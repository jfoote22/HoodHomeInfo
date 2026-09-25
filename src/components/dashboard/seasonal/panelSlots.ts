'use client';

import { useEffect, useState, type RefObject } from 'react';

// Where each panel sits, for decorations that perch on panel edges (winter's snow caps,
// spring's grass). Panels size themselves with flexbox, so their positions aren't known up
// front; this measures every element tagged `data-hh-panel` inside the dashboard grid
// (`data-hh-grid`) and re-measures once a second (cheap: under ten rects), which also catches
// the calendar fading in over the live panels. A panel inside an aria-hidden wrapper (the
// faded-out side of that crossfade) reports visible: false so its decoration can fade with it.

export const DESIGN_WIDTH = 1920; // the dashboard is laid out at 1920×1080 and scaled to fit

export interface PanelSlot {
  key: string;
  /** Position and width in design pixels, relative to the dashboard grid. */
  x: number;
  y: number;
  w: number;
  /** The panel's corner radius, so decorations can taper off where the corners round. */
  radius: number;
  visible: boolean;
}

/** `ref` is any element inside the dashboard grid (a decoration layer). */
export function usePanelSlots(ref: RefObject<HTMLElement>): PanelSlot[] {
  const [slots, setSlots] = useState<PanelSlot[]>([]);
  useEffect(() => {
    const grid = ref.current?.closest('[data-hh-grid]') as HTMLElement | null;
    if (!grid) return;
    let last = '';
    const measure = () => {
      const g = grid.getBoundingClientRect();
      const scale = g.width / DESIGN_WIDTH || 1;
      const next: PanelSlot[] = Array.from(grid.querySelectorAll<HTMLElement>('[data-hh-panel]')).map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          key: String(i),
          x: Math.round((r.left - g.left) / scale),
          y: Math.round((r.top - g.top) / scale),
          w: Math.round(r.width / scale),
          radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16,
          visible: !el.closest('[aria-hidden="true"]'),
        };
      });
      const sig = JSON.stringify(next);
      if (sig !== last) {
        last = sig;
        setSlots(next);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    const id = setInterval(measure, 1000);
    return () => {
      ro.disconnect();
      clearInterval(id);
    };
  }, [ref]);
  return slots;
}

/** Fixed-seed random numbers: the same decoration on every load and in every render. */
export function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}
