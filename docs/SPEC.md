# Cartaly — spec

Photograph a restaurant menu → translated dish names, prices, and a generated photo of every dish. Lives at cartaly.app.

> **Current build scope (2026-08-17):** simplified contract — photo in →
> English dish name + one image per dish (1:1). Dish identity =
> `sha256(normalize(englishName))`. Everything else below (prices, targetLang,
> tags, calories, romanization…) is deferred; see
> [implementation-plan.md](./implementation-plan.md).

Design rules:

1. Text renders before images (~2–3 s). Images stream in after.
2. Nothing expensive is computed twice. Deterministic cache keys for everything.
3. Images generate lazily, only near the viewport.
4. Failures stay per-dish. One bad image never breaks a menu.

## Pipeline

```
 photo ──▶ sha256(bytes) ──▶ menus row? ──hit──▶ dishes JSON (instant)
                                  │miss
                                  ▼
                     gpt-5-mini (vision, structured output)
                     parse + translate in one call
                                  │
                                  ▼
                     cards render (text + skeletons)
                                  │  per dish, lazy
                                  ▼
                     dish row image? ──hit──▶ R2 URL
                                  │miss
                                  ▼
                     gpt-image-2 ──▶ R2 + row ──▶ card fades in
```

Infra: Next.js on one always-on Bun server + OpenAI API + `bun:sqlite` (source of
truth + cache index) + Cloudflare R2 (image bytes; zero-egress CDN). No Redis.

## Parsing

One `gpt-5-mini` vision call with structured outputs. Parse and translate in the same request; the schema makes malformed JSON impossible. `gpt-5` behind a flag for dense or handwritten menus.

```ts
// lib/schema.ts
import { z } from "zod";

export const Dish = z.object({
  originalName: z.string(),        // exactly as printed
  translatedName: z.string(),
  description: z.string(),         // translated; model writes one if menu has none
  price: z.string().nullable(),    // as printed: "€14.50", "฿120"
  category: z.enum(["appetizer", "main", "side", "dessert", "drink", "other"]),
  tags: z.array(z.enum(["vegetarian", "vegan", "gluten-free", "spicy", "contains-nuts",
                        "contains-shellfish", "contains-dairy", "raw"])),
  spiceLevel: z.number().min(0).max(3),
  calories: z.number().nullable(),     // typical-serving estimate
  romanization: z.string().nullable(), // for non-Latin scripts
  confidence: z.enum(["high", "low"]),
});

export const ParsedMenu = z.object({
  isMenu: z.boolean(),
  detectedLanguage: z.string(),        // BCP-47
  detectedCurrency: z.string().nullable(), // ISO 4217
  restaurantName: z.string().nullable(),
  dishes: z.array(Dish),
});
```

- `originalName` drives the image cache key and show-to-waiter mode.
- Names are transliterated + glossed ("Tom Yum Goong — spicy shrimp soup"), not replaced.
- `tags` / `category` / `spiceLevel` cost nothing extra and power the filters.
- `calories`: estimate for a typical preparation. Display fuzzy ("~350"), never
  exact; sum in the order builder. Hideable in settings.
- `isMenu` rejects non-menu photos before any image spend. Cap: 60 dishes.

## Images

`gpt-image-2`, `quality: "low"`, 1024² → WebP (~$0.006/image). Test `medium` on ~10
dishes once to confirm `low` is good enough for food. (Not `gpt-image-1`/`-mini`:
that family leaves the API 2026-12-01.) Single vendor: all AI calls go to OpenAI,
behind `src/server/ai/` so a model swap is one file + a cache-version bump.

## Storage & cache

`bun:sqlite` (via Drizzle) is the source of truth and the cache index; R2 holds
image bytes only. Dedup is a unique index, a hit is a local row read (~ms). No
invalidation logic, no eviction.

| Layer | Dedup key | Shared across |
|---|---|---|
| Parse | `menus` `UNIQUE(photo_hash, lang)` — row stores parse JSON + short id | Re-uploads of the same photo |
| Image | `dishes` `UNIQUE(name_hash)` where `name_hash = sha256(normalize(originalName))`; row points to R2 `v1/dish/{name_hash}.webp` | All users, languages, menus |
| Detail | `details` `UNIQUE(name_hash, lang)` | Same |

