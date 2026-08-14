import "server-only";
import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { S3Client } from "bun";
import { env } from "@/src/server/env";
import { BadRequestError } from "@/src/server/errors";

const KEY_RE = /^[a-z0-9][a-z0-9/._-]*$/i;

const assertKey = (key: string) => {
  if (!KEY_RE.test(key) || key.includes("..")) {
    throw new BadRequestError("Invalid blob key");
  }
};

const r2 =
  env.S3_ENDPOINT &&
  env.S3_BUCKET &&
  env.S3_ACCESS_KEY_ID &&
  env.S3_SECRET_ACCESS_KEY
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      })
    : null;

// Local-disk fallback so dev works without an R2 bucket.
const LOCAL_DIR = "data/blobs";

const putBlob = async (key: string, bytes: Uint8Array, contentType: string) => {
  assertKey(key);
  if (r2) {
    await r2.write(key, bytes, { type: contentType });
    return;
  }
  const path = join(LOCAL_DIR, key);
  mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, bytes);
};

const readBlob = async (key: string): Promise<Uint8Array | null> => {
  assertKey(key);
  try {
    if (r2) {
      return new Uint8Array(await r2.file(key).arrayBuffer());
    }
    return new Uint8Array(await readFile(join(LOCAL_DIR, key)));
  } catch {
    return null;
  }
};

// CDN base when configured; otherwise images are served by /api/blob/[...key].
const blobPublicUrl = (key: string): string => {
  assertKey(key);
  return env.S3_PUBLIC_BASE_URL
    ? `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`
    : `/api/blob/${key}`;
};

export { putBlob, readBlob, blobPublicUrl };
