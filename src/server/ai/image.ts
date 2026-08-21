import "server-only";
import OpenAI from "openai";
import sharp from "sharp";
import { env } from "@/src/server/env";
import { UpstreamError } from "@/src/server/errors";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 300_000,
  maxRetries: 1,
});

const IMAGE_MODEL = "gpt-image-1-mini";

const buildImagePrompt = (name: string): string =>
  `Overhead photo of a single serving of "${name}" on a simple ceramic plate, ` +
  "soft natural light, realistic everyday restaurant presentation — appetizing " +
  "but honest, not glamorized. No text.";

const generateDishImage = async ({
  name,
  quality = "low",
}: {
  name: string;
  quality?: "low" | "medium";
}): Promise<Buffer> => {
  let b64: string | undefined;
  try {
    const response = await client.images.generate({
      model: IMAGE_MODEL,
      prompt: buildImagePrompt(name),
      size: "1024x1024",
      quality,
    });
    b64 = response.data?.[0]?.b64_json;
  } catch (error) {
    console.error("dish-image OpenAI call failed:", error);
    throw new UpstreamError("Image generation failed — please retry");
  }
  if (!b64) {
    throw new UpstreamError("Image generation returned no data");
  }
  try {
    return await sharp(Buffer.from(b64, "base64")).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new UpstreamError("Image conversion failed");
  }
};

export { generateDishImage };
