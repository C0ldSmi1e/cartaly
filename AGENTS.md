# Guidelines for Coding Agents

## Default to using Bun instead of Node.js

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx` instead of `npx`

## Refer to docs to understand the codebase

- Read docs to have better understanding
- You can ask users questions to clarify things
- If you update the code, you should also update the docs correspondingly if you need

## Use custom standard response format in API endpoints

- All the API endpoints will return custom standard response (unless errors in network)
- Use `@/src/server/create-response` to construct return object
- Refer to `@/src/schemas/standard-response` to understand the response format
- Refer to `@/src/app/api/route.ts` to see how an API endpoint work in this system
- By default, `GET` methods return all the entities from database (with hard cap set in `@/src/config/constants.ts`). With pagination parameters, they will follow the paginated configuration.

## Code organization

- `src/server/` — server-only zone. Key modules import `"server-only"`, so client bundles that touch them fail the build.
- `src/components/` — UI components.
- `src/lib/` — browser-safe helpers.
- `src/schemas/` and `src/config/` — shared between both sides; must never read `process.env` or import from `src/server/`.
- `src/app/` — routing shell only (pages, layouts, API routes).

## Use aboslute path instead of relative path in import

- For example: `import { foo } from "@/src/xyz/abc"`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
