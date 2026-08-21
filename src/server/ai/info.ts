import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/src/server/env";
import { normalizeDishName } from "@/src/lib/normalize";
import { UpstreamError } from "@/src/server/errors";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 180_000,
  maxRetries: 1,
});

const INFO_MODEL = "gpt-5.6-luna";

const PROMPT = [
  "For each dish name: estimate the calories of one typical serving, and",
  "write one short plain-English sentence saying what the dish is.",
  "Echo each name exactly as given.",
  "If you do not recognize a dish or cannot say what it is, return null —",
  "never write a sentence saying it is unclear or unknown.",
].join(" ");

const DishFactsSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("The dish name, echoed exactly as given"),
      calories: z
        .number()
        .nullable()
        .describe("kcal for one typical serving; null if unclear"),
      description: z
        .string()
        .nullable()
        .describe(
          "One short plain-English sentence saying what the dish is; null if you don't recognize it",
        ),
    }),
  ),
});

type DishFacts = { calories: number | null; description: string | null };

// Text-only call — dish facts come from world knowledge, not the photo.
const enrichDishes = async (names: string[]): Promise<Map<string, DishFacts>> => {
  let response;
  try {
    response = await client.responses.parse({
      model: INFO_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `${PROMPT}\n${names.map((name) => `- ${name}`).join("\n")}`,
            },
          ],
        },
      ],
      text: { format: zodTextFormat(DishFactsSchema, "dish_facts") },
    });
  } catch (error) {
    console.error("dish-info OpenAI call failed:", error);
    throw new UpstreamError("Dish info failed — please retry");
  }
  if (!response.output_parsed) {
    throw new UpstreamError("Dish info returned no result — please retry");
  }

  const byKey = new Map<string, DishFacts>();
  for (const item of response.output_parsed.items) {
    byKey.set(normalizeDishName(item.name), {
      calories:
        item.calories !== null && item.calories > 0
          ? Math.round(item.calories)
          : null,
      description: item.description?.trim() || null,
    });
  }
  return byKey;
};

export { enrichDishes };
export type { DishFacts };
