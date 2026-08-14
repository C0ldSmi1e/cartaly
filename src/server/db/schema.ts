import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// Parse cache + share-page source: one row per (photo, target language).
const menus = sqliteTable(
  "menus",
  {
    id: text("id").primaryKey(), // short slug used in /m/[id]
    photoHash: text("photo_hash").notNull(), // sha256 of the normalized photo
    lang: text("lang").notNull(), // target language, lowercased BCP-47
    restaurantName: text("restaurant_name"),
    detectedLanguage: text("detected_language").notNull(),
    detectedCurrency: text("detected_currency"),
    menuJson: text("menu_json").notNull(), // ParsedMenu as JSON
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("menus_photo_hash_lang").on(table.photoHash, table.lang)],
);

// Global dish registry: image cache index + legitimacy gate for /api/dish-image.
const dishes = sqliteTable("dishes", {
  nameHash: text("name_hash").primaryKey(), // sha256(normalize(originalName))
  originalName: text("original_name").notNull(),
  imageKey: text("image_key"), // R2 key once generated; null = not yet
  hits: integer("hits").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Fixed-window rate limiting (Phase 2); key = "{scope}:{ip}".
const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at").notNull(), // epoch ms when the window resets
});

export { menus, dishes, rateLimits };
