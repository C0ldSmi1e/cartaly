import "server-only";
import OpenAI from "openai";
import { env } from "@/src/server/env";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 300_000,
  maxRetries: 1,
});

const generateOpenAI = async ({
  prompt,
  model,
}: {
  prompt: string;
  model: string;
}): Promise<Uint8Array | null> => {
  const response = await client.images.generate({
    model,
    prompt,
    size: "1024x1024",
    quality: "low",
  });
  const b64 = response.data?.[0]?.b64_json;
  return b64 ? Buffer.from(b64, "base64") : null;
};

export { generateOpenAI };
