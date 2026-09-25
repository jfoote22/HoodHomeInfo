'use client';

import { useRef, type CSSProperties } from 'react';
import type { DashboardTheme } from '../theme';
import { DESIGN_WIDTH as W, seeded, usePanelSlots } from './panelSlots';

// Spring: cherry-blossom petals tumbling down, flowering branches reaching in from the two top
// corners, grass and flowers growing along the top of every panel (like winter's snow caps) and
// along the bottom of the screen. Branches reach in and the grass grows up over the first half
// minute (.hh-bloom and .hh-snow-build in globals.css); petals reuse the autumn leaves' fall and
// tumble. Everything stays inside the 26px outer margin or just over a panel's edge, clear of
// panel headers.

const PETAL_COLORS = ['#f9c6d9', '#f4a3c0', '#fde2ec', '#fff3f7', '#f7b5cd'];

export function SpringBackdrop({ theme }: { theme: DashboardTheme }) {
  const a = theme.isLight ? 0.35 : 0.18;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: [
          // Blossom pink up top where the branches are, new-leaf green down at the meadow.
          `radial-gradient(40% 45% at 0% 0%, rgba(244,163,192,${a}), transparent 70%)`,
          `radial-gradient(40% 45% at 100% 0%, rgba(244,163,192,${a}), transparent 70%)`,
          `radial-gradient(60% 35% at 50% 100%, rgba(134,200,110,${a * 0.8}), transparent 72%)`,
        ].join(', '),
      }}
    />
  );
}

// --- Petals and blossoms --------------------------------------------------------------------

/** A single cherry petal: a rounded teardrop with the little notch at its tip. */
const PETAL_PATH = 'M50 92 C22 72 18 36 38 14 L50 24 L62 14 C82 36 78 72 50 92 Z';

function Blossom({ size, color, center = '#e0527f' }: { size: number; color: string; center?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M50 50 C36 40 34 18 44 8 L50 14 L56 8 C66 18 64 40 50 50 Z" fill={color} transform={`rotate(${r} 50 50)`} />
      ))}
      <circle cx={50} cy={50} r={8} fill={center} />
      {[0, 72, 144, 216, 288].map((r) => (
        <circle key={r} cx={50} cy={36} r={2.6} fill="#f6d365" transform={`rotate(${r + 36} 50 50)`} />
      ))}
    </svg>
  );
}

const PETAL_COUNT = 30;
const BLOSSOM_COUNT = 6;

const FALLING = (() => {
  const rnd = seeded(20260320);
  const total = PETAL_COUNT + BLOSSOM_COUNT;
  return Array.from({ length: total }, (_, i) => {
    const whole = i % 6 === 3;
    const fall = 28 + rnd() * 16;
    return {
      whole,
      left: ((i + 0.2 + rnd() * 0.6) / total) * 100,
      size: whole ? Math.round(20 + rnd() * 8) : Math.round(10 + rnd() * 7),
      color: PETAL_COLORS[Math.floor(rnd() * PETAL_COLORS.length)],
      fall,
      sway: 3.6 + rnd() * 2.4,
      delay: -rnd() * fall,
      drift: Math.round((rnd() - 0.5) * 240),
    };
  });
})();

