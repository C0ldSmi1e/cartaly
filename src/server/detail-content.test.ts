import { describe, expect, test } from "bun:test";
import {
  sanitizeDishDetail,
  parseStoredDetail,
  isEmptyDishDetail,
} from "@/src/server/detail-content";
import { maxDetailIngredients } from "@/src/config/constants";

describe("sanitizeDishDetail", () => {
  test("trims fields and drops empty ingredients", () => {
    const detail = sanitizeDishDetail({
      ingredients: ["  Egg noodles ", "", "   "],
      taste: "  Creamy and a little sweet. ",
      origin: "",
      howToEat: null,
    });
    expect(detail.ingredients).toEqual(["Egg noodles"]);
    expect(detail.taste).toBe("Creamy and a little sweet.");
    expect(detail.origin).toBeNull();
    expect(detail.howToEat).toBeNull();
  });

  test("dedupes ingredients case-insensitively, keeping the first", () => {
    const detail = sanitizeDishDetail({
      ingredients: ["Lime", "lime ", "Chili"],
      taste: null,
      origin: null,
      howToEat: null,
    });
    expect(detail.ingredients).toEqual(["Lime", "Chili"]);
  });

  test("caps the ingredient list", () => {
    const detail = sanitizeDishDetail({
      ingredients: Array.from({ length: 30 }, (_, i) => `Item ${i}`),
      taste: null,
      origin: null,
      howToEat: null,
    });
    expect(detail.ingredients).toHaveLength(maxDetailIngredients);
  });

  test("passes an all-unknown detail through untouched", () => {
    const detail = sanitizeDishDetail({
      ingredients: [],
      taste: null,
      origin: null,
      howToEat: null,
    });
    expect(detail).toEqual({
      ingredients: [],
      taste: null,
      origin: null,
      howToEat: null,
    });
  });
});

describe("isEmptyDishDetail", () => {
  test("true only when nothing was recognized", () => {
    const empty = { ingredients: [], taste: null, origin: null, howToEat: null };
    expect(isEmptyDishDetail(empty)).toBe(true);
    expect(isEmptyDishDetail({ ...empty, ingredients: ["Rice"] })).toBe(false);
    expect(isEmptyDishDetail({ ...empty, taste: "Sweet." })).toBe(false);
    expect(isEmptyDishDetail({ ...empty, howToEat: "With a spoon." })).toBe(false);
  });
});

describe("parseStoredDetail", () => {
  const good = {
    ingredients: ["Shrimp", "Lime"],
    taste: "Spicy and sour at the same time.",
    origin: null,
    howToEat: "Sip the soup with a spoon.",
  };

  test("round-trips a stored detail", () => {
    expect(parseStoredDetail(JSON.stringify(good))).toEqual(good);
  });

  test("returns null for invalid JSON", () => {
    expect(parseStoredDetail("not json {")).toBeNull();
  });

  test("returns null for a legacy shape", () => {
    expect(parseStoredDetail(JSON.stringify({ ingredients: "Shrimp" }))).toBeNull();
    expect(parseStoredDetail(JSON.stringify({ taste: "Spicy" }))).toBeNull();
  });
});
