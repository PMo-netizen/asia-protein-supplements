import { strings } from "./i18n.js";

const LANG_KEY = "aps-lang";
const STORE_KEY = "aps-waitlist";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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
    const path = el.getAttribute("data-i18n").split(".");
    let val = dict;
    for (const key of path) val = val?.[key];
    if (typeof val === "string") el.textContent = val;
  });

  $$("[data-i18n-ph]").forEach((el) => {
    const path = el.getAttribute("data-i18n-ph").split(".");
    let val = dict;
    for (const key of path) val = val?.[key];
    if (typeof val === "string") el.setAttribute("placeholder", val);
  });

  $$("[data-i18n-aria]").forEach((el) => {
    const path = el.getAttribute("data-i18n-aria").split(".");
    let val = dict;
    for (const key of path) val = val?.[key];
    if (typeof val === "string") el.setAttribute("aria-label", val);
  });

  $("#lang-en")?.setAttribute("aria-pressed", String(lang === "en"));
  $("#lang-zh")?.setAttribute("aria-pressed", String(lang === "zh"));

  renderCards(dict);
  renderSteps(dict);
  renderClaims(dict);
  renderMarkets(dict);
  renderFaq(dict);
}

function renderCards(dict) {
  const root = $("#what-cards");
  if (!root) return;
  root.innerHTML = dict.what.cards
    .map(
      (c) => `<article class="card card-accent">
        <h3>${escapeHtml(c.h)}</h3>
        <p>${escapeHtml(c.p)}</p>
      </article>`
    )
    .join("");
}

function renderSteps(dict) {
  const root = $("#why-steps");
  if (!root) return;
  root.innerHTML = dict.why.steps
    .map(
      (s) => `<article class="step">
        <div class="step-mark" aria-hidden="true">${escapeHtml(s.n)}</div>
        <div>
          <h3>${escapeHtml(s.h)}</h3>
          <p>${escapeHtml(s.p)}</p>
        </div>
      </article>`
    )
    .join("");
}

function renderClaims(dict) {
  const say = $("#claims-say");
  const not = $("#claims-not");
  if (say) {
    say.innerHTML = dict.claims.say.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  }
  if (not) {
    not.innerHTML = dict.claims.not.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  }
}

function renderMarkets(dict) {
  const path = $("#market-path");
  if (path) {
    const nodes = dict.markets.path;
    path.innerHTML = nodes
      .map((n, i) => {
        const klass = i === 0 ? "first" : "later";
        const label = i === 0 ? `${n}` : n;
        const arr = i < nodes.length - 1 ? `<span class="arr" aria-hidden="true">→</span>` : "";
        return `<span class="node ${klass}">${escapeHtml(label)}</span>${arr}`;
      })
      .join("");
  }
  const grid = $("#market-grid");
  if (grid) {
    grid.innerHTML = dict.markets.items
      .map(
        (m) => `<article class="market ${m.klass}">
          <header>
            <h3>${escapeHtml(m.h)}</h3>
            <span class="tag">${escapeHtml(m.tag)}</span>
          </header>
          <p>${escapeHtml(m.p)}</p>
        </article>`
      )
      .join("");
  }
}

function renderFaq(dict) {
  const root = $("#faq-list");
  if (!root) return;
  root.innerHTML = dict.faq.items
    .map((item, i) => {
      return `<div class="faq-item">
        <button type="button" id="faq-btn-${i}" aria-expanded="false" aria-controls="faq-a-${i}">
          <span>${escapeHtml(item.q)}</span>
        </button>
        <div class="faq-a" id="faq-a-${i}" role="region" hidden>${escapeHtml(item.a)}</div>
      </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bindFaq() {
  $("#faq-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[aria-expanded]");
    if (!btn) return;
    const item = btn.parentElement;
    const panel = item.querySelector(".faq-a");
    const open = btn.getAttribute("aria-expanded") === "true";
    $$("#faq-list button[aria-expanded]").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      b.parentElement.querySelector(".faq-a").hidden = true;
      b.parentElement.removeAttribute("open");
    });
    if (!open) {
      btn.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      item.setAttribute("open", "");
    }
  });
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

function writeLocal(email, lang) {
  const list = readLocal();
  const key = email.toLowerCase();
  if (list.some((row) => row.email === key)) return "dup";
  list.push({ email: key, lang, ts: new Date().toISOString() });
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  return "ok";
}

function setStatus(form, kind, message) {
  const el = form.querySelector(".waitlist-status");
  if (!el) return;
  el.className = `waitlist-status ${kind}`;
  el.textContent = message;
}

async function submitWaitlist(form) {
  const dict = t();
  const email = (form.querySelector('input[type="email"]')?.value || "").trim();
  const hp = form.querySelector(".hp")?.value || "";
  if (hp) return;
  if (!EMAIL_RE.test(email) || email.length > 254) {
    setStatus(form, "err", dict.waitlistErr);
    return;
  }

  const lang = document.documentElement.dataset.lang || "en";
  const local = writeLocal(email, lang);

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 || data.status === "duplicate") {
      setStatus(form, "ok", dict.waitlistDup);
    } else if (!res.ok) {
      setStatus(form, "ok", dict.waitlistLocal);
    } else {
      setStatus(form, "ok", dict.waitlistOk);
    }
  } catch {
    setStatus(form, "ok", local === "dup" ? dict.waitlistDup : dict.waitlistFail);
  }

  form.reset();
}

function bindWaitlist() {
  $$(".waitlist-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitWaitlist(form);
    });
  });
}

function bindLang() {
  $("#lang-en")?.addEventListener("click", () => apply("en"));
  $("#lang-zh")?.addEventListener("click", () => apply("zh"));
}

function bindHeader() {
  const header = $(".site-header");
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function greetFromQuery() {
  const params = new URLSearchParams(location.search);
  if (params.get("joined") === "1") {
    $$(".waitlist-form").forEach((form) => setStatus(form, "ok", t().waitlistOk));
  }
}

bindLang();
bindFaq();
bindWaitlist();
bindHeader();
apply(currentLang());
greetFromQuery();
