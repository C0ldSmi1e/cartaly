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

const ParsedMenuSchema = z.object({
  isMenu: z.boolean().describe("False if the photo is not a food or drink menu"),
  dishes: z.array(DishSchema),
});

// POST /api/dish-info result: per-dish facts derived from the name alone,
// cached globally on the dishes row (same economics as images).
const DishInfoResultSchema = z.object({
  dishes: z.array(
    z.object({
      name: z.string(),
      calories: z.number().nullable(),
    }),
  ),
});

const ParseMenuResultSchema = z.object({
  menuId: z.string(),
  menu: ParsedMenuSchema,
  cached: z.boolean(),
});

type Dish = z.infer<typeof DishSchema>;
type ParsedMenu = z.infer<typeof ParsedMenuSchema>;
type ParseMenuResult = z.infer<typeof ParseMenuResultSchema>;
type DishInfoResult = z.infer<typeof DishInfoResultSchema>;

export { DishSchema, ParsedMenuSchema, ParseMenuResultSchema, DishInfoResultSchema };
export type { Dish, ParsedMenu, ParseMenuResult, DishInfoResult };
