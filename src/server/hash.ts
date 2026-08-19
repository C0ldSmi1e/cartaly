// Pure helpers — no "server-only"/env imports so bun test can load this module.
import { createHash, randomBytes } from "node:crypto";
import { normalizeDishName } from "@/src/lib/normalize";

const sha256Hex = (data: string | Uint8Array): string =>
  createHash("sha256").update(data).digest("hex");

const dishNameHash = (name: string): string => sha256Hex(normalizeDishName(name));

const SHORT_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz"; // no I/L/O/U/i/l/o/u

// 12 chars × 54 symbols ≈ 69 bits — collision-safe here.
const shortId = (length = 12): string => {
  const bytes = randomBytes(length);
  let id = "";
  for (const byte of bytes) {
    id += SHORT_ID_ALPHABET[byte % SHORT_ID_ALPHABET.length];
  }
  return id;
};

export { sha256Hex, dishNameHash, shortId };
