import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { env } from "@/src/server/env";
import { normalizeDishName } from "@/src/lib/normalize";
import { UpstreamError } from "@/src/server/errors";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 1,
});

const INFO_MODEL = "gpt-5.6-luna";

const CaloriesSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("The dish name, echoed exactly as given"),
      calories: z
        .number()
        .nullable()
        .describe("kcal for one typical serving; null if unclear"),
    }),
  ),
});

// Text-only call — dish facts come from world knowledge, not the photo.
const estimateCalories = async (
  names: string[],
): Promise<Map<string, number | null>> => {
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
              text:
                "For each dish name, estimate the calories of one typical serving. " +
                "Echo each name exactly as given. Use null when you cannot estimate.\n" +
                names.map((name) => `- ${name}`).join("\n"),
            },
          ],
        },
      ],
      text: { format: zodTextFormat(CaloriesSchema, "dish_calories") },
    });
  } catch (error) {
    console.error("dish-info OpenAI call failed:", error);
    throw new UpstreamError("Dish info failed — please retry");
  }
  if (!response.output_parsed) {
    throw new UpstreamError("Dish info returned no result — please retry");
  }

  const byKey = new Map<string, number | null>();
  for (const item of response.output_parsed.items) {
    const calories =
      item.calories !== null && item.calories > 0 ? Math.round(item.calories) : null;
    byKey.set(normalizeDishName(item.name), calories);
  }
  return byKey;
};

export { estimateCalories };
