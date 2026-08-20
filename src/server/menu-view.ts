import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/src/server/db";
import { dishes } from "@/src/server/db/schema";
import { blobPublicUrl } from "@/src/server/blob";
import { dishNameHash } from "@/src/server/hash";
import type { MenuView, ParsedMenu } from "@/src/schemas/menu";

// Joins a stored/parsed menu with the global dishes table so responses carry
// every fact already known — no AI, one local read.
const toMenuView = (parsed: ParsedMenu): MenuView => {
  const hashes = parsed.dishes.map((dish) => dishNameHash(dish.name));
  const rows =
    hashes.length > 0
      ? db.select().from(dishes).where(inArray(dishes.nameHash, hashes)).all()
      : [];
  const byHash = new Map(rows.map((row) => [row.nameHash, row]));

  return {
    isMenu: parsed.isMenu,
    dishes: parsed.dishes.map((dish, index) => {
      const row = byHash.get(hashes[index]);
      return {
        name: dish.name,
        originalName: dish.originalName,
        calories: row?.calories ?? null,
        description: row?.description ?? null,
        imageUrl: row?.imageKey ? blobPublicUrl(row.imageKey) : null,
      };
    }),
  };
};

export { toMenuView };
