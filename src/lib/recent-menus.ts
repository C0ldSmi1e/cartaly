// Device-local "recent menus" history. No server state: menus already live
// forever behind /m/[id], so the device only remembers which ones it has seen.
const STORAGE_KEY = "cartaly:recent-menus";
const MAX_RECENTS = 20;
const DEFAULT_TITLE = "Untitled";

type RecentMenu = { menuId: string; title: string; at: number };

// Pure ops (exported for tests); the storage-backed API lives below.
const sanitizeRecents = (value: unknown): RecentMenu[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is RecentMenu =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentMenu).menuId === "string" &&
          typeof (item as RecentMenu).title === "string" &&
          typeof (item as RecentMenu).at === "number",
      )
    : [];

const upsertRecent = (
  list: RecentMenu[],
  menuId: string,
  at: number,
): RecentMenu[] => {
  const title = list.find((m) => m.menuId === menuId)?.title ?? DEFAULT_TITLE;
  return [{ menuId, title, at }, ...list.filter((m) => m.menuId !== menuId)].slice(
    0,
    MAX_RECENTS,
  );
};

const retitleRecent = (
  list: RecentMenu[],
  menuId: string,
  title: string,
): RecentMenu[] => {
  const clean = title.trim() || DEFAULT_TITLE;
  return list.map((m) => (m.menuId === menuId ? { ...m, title: clean } : m));
};

// localStorage can be absent, full, or hold garbage — then reads come back
// empty and writes are dropped, and the feature is silently absent.
const listRecents = (): RecentMenu[] => {
  try {
    return sanitizeRecents(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
};

const writeRecents = (list: RecentMenu[]): RecentMenu[] => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // dropped — see above
  }
  return list;
};

const recordRecent = (menuId: string): void => {
  writeRecents(upsertRecent(listRecents(), menuId, Date.now()));
};

const renameRecent = (menuId: string, title: string): RecentMenu[] =>
  writeRecents(retitleRecent(listRecents(), menuId, title));

export {
  listRecents,
  recordRecent,
  renameRecent,
  sanitizeRecents,
  upsertRecent,
  retitleRecent,
};
export type { RecentMenu };
