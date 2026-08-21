// Compare image models on sample dishes.
// Usage: bun scripts/image-bake-off.ts [provider:model] [count]
//   bun scripts/image-bake-off.ts openai:gpt-image-2 3
//   bun scripts/image-bake-off.ts together:black-forest-labs/FLUX.1-schnell 3
//   bun scripts/image-bake-off.ts together:black-forest-labs/FLUX.1-schnell-Free 3
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import OpenAI from "openai";
import sharp from "sharp";

const DISHES = [
  "Tom Yum Goong",
  "Coq au Vin",
  "Assorted Sushi",
  "Mango Sticky Rice",
  "Margherita Pizza",
  "Tonkotsu Ramen",
  "Tacos al Pastor",
  "Boeuf Bourguignon",
  "Som Tam",
  "Cappuccino",
];

const prompt = (name: string) =>
  `Overhead photo of a single serving of "${name}" on a simple ceramic plate, ` +
  "soft natural light, realistic everyday restaurant presentation — appetizing " +
  "but honest, not glamorized. No text.";

const spec = process.argv[2] ?? "openai:gpt-image-1-mini";
const [provider, ...rest] = spec.split(":");
const model = rest.join(":");
const count = Math.min(Number(process.argv[3]) || 3, DISHES.length);
if (!model || !["openai", "together"].includes(provider)) {
  console.error(
    "Usage: bun scripts/image-bake-off.ts <openai|together>:<model> [count]",
  );
  process.exit(1);
}

const generate = async (name: string): Promise<string | undefined> => {
  if (provider === "together") {
    const res = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: prompt(name),
        width: 1024,
        height: 1024,
        steps: 4,
        n: 1,
        response_format: "base64",
      }),
    });
    if (!res.ok) {
      console.error(`  ${name} FAILED:`, (await res.text()).slice(0, 200));
      return undefined;
    }
    const body = (await res.json()) as { data?: { b64_json?: string }[] };
    return body.data?.[0]?.b64_json;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.images.generate({
    model,
    prompt: prompt(name),
    size: "1024x1024",
    quality: "low",
  });
  return res.data?.[0]?.b64_json;
};

mkdirSync("bake-off", { recursive: true });
const tag = model.replace(/[^A-Za-z0-9.]+/g, "-");
console.log(`${spec} · ${count} dishes\n`);

for (const name of DISHES.slice(0, count)) {
  const started = Date.now();
  const b64 = await generate(name);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (!b64) {
    console.log(`${name} [${seconds}s] FAILED`);
    continue;
  }
  const webp = await sharp(Buffer.from(b64, "base64"))
    .webp({ quality: 80 })
    .toBuffer();
  const file = `bake-off/${name.replace(/[^A-Za-z0-9]+/g, "-")}-${tag}.webp`;
  await writeFile(file, webp);
  console.log(
    `${name} [${seconds}s] ${(webp.length / 1024).toFixed(0)}KB → ${file}`,
  );
}
console.log("\nDone. Compare files in bake-off/.");
