import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { photos, dishes } from "@/src/server/db/schema";
import { normalizePhoto } from "@/src/server/photo";
import { parseMenuPhoto } from "@/src/server/ai/parse";
import { sha256Hex, dishNameHash } from "@/src/server/hash";
import type { Dish } from "@/src/schemas/menu";

type ParsedPhotoResult =
  | { photoHash: string; dishes: Dish[]; cached: boolean; valid: true }
  | { valid: false };

// Parse one photo through the page cache. Junk photos (not a menu) are not
// stored, so they report valid: false and never attach to a menu.
const parsePhoto = async (photoBytes: Uint8Array): Promise<ParsedPhotoResult> => {
  const normalized = await normalizePhoto(photoBytes);
  const photoHash = sha256Hex(normalized);

  const cachedRow = db
    .select()
    .from(photos)
    .where(eq(photos.photoHash, photoHash))
    .get();
  if (cachedRow) {
    return {
      photoHash,
      dishes: JSON.parse(cachedRow.dishesJson) as Dish[],
      cached: true,
      valid: true,
    };
  }

  const page = await parseMenuPhoto({ jpegBytes: normalized });
  if (!page.isMenu || page.dishes.length === 0) {
    return { valid: false };
  }

  db.transaction((tx) => {
    tx.insert(photos)
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

const parsePhotos = async (photos: Uint8Array[]): Promise<ParsedPhotoResult[]> => {
  const results: ParsedPhotoResult[] = new Array(photos.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(PARSE_CONCURRENCY, photos.length) }, async () => {
      while (next < photos.length) {
        const index = next++;
        results[index] = await parsePhoto(photos[index]);
      }
    }),
  );
  return results;
};

export { parsePhotos };
export type { ParsedPhotoResult };
