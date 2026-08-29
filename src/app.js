import { strings } from "./i18n.js";

const LANG_KEY = "aps-lang";
const STORE_KEY = "aps-intro";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MARKETS = new Set(["hk", "sg", "jp", "kr", "cn", "other"]);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function lookup(dict, path) {
  let val = dict;
  for (const key of path.split(".")) val = val?.[key];
  return val;
}

function currentLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "zh" || saved === "en") return saved;
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("zh") && (nav.includes("hant") || nav.includes("hk") || nav.includes("tw"))) {
    return "zh";
  }
  return "en";
}

function t() {
  return strings[document.documentElement.dataset.lang || "en"];
}

function apply(lang) {
  const dict = strings[lang] || strings.en;
  document.documentElement.lang = dict.htmlLang;
  document.documentElement.dataset.lang = lang;
  localStorage.setItem(LANG_KEY, lang);

  document.title = dict.metaTitle;
  const meta = $('meta[name="description"]');
  if (meta) meta.setAttribute("content", dict.metaDesc);
  const ogt = $('meta[property="og:title"]');
  if (ogt) ogt.setAttribute("content", dict.metaTitle);
  const ogd = $('meta[property="og:description"]');
  if (ogd) ogd.setAttribute("content", dict.metaDesc);

  $$("[data-i18n]").forEach((el) => {
    const val = lookup(dict, el.getAttribute("data-i18n"));
    if (typeof val === "string") el.textContent = val;
  });

  $$("[data-i18n-ph]").forEach((el) => {
    const val = lookup(dict, el.getAttribute("data-i18n-ph"));
    if (typeof val === "string") el.setAttribute("placeholder", val);
  });

  $$("[data-i18n-aria]").forEach((el) => {
    const val = lookup(dict, el.getAttribute("data-i18n-aria"));
    if (typeof val === "string") el.setAttribute("aria-label", val);
  });

  $$('input[name="lang"]').forEach((el) => {
    el.value = lang;
  });

  $("#lang-en")?.setAttribute("aria-pressed", String(lang === "en"));
  $("#lang-zh")?.setAttribute("aria-pressed", String(lang === "zh"));
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(row) {
  const list = readLocal();
  const key = row.email.toLowerCase();
  if (list.some((item) => item.email === key)) return "dup";
  list.push({ ...row, email: key, ts: new Date().toISOString() });
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  return "ok";
}

function setStatus(form, kind, message) {
  const el = form.querySelector(".form-status");
  if (!el) return;
  el.className = `form-status ${kind}`;
  el.textContent = message;
}

function readFields(form) {
  const name = (form.querySelector('[name="name"]')?.value || "").trim();
  const company = (form.querySelector('[name="company"]')?.value || "").trim();
  const market = (form.querySelector('[name="market"]')?.value || "").trim();
  const email = (form.querySelector('[name="email"]')?.value || "").trim();
  const note = (form.querySelector('[name="note"]')?.value || "").trim();
  const hp = form.querySelector(".hp")?.value || "";
  return { name, company, market, email, note, hp };
}

function valid(fields) {
  if (fields.name.length < 1 || fields.name.length > 120) return false;
  if (fields.company.length < 1 || fields.company.length > 160) return false;
  if (!MARKETS.has(fields.market)) return false;
  if (!EMAIL_RE.test(fields.email) || fields.email.length > 254) return false;
  if (fields.note.length > 1000) return false;
  return true;
}

async function submitIntro(form) {
  const dict = t();
  const fields = readFields(form);
  if (fields.hp) return;
  if (!valid(fields)) {
    setStatus(form, "err", dict.formErr);
    return;
  }

  const lang = document.documentElement.dataset.lang || "en";
  const payload = {
    name: fields.name,
    company: fields.company,
    market: fields.market,
    email: fields.email,
    note: fields.note,
    lang,
  };
  const local = writeLocal(payload);

  try {
    const res = await fetch("/api/intro", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const type = res.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await res.json().catch(() => null) : null;
    if (!data) {
      setStatus(form, "ok", local === "dup" ? dict.formDup : dict.formFail);
    } else if (res.status === 409 || data.status === "duplicate") {
      setStatus(form, "ok", dict.formDup);
    } else if (!res.ok) {
      setStatus(form, "ok", dict.formLocal);
    } else {
      setStatus(form, "ok", dict.formOk);
    }
  } catch {
    setStatus(form, "ok", local === "dup" ? dict.formDup : dict.formFail);
  }

  form.reset();
  const langInput = form.querySelector('input[name="lang"]');
  if (langInput) langInput.value = lang;
}

function bindForms() {
  $$(".intro-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitIntro(form);
    });
  });
}

function bindLang() {
  $("#lang-en")?.addEventListener("click", () => apply("en"));
  $("#lang-zh")?.addEventListener("click", () => apply("zh"));
}

function greetFromQuery() {
  const params = new URLSearchParams(location.search);
  if (params.get("sent") === "1") {
    $$(".intro-form").forEach((form) => setStatus(form, "ok", t().formOk));
  }
}

bindLang();
bindForms();
apply(currentLang());
greetFromQuery();
