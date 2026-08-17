import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/src/server/db";
import { dishes } from "@/src/server/db/schema";
import { generateDishImage } from "@/src/server/ai/image";
import { putBlob, blobPublicUrl } from "@/src/server/blob";
import { dishNameHash } from "@/src/server/hash";
import { imageCacheVersion } from "@/src/config/constants";
import { assertSpendBudget, recordSpend } from "@/src/server/spend";
import { AuthorizationError } from "@/src/server/errors";

type DishImageResult = { url: string; cached: boolean };

const getDishImage = async ({
  name,
}: {
  name: string;
}): Promise<DishImageResult> => {
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

  if (dish.imageKey) {
    return { url: blobPublicUrl(dish.imageKey), cached: true };
  }

  assertSpendBudget("imageLow");
  const webp = await generateDishImage({ name: dish.name });
  recordSpend("imageLow");

  const imageKey = `${imageCacheVersion}/dish/${nameHash}.webp`;
  await putBlob(imageKey, webp, "image/webp");
  db.update(dishes).set({ imageKey }).where(eq(dishes.nameHash, nameHash)).run();

  return { url: blobPublicUrl(imageKey), cached: false };
};

export { getDishImage };
