import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus, dishes } from "@/src/server/db/schema";
import { normalizePhoto } from "@/src/server/photo";
import { parseMenuPhoto } from "@/src/server/ai/parse";
import { sha256Hex, dishNameHash, shortId } from "@/src/server/hash";
import { assertSpendBudget, recordSpend } from "@/src/server/spend";
import { BadRequestError, isUniqueViolation } from "@/src/server/errors";
import type { ParsedMenu, ParseMenuResult } from "@/src/schemas/menu";

const findCached = (photoHash: string): ParseMenuResult | null => {
  const row = db.select().from(menus).where(eq(menus.photoHash, photoHash)).get();
  if (!row) {
    return null;
  }
  return {
    menuId: row.id,
    menu: JSON.parse(row.menuJson) as ParsedMenu,
    cached: true,
  };
};

const parseMenu = async ({
  photoBytes,
}: {
  photoBytes: Uint8Array;
}): Promise<ParseMenuResult> => {
  const normalized = await normalizePhoto(photoBytes);
  const photoHash = sha256Hex(normalized);

  const cached = findCached(photoHash);
  if (cached) {
    return cached;
  }

  assertSpendBudget("parse");
  const menu = await parseMenuPhoto({ jpegBytes: normalized });
  recordSpend("parse");
  if (!menu.isMenu || menu.dishes.length === 0) {
    throw new BadRequestError(
      "That photo doesn't look like a menu — try a clearer shot of the menu page",
    );
  }

  const menuId = shortId();
  try {
    db.transaction((tx) => {
      tx.insert(menus)
        .values({ id: menuId, photoHash, menuJson: JSON.stringify(menu) })
        .run();
      for (const dish of menu.dishes) {
        tx.insert(dishes)
          .values({ nameHash: dishNameHash(dish.name), name: dish.name })
          .onConflictDoNothing()
          .run();
      }
    });
  } catch (error) {
    // Concurrent first-scan race: loser of UNIQUE(photo_hash) serves the winner's row.
    if (isUniqueViolation(error)) {
      const raced = findCached(photoHash);
      if (raced) {
        return raced;
      }
    }
    throw error;
  }

  return { menuId, menu, cached: false };
};

export { parseMenu };
