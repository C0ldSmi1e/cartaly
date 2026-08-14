import { z } from "zod";

const dishCategories = [
  "appetizer",
  "main",
  "side",
  "dessert",
  "drink",
  "other",
] as const;

const dishTags = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "spicy",
  "contains-nuts",
  "contains-shellfish",
  "contains-dairy",
  "raw",
] as const;

// Also the structured-output schema: no min/max keywords (strict mode rejects
// them) — ranges are described to the model and clamped in src/server/ai/parse.ts.
const DishSchema = z.object({
  originalName: z.string().describe("Dish name exactly as printed, original script"),
  translatedName: z
    .string()
    .describe("Natural translation; famous dishes keep their name plus a gloss"),
  description: z
    .string()
    .describe("One short sentence in the target language; write one if missing"),
  price: z.string().nullable().describe('As printed, e.g. "€14.50", "฿120"'),
  category: z.enum(dishCategories),
  tags: z.array(z.enum(dishTags)).describe("Only when confident"),
  spiceLevel: z.number().describe("Integer 0–3"),
  calories: z
    .number()
    .nullable()
    .describe("Rough kcal estimate for a typical serving; null if unclear"),
  romanization: z
    .string()
    .nullable()
    .describe("Latin transliteration for non-Latin scripts, else null"),
  confidence: z
    .enum(["high", "low"])
    .describe('"low" if the line is blurry or uncertain'),
});

const ParsedMenuSchema = z.object({
  isMenu: z.boolean().describe("False if the photo is not a food or drink menu"),
  detectedLanguage: z.string().describe("BCP-47 tag of the menu's language"),
  detectedCurrency: z.string().nullable().describe("ISO 4217 code, or null"),
  restaurantName: z.string().nullable(),
  dishes: z.array(DishSchema),
});

// What /api/parse-menu returns inside the standard response envelope.
const ParseMenuResultSchema = z.object({
  menuId: z.string(),
  menu: ParsedMenuSchema,
  cached: z.boolean(),
});

type Dish = z.infer<typeof DishSchema>;
type ParsedMenu = z.infer<typeof ParsedMenuSchema>;
type ParseMenuResult = z.infer<typeof ParseMenuResultSchema>;
type DishCategory = (typeof dishCategories)[number];
type DishTag = (typeof dishTags)[number];

export {
  DishSchema,
  ParsedMenuSchema,
  ParseMenuResultSchema,
  dishCategories,
  dishTags,
};
export type { Dish, ParsedMenu, ParseMenuResult, DishCategory, DishTag };
