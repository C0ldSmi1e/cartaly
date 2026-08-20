import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { pages, dishes } from "@/src/server/db/schema";
import { normalizePhoto } from "@/src/server/photo";
import { parseMenuPhoto } from "@/src/server/ai/parse";
import { sha256Hex, dishNameHash } from "@/src/server/hash";
import { assertSpendBudget, recordSpend } from "@/src/server/spend";
import type { Dish } from "@/src/schemas/menu";

type ParsedPageResult =
  | { photoHash: string; dishes: Dish[]; cached: boolean; valid: true }
  | { valid: false };

// Parse one photo through the page cache. Junk photos (not a menu) are not
// stored, so they report valid: false and never attach to a menu.
const parsePage = async (photoBytes: Uint8Array): Promise<ParsedPageResult> => {
  const normalized = await normalizePhoto(photoBytes);
  const photoHash = sha256Hex(normalized);

  const cachedRow = db
    .select()
    .from(pages)
    .where(eq(pages.photoHash, photoHash))
    .get();
  if (cachedRow) {
    return {
      photoHash,
      dishes: JSON.parse(cachedRow.dishesJson) as Dish[],
      cached: true,
      valid: true,
    };
  }

  assertSpendBudget("parse");
  const page = await parseMenuPhoto({ jpegBytes: normalized });
  recordSpend("parse");
  if (!page.isMenu || page.dishes.length === 0) {
    return { valid: false };
  }

  db.transaction((tx) => {
    tx.insert(pages)
      .values({ photoHash, dishesJson: JSON.stringify(page.dishes) })
      .onConflictDoNothing()
      .run();
    for (const dish of page.dishes) {
      tx.insert(dishes)
        .values({ nameHash: dishNameHash(dish.name), name: dish.name })
        .onConflictDoNothing()
        .run();
    }
  });

  return { photoHash, dishes: page.dishes, cached: false, valid: true };
};

const PARSE_CONCURRENCY = 4;

const parsePages = async (photos: Uint8Array[]): Promise<ParsedPageResult[]> => {
  const results: ParsedPageResult[] = new Array(photos.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARSE_CONCURRENCY, photos.length) }, async () => {
      while (next < photos.length) {
        const index = next++;
        results[index] = await parsePage(photos[index]);
      }
    }),
  );
  return results;
};

export { parsePages };
export type { ParsedPageResult };
