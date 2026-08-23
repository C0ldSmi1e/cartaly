import type { MenuDish } from "@/src/schemas/menu";

// Search folding: case- and diacritic-insensitive so "pho" matches "Phở".
// Deliberately NOT normalizeDishName — that is a cache identity and must never
// fold. Both sides fold the same way, so non-Latin queries still match.
const fold = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();

const dishMatches = (
  query: string,
  dish: Pick<MenuDish, "name" | "originalName" | "description">,
): boolean => {
  const q = fold(query.trim());
  if (!q) {
    return true;
  }
  return [dish.name, dish.originalName, dish.description ?? ""].some((field) =>
    fold(field).includes(q),
  );
};

export { dishMatches };
