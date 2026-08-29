import "server-only";
import sharp from "sharp";
import { env } from "@/src/server/env";
import { UpstreamError } from "@/src/server/errors";
import { generateOpenAI } from "@/src/server/ai/image/openai";
import { generateTogether } from "@/src/server/ai/image/together";

// The port: adapters take a prompt, return raw image bytes (null on failure).
type ImageAdapter = (request: {
  prompt: string;
  model: string;
}) => Promise<Uint8Array | null>;

const ADAPTERS: Record<string, ImageAdapter> = {
  openai: generateOpenAI,
  together: generateTogether,
};

// env.IMAGE_MODEL is "provider:model", e.g. "together:black-forest-labs/FLUX.1-schnell"
const resolve = (): { adapter: ImageAdapter; model: string } => {
  const [provider, ...rest] = env.IMAGE_MODEL.split(":");
  const adapter = ADAPTERS[provider];
  if (!adapter || rest.length === 0) {
    throw new Error(
      `IMAGE_MODEL must be "<${Object.keys(ADAPTERS).join("|")}>:<model>", got "${env.IMAGE_MODEL}"`,
    );
  }
  return { adapter, model: rest.join(":") };
};

const buildImagePrompt = (name: string): string =>
  `Overhead photo of a single serving of "${name}", served in the vessel it ` +
  "typically comes in at a restaurant — plate, bowl, cup, or glass, whichever " +
  "fits the dish. Simple ceramic serveware, soft natural light, realistic " +
  "everyday restaurant presentation — appetizing but honest, not glamorized. No text.";

const generateDishImage = async ({ name }: { name: string }): Promise<Buffer> => {
  const { adapter, model } = resolve();
  let bytes: Uint8Array | null = null;
  try {
    bytes = await adapter({ prompt: buildImagePrompt(name), model });
  } catch (error) {
    console.error("dish-image call failed:", error);
    throw new UpstreamError("Image generation failed — please retry");
  }
  if (!bytes) {
    throw new UpstreamError("Image generation returned no data");
  }
  try {
    return await sharp(bytes).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new UpstreamError("Image conversion failed");
  }
};

export { generateDishImage };
export type { ImageAdapter };
