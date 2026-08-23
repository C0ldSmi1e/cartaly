"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listRecents, renameRecent, type RecentMenu } from "@/src/lib/recent-menus";

const formatDay = (at: number): string =>
  new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const RecentMenus = () => {
  // localStorage is unreadable during SSR, so the list fills in after mount.
  const [recents, setRecents] = useState<RecentMenu[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setRecents(listRecents()), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!recents || recents.length === 0) {
    return null;
  }

  const saveTitle = (menuId: string, title: string) => {
    setRecents(renameRecent(menuId, title));
    setEditingId(null);
  };

  return (
    <section className="animate-fade mt-10 w-full max-w-md pb-8">
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-widest text-muted-fg uppercase">
        Recent menus
      </h2>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4">
        {recents.map((menu) => (
          <li key={menu.menuId} className="flex items-center gap-3 py-3">
            {editingId === menu.menuId ? (
              <input
                type="text"
                defaultValue={menu.title}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                onBlur={(e) => saveTitle(menu.menuId, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Menu name"
                className="min-w-0 flex-1 rounded-lg border border-line bg-background px-2.5 py-1.5 text-sm outline-none"
              />
            ) : (
              <>
                <Link
                  href={`/m/${menu.menuId}`}
                  prefetch={false}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold">{menu.title}</p>
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {formatDay(menu.at)}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => setEditingId(menu.menuId)}
                  aria-label={`Rename ${menu.title}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-fg"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.2 2.9a2.3 2.3 0 0 1 3.2 3.2L6.3 17.2 2 18.3l1.1-4.3z" />
                  </svg>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export { RecentMenus };
