'use client';

import type { CSSProperties } from 'react';
import type { DashboardTheme } from '../theme';

// Autumn: a fall-green wash behind the panels and a few leaves drifting down across the screen.
// Leaves are inline SVG; motion is transform-only CSS (see .hh-leaf-* in globals.css) so it
// stays on the compositor on the Pi.

type LeafKind = 'maple' | 'oak' | 'birch';

// Big-leaf maple rust, vine maple crimson, alder gold, oak brown - Hood Canal's own October.
const COLORS = {
  rust: '#c2410c',
  amber: '#d97706',
  gold: '#ca8a04',
  crimson: '#b91c1c',
  brown: '#92400e',
} as const;
type LeafColor = keyof typeof COLORS;

function LeafShape({ kind, color }: { kind: LeafKind; color: string }) {
  const vein = 'rgba(40,16,4,.38)';
  if (kind === 'maple') {
    return (
      <>
        <path
          d="M50 78 L56 72 L72 76 L70 68 L88 56 L80 52 L84 40 L72 42 L70 34 L60 44 L62 22 L56 24 L50 8 L44 24 L38 22 L40 44 L30 34 L28 42 L16 40 L20 52 L12 56 L30 68 L28 76 L44 72 Z"
          fill={color}
        />
        <path d="M50 96 L50 16 M50 70 L78 52 M50 70 L22 52 M50 58 L64 36 M50 58 L36 36" stroke={vein} strokeWidth={2} fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'oak') {
    return (
      <>
        <path
          d="M50 6 C58 10 60 18 56 22 C64 20 68 28 60 34 C70 34 72 44 62 48 C72 50 72 60 62 62 C70 66 66 76 56 74 L52 80 L48 80 L44 74 C34 76 30 66 38 62 C28 60 28 50 38 48 C28 44 30 34 40 34 C32 28 36 20 44 22 C40 18 42 10 50 6 Z"
          fill={color}
        />
        <path d="M50 94 L50 12 M50 34 L62 28 M50 34 L38 28 M50 50 L64 44 M50 50 L36 44 M50 64 L62 60 M50 64 L38 60" stroke={vein} strokeWidth={2} fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path d="M50 8 C74 28 74 60 50 84 C26 60 26 28 50 8 Z" fill={color} />
      <path d="M50 94 L50 14 M50 40 L62 30 M50 40 L38 30 M50 58 L64 46 M50 58 L36 46" stroke={vein} strokeWidth={2} fill="none" strokeLinecap="round" />
    </>
  );
}

function Leaf({ kind, color, size, style }: { kind: LeafKind; color: LeafColor; size: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', ...style }}>
      <LeafShape kind={kind} color={COLORS[color]} />
    </svg>
  );
}

// Olive and moss rather than orange: October on Hood Canal is turning maples against a wall of
// evergreens, so the screen takes on the green and the falling leaves carry the warm colours.
export function FallBackdrop({ theme }: { theme: DashboardTheme }) {
  const a = theme.isLight ? 0.22 : 0.26;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: [
          `radial-gradient(55% 60% at 0% 100%, rgba(101,125,45,${a}), transparent 72%)`,
          `radial-gradient(50% 55% at 100% 0%, rgba(128,140,52,${a}), transparent 72%)`,
          `radial-gradient(45% 50% at 100% 100%, rgba(77,107,47,${a * 0.9}), transparent 72%)`,
          `radial-gradient(40% 45% at 0% 0%, rgba(77,107,47,${a * 0.7}), transparent 72%)`,
          `linear-gradient(rgba(96,118,48,${a * 0.35}), rgba(96,118,48,${a * 0.35}))`,
        ].join(', '),
      }}
    />
  );
}

// Two dozen leaves spread evenly across the width, each with its own size, pace and swing.
// A fixed-seed generator keeps the layout identical on every load (and between the server and
// client renders) while avoiding a hand-tuned table. Negative delays start them mid-fall.
const LEAF_COUNT = 24;
const KINDS: LeafKind[] = ['maple', 'oak', 'birch'];
const PALETTE: LeafColor[] = ['rust', 'gold', 'amber', 'crimson', 'rust', 'brown'];

function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const FALLING = (() => {
  const rnd = seeded(20260925);
  return Array.from({ length: LEAF_COUNT }, (_, i) => {
    const fall = 30 + rnd() * 16; // seconds top to bottom
    return {
      left: ((i + 0.2 + rnd() * 0.6) / LEAF_COUNT) * 100,
      size: Math.round(28 + rnd() * 16),
      kind: KINDS[i % KINDS.length],
      color: PALETTE[Math.floor(rnd() * PALETTE.length)],
      fall,
      sway: 4 + rnd() * 2.4,
      delay: -rnd() * fall,
      drift: Math.round((rnd() - 0.5) * 220),
    };
  });
})();

export function FallForeground({ theme }: { theme: DashboardTheme }) {
  return (
    <>
      {FALLING.map((l, i) => (
        <div
          key={i}
          className="hh-leaf-fall"
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${l.left}%`,
              animationDuration: `${l.fall}s`,
              animationDelay: `${l.delay}s`,
              '--hh-drift': `${l.drift}px`,
              opacity: theme.isLight ? 0.85 : 0.7,
            } as CSSProperties
          }
        >
          <div className="hh-leaf-sway" style={{ animationDuration: `${l.sway}s`, animationDelay: `${l.delay}s` }}>
            <Leaf kind={l.kind} color={l.color} size={l.size} />
          </div>
        </div>
      ))}
    </>
  );
}
