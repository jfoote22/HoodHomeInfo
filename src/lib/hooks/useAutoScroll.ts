'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

const SCROLL_PX_PER_SEC = 14; // gentle, readable from the couch
const HOLD_MS = 4500; // pause at top/bottom before reversing

/**
 * Slow ping-pong auto-scroll for a list taller than its viewport. The position is written
 * straight to the list element's transform each frame (routing it through React state
 * re-rendered every row per frame and stuttered on the Pi). `paused` is read from a ref so
 * the caller can flip it without restarting the loop.
 */
export function useAutoScroll(
  viewportRef: RefObject<HTMLElement>,
  listRef: RefObject<HTMLElement>,
  pausedRef: RefObject<boolean>,
  deps: unknown[],
): { canScroll: boolean; scrolled: boolean } {
  const [canScroll, setCanScroll] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;
    let raf = 0;
    let last = performance.now();
    let dir = 1;
    let holdUntil = last + HOLD_MS;
    let pos = 0;

    const tick = (t: number) => {
      const max = Math.max(0, list.scrollHeight - viewport.clientHeight);
      setCanScroll(max > 2);
      if (max <= 2) {
        pos = 0;
      } else if (!pausedRef.current && t >= holdUntil) {
        // Cap dt so a dropped frame (or a tab that was hidden) can't produce a visible jump.
        const dt = Math.min(0.05, (t - last) / 1000);
        pos = Math.min(max, Math.max(0, pos + dir * SCROLL_PX_PER_SEC * dt));
        if (pos >= max) {
          dir = -1;
          holdUntil = t + HOLD_MS;
        } else if (pos <= 0) {
          dir = 1;
          holdUntil = t + HOLD_MS;
        }
      }
      list.style.transform = `translate3d(0, ${-pos}px, 0)`;
      const s = pos > 2;
      if (s !== scrolledRef.current) {
        scrolledRef.current = s;
        setScrolled(s);
      }
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { canScroll, scrolled };
}
