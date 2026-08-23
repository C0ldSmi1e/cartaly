import { describe, expect, test } from "bun:test";
import {
  sanitizeRecents,
  upsertRecent,
  retitleRecent,
  type RecentMenu,
} from "@/src/lib/recent-menus";

const entry = (menuId: string, title = "Untitled", at = 0): RecentMenu => ({
  menuId,
  title,
  at,
});

describe("upsertRecent", () => {
  test("new menu lands first, titled Untitled", () => {
    const list = upsertRecent([entry("a", "Osaka", 1)], "b", 2);
    expect(list).toEqual([entry("b", "Untitled", 2), entry("a", "Osaka", 1)]);
  });

  test("known menu keeps its title and moves to the front", () => {
    const list = upsertRecent(
      [entry("a", "Osaka", 1), entry("b", "Bangkok", 2)],
      "b",
      3,
    );
    expect(list).toEqual([entry("b", "Bangkok", 3), entry("a", "Osaka", 1)]);
  });

  test("caps the list at 10", () => {
    let list: RecentMenu[] = [];
    for (let i = 0; i < 25; i++) {
      list = upsertRecent(list, `menu-${i}`, i);
    }
    expect(list).toHaveLength(10);
    expect(list[0].menuId).toBe("menu-24");
    expect(list[9].menuId).toBe("menu-15");
  });
});

describe("retitleRecent", () => {
  test("renames only the matching menu, trimmed", () => {
    const list = retitleRecent(
      [entry("a"), entry("b")],
      "a",
      "  Osaka ramen place  ",
    );
    expect(list[0].title).toBe("Osaka ramen place");
    expect(list[1].title).toBe("Untitled");
  });

  test("blank titles fall back to Untitled", () => {
    const list = retitleRecent([entry("a", "Osaka")], "a", "   ");
    expect(list[0].title).toBe("Untitled");
  });
});

describe("sanitizeRecents", () => {
  test("keeps well-formed entries, drops the rest", () => {
    const good = entry("a", "Osaka", 1);
    expect(
      sanitizeRecents([good, null, "junk", { menuId: "b" }, { title: "x", at: 1 }]),
    ).toEqual([good]);
  });

  test("non-arrays come back empty", () => {
    expect(sanitizeRecents("junk")).toEqual([]);
    expect(sanitizeRecents(null)).toEqual([]);
    expect(sanitizeRecents({ menuId: "a" })).toEqual([]);
  });
});
