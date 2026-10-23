// Обогащает catalog.json данными о вариациях (размер/объём → своя цена + наличие).
// Источник — публичный WooCommerce Store API (тот же, что у refetch-catalog.mjs).
// НЕ трогает картинки/описания: только добавляет product.variants[] вариативным товарам.
//
// Запуск:  node scripts/enrich-variants.mjs <path-to-catalog.json> [<path2> ...]
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://xn----7sbbqrluc1bf5k.xn--p1ai";
const UA = { "User-Agent": "Mozilla/5.0 (variants enrich)" };

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error("usage: node scripts/enrich-variants.mjs <catalog.json> [...]");
  process.exit(1);
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&laquo;/gi, "«").replace(/&raquo;/gi, "»")
    .replace(/&mdash;/gi, "—").replace(/&ndash;/gi, "–").replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
const money = (p) => {
  if (!p || p.price == null) return null;
  const minor = p.currency_minor_unit ?? 2;
  return Math.round(parseInt(p.price, 10) / Math.pow(10, minor));
};
async function fetchJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function pool(items, n, fn) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); }
  }));
  return res;
}
const litres = (label) => {
  const m = String(label).match(/([\d.,]+)/);
  return m ? parseFloat(m[1].replace(",", ".")) : 9999;
};

// ---- 1. собрать структуру вариативных товаров ----
console.log("Fetching product list…");
const list = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products?per_page=100&orderby=menu_order&order=asc`);
const variableProducts = list.filter((p) => p.type === "variable");
console.log(`  variable products: ${variableProducts.length}`);

// id вариаций, которые надо догрузить (цена + сток у каждой)
const variationIds = [];
for (const p of variableProducts) for (const v of p.variations || []) variationIds.push(v.id);

console.log(`Fetching ${variationIds.length} variations…`);
const variationData = {};
await pool(variationIds, 8, async (vid) => {
  try {
    const v = await fetchJSON(`${BASE}/wp-json/wc/store/v1/products/${vid}`);
    const txt = v.stock_availability?.text || "";
    const m = txt.match(/(\d+)/);
    variationData[vid] = {
      price: money(v.prices),
      inStock: !!v.is_in_stock,
      stock: v.is_in_stock ? (m ? +m[1] : 10) : 0,
    };
  } catch (e) {
    console.log("  variation fail", vid, e.message);
  }
});

// ---- 2. построить variants[] на каждый вариативный товар ----
const variantsByProduct = {};
for (const p of variableProducts) {
  const attr = (p.attributes || []).find((a) => a.has_variations) || (p.attributes || [])[0] || {};
  const slugToName = {};
  for (const t of attr.terms || []) slugToName[t.slug] = decodeEntities(t.name);
  const attrName = decodeEntities(attr.name || "Размер");

  const variants = (p.variations || []).map((v) => {
    const a = (v.attributes || [])[0] || {};
    const label = slugToName[a.value] || decodeURIComponent(a.value || "").trim() || "—";
    const d = variationData[v.id] || { price: null, inStock: false, stock: 0 };
    return { id: v.id, label, price: d.price, inStock: d.inStock, stock: d.stock };
  })
    .filter((v) => v.price != null)
    .sort((a, b) => litres(a.label) - litres(b.label));

  if (variants.length) {
    variantsByProduct[p.id] = { attrName, variants };
  }
}
console.log(`Built variants for ${Object.keys(variantsByProduct).length} products.`);

// ---- 3. вписать в каждый целевой catalog.json ----
for (const file of targets) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const arr = Array.isArray(json) ? json : json.products || [];
  let touched = 0;
  for (const prod of arr) {
    const info = variantsByProduct[prod.id];
    if (!info) {
      // на всякий случай чистим возможные старые поля у простых товаров
      delete prod.variants; delete prod.variantAttr; delete prod.priceFrom;
      continue;
    }
    const inStockV = info.variants.filter((v) => v.inStock);
    const prices = info.variants.map((v) => v.price);
    prod.variants = info.variants;
    prod.variantAttr = info.attrName;
    prod.price = Math.min(...prices);           // «от {min}»
    prod.priceFrom = true;
    prod.stock = inStockV.reduce((s, v) => s + v.stock, 0); // суммарный сток доступных размеров
    prod.status = inStockV.length ? (prod.stock <= 5 ? "low" : "ok") : "out";
    touched++;
  }
  writeFileSync(file, JSON.stringify(json, null, 2));
  console.log(`WROTE ${file}  (variants on ${touched} products)`);
}
console.log("done.");
