import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/src/server/env";
import { ParsedMenuSchema, type ParsedMenu } from "@/src/schemas/menu";
import { menuLimits } from "@/src/config/constants";
import { UpstreamError } from "@/src/server/errors";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 90_000,
  maxRetries: 1,
});

const PARSE_MODEL = "gpt-5-mini";

const buildPrompt = (targetLang: string): string =>
  [
    "You read a photo of a restaurant menu and return structured data.",
    `Target language for translations: ${targetLang} (BCP-47).`,
    "Rules:",
    "- isMenu: false if the photo is not a food or drink menu; then return an empty dishes array.",
    "- originalName: exactly as printed, in the original script.",
    '- translatedName: natural translation. Famous dishes keep their transliterated name plus a short gloss (e.g. "Tom Yum Goong — spicy shrimp soup").',
    "- description: one short sentence in the target language; write a helpful one if the menu has none.",
    "- price: exactly as printed including currency symbol, or null if the line has no price.",
    "- detectedLanguage: BCP-47 tag of the menu's own language. detectedCurrency: ISO 4217 code or null.",
    "- tags: only when reasonably confident from the dish itself.",
    "- spiceLevel: integer 0–3. calories: rough kcal for a typical serving, null if you cannot estimate.",
    "- romanization: Latin transliteration when originalName is in a non-Latin script, else null.",
    '- confidence: "low" for blurry or uncertain lines — include them anyway.',
    `- At most ${menuLimits.maxDishes} dishes.`,
  ].join("\n");

// Clamps ranges the structured-output schema can't express (no min/max in strict mode).
const sanitize = (menu: ParsedMenu): ParsedMenu => ({
  ...menu,
  dishes: menu.dishes
    .filter((dish) => dish.originalName.trim().length > 0)
    .slice(0, menuLimits.maxDishes)
    .map((dish) => ({
      ...dish,
      spiceLevel: Math.min(3, Math.max(0, Math.round(dish.spiceLevel))),
      calories:
        dish.calories !== null && dish.calories > 0
          ? Math.round(dish.calories)
          : null,
    })),
});

const parseMenuPhoto = async ({
  jpegBytes,
  targetLang,
}: {
  jpegBytes: Uint8Array;
  targetLang: string;
}): Promise<ParsedMenu> => {
  const imageUrl = `data:image/jpeg;base64,${Buffer.from(jpegBytes).toString("base64")}`;
  let response;
  try {
    response = await client.responses.parse({
      model: PARSE_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: buildPrompt(targetLang) },
            { type: "input_image", image_url: imageUrl, detail: "high" },
          ],
        },
      ],
      text: { format: zodTextFormat(ParsedMenuSchema, "parsed_menu") },
    });
  } catch (error) {
    console.error("parse-menu OpenAI call failed:", error);
    throw new UpstreamError("Menu parsing failed — please try again");
  }
  if (!response.output_parsed) {
    throw new UpstreamError("Menu parsing returned no result — please try again");
  }
  return sanitize(response.output_parsed);
};

export { parseMenuPhoto };
