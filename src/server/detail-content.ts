// Pure helpers — no "server-only"/env imports so bun test can load this module.
import { DishDetailSchema, type DishDetail } from "@/src/schemas/menu";
import { maxDetailIngredients } from "@/src/config/constants";

// Model output is honest but messy: trim everything, drop empty strings,
// dedupe ingredients case-insensitively, cap the list.
const sanitizeDishDetail = (raw: DishDetail): DishDetail => {
  const seen = new Set<string>();
  const ingredients: string[] = [];
  for (const item of raw.ingredients) {
    const ingredient = item.trim();
    const key = ingredient.toLowerCase();
    if (!ingredient || seen.has(key)) {
      continue;
    }
    seen.add(key);
    ingredients.push(ingredient);
    if (ingredients.length >= maxDetailIngredients) {
      break;
    }
  }
  return {
    ingredients,
    taste: raw.taste?.trim() || null,
    origin: raw.origin?.trim() || null,
    howToEat: raw.howToEat?.trim() || null,
  };
};

// A stored row that no longer parses (corrupt or legacy shape) reads as a
// cache miss, so the action regenerates instead of serving junk.
const parseStoredDetail = (json: string): DishDetail | null => {
  try {
    const parsed = DishDetailSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export { sanitizeDishDetail, parseStoredDetail };
