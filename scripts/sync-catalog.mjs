// Пересобирает catalog.json из ЖИВОГО WooCommerce (Store API): актуальный список товаров,
// цены, наличие, описания, КАТЕГОРИИ + вариации (размер/объём). Картинки — удалённые URL (как на WP).
// Это «источник правды»: после правок в админке достаточно запустить этот скрипт и залить файл.
//
// Запуск:  node scripts/sync-catalog.mjs <catalog.json> [<catalog2.json> ...]
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://annaflowerfarm.ru";
const UA = { "User-Agent": "Mozilla/5.0 (catalog sync)" };

const targets = process.argv.slice(2);
if (!targets.length) { console.error("usage: node scripts/sync-catalog.mjs <catalog.json> [...]"); process.exit(1); }

// category name -> { prodKey (product.categoryKey), catKey (categories[].key) }  — как в refetch-catalog.mjs
const CAT_MAP = {
  "Гортензии": { prodKey: "hydrangea", catKey: "hydrangea" },
  "Кустарники": { prodKey: "other", catKey: "shrubs" },
  "Овощная рассада": { prodKey: "vegetables", catKey: "vegetables" },
  "Цветы многолетние": { prodKey: "perennials", catKey: "perennials" },
  "Цветы однолетние": { prodKey: "annuals", catKey: "annuals" },
  "Пособия": { prodKey: "guides", catKey: "guides" },
  "Композиции": { prodKey: "compositions", catKey: "compositions" },
};

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&laquo;/gi, "«").replace(/&raquo;/gi, "»").replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–")
    .replace(/&minus;/gi, "−").replace(/&deg;/gi, "°").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&hellip;/gi, "…").replace(/&#8201;|&thinsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripEmoji(s) {
  if (!s) return s;
  return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2460}-\u{24FF}\u{25A0}-\u{25FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, "");
}
function htmlToText(html) {
  if (!html) return "";
  let t = html.replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "$& \n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, " ");
  t = stripEmoji(decodeEntities(t));
  return t.replace(/[ \t\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function pickImage(img) {
  if (!img) return null;
  const out = [];
  (img.srcset || "").split(",").forEach((part) => { const m = part.trim().match(/^(\S+)\s+(\d+)w$/); if (m) out.push({ url: m[1], w: +m[2] }); });
  if (img.src) out.push({ url: img.src, w: 9999 });
  if (!out.length) return img.src || null;
  const ok = out.filter((o) => o.w <= 1280).sort((a, b) => b.w - a.w);
  return ok.length ? ok[0].url : out.sort((a, b) => a.w - b.w)[0].url;
}
function parseCare(text) {
  const care = {};
  const grab = (re) => { const m = text.match(re); return m ? m[1].trim().replace(/[\s.;,]+$/, "") : null; };
  const h = grab(/Высот[аы][.:\s-]*([^.\n]{2,40}?(?:см|м))/i); if (h) care.height = h;
  const b = grab(/(?:Период\s+цветения|Цветени[ея])[.:\s-]*([^.\n]{3,60})/i); if (b) care.bloom = b;
  const l = grab(/(?:Освещени[ея]|Место\s+посадки|Свет)[.:\s-]*([^.\n]{3,60})/i); if (l) care.light = l;
  const z = grab(/(?:Зимостойкост[ьи]|Зона\s+морозостойкости)[.:\s-]*([^.\n]{1,60})/i); if (z) care.hardiness = z;
  return care;
}
const money = (p) => { if (!p || p.price == null) return null; const minor = p.currency_minor_unit ?? 2; return Math.round(parseInt(p.price, 10) / Math.pow(10, minor)); };
const litres = (label) => { const m = String(label).match(/([\d.,]+)/); return m ? parseFloat(m[1].replace(",", ".")) : 9999; };
async function fetchJSON(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
async function pool(items, n, fn) { const res = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); } })); return res; }

// ---- 1. живой список товаров (все страницы) ----
console.log("Fetching live products…");
let raw = [];
for (let pg = 1; pg <= 10; pg++) { const a = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products?per_page=100&page=${pg}&orderby=menu_order&order=asc`); if (!a.length) break; raw = raw.concat(a); }
console.log(`  products: ${raw.length}`);
const cats = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products/categories?per_page=100`);

