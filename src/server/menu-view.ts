import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus, pages, menuPages, dishes } from "@/src/server/db/schema";
import { blobPublicUrl } from "@/src/server/blob";
import { dishNameHash } from "@/src/server/hash";
import type { Dish, MenuView } from "@/src/schemas/menu";

// A menu's dish list is derived: pages in order → dishes deduped by name
// (first occurrence wins) → joined with the global dishes facts.
const deriveMenu = (menuId: string): MenuView | null => {
  const menuRow = db.select().from(menus).where(eq(menus.id, menuId)).get();
  if (!menuRow) {
    return null;
  }

  const pageRows = db
    .select({ dishesJson: pages.dishesJson })
    .from(menuPages)
    .innerJoin(pages, eq(menuPages.photoHash, pages.photoHash))
    .where(eq(menuPages.menuId, menuId))
    .orderBy(menuPages.position)
    .all();

  const seen = new Set<string>();
  const flat: { dish: Dish; nameHash: string }[] = [];
  for (const row of pageRows) {
    for (const dish of JSON.parse(row.dishesJson) as Dish[]) {
      const nameHash = dishNameHash(dish.name);
      if (!seen.has(nameHash)) {
        seen.add(nameHash);
        flat.push({ dish, nameHash });
      }
    }
  }

  const factRows =
    flat.length > 0
      ? db
          .select()
          .from(dishes)
          .where(
            inArray(
              dishes.nameHash,
              flat.map((entry) => entry.nameHash),
            ),
          )
          .all()
      : [];
  const facts = new Map(factRows.map((row) => [row.nameHash, row]));

  return {
    pageCount: pageRows.length,
    dishes: flat.map(({ dish, nameHash }) => {
      const fact = facts.get(nameHash);
      return {
        name: dish.name,
        originalName: dish.originalName,
        calories: fact?.calories ?? null,
        description: fact?.description ?? null,
        imageUrl: fact?.imageKey ? blobPublicUrl(fact.imageKey) : null,
      };
    }),
  };
};

export { deriveMenu };
