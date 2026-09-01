'use client';

import { RefObject, useEffect, useRef } from 'react';

const SCROLL_PX_PER_SEC = 14; // gentle, readable from the couch
const HOLD_MS = 4500; // pause at top/bottom before reversing

/**
 * Slow ping-pong auto-scroll for a list taller than its viewport. The position is written
 * straight to the list element's transform each frame and never touches React state, and the
 * motion state lives in refs, so a re-render (or the effect re-running) never resets the
 * scroll to the top. `paused` is read from a ref so the caller can flip it freely.
 */
export function useAutoScroll(viewportRef: RefObject<HTMLElement>, listRef: RefObject<HTMLElement>, pausedRef: RefObject<boolean>): void {
  const motion = useRef({ pos: 0, dir: 1, holdUntil: 0, last: 0, max: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;
    const m = motion.current;
    let raf = 0;

    // Measure the scroll range only when the content or viewport actually resizes, not on every
    // animation frame. Reading scrollHeight/clientHeight inside the frame loop forced a synchronous
    // layout every frame, which is what made the scroll stutter (most visibly on the Pi).
    const measure = () => {
      m.max = Math.max(0, list.scrollHeight - viewport.clientHeight);
      if (m.pos > m.max) m.pos = m.max;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    ro.observe(viewport);

    m.last = performance.now();
    if (!m.holdUntil) m.holdUntil = m.last + HOLD_MS;

    const tick = (t: number) => {
      const max = m.max;
      if (max <= 2) {
        m.pos = 0;
      } else if (!pausedRef.current && t >= m.holdUntil) {
        // Cap dt so a dropped frame (or a tab that was hidden) can't produce a visible jump.
        const dt = Math.min(0.05, Math.max(0, (t - m.last) / 1000));
        m.pos = Math.min(max, Math.max(0, m.pos + m.dir * SCROLL_PX_PER_SEC * dt));
        if (m.pos >= max) {
          m.dir = -1;
          m.holdUntil = t + HOLD_MS;
        } else if (m.pos <= 0) {
          m.dir = 1;
          m.holdUntil = t + HOLD_MS;
        }
      }
      list.style.transform = `translate3d(0, ${-m.pos}px, 0)`;
      m.last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [viewportRef, listRef, pausedRef]);
}
