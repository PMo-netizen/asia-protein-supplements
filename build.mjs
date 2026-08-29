import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

const pages = [
  "index.html",
  "line.html",
  "partners.html",
  "markets.html",
  "about.html",
  "intro.html",
];

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

rm(dist);
fs.mkdirSync(dist, { recursive: true });
for (const page of pages) {
  copy(path.join(root, page), path.join(dist, page));
}
copy(path.join(root, "src", "styles.css"), path.join(dist, "src", "styles.css"));
copy(path.join(root, "src", "app.js"), path.join(dist, "src", "app.js"));
copy(path.join(root, "src", "i18n.js"), path.join(dist, "src", "i18n.js"));
copy(path.join(root, "public", "favicon.svg"), path.join(dist, "public", "favicon.svg"));
copy(path.join(root, ".nojekyll"), path.join(dist, ".nojekyll"));
console.log("Built to dist/");
