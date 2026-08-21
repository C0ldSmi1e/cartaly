"use client";

import { useEffect, useRef } from "react";
import type { MenuDish } from "@/src/schemas/menu";
import type { ImageState } from "@/src/components/menu/menu-screen";

const VIEWPORT_MARGIN = "600px";

const DishCard = ({
  dish,
  image,
  orderQty,
  onVisible,
  onRetry,
  onBump,
  onOpen,
}: {
  dish: MenuDish;
  image: ImageState;
  orderQty: number;
  onVisible: (name: string) => void;
  onRetry: (name: string) => void;
  onBump: (name: string, delta: 1 | -1) => void;
  onOpen: (name: string) => void;
}) => {
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (image.status !== "idle" || !cardRef.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          onVisible(dish.name);
        }
      },
      { rootMargin: VIEWPORT_MARGIN },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [dish.name, image.status, onVisible]);

  return (
    <article ref={cardRef} className="flex gap-3.5 py-3">
      <div className="relative size-22 shrink-0 overflow-hidden rounded-xl bg-line">
        {image.status === "done" ? (
          <button
            type="button"
            onClick={() => onOpen(dish.name)}
            aria-label={`View ${dish.name}`}
            className="size-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={dish.name}
              className="size-full object-cover"
              loading="lazy"
            />
          </button>
        ) : image.status === "error" ? (
          <button
            type="button"
            onClick={() => onRetry(dish.name)}
            className="flex size-full items-center justify-center text-center text-xs text-muted-fg"
          >
            failed
            <br />
            tap to retry
          </button>
        ) : (
          <div
            className={
              image.status === "idle" ? "size-full" : "size-full animate-pulse"
            }
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {dish.name}
          </h3>
          {dish.calories !== null && (
            <span className="shrink-0 rounded-full bg-brass-soft px-2 py-0.5 text-xs text-brass tabular-nums">
              ~{dish.calories} kcal
            </span>
          )}
        </div>
        {dish.originalName && (
          <p className="mt-px truncate text-xs font-medium text-accent">
            {dish.originalName}
          </p>
        )}
        {dish.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-fg">
            {dish.description}
          </p>
        )}
        <div className="mt-auto flex justify-end pt-1">
          {orderQty === 0 ? (
            <button
              type="button"
              onClick={() => onBump(dish.name, 1)}
              aria-label={`Add ${dish.name} to the order`}
              className="flex size-7 items-center justify-center rounded-full border border-accent text-base leading-none text-accent transition-transform active:scale-90"
            >
              +
            </button>
          ) : (
            <div className="flex items-center gap-2.5 rounded-full bg-accent px-3 py-1 text-white">
              <button
                type="button"
                onClick={() => onBump(dish.name, -1)}
                aria-label={`Remove one ${dish.name}`}
                className="text-base font-bold"
              >
                −
              </button>
              <span className="min-w-3 text-center text-sm font-bold">
                {orderQty}
              </span>
              <button
                type="button"
                onClick={() => onBump(dish.name, 1)}
                aria-label={`Add one ${dish.name}`}
                className="text-base font-bold"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export { DishCard };
