import "server-only";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/src/server/db";
import { rateLimits } from "@/src/server/db/schema";
import { applyWindow } from "@/src/server/rate-window";
import { env } from "@/src/server/env";
import { RateLimitError } from "@/src/server/errors";

const HOUR_MS = 60 * 60 * 1000;

// Behind cloudflared the real client IP is CF-Connecting-IP.
const getClientIp = (request: NextRequest): string =>
  request.headers.get("cf-connecting-ip") ||
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "local";

const enforceRateLimit = ({
  scope,
  ip,
  limit,
  cost = 1,
  windowMs = HOUR_MS,
}: {
  scope: string;
  ip: string;
  limit: number;
  cost?: number;
  windowMs?: number;
}) => {
  if (env.RATE_LIMIT === "off") {
    return;
  }
  const key = `${scope}:${ip}`;
  db.transaction((tx) => {
    const row = tx.select().from(rateLimits).where(eq(rateLimits.key, key)).get();
    const decision = applyWindow(row ?? null, Date.now(), limit, windowMs, cost);
    if (!decision.allowed) {
      throw new RateLimitError(decision.retryAfterSec);
    }
    tx.insert(rateLimits)
      .values({ key, count: decision.next.count, resetAt: decision.next.resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: decision.next.count, resetAt: decision.next.resetAt },
      })
      .run();
  });
};

export { enforceRateLimit, getClientIp };
