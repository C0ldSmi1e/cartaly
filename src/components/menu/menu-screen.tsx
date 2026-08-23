"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  MenuDish,
  MenuView,
  DishInfoResult,
  ParseMenuResult,
  OrderResult,
} from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { menuLimits } from "@/src/config/constants";
import { buildPhotoForm } from "@/src/lib/image";
import { DishCard } from "@/src/components/menu/dish-card";
import { DishDetail } from "@/src/components/menu/dish-detail";
import { PhotoPicker } from "@/src/components/scan/photo-picker";
import { Modal } from "@/src/components/modal";
import { ShareModal } from "@/src/components/menu/share-modal";
import { TableOrder } from "@/src/components/menu/table-order";
import { ReadingView } from "@/src/components/scan/reading-view";
import { takeScanHandoff } from "@/src/lib/scan-handoff";
import { recordRecent } from "@/src/lib/recent-menus";

type ImageState =
  | { status: "idle" | "queued" | "loading" | "error"; url: null }
  | { status: "done"; url: string };

const MAX_IN_FLIGHT = 4;
const INFO_POLL_MS = 4000;
const INFO_POLL_TRIES = 4;
const ORDER_POLL_MS = 3000;

const toOrderMap = (result: OrderResult): Record<string, number> =>
  Object.fromEntries(result.items.map((item) => [item.name, item.qty]));

const toImageState = (dish: MenuDish): ImageState =>
  dish.imageUrl
    ? { status: "done", url: dish.imageUrl }
    : { status: "idle", url: null };

