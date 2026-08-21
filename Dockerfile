# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# build-time placeholder only; real values come from compose env_file
ENV NODE_ENV=production \
    OPENAI_API_KEY="build-time-placeholder"
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public
# migrations run on boot (src/server/db); the SQL files must sit at cwd
COPY --chown=bun:bun drizzle ./drizzle
RUN mkdir -p data && chown bun:bun data
USER bun
EXPOSE 3000
CMD ["bun", "server.js"]
