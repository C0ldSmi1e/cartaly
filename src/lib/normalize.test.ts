import { describe, expect, test } from "bun:test";
import { normalizeDishName } from "@/src/lib/normalize";

describe("normalizeDishName", () => {
  test("trims and collapses whitespace", () => {
    expect(normalizeDishName("  Pad   Thai  ")).toBe("pad thai");
  });

  test("lowercases Latin scripts", () => {
    expect(normalizeDishName("Coq Au Vin")).toBe("coq au vin");
  });

  test("keeps diacritics", () => {
    expect(normalizeDishName("Phở Bò")).toBe("phở bò");
  });

  test("never case-folds non-Latin scripts", () => {
    expect(normalizeDishName("ผัดไทย")).toBe("ผัดไทย");
    expect(normalizeDishName("Борщ Украинский")).toBe("Борщ Украинский");
  });

  test("does not lowercase mixed Latin when non-Latin letters present", () => {
    expect(normalizeDishName("Pad Thai ผัดไทย")).toBe("Pad Thai ผัดไทย");
  });

  test("strips trailing punctuation", () => {
    expect(normalizeDishName("Tom Yum Goong...")).toBe("tom yum goong");
    expect(normalizeDishName("ต้มยำกุ้ง。")).toBe("ต้มยำกุ้ง");
  });

  test("applies NFC so composed and decomposed forms match", () => {
    const composed = "Phở"; // ở as single code point
    const decomposed = "Phở"; // o + horn + hook above
    expect(normalizeDishName(composed)).toBe(normalizeDishName(decomposed));
  });

  test("same input always yields the same output", () => {
    expect(normalizeDishName("Crème Brûlée!")).toBe(
      normalizeDishName("  crème  brûlée "),
    );
  });
});
