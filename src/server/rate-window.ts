// Pure fixed-window math, kept import-free for bun test.
type Window = { count: number; resetAt: number };

type WindowDecision = {
  allowed: boolean;
  next: Window;
  retryAfterSec: number;
};

const applyWindow = (
  current: Window | null,
  now: number,
  limit: number,
  windowMs: number,
): WindowDecision => {
  const fresh = !current || now >= current.resetAt;
  const window: Window = fresh
    ? { count: 0, resetAt: now + windowMs }
    : { count: current.count, resetAt: current.resetAt };
  if (window.count >= limit) {
    return {
      allowed: false,
      next: window,
      retryAfterSec: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }
  return {
    allowed: true,
    next: { count: window.count + 1, resetAt: window.resetAt },
    retryAfterSec: 0,
  };
};

export { applyWindow };
export type { Window, WindowDecision };
