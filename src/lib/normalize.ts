// Canonical dish name for the global image cache key — rules in docs/SPEC.md.
// Never fold non-Latin scripts or diacritics: "Pho" and "Phở" are different dishes.

const hasNonLatinLetters = (value: string): boolean =>
  /\p{L}/u.test(value.replace(/\p{Script=Latin}/gu, ""));

const normalizeDishName = (name: string): string => {
  let result = name.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!hasNonLatinLetters(result)) {
    result = result.toLowerCase();
  }
  return result.replace(/[\p{P}\s]+$/gu, "");
};

export { normalizeDishName };
