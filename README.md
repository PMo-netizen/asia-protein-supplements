# Asia Protein Supplements

Consumer landing page for a Hong Kong novel-ingredient protein, sold as food. Hero example: precision-fermented lactoferrin powder.

English is the default. Toggle to Traditional Chinese (Hong Kong). No slogan was coined. The headline is the category line from the decks:

Launching novel-ingredient protein supplements across Asia.

## Run

Requires Node 18+. There are no extra packages.

    node server.mjs

Then open http://127.0.0.1:5173

Scripts in package.json:

- dev — serve the site and the waitlist API from the project root
- build — copy the static files into dist/
- preview / start — serve the built dist/ folder (same API)

PORT and HOST can be set in the environment. Default is 127.0.0.1:5173.

## Waitlist

The Join the waitlist forms are live, not placeholders.

1. POST /api/waitlist with JSON { email, lang } or a normal HTML form post.
2. Addresses are appended to data/waitlist.json on disk.
3. The browser also writes to localStorage (aps-waitlist), so the form still succeeds if the API is down.
4. Duplicates return 409. A hidden honeypot field drops bots. In-memory rate limit: 20 posts per hour per IP.

GET /api/health returns { ok, waitlist } (count only).

## Claims (do not loosen)

We say: High in protein. Supports muscle recovery after exercise. Helps maintain healthy energy levels.

We never say: treats / cures / prevents; lowers cholesterol; boosts immunity; clinically proven as a naked claim.

Banned buzzwords, site-wide: clean, pure, natural.

Footer: food not medicine; not intended to diagnose, treat, cure, or prevent disease.

No price. No FDA GRAS. No EU/US as launch markets. No founder name, photo, or gender.

## Stack

Hand-built HTML, CSS, and ES modules. A small Node http server (server.mjs) with no packages to install. SVG wordmark and editorial diagrams are inline. There is no stock whey photography.

Palette from the May 2026 decks: cream FBFBF9 / F7F6F2, charcoal 28251D, muted 7A7974, teal 01696F, deep teal 1B474D, wash BCE2E7, gold FFC553, terracotta A84B2F, hairline D4D1CA.

## Layout

1. Hero + waitlist
2. What it is
3. Why this ingredient (precision fermentation)
4. What we will / will not claim
5. Made for Asia, launched in HK (HK to SG to JP to KR, China CBEC)
6. Founder (unnamed HK solo, cosmetics + biotech)
7. FAQ
8. Footer + waitlist
