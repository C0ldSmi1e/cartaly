import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus, dishes } from "@/src/server/db/schema";
import { normalizePhoto } from "@/src/server/photo";
import { parseMenuPhoto } from "@/src/server/ai/parse";
import { sha256Hex, dishNameHash, shortId } from "@/src/server/hash";
import { assertSpendBudget, recordSpend } from "@/src/server/spend";
import { BadRequestError, isUniqueViolation } from "@/src/server/errors";
import type { ParsedMenu, ParseMenuResult } from "@/src/schemas/menu";

const findCached = (photoHash: string, lang: string): ParseMenuResult | null => {
  const row = db
    .select()
    .from(menus)
    .where(and(eq(menus.photoHash, photoHash), eq(menus.lang, lang)))
    .get();
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
  targetLang,
}: {
  photoBytes: Uint8Array;
  targetLang: string;
}): Promise<ParseMenuResult> => {
  const normalized = await normalizePhoto(photoBytes);
  const photoHash = sha256Hex(normalized);
  const lang = targetLang.toLowerCase();

  const cached = findCached(photoHash, lang);
  if (cached) {
    return cached;
  }

  assertSpendBudget("parse");
  const menu = await parseMenuPhoto({ jpegBytes: normalized, targetLang });
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
        .values({
          id: menuId,
          photoHash,
          lang,
          restaurantName: menu.restaurantName,
          detectedLanguage: menu.detectedLanguage,
          detectedCurrency: menu.detectedCurrency,
          menuJson: JSON.stringify(menu),
        })
        .run();
      for (const dish of menu.dishes) {
        tx.insert(dishes)
          .values({
            nameHash: dishNameHash(dish.originalName),
            originalName: dish.originalName,
          })
          .onConflictDoNothing()
          .run();
      }
    });
  } catch (error) {
    // Concurrent first-scan race: loser of UNIQUE(photo_hash, lang) serves the winner's row.
    if (isUniqueViolation(error)) {
      const raced = findCached(photoHash, lang);
      if (raced) {
        return raced;
      }
    }
    throw error;
  }

  return { menuId, menu, cached: false };
};

export { parseMenu };
