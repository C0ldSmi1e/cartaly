"use client";

import type { Dish } from "@/src/schemas/menu";

const SPICE_LABELS = ["", "mild", "medium", "hot"] as const;

const DishCard = ({ dish }: { dish: Dish }) => {
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      {/* image slot — Phase 2 */}
      <div
        className="size-20 shrink-0 animate-pulse rounded-xl bg-line"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-semibold">{dish.translatedName}</h3>
          {dish.price && (
            <span className="shrink-0 text-sm font-semibold">{dish.price}</span>
          )}
        </div>
        <p className="truncate text-xs text-accent">
          {dish.originalName}
          {dish.romanization ? ` · ${dish.romanization}` : ""}
        </p>
        {dish.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-fg">
            {dish.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-fg">
          {dish.calories !== null && <span>~{dish.calories} kcal</span>}
          {dish.spiceLevel > 0 && (
            <span
              className="text-accent"
              aria-label={`Spice: ${SPICE_LABELS[dish.spiceLevel] ?? "hot"}`}
            >
              {"●".repeat(Math.min(dish.spiceLevel, 3))}
              {"○".repeat(Math.max(0, 3 - dish.spiceLevel))}
            </span>
          )}
          {dish.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-line px-2 py-0.5">
              {tag}
            </span>
          ))}
          {dish.confidence === "low" && (
            <span className="italic">unclear — double-check</span>
          )}
        </div>
      </div>
    </article>
  );
};

export { DishCard };
