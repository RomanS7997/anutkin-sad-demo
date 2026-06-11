// Re-fetch all products from the live WooCommerce Store API and rebuild catalog.json
// (full descriptions, prices, stock, categories) + download real product photos.
import { writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const BASE = "https://xn----7sbbqrluc1bf5k.xn--p1ai";
const UA = { "User-Agent": "Mozilla/5.0 (catalog refetch)" };
const PRODUCTS_DIR = "public/assets/products";
const OUT = "public/data/catalog.json";

// category name -> { prodKey (product.categoryKey), catKey (categories[].key) }
const CAT_MAP = {
  "Гортензии": { prodKey: "hydrangea", catKey: "hydrangea" },
  "Кустарники": { prodKey: "other", catKey: "shrubs" },
  "Овощная рассада": { prodKey: "vegetables", catKey: "vegetables" },
  "Цветы многолетние": { prodKey: "perennials", catKey: "perennials" },
  "Цветы однолетние": { prodKey: "annuals", catKey: "annuals" },
};

function decodeEntities(s) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&laquo;/gi, "«").replace(/&raquo;/gi, "»")
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–")
    .replace(/&minus;/gi, "−").replace(/&deg;/gi, "°")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "…").replace(/&#8201;|&thinsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function htmlToText(html) {
  if (!html) return "";
  let t = html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "$& \n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  return t.replace(/[ \t\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function pickImage(img) {
  if (!img) return null;
  const out = [];
  (img.srcset || "").split(",").forEach((part) => {
    const m = part.trim().match(/^(\S+)\s+(\d+)w$/);
    if (m) out.push({ url: m[1], w: +m[2] });
  });
  if (img.src) out.push({ url: img.src, w: 9999 });
  if (!out.length) return img.src || null;
  const ok = out.filter((o) => o.w <= 1280).sort((a, b) => b.w - a.w);
  if (ok.length) return ok[0].url;
  return out.sort((a, b) => a.w - b.w)[0].url; // all bigger than 1280 -> smallest
}
function parseCare(text) {
  const care = {};
  const grab = (re) => { const m = text.match(re); return m ? m[1].trim().replace(/[\s.;,]+$/, "") : null; };
  const h = grab(/Высот[аы][.:\s-]*([^.\n]{2,40}?(?:см|м))/i); if (h) care.height = h;
  const b = grab(/(?:Период\s+цветения|Цветени[ея])[.:\s-]*([^.\n]{3,60})/i); if (b) care.bloom = b;
  const l = grab(/(?:Освещени[ея]|Место\s+посадки|Свет)[.:\s-]*([^.\n]{3,60})/i); if (l) care.light = l;
  const z = grab(/(?:Зимостойкост[ьи]|Зона\s+морозостойкости|зона\s+морозостойкости)[.:\s-]*([^.\n]{1,60})/i); if (z) care.hardiness = z;
  return care;
}

async function fetchJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function download(url, dest, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(dest, buf);
      return buf.length;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 400));
    }
  }
}
async function pool(items, n, fn) {
  const res = []; let idx = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (idx < items.length) { const i = idx++; res[i] = await fn(items[i], i); }
  }));
  return res;
}

// ---- main ----
const existing = JSON.parse(readFileSync(OUT, "utf8"));

console.log("Fetching products...");
const raw = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products?per_page=100&orderby=menu_order&order=asc`);
console.log("  got", raw.length, "products");
const cats = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products/categories?per_page=100`);

mkdirSync(PRODUCTS_DIR, { recursive: true });

const products = raw.map((p) => {
  const catName = (p.categories?.[0]?.name) || "Без категории";
  const map = CAT_MAP[catName] || { prodKey: "other" };
  const minor = p.prices?.currency_minor_unit ?? 2;
  const price = Math.round((parseInt(p.prices?.price || "0", 10) / Math.pow(10, minor)));
  const inStock = !!p.is_in_stock;
  const qtyText = p.stock_availability?.text || "";
  const qtyMatch = qtyText.match(/(\d+)/);
  const low = p.low_stock_remaining;
  let stock, status;
  if (!inStock) { stock = 0; status = "out"; }
  else { status = (low != null) ? "low" : "ok"; stock = qtyMatch ? +qtyMatch[1] : (low ?? 12); }
  const desc = htmlToText(p.description || p.short_description || "");
  const imgUrls = (p.images || []).map(pickImage).filter(Boolean);
  return {
    _imgUrl: imgUrls[0] || null,
    _allImgs: imgUrls,
    id: p.id,
    name: decodeEntities(p.name).replace(/\s+/g, " ").trim(),
    category: decodeEntities(catName),
    categoryKey: map.prodKey,
    price,
    stock,
    status,
    description: desc,
    care: parseCare(desc),
    image: null, // set after download
    images: [],
    sourceUrl: p.permalink,
  };
});

// download images
console.log("Downloading images...");
let okImg = 0, failImg = 0;
const usedFiles = new Set();
await pool(products, 8, async (prod) => {
  if (!prod._imgUrl) { failImg++; return; }
  const ext = (prod._imgUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i)?.[1] || "jpg").toLowerCase().replace("jpeg", "jpg");
  const file = `p${prod.id}.${ext}`;
  try {
    await download(prod._imgUrl, path.join(PRODUCTS_DIR, file));
    prod.image = `/assets/products/${file}`;
    usedFiles.add(file);
    okImg++;
  } catch (e) {
    failImg++;
    console.log("  img fail", prod.id, e.message);
  }
});
console.log(`  images ok=${okImg} fail=${failImg}`);

// clean output products (drop temp fields, set images array path-less->keep urls for reference)
const finalProducts = products.map((p) => ({
  id: p.id, name: p.name, category: p.category, categoryKey: p.categoryKey,
  price: p.price, stock: p.stock, status: p.status, description: p.description,
  care: p.care, image: p.image, images: p._allImgs, sourceUrl: p.sourceUrl,
}));

// categories array (mapped keys, real counts)
const categories = cats
  .filter((c) => CAT_MAP[c.name])
  .map((c) => ({ id: c.id, name: decodeEntities(c.name), key: CAT_MAP[c.name].catKey, count: c.count, url: c.permalink }));

// remove stale image files
for (const f of readdirSync(PRODUCTS_DIR)) {
  if (!usedFiles.has(f)) { try { rmSync(path.join(PRODUCTS_DIR, f)); } catch {} }
}

const heroImages = finalProducts.filter((p) => p.image && p.stock > 0).slice(0, 8).map((p) => p.image);

const out = {
  products: finalProducts,
  categories,
  orders: existing.orders,   // keep admin mock
  metrics: existing.metrics, // keep admin mock
  heroImages,
};
writeFileSync(OUT, JSON.stringify(out, null, 2));

const inStockN = finalProducts.filter((p) => p.status !== "out").length;
console.log(`\nWROTE ${OUT}`);
console.log(`products=${finalProducts.length}  inStock=${inStockN}  out=${finalProducts.length - inStockN}`);
console.log(`categories=${categories.length}`, categories.map((c) => `${c.name}:${c.count}`).join(", "));
console.log(`avg desc len=${Math.round(finalProducts.reduce((s, p) => s + p.description.length, 0) / finalProducts.length)}`);
