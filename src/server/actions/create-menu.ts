import "server-only";
import { db } from "@/src/server/db";
import { menus, menuPages } from "@/src/server/db/schema";
import { parsePages } from "@/src/server/actions/parse-page";
import { deriveMenu } from "@/src/server/menu-view";
import { shortId } from "@/src/server/hash";
import { BadRequestError } from "@/src/server/errors";
import type { ParseMenuResult } from "@/src/schemas/menu";

const createMenu = async ({
  photos,
}: {
  photos: Uint8Array[];
}): Promise<ParseMenuResult> => {
  const results = await parsePages(photos);
  const valid = results.filter((result) => result.valid);
  if (valid.length === 0) {
    throw new BadRequestError(
      "Those photos don't look like a menu — try clearer shots of the menu pages",
    );
  }

  const uniquePages = [
    ...new Map(valid.map((result) => [result.photoHash, result])).values(),
  ];
  const menuId = shortId();
  db.transaction((tx) => {
    tx.insert(menus).values({ id: menuId }).run();
    uniquePages.forEach((page, index) => {
      tx.insert(menuPages)
        .values({ menuId, photoHash: page.photoHash, position: index })
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
