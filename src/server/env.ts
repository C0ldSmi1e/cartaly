import "server-only";
import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  DATABASE_PATH: z.string().min(1).default("data/cartaly.db"),
  // R2 — used from Phase 2 on; optional so Phase 1 dev runs without a bucket.
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  DAILY_SPEND_LIMIT_USD: z.coerce.number().positive().optional(),
});

// Empty strings (e.g. from a copied .env.example) count as unset.
const parsed = envSchema.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")),
);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const env = parsed.data;

export { env };
