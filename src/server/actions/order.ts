import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/src/server/db";
import { menus, dishes, orderItems } from "@/src/server/db/schema";
import { deriveMenu } from "@/src/server/menu-view";
import { dishNameHash } from "@/src/server/hash";
import { BadRequestError, NotFoundError } from "@/src/server/errors";
import type { OrderDelta, OrderResult } from "@/src/schemas/menu";

const MAX_QTY = 99;

const assertMenuExists = (menuId: string) => {
  if (!db.select().from(menus).where(eq(menus.id, menuId)).get()) {
    throw new NotFoundError("Menu not found");
  }
};

const getOrder = (menuId: string): OrderResult => {
  assertMenuExists(menuId);
  const rows = db
    .select({ name: dishes.name, qty: orderItems.qty })
    .from(orderItems)
    .innerJoin(dishes, eq(orderItems.nameHash, dishes.nameHash))
    .where(eq(orderItems.menuId, menuId))
    .all();
  return { items: rows };
};

const bumpOrder = ({
  menuId,
  name,
  delta,
}: {
  menuId: string;
  name: string;
  delta: OrderDelta;
}): OrderResult => {
  const menu = deriveMenu(menuId);
  if (!menu) {
    throw new NotFoundError("Menu not found");
  }
  const nameHash = dishNameHash(name);
  const onMenu = menu.dishes.some((dish) => dishNameHash(dish.name) === nameHash);
  if (!onMenu) {
    throw new BadRequestError("That dish isn't on this menu");
  }

  db.transaction((tx) => {
    const row = tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.menuId, menuId), eq(orderItems.nameHash, nameHash)))
      .get();
    const qty =
      delta === "clear"
        ? 0
        : Math.max(0, Math.min(MAX_QTY, (row?.qty ?? 0) + delta));
    if (qty === 0) {
      tx.delete(orderItems)
        .where(and(eq(orderItems.menuId, menuId), eq(orderItems.nameHash, nameHash)))
        .run();
    } else {
      tx.insert(orderItems)
        .values({ menuId, nameHash, qty })
        .onConflictDoUpdate({
          target: [orderItems.menuId, orderItems.nameHash],
          set: { qty },
        })
        .run();
    }
  });

  return getOrder(menuId);
};

export { getOrder, bumpOrder };
