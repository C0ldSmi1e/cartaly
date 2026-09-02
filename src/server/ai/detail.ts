import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/src/server/env";
import { sanitizeDishDetail } from "@/src/server/detail-content";
import { maxDetailIngredients } from "@/src/config/constants";
import { UpstreamError } from "@/src/server/errors";
import type { DishDetail } from "@/src/schemas/menu";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 180_000,
  maxRetries: 1,
});

const DETAIL_MODEL = "gpt-5.6-luna";

const PROMPT = [
  "You explain one restaurant dish or drink to someone who has never had it.",
  "Write so simply that a five-year-old understands: short sentences, everyday",
  "words, no cooking jargon. One or two sentences per field.",
  "Rules:",
  `- ingredients: the main things inside a typical version, simple names ("onions", not "shallots"). At most ${maxDetailIngredients}.`,
  "- taste: how it tastes and feels to eat or drink.",
  "- origin: where it comes from and its story.",
  "- howToEat: how locals have it — mixing, dipping, what to skip, hands or spoon.",
  "- No health or allergy claims.",
  "- If you do not recognize it, return an empty ingredients array and null",
  "  for the other fields — never guess or write filler.",
].join("\n");

// Model-facing shape mirrors DishDetailSchema, with descriptions for the model.
const DetailOutputSchema = z.object({
  ingredients: z.array(z.string()).describe("Main ingredients, simple names"),
  taste: z.string().nullable().describe("How it tastes and feels; null if unknown"),
  origin: z.string().nullable().describe("Where it comes from; null if unknown"),
  howToEat: z.string().nullable().describe("How locals eat it; null if unknown"),
});

// Text-only call — detail comes from world knowledge, not the photo.
const generateDishDetail = async ({
  name,
}: {
  name: string;
}): Promise<DishDetail> => {
  let response;
  try {
    response = await client.responses.parse({
      model: DETAIL_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: `${PROMPT}\nDish: ${name}` }],
        },
      ],
      text: { format: zodTextFormat(DetailOutputSchema, "dish_detail") },
    });
  } catch (error) {
    console.error("dish-detail OpenAI call failed:", error);
    throw new UpstreamError("Dish detail failed — please retry");
  }
  if (!response.output_parsed) {
    throw new UpstreamError("Dish detail returned no result — please retry");
  }
  return sanitizeDishDetail(response.output_parsed);
};

export { generateDishDetail };
