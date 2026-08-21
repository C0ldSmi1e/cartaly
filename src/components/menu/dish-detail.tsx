"use client";

import type { MenuDish } from "@/src/schemas/menu";

const DishDetail = ({
  dish,
  imageUrl,
  qty,
  onBump,
  onClose,
}: {
  dish: MenuDish;
  imageUrl: string | null;
  qty: number;
  onBump: (name: string, delta: 1 | -1) => void;
  onClose: () => void;
}) => (
  <div className="animate-rise fixed inset-0 z-50 flex flex-col bg-background">
    <div className="relative h-2/5 shrink-0 bg-line">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={dish.name} className="size-full object-cover" />
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 left-4 flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
      >
        ✕
      </button>
    </div>

    <div className="relative -mt-6 flex-1 overflow-y-auto rounded-t-3xl bg-background">
      <div className="mx-auto w-full max-w-2xl px-5 pt-7 pb-32">
        <h2 className="text-xl font-semibold tracking-tight">{dish.name}</h2>
        {dish.originalName && (
          <p className="mt-1 text-sm font-medium text-accent">{dish.originalName}</p>
        )}
        {dish.calories !== null && (
          <span className="mt-3 inline-block rounded-full bg-brass-soft px-3 py-1 text-xs text-brass tabular-nums">
            ~{dish.calories} kcal
          </span>
        )}
        {dish.description && (
          <p className="mt-4 text-sm leading-relaxed text-muted-fg">
            {dish.description}
          </p>
        )}
      </div>
    </div>

    <div className="absolute inset-x-5 bottom-6 mx-auto w-auto max-w-2xl">
      {qty === 0 ? (
        <button
          type="button"
          onClick={() => onBump(dish.name, 1)}
          className="w-full rounded-full bg-accent py-4 font-semibold text-white shadow-xl transition-transform active:scale-95"
        >
          ＋ Add to order
        </button>
      ) : (
        <div className="flex items-center justify-center gap-8 rounded-full bg-accent py-3.5 text-white shadow-xl">
          <button
            type="button"
            onClick={() => onBump(dish.name, -1)}
            aria-label={`Remove one ${dish.name}`}
            className="text-xl font-bold"
          >
            −
          </button>
          <span className="min-w-6 text-center text-lg font-bold">{qty}</span>
          <button
            type="button"
            onClick={() => onBump(dish.name, 1)}
            aria-label={`Add one ${dish.name}`}
            className="text-xl font-bold"
          >
            +
          </button>
        </div>
      )}
    </div>
  </div>
);

export { DishDetail };
