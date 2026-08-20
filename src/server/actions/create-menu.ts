import "server-only";
import { db } from "@/src/server/db";
import { menus, menuPhotos } from "@/src/server/db/schema";
import { parsePhotos } from "@/src/server/actions/parse-photo";
import { deriveMenu } from "@/src/server/menu-view";
import { shortId } from "@/src/server/hash";
import { BadRequestError } from "@/src/server/errors";
import type { ParseMenuResult } from "@/src/schemas/menu";

const createMenu = async ({
  photos,
}: {
  photos: Uint8Array[];
}): Promise<ParseMenuResult> => {
  const results = await parsePhotos(photos);
  const valid = results.filter((result) => result.valid);
  if (valid.length === 0) {
    throw new BadRequestError(
      "Those photos don't look like a menu — try clearer photos of the menu",
    );
  }

  const uniquePhotos = [
    ...new Map(valid.map((result) => [result.photoHash, result])).values(),
  ];
  const menuId = shortId();
  db.transaction((tx) => {
    tx.insert(menus).values({ id: menuId }).run();
    uniquePhotos.forEach((photo, index) => {
      tx.insert(menuPhotos)
        .values({ menuId, photoHash: photo.photoHash, position: index })
        .run();
    });
  });

  return {
    menuId,
    menu: deriveMenu(menuId)!,
    cached: valid.every((result) => result.cached),
  };
};

export { createMenu };
