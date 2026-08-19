import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/server/db";
import { dishes } from "@/src/server/db/schema";
import { enrichDishes } from "@/src/server/ai/info";
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

  const uncached = rows.filter(
    (row) => row.calories === null || row.description === null,
  );
  if (uncached.length > 0) {
    assertSpendBudget("info");
    const facts = await enrichDishes(uncached.map((row) => row.name));
    recordSpend("info");
    for (const row of uncached) {
      const fact = facts.get(normalizeDishName(row.name));
      if (!fact) {
        continue;
      }
      // Fill blanks only — never overwrite a previously computed value.
      const updates: { calories?: number; description?: string } = {};
      if (row.calories === null && fact.calories !== null) {
        updates.calories = fact.calories;
        row.calories = fact.calories;
      }
      if (row.description === null && fact.description !== null) {
        updates.description = fact.description;
        row.description = fact.description;
      }
      if (Object.keys(updates).length > 0) {
        db.update(dishes)
          .set(updates)
          .where(eq(dishes.nameHash, row.nameHash))
          .run();
      }
    }
  }

  return {
    dishes: rows.map((row) => ({
      name: row.name,
      calories: row.calories,
      description: row.description,
    })),
  };
};

export { getDishInfo };
