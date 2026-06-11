// Fetch the shop's real ratings + reviews from the Avito API and write public/data/reviews.json.
// Credentials live in .env (gitignored): AVITO_CLIENT_ID, AVITO_CLIENT_SECRET, optional AVITO_PROFILE_URL.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(".env")) {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const ID = env.AVITO_CLIENT_ID;
const SECRET = env.AVITO_CLIENT_SECRET;
if (!ID || !SECRET) {
  console.error("Заполни .env: AVITO_CLIENT_ID=... и AVITO_CLIENT_SECRET=... (файл в .gitignore)");
  process.exit(1);
}

// 1) OAuth client_credentials
const tokRes = await fetch("https://api.avito.ru/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: ID, client_secret: SECRET }),
});
const tok = await tokRes.json().catch(() => ({}));
if (!tok.access_token) {
  console.error("Не получил токен:", tokRes.status, JSON.stringify(tok));
  process.exit(1);
}
const H = { Authorization: `Bearer ${tok.access_token}` };
console.log("token OK");

async function getJSON(url) {
  const r = await fetch(url, { headers: H });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, json: j };
}

// 2) rating summary
const info = await getJSON("https://api.avito.ru/ratings/v1/info");
console.log("info:", info.status);

// 3) reviews (paginated)
const all = [];
let total = null;
for (let offset = 0; offset < 500; offset += 50) {
  const page = await getJSON(`https://api.avito.ru/ratings/v1/reviews?offset=${offset}&limit=50`);
  if (page.status !== 200) {
    console.error("reviews page error:", page.status, JSON.stringify(page.json).slice(0, 300));
    break;
  }
  const list = page.json.reviews || page.json.items || [];
  total = page.json.total ?? total;
  all.push(...list);
  if (!list.length || (total != null && all.length >= total)) break;
}
console.log(`reviews fetched: ${all.length}${total != null ? ` of ${total}` : ""}`);

// raw dump for field-mapping debug (gitignored)
writeFileSync("scripts/avito-raw.json", JSON.stringify({ info: info.json, reviews: all }, null, 2));

// 4) normalize defensively (field names vary between API versions)
const toISO = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const reviews = all
  .map((r) => ({
    id: r.id,
    author: r.sender?.name || r.author?.name || r.userName || r.user?.name || "Покупатель",
    score: r.score ?? r.rating ?? r.stars ?? 5,
    date: toISO(r.createdAt ?? r.created_at ?? r.date ?? r.published_at),
    text: String(r.text ?? r.comment ?? r.message ?? "").trim(),
  }))
  .filter((r) => r.text.length > 2)
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

const ratingScore =
  info.json?.rating?.score ?? info.json?.score ?? info.json?.rating ?? null;
const reviewsCount =
  info.json?.reviewsCount ?? info.json?.rating?.reviewsCount ?? info.json?.reviews_count ?? total ?? reviews.length;

const out = {
  source: "avito",
  rating: typeof ratingScore === "number" ? ratingScore : null,
  reviewsCount,
  profileUrl: env.AVITO_PROFILE_URL || null,
  reviews,
};
writeFileSync("public/data/reviews.json", JSON.stringify(out, null, 2));
console.log(`WROTE public/data/reviews.json  rating=${out.rating}  count=${out.reviewsCount}  saved=${reviews.length}`);