// ---- 2. вариации вариативных товаров (цена+сток по каждой) ----
const variableProducts = raw.filter((p) => p.type === "variable");
const variationIds = [];
for (const p of variableProducts) for (const v of p.variations || []) variationIds.push(v.id);
console.log(`Fetching ${variationIds.length} variations of ${variableProducts.length} variable products…`);
const vData = {};
await pool(variationIds, 8, async (vid) => {
  try { const v = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products/${vid}`); const m = (v.stock_availability?.text || "").match(/(\d+)/);
    vData[vid] = { price: money(v.prices), inStock: !!v.is_in_stock, stock: v.is_in_stock ? (m ? +m[1] : 10) : 0 };
  } catch (e) { console.log("  variation fail", vid, e.message); }
});
function buildVariants(p) {
  const attr = (p.attributes || []).find((a) => a.has_variations) || (p.attributes || [])[0] || {};
  const slugToName = {}; for (const t of attr.terms || []) slugToName[t.slug] = decodeEntities(t.name);
  const variants = (p.variations || []).map((v) => {
    const a = (v.attributes || [])[0] || {}; const label = slugToName[a.value] || decodeURIComponent(a.value || "").trim() || "—";
    const d = vData[v.id] || { price: null, inStock: false, stock: 0 };
    return { id: v.id, label, price: d.price, inStock: d.inStock, stock: d.stock };
  }).filter((v) => v.price != null).sort((a, b) => litres(a.label) - litres(b.label));
  return { attrName: decodeEntities(attr.name || "Размер"), variants };
}

// ---- 3. собрать товары ----
const products = raw.map((p) => {
  const catName = (p.categories?.[0]?.name) || "Без категории";
  const map = CAT_MAP[catName] || { prodKey: "other" };
  const desc = htmlToText(p.description || p.short_description || "");
  const imgUrls = (p.images || []).map(pickImage).filter(Boolean);
  const base = {
    id: p.id, name: stripEmoji(decodeEntities(p.name)).replace(/\s+/g, " ").trim(),
    category: stripEmoji(decodeEntities(catName)).trim(), categoryKey: map.prodKey,
    price: 0, stock: 0, status: "ok", description: desc, care: parseCare(desc),
    image: imgUrls[0] || null, images: imgUrls, sourceUrl: p.permalink,
  };
  if (p.type === "variable") {
    const { attrName, variants } = buildVariants(p);
    if (variants.length) {
      const inS = variants.filter((v) => v.inStock); const prices = variants.map((v) => v.price);
      base.variants = variants; base.variantAttr = attrName; base.priceFrom = true;
      base.price = Math.min(...prices); base.stock = inS.reduce((s, v) => s + v.stock, 0);
      base.status = inS.length ? (base.stock <= 5 ? "low" : "ok") : "out";
      return base;
    }
  }
  // простой товар
  const price = money(p.prices) ?? 0; const inStock = !!p.is_in_stock;
  const m = (p.stock_availability?.text || "").match(/(\d+)/); const low = p.low_stock_remaining;
  base.price = price;
  if (!inStock) { base.stock = 0; base.status = "out"; }
  else { base.status = low != null ? "low" : "ok"; base.stock = m ? +m[1] : (low ?? 12); }
  return base;
});

const categories = cats.filter((c) => CAT_MAP[c.name]).map((c) => ({ id: c.id, name: decodeEntities(c.name), key: CAT_MAP[c.name].catKey, count: c.count, url: c.permalink }));
const heroImages = products.filter((p) => p.image && p.stock > 0).slice(0, 8).map((p) => p.image);

// ---- 4. записать в каждый целевой файл (сохраняя admin-mock orders/metrics) ----
for (const file of targets) {
  let existing = {}; try { existing = JSON.parse(readFileSync(file, "utf8")); } catch {}
  const out = { products, categories, orders: existing.orders, metrics: existing.metrics, heroImages };
  writeFileSync(file, JSON.stringify(out, null, 2));
  const nV = products.filter((p) => p.variants?.length).length;
  console.log(`WROTE ${file}  products=${products.length} variable=${nV} categories=${categories.length}`);
}
console.log("done.");
