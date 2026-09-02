# Cartaly

Photograph a restaurant menu you can't read and get back one you can order from — translated dish names and an AI-generated picture of every dish. Built for the moment you're sitting in a restaurant abroad and the menu is a wall of foreign text.

Live at [cartaly.app](https://cartaly.app).

## How it works

```
photo → sha256(bytes) → cache hit? → dishes JSON (instant)
                            │ miss
                            ▼
              gpt-5-mini (vision, structured output)
              parse + translate in one call (~2–3 s)
                            │
                            ▼
              cards render (text first, image skeletons)
                            │ per dish, lazy, near viewport
                            ▼
              image cache hit? → R2 URL, else generate → R2
```

Design rules: text renders before images, nothing expensive is computed twice (deterministic cache keys everywhere), images generate lazily, and failures stay per-dish — one bad image never breaks a menu.

## Features

- **Menu scan** — snap or upload a photo; the readable menu appears in seconds
- **Dish photos** — an AI-generated impression of every dish, loading as you scroll
- **Search** — diacritic-insensitive, across both languages ("pho" finds "Phở")
- **Order builder + show-to-waiter** — tap dishes into a list, then show the original-language names in big type
- **Table share** — every scanned menu gets a link; one person scans, the whole table browses

Full feature list in [docs/features.md](docs/features.md).

## Stack

Next.js (App Router) + React on a single always-on Bun server, `bun:sqlite` via Drizzle ORM as source of truth and cache index, Cloudflare R2 for image bytes, OpenAI for parsing (`gpt-5-mini` vision) and image generation (swappable to Together via `IMAGE_MODEL`). No Redis.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
cp .env.example .env   # set OPENAI_API_KEY; R2 vars are optional in dev
bun run db:migrate
bun run dev
```

Open http://localhost:3000.

```bash
bun test        # run tests
bun run lint    # lint
```

## Deploy

Docker Compose runs the app with a persistent volume for the SQLite database, behind an external `tunnel-net` network (e.g. a Cloudflare Tunnel):

```bash
docker compose up -d --build
```

## Project layout

```
src/
  app/         routing shell only (pages, layouts, API routes)
  server/      server-only zone (AI calls, DB, actions, blob storage)
  components/  UI components
  lib/         browser-safe helpers
  schemas/     shared Zod schemas (client + server)
  config/      shared constants
docs/          spec, features, system design, implementation plan
```

All API endpoints return a standard response envelope — see `src/schemas/standard-response.ts` and `src/server/create-response.ts`.

## Docs

- [docs/SPEC.md](docs/SPEC.md) — technical spec and pipeline
- [docs/features.md](docs/features.md) — product features
- [docs/system-design-overview.md](docs/system-design-overview.md) — product overview
- [docs/implementation-plan.md](docs/implementation-plan.md) — build phases and current scope
