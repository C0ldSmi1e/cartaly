import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus, menuPages } from "@/src/server/db/schema";
import { parsePages } from "@/src/server/actions/parse-page";
import { deriveMenu } from "@/src/server/menu-view";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError, NotFoundError } from "@/src/server/errors";
import type { ParseMenuResult } from "@/src/schemas/menu";

// Anyone holding the menu link can contribute pages — that's the share model.
const addPages = async ({
  menuId,
  photos,
}: {
  menuId: string;
  photos: Uint8Array[];
}): Promise<ParseMenuResult> => {
  const menuRow = db.select().from(menus).where(eq(menus.id, menuId)).get();
  if (!menuRow) {
    throw new NotFoundError("Menu not found");
  }

  const existing = db
    .select()
    .from(menuPages)
    .where(eq(menuPages.menuId, menuId))
    .all();
  if (existing.length + photos.length > menuLimits.maxPagesPerMenu) {
    throw new BadRequestError(
      `A menu can have at most ${menuLimits.maxPagesPerMenu} pages`,
    );
  }

  const results = await parsePages(photos);
  const valid = results.filter((result) => result.valid);
  const attached = new Set(existing.map((row) => row.photoHash));
  const fresh = [
    ...new Map(valid.map((result) => [result.photoHash, result])).values(),
  ].filter((page) => !attached.has(page.photoHash));

  if (valid.length === 0) {
    throw new BadRequestError(
      "Those photos don't look like menu pages — try clearer shots",
    );
  }

  if (fresh.length > 0) {
    const nextPosition =
      existing.reduce((max, row) => Math.max(max, row.position), -1) + 1;
    db.transaction((tx) => {
      fresh.forEach((page, index) => {
        tx.insert(menuPages)
          .values({
            menuId,
            photoHash: page.photoHash,
            position: nextPosition + index,
          })
          .onConflictDoNothing()
          .run();
      });
    });
  }

  return {
    menuId,
    menu: deriveMenu(menuId)!,
    cached: valid.every((result) => result.cached),
  };
};

export { addPages };
