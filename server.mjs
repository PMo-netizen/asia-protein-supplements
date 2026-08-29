#!/usr/bin/node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.argv.includes("--prod");
const ROOT = PROD ? path.join(__dirname, "dist") : __dirname;
const DATA_DIR = path.join(__dirname, "data");
const INTRO = path.join(DATA_DIR, "intro.json");
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MARKETS = new Set(["hk", "sg", "jp", "kr", "cn", "other"]);
const hits = new Map();

function rateOk(ip) {
  const now = Date.now();
  const row = hits.get(ip) || [];
  const recent = row.filter((t) => now - t < 60 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length <= 20;
}

function readList() {
  try {
    const raw = fs.readFileSync(INTRO, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INTRO, JSON.stringify(list, null, 2) + "\n", "utf8");
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function parseBody(req, raw) {
  const type = req.headers["content-type"] || "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(raw || "{}");
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

function wantsHtml(req) {
  const accept = req.headers.accept || "";
  const type = req.headers["content-type"] || "";
  return !accept.includes("application/json") && !type.includes("application/json");
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function addIntro(fields) {
  const list = readList();
  const key = fields.email.toLowerCase();
  if (list.some((row) => row.email === key)) return { status: "duplicate", count: list.length };
  list.push({
    name: fields.name,
    company: fields.company,
    market: fields.market,
    email: key,
    note: fields.note,
    lang: fields.lang === "zh" ? "zh" : "en",
    ts: new Date().toISOString(),
  });
  writeList(list);
  return { status: "ok", count: list.length };
}

function cors(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  });
  res.end();
}

function safeJoin(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(ROOT, safePath);
  if (!file.startsWith(ROOT)) return null;
  return file;
}

function serveStatic(req, res, urlPath) {
  let file = safeJoin(urlPath === "/" ? "/index.html" : urlPath);
  if (!file) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!path.extname(file) && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      if (urlPath !== "/" && !path.extname(urlPath)) {
        return serveStatic(req, res, "/index.html");
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
  });
}

function handleIntro(req, res, body) {
  const ip = req.socket.remoteAddress || "unknown";
  if (!rateOk(ip)) {
    send(res, 429, { status: "error", message: "Too many requests" });
    return;
  }
  if (body.website) {
    send(res, 200, { status: "ok" });
    return;
  }
  const fields = {
    name: clip(body.name, 120),
    company: clip(body.company, 160),
    market: clip(body.market, 16).toLowerCase(),
    email: clip(body.email, 254),
    note: clip(body.note, 1000),
    lang: clip(body.lang, 8),
  };
  const ok =
    fields.name.length >= 1 &&
    fields.company.length >= 1 &&
    MARKETS.has(fields.market) &&
    EMAIL_RE.test(fields.email);
  if (!ok) {
    if (wantsHtml(req)) {
      res.writeHead(302, { Location: "/?sent=0" });
      res.end();
      return;
    }
    send(res, 400, { status: "error", message: "Invalid intro request" });
    return;
  }
  const result = addIntro(fields);
  if (wantsHtml(req)) {
    res.writeHead(302, { Location: "/?sent=1" });
    res.end();
    return;
  }
  send(res, result.status === "duplicate" ? 409 : 200, result);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === "/api/intro") {
    cors(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/intro") {
    const raw = await readBody(req);
    handleIntro(req, res, parseBody(req, raw));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, { ok: true, intros: readList().length });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, { status: "error", message: "Method not allowed" });
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  const mode = PROD ? "production (dist)" : "dev";
  console.log(`Asia Protein Supplements  ·  ${mode}`);
  console.log(`http://${HOST}:${PORT}`);
  console.log(`Intro file: ${INTRO}`);
});
