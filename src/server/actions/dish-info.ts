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

// Gated cache read only — never calls the model. Names still missing facts
// come back in `pending`; the route schedules enrichPending for them.
const getDishInfo = ({ names }: { names: string[] }): DishInfoResult => {
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

  return {
    dishes: rows.map((row) => ({
      name: row.name,
      calories: row.calories,
      description: row.description,
    })),
    pending: rows
      .filter((row) => row.calories === null || row.description === null)
      .map((row) => row.name),
  };
};

// Names currently being enriched, so overlapping polls can't double-spend.
const inFlight = new Set<string>();

const enrichPending = async (names: string[]): Promise<void> => {
  const targets = names.filter((name) => {
    const key = dishNameHash(name);
    if (inFlight.has(key)) {
      return false;
    }
    inFlight.add(key);
    return true;
  });
  if (targets.length === 0) {
    return;
  }

  try {
    assertSpendBudget("info");
    const facts = await enrichDishes(targets);
    recordSpend("info");

    const rows = db
      .select()
      .from(dishes)
      .where(inArray(dishes.nameHash, targets.map(dishNameHash)))
      .all();
    for (const row of rows) {
      const fact = facts.get(normalizeDishName(row.name));
      if (!fact) {
        continue;
      }
      // Fill blanks only — never overwrite a previously computed value.
      const updates: { calories?: number; description?: string } = {};
      if (row.calories === null && fact.calories !== null) {
        updates.calories = fact.calories;
      }
      if (row.description === null && fact.description !== null) {
        updates.description = fact.description;
      }
      if (Object.keys(updates).length > 0) {
        db.update(dishes)
          .set(updates)
          .where(eq(dishes.nameHash, row.nameHash))
          .run();
      }
    }
  } catch (error) {
    // Enrichment is decoration — log and leave facts null for a later retry.
    console.error("dish-info enrichment failed:", error);
  } finally {
    for (const name of targets) {
      inFlight.delete(dishNameHash(name));
    }
  }
};

export { getDishInfo, enrichPending };
