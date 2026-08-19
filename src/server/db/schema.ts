import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// Parse cache + share-page source: one row per photo.
const menus = sqliteTable(
  "menus",
  {
    id: text("id").primaryKey(), // short slug used in /m/[id]
    photoHash: text("photo_hash").notNull(), // sha256 of the normalized photo
    menuJson: text("menu_json").notNull(), // ParsedMenu as JSON
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("menus_photo_hash").on(table.photoHash)],
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

// Fixed-window rate limiting; key = "{scope}:{ip}".
const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at").notNull(), // epoch ms when the window resets
});

export { menus, dishes, rateLimits };
