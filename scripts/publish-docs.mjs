import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const docs = resolve(root, "docs");

if (!existsSync(dist)) {
  throw new Error("dist does not exist. Run npm run build first.");
}

rmSync(docs, { recursive: true, force: true });
mkdirSync(docs, { recursive: true });
cpSync(dist, docs, { recursive: true });
copyFileSync(resolve(docs, "index.html"), resolve(docs, "404.html"));
writeFileSync(resolve(docs, ".nojekyll"), "", "utf8");
