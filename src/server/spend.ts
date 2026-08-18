import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/src/server/db";
import { rateLimits } from "@/src/server/db/schema";
import { env } from "@/src/server/env";
import { RateLimitError } from "@/src/server/errors";

// Rough per-call costs in cents; the kill switch is a fuse, not accounting.
const COST_CENTS = { parse: 1, imageLow: 1, imageMedium: 6, info: 1 } as const;

const spendKey = () => `spend:${new Date().toISOString().slice(0, 10)}`;

const secondsToUtcMidnight = () => {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.ceil((midnight - now.getTime()) / 1000);
};

const assertSpendBudget = (kind: keyof typeof COST_CENTS) => {
  if (!env.DAILY_SPEND_LIMIT_USD) {
    return;
  }
  const row = db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, spendKey()))
    .get();
  const spentCents = row?.count ?? 0;
  if (spentCents + COST_CENTS[kind] > env.DAILY_SPEND_LIMIT_USD * 100) {
    throw new RateLimitError(secondsToUtcMidnight());
  }
};

const recordSpend = (kind: keyof typeof COST_CENTS) => {
  const key = spendKey();
  db.insert(rateLimits)
    .values({ key, count: COST_CENTS[kind], resetAt: 0 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: sql`${rateLimits.count} + ${COST_CENTS[kind]}` },
    })
    .run();
};

export { assertSpendBudget, recordSpend };
