import { describe, expect, test } from "bun:test";
import { dishMatches } from "@/src/lib/dish-search";

const tomYum = {
  name: "Tom Yum Goong",
  originalName: "ต้มยำกุ้ง",
  description: "Hot and sour Thai soup with shrimp and lemongrass.",
};
const pho = {
  name: "Beef Noodle Soup",
  originalName: "Phở Bò",
  description: null,
};

describe("dishMatches", () => {
  test("empty or whitespace query matches everything", () => {
    expect(dishMatches("", tomYum)).toBe(true);
    expect(dishMatches("   ", pho)).toBe(true);
  });

  test("matches the English name, case-insensitively", () => {
    expect(dishMatches("tom yum", tomYum)).toBe(true);
    expect(dishMatches("TOM", tomYum)).toBe(true);
    expect(dishMatches("pizza", tomYum)).toBe(false);
  });

  test("matches the original script", () => {
    expect(dishMatches("ต้มยำ", tomYum)).toBe(true);
  });

  test("matches the description", () => {
    expect(dishMatches("shrimp", tomYum)).toBe(true);
  });

  test("folds diacritics both ways", () => {
    expect(dishMatches("pho", pho)).toBe(true);
    expect(dishMatches("Phở", pho)).toBe(true);
    expect(dishMatches("pho", tomYum)).toBe(false);
  });

  test("null description never matches or crashes", () => {
    expect(dishMatches("broth", pho)).toBe(false);
  });

  test("trims the query", () => {
    expect(dishMatches("  pho  ", pho)).toBe(true);
  });
});