function Petals({ theme }: { theme: DashboardTheme }) {
  // Pale pink on Daylight Glass needs a whisper of an edge to be seen at all.
  const edge = theme.isLight ? 'drop-shadow(0 0 1px rgba(160,60,100,.55))' : undefined;
  return (
    <>
      {FALLING.map((p, i) => (
        <div
          key={i}
          className="hh-leaf-fall"
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              animationDuration: `${p.fall}s`,
              animationDelay: `${p.delay}s`,
              '--hh-drift': `${p.drift}px`,
              opacity: 0.9,
            } as CSSProperties
          }
        >
          <div className="hh-leaf-sway" style={{ animationDuration: `${p.sway}s`, animationDelay: `${p.delay}s`, filter: edge }}>
            {p.whole ? (
              <Blossom size={p.size} color={p.color} />
            ) : (
              <svg viewBox="0 0 100 100" width={p.size} height={p.size} style={{ display: 'block' }}>
                <path d={PETAL_PATH} fill={p.color} />
                <path d="M50 86 L50 34" stroke="rgba(200,80,120,.3)" strokeWidth={3} strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// --- Branches ------------------------------------------------------------------------------

// Drawn for the top-left corner in a 420×70 box and mirrored for the top-right. The limb runs
// along the 26px outer margin and nothing hangs below y≈36, so the blossoms can lap over a
// panel's top edge but never reach its header ("OUR EVENTS", "WEATHER & TIDES" sit at y≈48).
const BRANCH_W = 420;
const BRANCH_H = 70;
const LIMB = 'M -10 4 C 60 8 120 14 190 16 C 250 18 300 12 360 16 C 385 18 405 20 420 22';
const TWIGS = [
  'M 120 14 C 130 20 138 24 148 26',
  'M 230 17 C 238 10 248 6 262 3',
  'M 300 13 C 312 18 322 22 336 24',
  'M 70 9 C 78 3 88 0 100 -2',
];
const BRANCH_BLOSSOMS = (() => {
  const rnd = seeded(417);
  const spots: [number, number][] = [
    [18, 6], [44, 9], [78, 5], [100, -1], [128, 18], [148, 25], [176, 15], [206, 18], [226, 14],
    [262, 3], [248, 9], [286, 14], [318, 20], [336, 24], [352, 15], [382, 19], [410, 22],
  ];
  return spots.map(([x, y]) => ({
    x: x + (rnd() - 0.5) * 6,
    y: y + (rnd() - 0.5) * 4,
    size: Math.round(13 + rnd() * 7),
    color: PETAL_COLORS[Math.floor(rnd() * PETAL_COLORS.length)],
    rot: Math.round(rnd() * 72),
    bud: rnd() < 0.22,
  }));
})();

function Branch({ flip, theme }: { flip?: boolean; theme: DashboardTheme }) {
  const bark = theme.isLight ? '#6b4a3a' : '#4a3328';
  // The outer box does the mirroring; the svg inside runs the grow-in animation, which would
  // otherwise overwrite the flip (both are transforms).
  return (
    <div style={{ position: 'absolute', top: 0, [flip ? 'right' : 'left']: 0, width: BRANCH_W, height: BRANCH_H, transform: flip ? 'scaleX(-1)' : undefined }}>
    <svg
      width={BRANCH_W}
      height={BRANCH_H}
      viewBox={`0 0 ${BRANCH_W} ${BRANCH_H}`}
      className="hh-bloom"
      style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(20,8,16,.35))' }}
    >
      <path d={LIMB} stroke={bark} strokeWidth={5} fill="none" strokeLinecap="round" />
      {TWIGS.map((d, i) => (
        <path key={i} d={d} stroke={bark} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      ))}
      {BRANCH_BLOSSOMS.map((b, i) =>
        b.bud ? (
          <ellipse key={i} cx={b.x} cy={b.y} rx={3.5} ry={5} fill="#e98bb0" transform={`rotate(${b.rot} ${b.x} ${b.y})`} />
        ) : (
          <g key={i} transform={`translate(${b.x - b.size / 2} ${b.y - b.size / 2}) rotate(${b.rot} ${b.size / 2} ${b.size / 2})`}>
            <Blossom size={b.size} color={b.color} />
          </g>
        ),
      )}
    </svg>
    </div>
  );
}

// --- Grass and flowers ---------------------------------------------------------------------

type Flower = { x: number; h: number; kind: 'daffodil' | 'tulip'; color: string };
const TULIP_COLORS = ['#f472b6', '#fb7185', '#c084fc', '#f9a8d4'];

function randomFlower(rnd: () => number, x: number, h: number): Flower {
  return { x, h, kind: rnd() < 0.55 ? 'daffodil' : 'tulip', color: TULIP_COLORS[Math.floor(rnd() * TULIP_COLORS.length)] };
}

/** One grass blade rooted at (x, baseY), as a closed path segment. */
function blade(x: number, baseY: number, h: number, lean: number, w: number): string {
  return `M ${x - w} ${baseY} Q ${x + lean * 0.3} ${baseY - h * 0.6} ${x + lean} ${baseY - h} Q ${x + lean * 0.3 + 1} ${baseY - h * 0.5} ${x + w} ${baseY} Z`;
}

function grassTones(theme: DashboardTheme): [string, string] {
  return theme.isLight ? ['#4d8a3a', '#72b556'] : ['#3f7a34', '#65a84c'];
}

/** A stem with a daffodil or tulip head, standing on baseY. `scale` shrinks the head. */
function FlowerNode({ f, baseY, stem, scale = 1 }: { f: Flower; baseY: number; stem: string; scale?: number }) {
  const top = baseY - f.h;
  return (
    <g>
      <path d={`M ${f.x} ${baseY} C ${f.x - 2} ${baseY - f.h * 0.5} ${f.x + 2} ${top + 8} ${f.x} ${top + 4}`} stroke={stem} strokeWidth={2 * scale} fill="none" />
      <g transform={`translate(${f.x} ${top}) scale(${scale})`}>
        {f.kind === 'daffodil' ? (
          <>
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <ellipse key={r} cx={0} cy={-4.5} rx={2.6} ry={4.8} fill="#fde047" transform={`rotate(${r})`} />
            ))}
            <circle r={3.2} fill="#f59e0b" />
          </>
        ) : (
          <path d="M -5 -1 C -5 7 5 7 5 -1 L 2.5 2 L 0 -3 L -2.5 2 Z" fill={f.color} />
        )}
      </g>
    </g>
  );
}

// Grass along the top of every panel. It roots on the panel's top edge, rises into the gutter
// above it, and thins out to nothing where the corners round off, the way the snow caps do.
const TOP_RISE = 20; // tallest flower above the edge; the gutter above a panel is 22-26px
const TOP_SINK = 3; // roots lap just over the edge so the grass reads as sitting on the panel

function panelGrass(w: number, radius: number, seed: number) {
  const rnd = seeded(seed);
  const inset = radius * 0.35;
  const span = w - inset * 2;
  const base = TOP_RISE + TOP_SINK;
  const blades: string[][] = [[], []];
  const count = Math.round(span / 4.5);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const x = inset + t * span + rnd() * 3;
    const edge = Math.min(1, (t * span) / (radius * 2), ((1 - t) * span) / (radius * 2));
    const ease = edge * edge * (3 - 2 * edge);
    const h = ease * (4 + rnd() * 8) + 1;
    blades[i % 2].push(blade(x, base, h, (rnd() - 0.5) * 7, 1.4 + rnd() * 1.4));
  }
  const flowers: Flower[] = [];
  const n = Math.max(1, Math.floor(span / 95));
  for (let i = 0; i < n; i++) {
    const x = inset + radius + ((i + 0.15 + rnd() * 0.7) / n) * (span - radius * 2);
    flowers.push(randomFlower(rnd, x, 11 + rnd() * 7));
  }
  return { dark: blades[0].join(' '), light: blades[1].join(' '), flowers, base };
}

