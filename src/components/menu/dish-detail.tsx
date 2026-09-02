"use client";

import { useEffect, useState } from "react";
import type {
  DishDetail as DishDetailContent,
  DishDetailResult,
  MenuDish,
} from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";

type DetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; detail: DishDetailContent };

// Server cache hits are ~ms; this only spares the skeleton flash on reopen.
const detailCache = new Map<string, DishDetailContent>();

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold tracking-[0.13em] text-brass uppercase">
      {label}
    </p>
    {children}
  </div>
);

const DetailSkeleton = () => (
  <div
    className="flex flex-col gap-5"
    role="status"
    aria-label="Loading dish details"
  >
    <div className="flex flex-wrap gap-1.5">
      <div className="h-6 w-16 animate-pulse rounded-full bg-line" />
      <div className="h-6 w-20 animate-pulse rounded-full bg-line" />
      <div className="h-6 w-14 animate-pulse rounded-full bg-line" />
    </div>
    <div className="flex flex-col gap-2">
      <div className="h-3 w-full animate-pulse rounded bg-line" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-line" />
    </div>
    <div className="flex flex-col gap-2">
      <div className="h-3 w-full animate-pulse rounded bg-line" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
    </div>
  </div>
);

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
}) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DetailState>(() => {
    const hit = detailCache.get(dish.name);
    return hit ? { status: "done", detail: hit } : { status: "loading" };
  });

  useEffect(() => {
    // Cache hits were resolved by the state initializer; nothing to fetch.
    if (detailCache.has(dish.name)) {
      return;
    }
    let cancelled = false;
    fetch("/api/dish-detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dish.name }),
    })
      .then(async (res) => {
        const body = (await res.json()) as StandardResponse<DishDetailResult>;
        if (!res.ok || body.error !== null || body.data === null) {
          throw new Error(body.error ?? "failed");
        }
        detailCache.set(dish.name, body.data.detail);
        if (!cancelled) {
          setState({ status: "done", detail: body.data.detail });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dish.name, attempt]);

  return (
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
            <p className="mt-1 text-sm font-medium text-accent">
              {dish.originalName}
            </p>
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

          <div className="mt-6">
            {state.status === "loading" && <DetailSkeleton />}
            {state.status === "error" && (
              <p className="text-xs text-muted-fg">
                Couldn&rsquo;t load dish details.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setState({ status: "loading" });
                    setAttempt((n) => n + 1);
                  }}
                  className="font-semibold text-accent"
                >
                  Retry
                </button>
              </p>
            )}
            {state.status === "done" &&
              state.detail.ingredients.length === 0 &&
              !state.detail.taste &&
              !state.detail.origin &&
              !state.detail.howToEat && (
                <p className="text-xs text-muted-fg">No details for this one yet.</p>
              )}
            {state.status === "done" && (
              <div className="animate-fade flex flex-col gap-5">
                {state.detail.ingredients.length > 0 && (
                  <Section label="Ingredients">
                    <div className="flex flex-wrap gap-1.5">
                      {state.detail.ingredients.map((ingredient) => (
                        <span
                          key={ingredient}
                          className="rounded-full border border-line bg-surface px-3 py-1 text-xs"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}
                {state.detail.taste && (
                  <Section label="Taste">
                    <p className="text-sm leading-relaxed">{state.detail.taste}</p>
                  </Section>
                )}
                {state.detail.origin && (
                  <Section label="Origin">
                    <p className="text-sm leading-relaxed">{state.detail.origin}</p>
                  </Section>
                )}
                {state.detail.howToEat && (
                  <Section label="How locals eat it">
                    <p className="text-sm leading-relaxed">
                      {state.detail.howToEat}
                    </p>
                  </Section>
                )}
              </div>
            )}
          </div>
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
};

export { DishDetail };
