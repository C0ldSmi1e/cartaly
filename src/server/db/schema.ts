import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// A menu is an identity plus references to photos; its dish list is derived.
const menus = sqliteTable("menus", {
  id: text("id").primaryKey(), // short slug used in /m/[id]
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Parse-cache unit: one row per unique photo, shared across menus.
const photos = sqliteTable("photos", {
  photoHash: text("photo_hash").primaryKey(), // sha256 of the normalized photo
  dishesJson: text("dishes_json").notNull(), // ParsedPhoto dishes as JSON
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

const menuPhotos = sqliteTable(
  "menu_photos",
  {
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id),
    photoHash: text("photo_hash")
      .notNull()
      .references(() => photos.photoHash),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.menuId, table.photoHash] })],
);

// Global dish registry: image cache index + legitimacy gate for /api/dish-image.
const dishes = sqliteTable("dishes", {
  nameHash: text("name_hash").primaryKey(), // sha256(normalize(englishName))
  name: text("name").notNull(), // English dish name
  imageKey: text("image_key"), // R2 key once generated; null = not yet
  calories: integer("calories"), // typical-serving kcal; null = not computed yet
  description: text("description"), // one-line English description; null = not computed yet
  hits: integer("hits").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// One communal order per menu; anyone with the link can edit.
const orderItems = sqliteTable(
  "order_items",
  {
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id),
    nameHash: text("name_hash")
      .notNull()
      .references(() => dishes.nameHash),
    qty: integer("qty").notNull(),
  },
  (table) => [primaryKey({ columns: [table.menuId, table.nameHash] })],
);

// Fixed-window rate limiting; key = "{scope}:{ip}".
const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at").notNull(), // epoch ms when the window resets
});

export { menus, photos, menuPhotos, dishes, orderItems, rateLimits };
