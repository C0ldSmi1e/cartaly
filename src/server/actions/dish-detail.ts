import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/src/server/db";
import { dishes, details } from "@/src/server/db/schema";
import { generateDishDetail } from "@/src/server/ai/detail";
import { parseStoredDetail, isEmptyDishDetail } from "@/src/server/detail-content";
import { dishNameHash } from "@/src/server/hash";
import { detailVersion } from "@/src/config/constants";
import { AuthorizationError } from "@/src/server/errors";
import type { DishDetail, DishDetailResult } from "@/src/schemas/menu";

// One generation per dish at a time; concurrent readers (a shared table
// tapping the same dish) await the same promise instead of double-spending.
const inFlight = new Map<string, Promise<DishDetail>>();

const getDishDetail = async ({
  name,
}: {
  name: string;
}): Promise<DishDetailResult> => {
  const nameHash = dishNameHash(name);
  const dish = db.select().from(dishes).where(eq(dishes.nameHash, nameHash)).get();
  // Row existence proves the name came from a real parsed menu.
  if (!dish) {
    throw new AuthorizationError("Unknown dish — scan a menu first");
  }

  db.update(dishes)
    .set({ hits: sql`${dishes.hits} + 1` })
    .where(eq(dishes.nameHash, nameHash))
    .run();

  const row = db.select().from(details).where(eq(details.nameHash, nameHash)).get();
  if (row && row.version === detailVersion) {
    const stored = parseStoredDetail(row.detailJson);
    if (stored) {
      return { name: dish.name, detail: stored, cached: true };
    }
    // Unparseable row: fall through and regenerate over it.
  }

  let pending = inFlight.get(nameHash);
  if (!pending) {
    pending = (async () => {
      try {
        const generated = await generateDishDetail({ name: dish.name });
        // An all-empty detail (nothing recognized) is served but never cached,
        // so the next open retries instead of pinning the blank forever.
        if (!isEmptyDishDetail(generated)) {
          // Upsert (not ignore) so a version bump overwrites the stale row.
          db.insert(details)
            .values({
              nameHash,
              detailJson: JSON.stringify(generated),
              version: detailVersion,
            })
            .onConflictDoUpdate({
              target: details.nameHash,
              set: {
                detailJson: JSON.stringify(generated),
                version: detailVersion,
              },
            })
            .run();
        }
        return generated;
      } finally {
        inFlight.delete(nameHash);
      }
    })();
    inFlight.set(nameHash, pending);
  }
  const detail = await pending;

  return { name: dish.name, detail, cached: false };
};

export { getDishDetail };
