// Compare gpt-image-2 quality tiers on sample dishes.
// Usage: bun scripts/image-bake-off.ts [count]   (default 3, max 10)
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import OpenAI from "openai";
import sharp from "sharp";

const DISHES = [
  ["ต้มยำกุ้ง", "spicy Thai shrimp soup with lemongrass"],
  ["Coq au vin", "chicken braised in red wine with mushrooms"],
  ["寿司盛り合わせ", "assorted nigiri sushi platter"],
  ["ข้าวเหนียวมะม่วง", "mango sticky rice with coconut cream"],
  ["Margherita pizza", "tomato, mozzarella, basil"],
  ["ラーメン", "pork broth ramen with egg and chashu"],
  ["Tacos al pastor", "marinated pork tacos with pineapple"],
  ["Bœuf bourguignon", "beef stewed in burgundy wine"],
  ["ส้มตำ", "green papaya salad"],
  ["Cappuccino", "espresso with steamed milk foam"],
] as const;

const TIERS = ["low", "medium"] as const;
const PRICE_CENTS: Record<(typeof TIERS)[number], number> = {
  low: 0.6,
  medium: 5.3,
};

const prompt = (name: string, desc: string) =>
  `Overhead photo of a single serving of "${name}" (${desc}) on a simple ceramic plate, soft natural light, realistic everyday restaurant presentation — appetizing but honest, not glamorized. No text.`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const count = Math.min(Number(process.argv[2]) || 3, DISHES.length);
mkdirSync("bake-off", { recursive: true });

let totalCents = 0;
for (const [name, desc] of DISHES.slice(0, count)) {
  for (const tier of TIERS) {
    const started = Date.now();
    const res = await client.images.generate({
      model: "gpt-image-2",
      prompt: prompt(name, desc),
      size: "1024x1024",
      quality: tier,
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.log(`${name} [${tier}] FAILED`);
      continue;
    }
    const webp = await sharp(Buffer.from(b64, "base64"))
      .webp({ quality: 80 })
      .toBuffer();
    const file = `bake-off/${name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${tier}.webp`;
    await writeFile(file, webp);
    totalCents += PRICE_CENTS[tier];
    console.log(
      `${name} [${tier}] ${seconds}s ${(webp.length / 1024).toFixed(0)}KB → ${file}`,
    );
  }
}
console.log(
  `\nDone. Estimated spend: ~$${(totalCents / 100).toFixed(2)}. Open bake-off/ and compare.`,
);
