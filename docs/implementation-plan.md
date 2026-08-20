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
- SQLite rate limits (5 parses, 80 images /hr/IP) + daily-spend kill switch.
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

## Page-based menus (2026-08-20)

A menu is an identity plus references to pages; its dish list is derived
(pages in order → dedupe by name → join dish facts). `pages` is the parse-cache
unit (one row per photo hash, shared across menus). Scan accepts up to 10
photos per request (parsed with concurrency 4); anyone with the link can add
pages via `POST /api/menus/[id]/pages`; max 50 pages per menu. Re-scanning a
known photo creates a fresh menu referencing the cached page — menu identity
stays private to the scanner, convergence happens via the share link.

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
