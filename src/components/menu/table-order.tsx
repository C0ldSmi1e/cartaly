"use client";

import { useState } from "react";
import type { MenuDish, OrderDelta } from "@/src/schemas/menu";
import { TrashIcon } from "@/src/components/menu/trash-icon";

const TableOrder = ({
  order,
  dishes,
  onBump,
}: {
  order: Record<string, number>;
  dishes: MenuDish[];
  onBump: (name: string, delta: OrderDelta) => void;
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [waiterOpen, setWaiterOpen] = useState(false);

  const entries = Object.entries(order).filter(([, qty]) => qty > 0);
  const itemCount = entries.reduce((sum, [, qty]) => sum + qty, 0);
  if (itemCount === 0) {
    return null;
  }

  const originalOf = (name: string) =>
    dishes.find((dish) => dish.name === name)?.originalName ?? name;

  const clearAll = () => {
    for (const [name] of entries) {
      onBump(name, "clear");
    }
    setSheetOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="animate-rise fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl items-center justify-between rounded-full bg-accent px-6 py-4 text-sm font-semibold text-white shadow-xl"
      >
        <span>
          Table order · {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
        <span className="font-medium opacity-70">View order →</span>
      </button>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Table order"
            className="animate-rise max-h-[78vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">Table order</h2>
            <p className="mb-3 text-xs text-muted-fg">
              Everyone at this link sees the same list.
            </p>
            {entries.map(([name, qty]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="truncate text-xs text-accent">{originalOf(name)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 rounded-full bg-background px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => onBump(name, "clear")}
                    aria-label={`Remove ${name} from the order`}
                    className="text-muted-fg"
                  >
                    <TrashIcon />
                  </button>
                  <span className="h-3.5 w-px bg-line" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => onBump(name, -1)}
                    aria-label={`Remove one ${name}`}
                    className="text-accent"
                  >
                    −
                  </button>
                  <span className="min-w-4 text-center text-sm font-bold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onBump(name, 1)}
                    aria-label={`Add one ${name}`}
                    className="text-accent"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setSheetOpen(false);
                setWaiterOpen(true);
              }}
              className="mt-4 w-full rounded-full bg-accent py-3.5 font-semibold text-white"
            >
              Show to server
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="mt-2 w-full py-1 text-xs text-muted-fg"
            >
              Clear order
            </button>
          </div>
        </div>
      )}

      {waiterOpen && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer flex-col overflow-y-auto bg-white px-6 py-10 text-[#241f1b]"
          onClick={() => setWaiterOpen(false)}
        >
          <p className="mb-6 text-xs font-semibold tracking-widest text-[#7d756b] uppercase">
            We would like to order
          </p>
          {entries.map(([name, qty]) => (
            <div
              key={name}
              className="flex items-baseline justify-between border-b border-[#f0eae2] py-4"
            >
              <span className="min-w-0">
                <span className="block text-3xl leading-snug font-bold">
                  {originalOf(name)}
                </span>
                {name && (
                  <span className="mt-1 block text-sm text-[#7d756b]">{name}</span>
                )}
              </span>
              <span className="ml-4 shrink-0 text-xl font-bold text-accent">
                × {qty}
              </span>
            </div>
          ))}
          <p className="mt-auto pt-8 text-center text-xs text-[#a8a29e]">
            tap anywhere to close
          </p>
        </div>
      )}
    </>
  );
};

export { TableOrder };
