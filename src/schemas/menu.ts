import { z } from "zod";

// Simplified contract: a menu resolves to English dish names, 1:1 with images.
// Other attributes (price, tags, translations…) are deferred.
const DishSchema = z.object({
  name: z
    .string()
    .describe('The dish\'s most common English name, e.g. "Tom Yum Goong"'),
  originalName: z
    .string()
    .describe("The dish exactly as printed on the menu, original script"),
});

// One parsed photo — the AI output unit; a menu is a set of these.
const ParsedPhotoSchema = z.object({
  isMenu: z.boolean().describe("False if the photo is not a food or drink menu"),
  dishes: z.array(DishSchema),
});

// POST /api/dish-info result: per-dish facts derived from the name alone,
// cached globally on the dishes row (same economics as images).
// `pending` lists names still being enriched after the response.
const DishInfoResultSchema = z.object({
  dishes: z.array(
    z.object({
      name: z.string(),
      calories: z.number().nullable(),
      description: z.string().nullable(),
    }),
  ),
  pending: z.array(z.string()),
});

// Response-side dish: parsed names joined with whatever the global dishes
// table already knows. Nulls mark facts not computed yet.
const MenuDishSchema = z.object({
  name: z.string(),
  originalName: z.string(),
  calories: z.number().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

const MenuViewSchema = z.object({
  photoCount: z.number(),
  dishes: z.array(MenuDishSchema),
});

const ParseMenuResultSchema = z.object({
  menuId: z.string(),
  menu: MenuViewSchema,
  cached: z.boolean(),
});

// Communal table order, shared by everyone holding the menu link.
const OrderResultSchema = z.object({
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
});

type Dish = z.infer<typeof DishSchema>;
type ParsedPhoto = z.infer<typeof ParsedPhotoSchema>;
type MenuDish = z.infer<typeof MenuDishSchema>;
type MenuView = z.infer<typeof MenuViewSchema>;
type ParseMenuResult = z.infer<typeof ParseMenuResultSchema>;
type DishInfoResult = z.infer<typeof DishInfoResultSchema>;
type OrderResult = z.infer<typeof OrderResultSchema>;

export {
  DishSchema,
  ParsedPhotoSchema,
  MenuDishSchema,
  MenuViewSchema,
  ParseMenuResultSchema,
  DishInfoResultSchema,
  OrderResultSchema,
};
export type {
  Dish,
  ParsedPhoto,
  MenuDish,
  MenuView,
  ParseMenuResult,
  DishInfoResult,
  OrderResult,
};