function GrassCaps({ theme }: { theme: DashboardTheme }) {
  const ref = useRef<HTMLDivElement>(null);
  const slots = usePanelSlots(ref);
  const [deep, fresh] = grassTones(theme);
  const h = TOP_RISE + TOP_SINK + 4;
  return (
    <div ref={ref}>
      {slots.map((s) => {
        const g = panelGrass(s.w, s.radius, 700 + s.w * 3 + s.x);
        return (
          <svg
            key={s.key}
            width={s.w}
            height={h}
            className="hh-snow-build"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y - TOP_RISE,
              overflow: 'visible',
              opacity: s.visible ? 1 : 0,
              transition: 'opacity 1.4s ease-in-out',
              // Grow up from the panel's edge.
              transformOrigin: `50% ${((g.base / h) * 100).toFixed(1)}%`,
              filter: 'drop-shadow(0 1px 1.5px rgba(10,20,8,.35))',
            }}
          >
            <path d={g.dark} fill={deep} />
            {g.flowers.map((f, i) => (
              <FlowerNode key={i} f={f} baseY={g.base} stem={deep} scale={0.85} />
            ))}
            <path d={g.light} fill={fresh} />
          </svg>
        );
      })}
    </div>
  );
}

// --- Meadow --------------------------------------------------------------------------------

const MEADOW_H = 80;

const MEADOW = (() => {
  const rnd = seeded(5150);
  // Grass: every blade in one path per tone, so the whole strip is two DOM nodes.
  const blades: string[][] = [[], []];
  const bladeCount = 420;
  for (let i = 0; i < bladeCount; i++) {
    const x = (i / bladeCount) * (W + 40) - 20 + rnd() * 6;
    const t = Math.min(1, Math.max(0, x / W));
    const corner = Math.max(0, 1 - Math.min(t, 1 - t) / 0.06); // 1 at the screen edge
    const h = 5 + rnd() * 9 + corner * corner * 26;
    const lean = (rnd() - 0.5) * 12;
    const w = 2 + rnd() * 2;
    blades[i % 2].push(blade(x, MEADOW_H + 2, h + 2, lean, w));
  }
  // Flowers cluster in the corners, a few short ones dot the middle. Heights are capped so they
  // stay under the ticker's text and the theme/season buttons at its right end.
  const flowers: Flower[] = [];
  const add = (x: number, h: number) => flowers.push(randomFlower(rnd, x, h));
  for (let i = 0; i < 5; i++) add(6 + i * 20 + rnd() * 6, 38 - i * 6 + rnd() * 3);
  for (let i = 0; i < 5; i++) add(W - 6 - i * 20 - rnd() * 6, 22 - i * 2 + rnd() * 3);
  for (let i = 0; i < 8; i++) add(260 + i * 200 + rnd() * 80, 12 + rnd() * 5);
  return { dark: blades[0].join(' '), light: blades[1].join(' '), flowers };
})();

function Meadow({ theme }: { theme: DashboardTheme }) {
  const [deep, fresh] = grassTones(theme);
  return (
    <svg
      width={W}
      height={MEADOW_H}
      viewBox={`0 0 ${W} ${MEADOW_H}`}
      className="hh-snow-build"
      style={{ position: 'absolute', left: 0, bottom: 0, overflow: 'visible', filter: 'drop-shadow(0 -1px 2px rgba(10,20,8,.3))' }}
    >
      <path d={MEADOW.dark} fill={deep} />
      {MEADOW.flowers.map((f, i) => (
        <FlowerNode key={i} f={f} baseY={MEADOW_H} stem={deep} />
      ))}
      <path d={MEADOW.light} fill={fresh} />
    </svg>
  );
}

export function SpringForeground({ theme }: { theme: DashboardTheme }) {
  return (
    <>
      <Meadow theme={theme} />
      <GrassCaps theme={theme} />
      <Branch theme={theme} />
      <Branch theme={theme} flip />
      <Petals theme={theme} />
    </>
  );
}
