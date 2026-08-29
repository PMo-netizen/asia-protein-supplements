# Asia Protein Supplements

Trade site for a Hong Kong company building a novel-ingredient protein line for Asian retail. Written for retail buyers and distributors — not shoppers.

English is the default. Toggle to Traditional Chinese (Hong Kong). There is no consumer SKU name on the page.

One call to action: request an intro call.

## Run

Requires Node 18+. There are no extra packages.

    node server.mjs

Then open http://127.0.0.1:5173

Scripts in package.json:

- dev — serve the site and the intro API from the project root
- build — copy the static files into dist/
- preview / start — serve the built dist/ folder (same API)

PORT and HOST can be set in the environment. Default is 127.0.0.1:5173.

## Intro call

The forms are live, not placeholders. Fields: name, company, market of interest (HK / SG / JP / KR / CN / other), email, optional note.

1. POST /api/intro with JSON `{ name, company, market, email, note, lang }` or a normal HTML form post.
2. Requests are appended to data/intro.json on disk.
3. The browser preventDefaults the submit, then fetch /api/intro. If the API is absent (GitHub Pages), it writes to localStorage (`aps-intro`) instead.
4. Duplicates (same email) return 409. A hidden honeypot field drops bots. In-memory rate limit: 20 posts per hour per IP.

GET /api/health returns `{ ok, intros }` (count only). There is no Calendly link yet.

## GitHub Pages

Relative asset paths (`src/styles.css`, `src/app.js`, `public/favicon.svg`) so the static tree deploys as-is. Keep `.nojekyll`. The Pages workflow uploads the repository root.

## Do not loosen

Sold as food, not medicine. No disease claims. Banned buzzwords, site-wide: clean, pure, natural.

No consumer waitlist. No SKU name. No lactoferrin, pack size, or price. No FDA / GRAS. No EU/US as launch markets. No founder name, photo, or gender.

Footer: food not medicine; not intended to diagnose, treat, cure, or prevent disease.

## Stack

Hand-built HTML, CSS, and ES modules. A small Node http server (`server.mjs`) with no packages to install. Wordmark is type plus a pack-label mark — no overlapping circles, no product photography.

Palette from the May 2026 decks: cream FBFBF9 / F7F6F2, charcoal 28251D, muted 7A7974, teal 01696F, deep teal 1B474D, wash BCE2E7, gold FFC553 (sparingly), terracotta A84B2F (errors only), hairline D4D1CA.

## Layout

1. Hero — house, one commercial sentence, intro-call CTA
2. The line — range in development, novel ingredients as a capability, food, bilingual packs
3. Partners — retailers and distributors; HK then SG / JP / KR; China via cross-border e-commerce
4. Why meet — three reasons
5. Intro call form (repeated in the footer)
6. Quiet footer — food not medicine, Hong Kong