const MenuScreen = ({
  menuId,
  initialDishes,
  initialOrder,
}: {
  menuId: string;
  initialDishes: MenuDish[];
  initialOrder: OrderResult;
}) => {
  const [dishes, setDishes] = useState(initialDishes);
  const [images, setImages] = useState<Record<string, ImageState>>(() =>
    Object.fromEntries(initialDishes.map((dish) => [dish.name, toImageState(dish)])),
  );
  const [scanMoreOpen, setScanMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [order, setOrder] = useState<Record<string, number>>(() =>
    toOrderMap(initialOrder),
  );
  const [infoSettled, setInfoSettled] = useState(() =>
    initialDishes.every(
      (dish) => dish.calories !== null && dish.description !== null,
    ),
  );
  const [holdPhotoUrl, setHoldPhotoUrl] = useState<string | null>(null);
  const holdUrlRef = useRef<string | null>(null);

  // Runs for own scans and shared links alike, so tablemates keep the menu too.
  useEffect(() => {
    recordRecent(menuId);
  }, [menuId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const url = takeScanHandoff(menuId);
      if (url) {
        holdUrlRef.current = url;
        setHoldPhotoUrl(url);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (holdUrlRef.current) {
        URL.revokeObjectURL(holdUrlRef.current);
        holdUrlRef.current = null;
      }
    };
  }, [menuId]);

  const queueRef = useRef<string[]>([]);
  const activeRef = useRef(0);
  const pumpRef = useRef<() => void>(() => {});

  const setImage = (name: string, state: ImageState) =>
    setImages((prev) => ({ ...prev, [name]: state }));

  const pump = useCallback(() => {
    while (activeRef.current < MAX_IN_FLIGHT && queueRef.current.length > 0) {
      const name = queueRef.current.shift()!;
      activeRef.current += 1;
      setImage(name, { status: "loading", url: null });
      fetch("/api/dish-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
        .then(async (res) => {
          const body = (await res.json()) as StandardResponse<{ url: string }>;
          if (!res.ok || body.error !== null || body.data === null) {
            throw new Error(body.error ?? "failed");
          }
          setImage(name, { status: "done", url: body.data.url });
        })
        .catch(() => setImage(name, { status: "error", url: null }))
        .finally(() => {
          activeRef.current -= 1;
          pumpRef.current();
        });
    }
  }, []);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const requestImage = useCallback(
    (name: string) => {
      setImages((prev) => {
        const current = prev[name];
        if (!current || current.status !== "idle") {
          return prev;
        }
        queueRef.current.push(name);
        queueMicrotask(pump);
        return { ...prev, [name]: { status: "queued", url: null } };
      });
    },
    [pump],
  );

  const retryImage = (name: string) => {
    setImage(name, { status: "idle", url: null });
    requestImage(name);
  };

  const pollInfoRef = useRef<(names: string[], tries: number) => void>(() => {});

  const pollInfo = useCallback(async (names: string[], tries: number) => {
    if (names.length === 0) {
      return;
    }
    try {
      const res = await fetch("/api/dish-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const body = (await res.json()) as StandardResponse<DishInfoResult>;
      if (!res.ok || body.error !== null || body.data === null) {
        return;
      }
      const facts = new Map(body.data.dishes.map((d) => [d.name, d]));
      setDishes((prev) =>
        prev.map((dish) => {
          const fact = facts.get(dish.name);
          return fact
            ? { ...dish, calories: fact.calories, description: fact.description }
            : dish;
        }),
      );
      if (body.data.pending.length > 0 && tries > 0) {
        const pending = body.data.pending;
        setTimeout(() => pollInfoRef.current(pending, tries - 1), INFO_POLL_MS);
      } else {
        setInfoSettled(true);
      }
    } catch {
      // info is decoration — a failed poll just leaves facts blank
      setInfoSettled(true);
    }
  }, []);

  useEffect(() => {
    pollInfoRef.current = (names, tries) => void pollInfo(names, tries);
  }, [pollInfo]);

  useEffect(() => {
    const gaps = initialDishes
      .filter((dish) => dish.calories === null || dish.description === null)
      .map((dish) => dish.name);
    if (gaps.length === 0) {
      return;
    }
    const timer = setTimeout(() => pollInfoRef.current(gaps, INFO_POLL_TRIES), 0);
    return () => clearTimeout(timer);
  }, [initialDishes]);

  const bumpOrder = useCallback(
    (name: string, delta: 1 | -1) => {
      setOrder((prev) => {
        const qty = Math.max(0, (prev[name] ?? 0) + delta);
        const next = { ...prev };
        if (qty === 0) {
          delete next[name];
        } else {
          next[name] = qty;
        }
        return next;
      });
      fetch(`/api/menus/${menuId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, delta }),
      })
        .then(async (res) => {
          const body = (await res.json()) as StandardResponse<OrderResult>;
          if (res.ok && body.data !== null) {
            setOrder(toOrderMap(body.data));
          }
        })
        .catch(() => {
          // poll reconciles on the next tick
        });
    },
    [menuId],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      fetch(`/api/menus/${menuId}/order`)
        .then(async (res) => {
          const body = (await res.json()) as StandardResponse<OrderResult>;
          if (res.ok && body.data !== null) {
            setOrder(toOrderMap(body.data));
          }
        })
        .catch(() => {
          // offline — keep the local view
        });
    }, ORDER_POLL_MS);
    return () => clearInterval(timer);
  }, [menuId]);

  const applyMenu = (view: MenuView) => {
    const hasGaps = view.dishes.some(
      (dish) => dish.calories === null || dish.description === null,
    );
    if (hasGaps) {
      setInfoSettled(false);
    }
    setDishes(view.dishes);
    setImages((prev) => {
      const next: Record<string, ImageState> = {};
      for (const dish of view.dishes) {
        const current = prev[dish.name];
        next[dish.name] =
          current && current.status !== "idle" ? current : toImageState(dish);
      }
      return next;
    });
    void pollInfo(
      view.dishes
        .filter((dish) => dish.calories === null || dish.description === null)
        .map((dish) => dish.name),
      INFO_POLL_TRIES,
    );
  };

  const addPhotos = async (files: File[]) => {
    const res = await fetch(`/api/menus/${menuId}/photos`, {
      method: "POST",
      body: await buildPhotoForm(files, menuLimits.maxImageDim),
    });
    const body = (await res.json()) as StandardResponse<ParseMenuResult>;
    if (!res.ok || body.error !== null || body.data === null) {
      throw new Error(body.error ?? "Something went wrong — please try again");
    }
    applyMenu(body.data.menu);
    setScanMoreOpen(false);
  };

  // A dish appears once it has substance (photo or facts); once info settles,
  // everything shows so nothing can stay hidden forever.
  const visibleDishes = dishes.filter(
    (dish) =>
      infoSettled ||
      images[dish.name]?.status === "done" ||
      dish.calories !== null ||
      dish.description !== null,
  );
  const holding = visibleDishes.length === 0 && dishes.length > 0;

  return (
    <main
      className={
        holding
          ? "mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16"
          : "mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-2"
      }
    >
      {holding ? null : (
        <header className="animate-fade sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 bg-background px-4 py-3">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Cart<span className="text-brass">aly</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share"
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 12.5V2.5" />
                <path d="M6.5 5.5 10 2l3.5 3.5" />
                <path d="M6.5 8.5h-2A1.5 1.5 0 0 0 3 10v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 16v-6a1.5 1.5 0 0 0-1.5-1.5h-2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setScanMoreOpen((open) => !open)}
              aria-label="Add photos"
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M10 3.5v13M3.5 10h13" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {scanMoreOpen && (
        <Modal ariaLabel="Add" onClose={() => setScanMoreOpen(false)}>
          <PhotoPicker submitText={() => "Add"} onSubmit={addPhotos} />
        </Modal>
      )}

      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}

      {detailName &&
        (() => {
          const dish = dishes.find((d) => d.name === detailName);
          if (!dish) {
            return null;
          }
          const image = images[detailName];
          return (
            <DishDetail
              dish={dish}
              imageUrl={image?.status === "done" ? image.url : null}
              qty={order[detailName] ?? 0}
              onBump={bumpOrder}
              onClose={() => setDetailName(null)}
            />
          );
        })()}

      {holding ? (
        <div className="flex flex-1 items-center justify-center">
          <ReadingView photoUrl={holdPhotoUrl} text="Looking up the dishes…" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col pb-16">
          {(() => {
            const visible = visibleDishes;
            const rendered = visible.map((dish, index) => {
              // Stable per-dish stagger so a batch of reveals cascades instead
              // of popping at once; derived from the name so it never changes.
              const delay = `${(dish.name.length % 8) * 60}ms`;
              return (
                <div
                  key={dish.name}
                  className="animate-rise"
                  style={{ animationDelay: delay }}
                >
                  <DishCard
                    dish={dish}
                    image={images[dish.name] ?? { status: "idle", url: null }}
                    orderQty={order[dish.name] ?? 0}
                    onVisible={requestImage}
                    onRetry={retryImage}
                    onBump={bumpOrder}
                    onOpen={setDetailName}
                  />
                  {index < visible.length - 1 && (
                    <div className="ml-25.5 h-px bg-line" aria-hidden="true" />
                  )}
                </div>
              );
            });
            return (
              <>
                {rendered}
                {visible.length < dishes.length && (
                  <div className="flex items-center justify-center gap-2.5 py-8 text-xs text-muted-fg">
                    <div
                      className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"
                      role="status"
                      aria-label="Loading more dishes"
                    />
                    loading more dishes…
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <TableOrder order={order} dishes={dishes} onBump={bumpOrder} />
    </main>
  );
};

export { MenuScreen };
export type { ImageState };