- Images key on the original name: a Thai menu viewed in English, French, and Japanese = three parse rows, one image set. Each dish is generated once, globally.
- `normalize()`: Unicode NFC → trim → collapse whitespace → lowercase (Latin scripts only) → strip trailing punctuation. Never strip diacritics or fold non-Latin scripts.
- `v1/` prefix on R2 keys is the image-prompt version. Bump it when the prompt changes.
- `dishes.hits` counter increments per read — free popularity data for later.
- WebP ≈ 60 KB; a million dishes ≈ 60 GB ≈ ~$1/mo on R2, egress $0.
- Backups: Litestream replicates the SQLite file to R2.

## API

```
POST /api/parse-menu   multipart photo + targetLang → { menuId, menu, cached }
POST /api/dish-image   { originalName }             → { url }
GET  /m/[menuId]                                    → server-rendered share page
```

- Client POSTs the photo directly to the server (client-side downscale first to
  save roaming data; server re-normalizes canonically before hashing). No
  presigned uploads — the server needs the bytes anyway to hash and parse.
- `parse-menu` returns all dishes; cards render immediately with skeletons. It
  also upserts every dish into the global `dishes` table.
- Each card requests its image when within ~600 px of the viewport
  (`IntersectionObserver`). Client caps in-flight generations at 4.
- `dish-image` only generates for names already present in `dishes` (403
  otherwise) — the row's existence proves it came from a real parse, so no HMAC.
- `menuId` is the short slug from the `menus` row.
- Image failure = retry button on that card only.

## Translation

- Language picker, default = browser locale. Switching re-parses (usually cached); images never regenerate.
- Cards show translated name large, original name small beneath it.
- Show-to-waiter: full-screen original names in large type, from a dish or the order list.
- Currency: `detectedCurrency` + daily-cached FX rate → "฿120 (~$3.40)", marked approximate.
- Pronunciation: `romanization` from the schema + browser `speechSynthesis`. No API cost.

## Features

**MVP** — core flow; filter chips (vegetarian / vegan / gluten-free / spicy) + spice dots; category sections; search across both languages; order builder with running total in both currencies + show-to-waiter; share pages at `/m/[menuId]`; rate limits (5 parses/hr/IP, 80 images/hr/IP).

**Next** — dish detail sheet (ingredients, origin, taste; generated on demand, cached per language); multi-photo menus (parse pages in parallel, merge, key on sorted hash list); allergen warnings (prefs in localStorage, badge on matches, disclaimer that tags are AI-inferred, plus an "I'm allergic to X" phrase in the menu's language); PWA with last N menus available offline.

**Later** — "what should I order" (one model call over parsed JSON, 3 picks with reasons); popularity badges from image-cache hit counts; drink pairings; restaurant mode (upload once, permanent QR-linked menu page).

## Stack

Next.js App Router + TypeScript (Bun runtime) · Tailwind + shadcn/ui · OpenAI SDK
(structured outputs; verify Zod 4 compat at install) · `bun:sqlite` + Drizzle ·
Cloudflare R2 via `Bun.S3Client` (built in, zero deps) · sharp · Zod · Plausible
(optional; track cache hit-rate).

Deployment shape: one always-on Bun server with a disk (`output: "standalone"`).
Host TBD. Rate limits live in SQLite — no Redis.

```
OPENAI_API_KEY=
DATABASE_PATH=
S3_ENDPOINT=            # R2
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

## Cost & latency (approx)

| Operation | Cold | Warm | Cold cost |
|---|---|---|---|
| Parse (30 dishes) | 2–5 s | ~100 ms | $0.003–0.01 |
| One image | 5–15 s | ~100 ms | $0.01–0.02 |
| Full menu, first user | text ~3 s, images ~15 s | — | $0.15–0.40 |
| Full menu, cached | instant | — | ~$0 |

Cache hit-rate is the cost metric that matters.

## Hardening

- Sniff content-type, reject > 10 MB, downscale to ≤ 2048 px before hashing (re-encodes of the same photo still hit cache).
- Strip EXIF; keep the normalized photo in R2 (`uploads/{hash}`) for 30 days so
  language switches can re-parse server-side. Derived data lives forever.
- `dish-image` gated by the `dishes` row (403 otherwise); 60-dish cap;
  rate limits in SQLite (50 photos, 100
  images /hr/IP).
- Timeout + one retry on OpenAI calls. Return partial results with `confidence: "low"` flags instead of failing the menu.

## Build order

See [implementation-plan.md](./implementation-plan.md) for the phased plan.

1. DB + zod schemas, `parse-menu`, photo upload, cards with skeletons.
2. Image tier bake-off, `dish-image`, R2, lazy loading, rate limits.
3. Language picker, filters, currency, order builder, share pages.
4. Hardening; then "Next" list by appetite.