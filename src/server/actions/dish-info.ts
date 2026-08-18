import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/server/db";
import { dishes } from "@/src/server/db/schema";
import { estimateCalories } from "@/src/server/ai/info";
import { dishNameHash } from "@/src/server/hash";
import { normalizeDishName } from "@/src/lib/normalize";
import { assertSpendBudget, recordSpend } from "@/src/server/spend";
import { AuthorizationError } from "@/src/server/errors";
import type { DishInfoResult } from "@/src/schemas/menu";

const getDishInfo = async ({
  names,
}: {
  names: string[];
}): Promise<DishInfoResult> => {
  const hashes = [...new Set(names.map(dishNameHash))];
  const rows = db
    .select()
    .from(dishes)
    .where(inArray(dishes.nameHash, hashes))
    .all();
  // Row existence proves the names came from a real parsed menu.
  if (rows.length === 0) {
    throw new AuthorizationError("Unknown dishes — scan a menu first");
  }

  const uncached = rows.filter((row) => row.calories === null);
  if (uncached.length > 0) {
    assertSpendBudget("info");
    const estimates = await estimateCalories(uncached.map((row) => row.name));
    recordSpend("info");
    for (const row of uncached) {
      const calories = estimates.get(normalizeDishName(row.name)) ?? null;
      if (calories !== null) {
        db.update(dishes)
          .set({ calories })
          .where(eq(dishes.nameHash, row.nameHash))
          .run();
        row.calories = calories;
      }
    }
  }

  return { dishes: rows.map((row) => ({ name: row.name, calories: row.calories })) };
};

export { getDishInfo };
