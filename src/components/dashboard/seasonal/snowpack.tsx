'use client';

import { useEffect, useRef, useState } from 'react';
import type { DashboardTheme } from '../theme';

// Snow that has settled: a cap along the top of every panel and a bank along the bottom of the
// screen. Panels size themselves with flexbox, so their positions aren't known up front; this
// measures every element tagged `data-hh-panel` inside the dashboard grid and re-measures once a
// second (cheap: under ten rects), which also catches the calendar fading in over the live panels.
// Panels inside an aria-hidden wrapper (the faded-out side of that crossfade) lose their caps,
// with the same fade.
// Both grow in over the first half minute after load, via .hh-snow-build in globals.css.

const DESIGN_WIDTH = 1920; // the dashboard is laid out at 1920×1080 and scaled to fit
const CAP_RISE = 16; // how far the drift sits above the panel's top edge
const CAP_SINK = 6; // how far it laps over the edge onto the panel

interface Slot {
  key: string;
  x: number;
  y: number;
  w: number;
  radius: number;
  visible: boolean;
}

function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

/** Smooth closed outline through (x, y) points along the top, closed along `baseY`. */
function driftPath(points: [number, number][], baseY: number): string {
  let d = `M ${points[0][0]} ${baseY} L ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    d += ` Q ${px} ${py} ${(px + x) / 2} ${(py + y) / 2}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last[0]} ${last[1]} L ${last[0]} ${baseY} Z`;
  return d;
}

/** A lumpy drift that tapers to nothing where the panel's corners round off. */
function capShape(w: number, radius: number, seed: number) {
  const rnd = seeded(seed);
  const inset = radius * 0.3;
  const span = w - inset * 2;
  const steps = Math.max(6, Math.round(span / 34));
  const base = CAP_RISE + CAP_SINK;
  const top: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Full depth across the middle, easing to zero over the corner radius at each end.
    const edge = Math.min(1, (t * span) / (radius * 2.2), ((1 - t) * span) / (radius * 2.2));
    const ease = edge * edge * (3 - 2 * edge);
    const depth = ease * (CAP_RISE * (0.6 + rnd() * 0.4) + CAP_SINK);
    top.push([inset + t * span, base - depth]);
  }
  // A few icicles where the snow laps over the edge.
  const icicles: { x: number; len: number; w: number }[] = [];
  const count = Math.floor(span / 120);
  for (let i = 0; i < count; i++) {
    icicles.push({ x: inset + radius + rnd() * (span - radius * 2), len: 5 + rnd() * 9, w: 2.5 + rnd() * 2.5 });
  }
  return { path: driftPath(top, base), icicles };
}

function useSlots(ref: React.RefObject<HTMLDivElement>) {
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => {
    const grid = ref.current?.closest('[data-hh-grid]') as HTMLElement | null;
    if (!grid) return;
    let last = '';
    const measure = () => {
      const g = grid.getBoundingClientRect();
      const scale = g.width / DESIGN_WIDTH || 1;
      const next: Slot[] = Array.from(grid.querySelectorAll<HTMLElement>('[data-hh-panel]')).map((el, i) => {
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

function snowColors(theme: DashboardTheme) {
  return theme.isLight
    ? { top: '#ffffff', bottom: '#e3f0fa', edge: 'rgba(90,130,175,.45)', ice: 'rgba(170,215,245,.9)', shadow: 'drop-shadow(0 2px 3px rgba(40,90,140,.25))' }
    : { top: '#ffffff', bottom: '#d6e8f7', edge: 'rgba(255,255,255,.6)', ice: 'rgba(200,232,255,.85)', shadow: 'drop-shadow(0 3px 4px rgba(0,10,25,.45))' };
}

export function SnowCaps({ theme }: { theme: DashboardTheme }) {
  const ref = useRef<HTMLDivElement>(null);
  const slots = useSlots(ref);
  const c = snowColors(theme);
  const h = CAP_RISE + CAP_SINK + 16; // room below the cap for icicles

  return (
    <div ref={ref}>
      {slots.map((s) => {
        const { path, icicles } = capShape(s.w, s.radius, 1000 + s.w * 7 + s.x);
        const base = CAP_RISE + CAP_SINK;
        return (
          <svg
            key={s.key}
            width={s.w}
            height={h}
            className="hh-snow-build"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y - CAP_RISE,
              overflow: 'visible',
              // Grow up from the panel's top edge, not from the bottom of the icicle room.
              transformOrigin: `50% ${((base / h) * 100).toFixed(1)}%`,
              opacity: s.visible ? 1 : 0,
              transition: 'opacity 1.4s ease-in-out',
              filter: c.shadow,
            }}
          >
            <defs>
              <linearGradient id={`hh-cap-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.top} />
                <stop offset="1" stopColor={c.bottom} />
              </linearGradient>
            </defs>
            {icicles.map((ic, i) => (
              <path key={i} d={`M ${ic.x - ic.w / 2} ${base - 1} L ${ic.x + ic.w / 2} ${base - 1} L ${ic.x} ${base + ic.len} Z`} fill={c.ice} />
            ))}
            <path d={path} fill={`url(#hh-cap-${s.key})`} stroke={c.edge} strokeWidth={0.8} />
          </svg>
        );
      })}
    </div>
  );
}

// The bank along the bottom: low across the middle, heaped up in the two corners.
const BANK_H = 64;
const BANK_PATH = (() => {
  const rnd = seeded(1221);
  const pts: [number, number][] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const corner = Math.max(0, 1 - Math.min(t, 1 - t) / 0.12); // 1 at the very edge
    const height = 12 + rnd() * 9 + corner * corner * 34;
    pts.push([t * DESIGN_WIDTH, BANK_H - height]);
  }
  pts[0][0] = -20;
  pts[pts.length - 1][0] = DESIGN_WIDTH + 20;
  return driftPath(pts, BANK_H + 2);
})();

export function SnowBank({ theme }: { theme: DashboardTheme }) {
  const c = snowColors(theme);
  return (
    <svg
      width={DESIGN_WIDTH}
      height={BANK_H}
      viewBox={`0 0 ${DESIGN_WIDTH} ${BANK_H}`}
      className="hh-snow-build"
      style={{ position: 'absolute', left: 0, bottom: 0, overflow: 'visible', filter: c.shadow }}
    >
      <defs>
        <linearGradient id="hh-bank" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.top} />
          <stop offset="1" stopColor={c.bottom} />
        </linearGradient>
      </defs>
      <path d={BANK_PATH} fill="url(#hh-bank)" stroke={c.edge} strokeWidth={0.8} />
    </svg>
  );
}
