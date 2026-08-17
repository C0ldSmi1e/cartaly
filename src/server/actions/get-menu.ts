import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus } from "@/src/server/db/schema";
import { NotFoundError } from "@/src/server/errors";
import type { ParsedMenu } from "@/src/schemas/menu";

type MenuRecord = { menuId: string; menu: ParsedMenu };

const getMenu = ({ menuId }: { menuId: string }): MenuRecord => {
  const row = db.select().from(menus).where(eq(menus.id, menuId)).get();
  if (!row) {
    throw new NotFoundError("Menu not found");
  }
  return { menuId: row.id, menu: JSON.parse(row.menuJson) as ParsedMenu };
};

export { getMenu };
