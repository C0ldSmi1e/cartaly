"use client";

import type { Dish, DishCategory, ParseMenuResult } from "@/src/schemas/menu";
import { dishCategories } from "@/src/schemas/menu";
import { DishCard } from "@/src/components/menu/dish-card";

const CATEGORY_LABELS: Record<DishCategory, string> = {
  appetizer: "Appetizers",
  main: "Mains",
  side: "Sides",
  dessert: "Desserts",
  drink: "Drinks",
  other: "More",
};

const MenuView = ({
  result,
  onReset,
}: {
  result: ParseMenuResult;
  onReset: () => void;
}) => {
  const { menu } = result;
  const sections = dishCategories
    .map((category) => ({
      category,
      dishes: menu.dishes.filter((dish) => dish.category === category),
    }))
    .filter((section) => section.dishes.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {menu.restaurantName ?? "Menu"}
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            {menu.dishes.length} dishes
            {menu.detectedCurrency ? ` · prices in ${menu.detectedCurrency}` : ""}
            {result.cached ? " · from cache" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
        >
          Scan another
        </button>
      </header>

      {sections.map((section) => (
        <section key={section.category} className="mb-8">
          <h2 className="mb-3 text-xs font-bold tracking-widest text-muted-fg uppercase">
            {CATEGORY_LABELS[section.category]}
          </h2>
          <div className="flex flex-col gap-3">
            {section.dishes.map((dish: Dish, index: number) => (
              <DishCard key={`${dish.originalName}-${index}`} dish={dish} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
};

export { MenuView };
