# Cartaly — implementation plan

Phased so each phase ships something usable. Architecture: [SPEC.md](./SPEC.md).
Feature tiers: [features.md](./features.md).

## Phase 0 — Foundations

- Read the bundled Next 16 docs (`node_modules/next/dist/docs/`) before coding:
  route handlers, server/client components, upgrading notes.
- `bun add drizzle-orm openai sharp && bun add -d drizzle-kit @types/bun`.
  shadcn/ui deferred — Phase 1 UI is plain Tailwind; adopt shadcn when Phase 3
  needs real components (sheets, dialogs).
- Fill `src/server/env.ts` with the env schema from SPEC.
- Verify the OpenAI SDK's structured-output helpers accept Zod 4.

## Phase 1 — Photo → translated text menu

The product exists after this phase.

- `src/schemas/menu.ts` — `Dish` / `ParsedMenu` zod schemas (incl. `calories`).
- `src/server/db/` — Drizzle on `bun:sqlite`: `menus` (short id,
  `UNIQUE(photo_hash, lang)`, parse JSON), `dishes` (`UNIQUE(name_hash)`,
  original name, `image_key`, `hits`), `rate_limits`.
- `src/server/ai/parse.ts` — one `gpt-5-mini` structured-output vision call.
- `POST /api/parse-menu` — multipart photo → sharp normalize (≤ 2048, strip
  EXIF) → sha256 → row hit, or parse + insert menu + upsert dishes.
- UI: camera/upload → menu view: category sections, skeleton cards, both names,
  price, tags, spice dots, calories.

## Phase 2 — Images

- `scripts/image-bake-off.ts` first: gpt-image-2 low vs medium on 10 dishes.
- `src/server/blob.ts` — R2 via `Bun.S3Client`.
- `src/server/ai/image.ts` — gpt-image-2 → sharp → WebP.
- `POST /api/dish-image` — dish row must exist (403 gate) → return `image_key`
  or generate once → PUT R2 → UPDATE row (+ increment `hits` on reads).
- SQLite rate limits (50 photos, 100 images, 200 info /hr/IP).
- Client lazy-loading (IntersectionObserver, 4-in-flight cap, per-card retry,
  fade-in) → deferred to the UI pass; backend first.

Status: backend done. Bake-off measured low ≈ 17 s / medium ≈ 49 s per image;
low is the latency pick pending visual review. Blob layer runs on local disk
until R2 creds land in .env (config-only swap).

## Contract simplification (2026-08-17)

Current build scope: **photo in → English dish names + one image each (1:1)**.
The parse call only identifies dishes by their most common English name; the
dish identity (image cache key) is `sha256(normalize(englishName))`. Attributes
return one step at a time: `originalName` + `calories` are back (2026-08-17),
`description` via the dish-info lane (2026-08-19). Still deferred: prices,
translations/targetLang, tags, spice, romanization, currency.

## Photo-based menus (2026-08-20)

A menu is an identity plus references to photos; its dish list is derived
(photos in order → dedupe by name → join dish facts). `photos` is the parse-cache
unit (one row per photo hash, shared across menus). Scan accepts up to 20
photos per request (parsed with concurrency 4); anyone with the link can add
photos via `POST /api/menus/[id]/photos`; max 50 photos per menu. Re-scanning a
known photo creates a fresh menu referencing the cached photo — menu identity
stays private to the scanner, convergence happens via the share link.

## Recent menus (2026-08-23)

First cut of the trip food diary, entirely client-side. Every menu-screen
mount records `{menuId, title, at}` to localStorage (`cartaly:recent-menus`,
newest first, cap 10) — own scans and shared links alike. The home screen
lists the entries under the photo picker; new menus save as "Untitled" and a
pencil icon renames them in place. No server state: `/m/[id]` links are
already permanent.

## Menu search (2026-08-23)

Client-side only: a magnifier in the menu header opens a query box that
filters the loaded dish list as you type — matching English name, original
name, and description, case- and diacritic-insensitively ("pho" finds
"Phở"; folding is search-only, never the cache identity). The reveal gate
and the loading row key on the pre-search list, so a fruitless query shows
a "no dishes match" state instead of the holding screen.

## Dish detail sheet (2026-09-01)

Tapping a dish now earns its sheet: ingredients, taste, origin, and how
locals eat it, written simply enough for a five-year-old (the voice lives in
the `src/server/ai/detail.ts` prompt; drinks count too). Generated on demand
the first time anyone opens that dish — synchronously behind skeletons
(~2–4 s), single-flight so a shared table tapping the same dish can't
double-spend — then cached globally in the `details` table (PK `name_hash`,
JSON blob + `detailVersion`; bumping the version in constants regenerates
stale rows lazily; a `lang` key arrives with the language picker). Gated like
images by the `dishes` row (403 otherwise), rate-limit scope `detail`. An
unrecognized item comes back all-null and the sheet says so quietly instead
of guessing.

## Phase 3 — Menu UX

- Filters (vegetarian / vegan / gluten-free / spicy), search across both
  languages, language picker (re-parse via stored upload; images untouched).
- Currency conversion — daily FX fetch, cached; totals marked approximate.
- Order builder in localStorage: totals in both currencies + kcal;
  show-to-waiter full-screen view.
- Share page `GET /m/[id]` server-rendered from the `menus` row.

## Phase 4 — Hardening

- Content-type sniffing, 10 MB cap, OpenAI timeout + one retry, partial results
  with low-confidence flags instead of failed menus.
- Mobile polish; Litestream backup to R2; deploy notes.
- Keep docs in sync as behavior lands.

Tests throughout with `bun test`: `normalize()`, hashing/key derivation, rate
limiter, response helpers.
