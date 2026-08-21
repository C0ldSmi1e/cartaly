import "server-only";
import { z } from "zod";
import { env } from "@/src/server/env";

const responseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string() })).min(1),
});

// Together rate-limits dynamically and asks for exponential back-off from ~2s.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const MAX_ATTEMPTS = 4;
const MAX_WAIT_MS = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWaitMs = (response: Response, attempt: number): number => {
  const resetSeconds = Number(response.headers.get("x-ratelimit-reset"));
  const fallback = 2 ** attempt * 1000;
  const wait = resetSeconds > 0 ? resetSeconds * 1000 : fallback;
  return Math.min(wait, MAX_WAIT_MS);
};

const generateTogether = async ({
  prompt,
  model,
}: {
  prompt: string;
  model: string;
}): Promise<Uint8Array | null> => {
  if (!env.TOGETHER_API_KEY) {
    throw new Error("TOGETHER_API_KEY is not set");
  }
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        width: 1024,
        height: 1024,
        steps: 4, // FLUX schnell is a 1–4 step model; more wastes time
        n: 1,
        response_format: "base64",
      }),
    });
    if (response.ok) {
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) {
        console.error("together image response shape unexpected");
        return null;
      }
      return Buffer.from(parsed.data.data[0].b64_json, "base64");
    }
    const detail = await response.text();
    if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) {
      console.error("together image call failed:", detail);
      return null;
    }
    await sleep(retryWaitMs(response, attempt));
  }
  return null;
};

export { generateTogether };
