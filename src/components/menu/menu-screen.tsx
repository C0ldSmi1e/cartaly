"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MenuDish, DishInfoResult } from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { DishCard } from "@/src/components/menu/dish-card";

type ImageState =
  | { status: "idle" | "queued" | "loading" | "error"; url: null }
  | { status: "done"; url: string };

const MAX_IN_FLIGHT = 4;
const INFO_POLL_MS = 4000;
const INFO_POLL_TRIES = 4;

const MenuScreen = ({ initialDishes }: { initialDishes: MenuDish[] }) => {
  const [dishes, setDishes] = useState(initialDishes);
  const [images, setImages] = useState<Record<string, ImageState>>(() =>
    Object.fromEntries(
      initialDishes.map((dish) => [
        dish.name,
        dish.imageUrl
          ? { status: "done", url: dish.imageUrl }
          : { status: "idle", url: null },
      ]),
    ),
  );
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    const gaps = initialDishes
      .filter((dish) => dish.calories === null || dish.description === null)
      .map((dish) => dish.name);
    if (gaps.length === 0) {
      return;
    }
    let cancelled = false;

    const poll = async (names: string[], tries: number) => {
      try {
        const res = await fetch("/api/dish-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names }),
        });
        const body = (await res.json()) as StandardResponse<DishInfoResult>;
        if (cancelled || !res.ok || body.error !== null || body.data === null) {
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
          setTimeout(() => poll(body.data!.pending, tries - 1), INFO_POLL_MS);
        }
      } catch {
        // info is decoration — a failed poll just leaves facts blank
      }
    };

    void poll(gaps, INFO_POLL_TRIES);
    return () => {
      cancelled = true;
    };
  }, [initialDishes]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the URL bar still works
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Cart<span className="text-accent">aly</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
          >
            {copied ? "Link copied" : "Share"}
          </button>
          <Link
            href="/"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Scan
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {dishes.map((dish) => (
          <DishCard
            key={dish.name}
            dish={dish}
            image={images[dish.name] ?? { status: "idle", url: null }}
            onVisible={requestImage}
            onRetry={retryImage}
          />
        ))}
      </div>
    </main>
  );
};

export { MenuScreen };
export type { ImageState };
