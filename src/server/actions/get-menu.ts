import "server-only";
import { deriveMenu } from "@/src/server/menu-view";
import { NotFoundError } from "@/src/server/errors";
import type { MenuView } from "@/src/schemas/menu";

type MenuRecord = { menuId: string; menu: MenuView };

const getMenu = ({ menuId }: { menuId: string }): MenuRecord => {
  const menu = deriveMenu(menuId);
  if (!menu) {
    throw new NotFoundError("Menu not found");
  }
  return { menuId, menu };
};

export { getMenu };
