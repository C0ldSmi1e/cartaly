import { z } from "zod";

// Simplified contract: a menu resolves to English dish names, 1:1 with images.
// Other attributes (price, tags, translations…) are deferred.
const DishSchema = z.object({
  name: z
    .string()
    .describe('The dish\'s most common English name, e.g. "Tom Yum Goong"'),
});

const ParsedMenuSchema = z.object({
  isMenu: z.boolean().describe("False if the photo is not a food or drink menu"),
  dishes: z.array(DishSchema),
});

const ParseMenuResultSchema = z.object({
  menuId: z.string(),
  menu: ParsedMenuSchema,
  cached: z.boolean(),
});

type Dish = z.infer<typeof DishSchema>;
type ParsedMenu = z.infer<typeof ParsedMenuSchema>;
type ParseMenuResult = z.infer<typeof ParseMenuResultSchema>;

export { DishSchema, ParsedMenuSchema, ParseMenuResultSchema };
export type { Dish, ParsedMenu, ParseMenuResult };
