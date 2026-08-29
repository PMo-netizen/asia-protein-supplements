#!/usr/bin/node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.argv.includes("--prod");
const ROOT = PROD ? path.join(__dirname, "dist") : __dirname;
const DATA_DIR = path.join(__dirname, "data");
const WAITLIST = path.join(DATA_DIR, "waitlist.json");
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
    const raw = fs.readFileSync(WAITLIST, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(WAITLIST, JSON.stringify(list, null, 2) + "\n", "utf8");
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

function addEmail(email, lang, ip) {
  const list = readList();
  const key = email.toLowerCase();
  if (list.some((row) => row.email === key)) return { status: "duplicate", count: list.length };
  list.push({
    email: key,
    lang: lang === "zh" ? "zh" : "en",
    ts: new Date().toISOString(),
  });
  writeList(list);
  return { status: "ok", count: list.length };
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const ip = req.socket.remoteAddress || "unknown";

  if (req.method === "OPTIONS" && url.pathname === "/api/waitlist") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/waitlist") {
    if (!rateOk(ip)) {
      send(res, 429, { status: "error", message: "Too many requests" });
      return;
    }
    const raw = await readBody(req);
    const body = parseBody(req, raw);
    if (body.website) {
      send(res, 200, { status: "ok" });
      return;
    }
    const email = String(body.email || "").trim();
    const lang = String(body.lang || "en");
    if (!EMAIL_RE.test(email) || email.length > 254) {
      if (wantsHtml(req)) {
        res.writeHead(302, { Location: "/?joined=0" });
        res.end();
        return;
      }
      send(res, 400, { status: "error", message: "Invalid email" });
      return;
    }
    const result = addEmail(email, lang, ip);
    if (wantsHtml(req)) {
      res.writeHead(302, { Location: "/?joined=1" });
      res.end();
      return;
    }
    send(res, result.status === "duplicate" ? 409 : 200, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    send(res, 200, { ok: true, waitlist: readList().length });
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
  console.log(`Waitlist file: ${WAITLIST}`);
});
