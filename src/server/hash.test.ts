import { describe, expect, test } from "bun:test";
import { sha256Hex, dishNameHash, shortId } from "@/src/server/hash";

describe("sha256Hex", () => {
  test("known vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  test("bytes and equal strings agree deterministically", () => {
    expect(sha256Hex(new TextEncoder().encode("menu"))).toBe(sha256Hex("menu"));
  });
});

describe("dishNameHash", () => {
  test("variant spellings of the same dish share one hash", () => {
    expect(dishNameHash("  Pad   Thai. ")).toBe(dishNameHash("pad thai"));
  });

  test("different dishes differ", () => {
    expect(dishNameHash("Phở")).not.toBe(dishNameHash("Pho"));
  });
});

describe("shortId", () => {
  test("shape and uniqueness", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => shortId()));
    expect(ids.size).toBe(1000);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{12}$/);
    }
  });
});
