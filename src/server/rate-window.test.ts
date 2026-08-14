import { describe, expect, test } from "bun:test";
import { applyWindow } from "@/src/server/rate-window";

const HOUR = 3_600_000;

describe("applyWindow", () => {
  test("first request opens a window", () => {
    const d = applyWindow(null, 1000, 5, HOUR);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ count: 1, resetAt: 1000 + HOUR });
  });

  test("counts up to the limit", () => {
    let win = { count: 0, resetAt: HOUR };
    for (let i = 0; i < 5; i++) {
      const d = applyWindow(win, 1000, 5, HOUR);
      expect(d.allowed).toBe(true);
      win = d.next;
    }
    expect(win.count).toBe(5);
  });

  test("blocks past the limit with retry seconds", () => {
    const d = applyWindow({ count: 5, resetAt: 61_000 }, 1000, 5, HOUR);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSec).toBe(60);
    expect(d.next.count).toBe(5);
  });

  test("expired window resets", () => {
    const d = applyWindow({ count: 5, resetAt: 1000 }, 1000, 5, HOUR);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ count: 1, resetAt: 1000 + HOUR });
  });

  test("retryAfterSec is at least 1", () => {
    const d = applyWindow({ count: 5, resetAt: 1100 }, 1000, 5, HOUR);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSec).toBe(1);
  });
});
