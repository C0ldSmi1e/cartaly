"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  MenuDish,
  MenuView,
  DishInfoResult,
  ParseMenuResult,
} from "@/src/schemas/menu";
import type { StandardResponse } from "@/src/schemas/standard-response";
import { menuLimits } from "@/src/config/constants";
import { buildPhotoForm } from "@/src/lib/image";
import { DishCard } from "@/src/components/menu/dish-card";
import { PagePicker } from "@/src/components/scan/page-picker";

type ImageState =
  | { status: "idle" | "queued" | "loading" | "error"; url: null }
  | { status: "done"; url: string };

const MAX_IN_FLIGHT = 4;
const INFO_POLL_MS = 4000;
const INFO_POLL_TRIES = 4;

const toImageState = (dish: MenuDish): ImageState =>
  dish.imageUrl
    ? { status: "done", url: dish.imageUrl }
    : { status: "idle", url: null };

const MenuScreen = ({
  menuId,
  initialDishes,
}: {
  menuId: string;
  initialDishes: MenuDish[];
}) => {
  const [dishes, setDishes] = useState(initialDishes);
  const [images, setImages] = useState<Record<string, ImageState>>(() =>
    Object.fromEntries(initialDishes.map((dish) => [dish.name, toImageState(dish)])),
  );
  const [copied, setCopied] = useState(false);
  const [scanMoreOpen, setScanMoreOpen] = useState(false);

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
      }
    } catch {
      // info is decoration — a failed poll just leaves facts blank
    }
  }, []);

  useEffect(() => {
    pollInfoRef.current = (names, tries) => void pollInfo(names, tries);
  }, [pollInfo]);

  useEffect(() => {
    const gaps = initialDishes
      .filter((dish) => dish.calories === null || dish.description === null)
      .map((dish) => dish.name);
    const timer = setTimeout(() => pollInfoRef.current(gaps, INFO_POLL_TRIES), 0);
    return () => clearTimeout(timer);
  }, [initialDishes]);

  const applyMenu = (view: MenuView) => {
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
    const res = await fetch(`/api/menus/${menuId}/pages`, {
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
          <button
            type="button"
            onClick={() => setScanMoreOpen((open) => !open)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Scan more
          </button>
        </div>
      </header>

      {scanMoreOpen && (
        <div className="mb-5 rounded-2xl border border-line bg-surface p-4">
          <PagePicker
            submitText={(count) =>
              count <= 1 ? "Add this page" : `Add ${count} pages`
            }
            onSubmit={addPhotos}
          />
        </div>
      )}

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
