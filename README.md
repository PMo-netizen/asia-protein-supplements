# Asia Protein Supplements

Trade site for a Hong Kong company building a novel-ingredient protein line for Asian retail. Written for retail buyers and distributors — not shoppers.

English is the default. Toggle to Traditional Chinese (Hong Kong). There is no consumer SKU name on the site.

One call to action: request an intro call.

Live at https://pmo-netizen.github.io/asia-protein-supplements/ — relative links, so GitHub Pages works from that path.

## Pages

1. `index.html` — Home. Who we are, who the site is for, three teasers (The line / Partners / About), primary CTA to the intro call.
2. `line.html` — The line. Range in development, sold as food, bilingual pack, novel ingredients as a sourcing capability. Why this is a line, not a single SKU.
3. `partners.html` — Partners. Retail chains, regional distributors, China cross-border platforms. What a first conversation covers, and what we need from a partner.
4. `markets.html` — Markets. Hong Kong first; then Singapore, Japan, Korea; China via cross-border e-commerce as a beachhead. Why each market matters to a retailer or distributor. Commercial, not a regulatory playbook.
5. `about.html` — About. Founder-led Hong Kong company (cosmetics + biotech). Unnamed, no photo, no gender. Why Hong Kong.
6. `intro.html` — Intro call. Short form only: name, company, market, email, optional note.

Shared header and footer on every page. Nav: Home · The line · Partners · Markets · About · Intro call. Current page uses `aria-current="page"`.

## Run

Requires Node 18+. There are no extra packages.

    node server.mjs

Then open http://127.0.0.1:5173

Scripts in package.json:

- dev — serve the site and the intro API from the project root
- build — copy the static files into dist/
- preview / start — serve the built dist/ folder (same API)

PORT and HOST can be set in the environment. Default is 127.0.0.1:5173.

Extensionless paths (`/line`, `/partners`, `/markets`, `/about`, `/intro`) resolve to the matching `.html` file locally. GitHub Pages uses the `.html` files via relative links.

## Intro call

The form on `intro.html` is live, not a placeholder. Fields: name, company, market of interest (HK / SG / JP / KR / CN / other), email, optional note.

1. POST /api/intro with JSON `{ name, company, market, email, note, lang }` or a normal HTML form post.
2. Requests are appended to data/intro.json on disk.
3. The browser preventDefaults the submit, then fetch /api/intro. If the API is absent (GitHub Pages), it writes to localStorage (`aps-intro`) instead.
4. Duplicates (same email) return 409. A hidden honeypot field drops bots. In-memory rate limit: 20 posts per hour per IP.

GET /api/health returns `{ ok, intros }` (count only). There is no Calendly link yet.

A native form POST (no JavaScript) redirects to `/intro.html?sent=1`.

## GitHub Pages

Relative asset paths (`src/styles.css`, `src/app.js`, `public/favicon.svg`) and relative page links (`line.html`, `partners.html`, …) so the static tree deploys as-is. Keep `.nojekyll`. The Pages workflow uploads the repository root.

## Do not loosen

Sold as food, not medicine. No disease claims. Banned buzzwords, site-wide: clean, pure, natural.

No consumer waitlist. No SKU name. No lactoferrin, pack size, or price. No FDA / GRAS. No EU/US as launch markets. No founder name, photo, or gender.

No NHC month counts, consultant fee tables, Blue Hat lecture, or claims taxonomy. Markets is commercial sequence, not a regulatory matrix.

Footer: food not medicine; not intended to diagnose, treat, cure, or prevent disease.

## Stack

Hand-built HTML, CSS, and ES modules. A small Node http server (`server.mjs`) with no packages to install. Wordmark is type plus a pack-label mark — no overlapping circles, no product photography.

Palette from the May 2026 decks: cream FBFBF9 / F7F6F2, charcoal 28251D, muted 7A7974, teal 01696F, deep teal 1B474D, wash BCE2E7, gold FFC553 (sparingly), terracotta A84B2F (errors only), hairline D4D1CA.

i18n lives in `src/i18n.js` and covers every page. `data-page` on `<html>` selects the document title.
