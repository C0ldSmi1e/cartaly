import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/src/server/env";
import { ParsedMenuSchema, type ParsedMenu } from "@/src/schemas/menu";
import { menuLimits } from "@/src/config/constants";
import { normalizeDishName } from "@/src/lib/normalize";
import { UpstreamError } from "@/src/server/errors";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 90_000,
  maxRetries: 1,
});

const PARSE_MODEL = "gpt-5.6-luna";

const PROMPT = [
  "You read a photo of a restaurant menu and list its dishes.",
  "Rules:",
  "- isMenu: false if the photo is not a food or drink menu; then return an empty dishes array.",
  '- name: the dish\'s most common English name (e.g. "Tom Yum Goong", "Margherita Pizza").',
  "  Use the widely known transliterated name when one exists; otherwise a short plain-English name.",
  "- originalName: the dish name in its original language, exactly matching the text on the menu.",
  "- One entry per distinct dish on the menu. No duplicates, no section headers, no prices.",
  `- At most ${menuLimits.maxDishes} dishes.`,
].join("\n");

// Dedupe by normalized name and enforce the cap the schema can't express.
const sanitize = (menu: ParsedMenu): ParsedMenu => {
  const seen = new Set<string>();
  const dishes = [];
  for (const dish of menu.dishes) {
    const name = dish.name.trim();
    const key = normalizeDishName(name);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    dishes.push({ name, originalName: dish.originalName.trim() || name });
    if (dishes.length >= menuLimits.maxDishes) {
      break;
    }
  }
  return { isMenu: menu.isMenu, dishes };
};

const parseMenuPhoto = async ({
  jpegBytes,
}: {
  jpegBytes: Uint8Array;
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
            { type: "input_text", text: PROMPT },
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
