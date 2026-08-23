# Cartaly — features

Photograph a restaurant menu you can't read and get back one you can order from:
translated names, prices, and a picture of every dish. Built for the moment you're
sitting in a restaurant abroad and the menu is a wall of foreign text.

Technical design: [SPEC.md](./SPEC.md) · Product overview:
[system-design-overview.md](./system-design-overview.md)

## Core

- **Menu scan** — Snap or upload a photo; the readable menu appears in ~2–3 s,
  before any images. Non-menu photos are politely rejected.
- **Translate + gloss** — Translated name large, original name beneath it, so cards
  match the physical menu in your hand. Names are transliterated and explained
  ("Tom Yum Goong — spicy shrimp soup"), never replaced.
- **Dish photos** — An AI-generated image for every dish, loading lazily as cards
  scroll into view. Styled and labeled as an impression, not a photo of the
  restaurant's actual plate.
- **Prices in both currencies** — As printed, plus your home currency, marked
  approximate.
- **Calorie estimates** — A per-dish estimate for a typical preparation, shown as a
  fuzzy range (~350 kcal), never false precision. Hideable for anyone who'd rather
  not see it.
- **Filters & search** — Vegetarian / vegan / gluten-free / spicy chips, spice-level
  dots, category sections, and search across both languages.
- **Order builder** — Tap dishes into a list; running total in both currencies and
  approximate calories for the table.
- **Show-to-waiter** — Full-screen original-language names with quantities, in big
  type. Closes the loop: the waiter reads their own language.
- **Table share** — Every scanned menu gets a link; one person scans, the whole
  table browses on their own phones.
- **Language picker** — Defaults to your phone's language; switching re-translates
  the text but never regenerates an image.

## Others

- **Dietary profile** — Allergies, a diet toggle (vegetarian, halal, no pork…), and
  a free-text box ("pregnant — no raw fish"). Lives on the device, no account, and
  assembles itself from behavior instead of a setup form.
- **Allergy warnings** — Three states per dish: likely contains / likely fine /
  can't tell — ask. Never silently hidden, always paired with an "I'm allergic to
  X" phrase card in the menu's language, and clearly disclaimed as AI-inferred.
- **Diet auto-filter** — A stated diet filters every menu on scan, with a visible
  chip so the menu never feels secretly incomplete. Mere preferences ("no
  cilantro") annotate dishes instead of hiding them.
- **Dish detail sheet** — Ingredients, origin, taste, how locals eat it. Generated
  on demand — perfect for the wait after ordering — and cached per language.
- **Pronunciation help** — Romanization plus tap-to-hear, for ordering out loud.
- **Multi-photo menus** — Real menus are 2–6 pages; snap them all, get one merged
  menu.
- **Trip food diary** — Scanned menus become history: "that incredible thing we ate
  in Osaka," findable later with its picture and real name. First cut shipped: a
  device-local "Recent menus" list on the home screen — every menu you scan or
  open is remembered on the phone, saved as "Untitled" until you rename it.
- **Offline for opened menus** — Menus you've already scanned keep working with no
  signal.

## Future

- **Bill check** — Photograph the bill and reconcile it against your order list.
  Deferred: bills are abbreviations and scrawl, and a false overcharge alarm is
  worse than none. The order list is kept as real data so this stays possible.
- **"What should I order?"** — Three picks with reasons, from the parsed menu and
  your profile.
- **Table profiles** — Merge profiles at a shared table into "safe for everyone"
  badges — the real question in shared-plates cuisines.
- **Group ordering** — Everyone marks what they want on the shared menu; it merges
  into one table order.
- **Portion guidance** — "For four people, locals would order 4–5 dishes."
- **Phrase cards beyond allergies** — "No cilantro," "not spicy, please," "check,
  please" in the menu's language.
- **Specials-board mode** — Handwritten chalkboards and daily specials: the menus
  nothing else ever translates, and where the best food hides.
- **Popularity badges** — "Often ordered," derived free from image-cache hit
  counts.
- **Drink pairings & wine lists** — Wine lists are their own beast; drinks get
  their own detail treatment.
- **Restaurant mode** — A restaurant uploads its menu once and gets a permanent
  QR-linked visual menu page.

## Decisions so far

- One AI vendor for now: OpenAI — `gpt-5-mini` parses, `gpt-image-2` (low) draws.
  All calls live behind `src/server/ai/`, and cache keys carry a version prefix,
  so changing vendors later is one file plus a `v2/` bump, not a rewrite.
- Storage: `bun:sqlite` (with Drizzle) is the source of truth and cache index;
  Cloudflare R2 holds image bytes (zero egress). No Redis; no HMAC — image
  requests are gated by a `dishes`-row lookup.
- Hosting deferred but shaped: one always-on Bun server with a disk
  (standalone build), SQLite backed up via Litestream → R2. No serverless.
- Free to use for now. If charging comes later, it pays for depth (trip pass,
  profile sync, restaurant mode) — the core scan stays free.
- Generated images are honest: consistent, slightly illustrative, labeled as
  impressions — never passed off as the restaurant's real dish.
- No accounts until someone needs their profile on a second device; until then
  everything personal lives on the phone.
- No app install required at the table — first contact is a link that works in the
  browser.
