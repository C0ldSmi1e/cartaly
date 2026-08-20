"use client";

import { useEffect, useRef } from "react";
import type { MenuDish } from "@/src/schemas/menu";
import type { ImageState } from "@/src/components/menu/menu-screen";

const VIEWPORT_MARGIN = "600px";

const DishCard = ({
  dish,
  image,
  onVisible,
  onRetry,
}: {
  dish: MenuDish;
  image: ImageState;
  onVisible: (name: string) => void;
  onRetry: (name: string) => void;
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
    <article
      ref={cardRef}
      className="flex gap-3 rounded-2xl border border-line bg-surface p-3"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-line">
        {image.status === "done" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={dish.name}
            className="size-full object-cover"
            loading="lazy"
          />
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

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate font-semibold">{dish.name}</h3>
          {dish.calories !== null && (
            <span className="shrink-0 text-xs text-muted-fg">
              ~{dish.calories} kcal
            </span>
          )}
        </div>
        {dish.originalName !== dish.name && (
          <p className="truncate text-xs text-accent">{dish.originalName}</p>
        )}
        {dish.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-fg">
            {dish.description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-fg/50">…</p>
        )}
      </div>
    </article>
  );
};

export { DishCard };
