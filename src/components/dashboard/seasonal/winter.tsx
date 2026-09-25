'use client';

import type { CSSProperties } from 'react';
import type { DashboardTheme } from '../theme';
import { SnowBank, SnowCaps } from './snowpack';

// Winter: a frosted-glass glow creeping in from the screen edges, snow drifting down, and snow
// settled on top of every panel and along the bottom of the screen (snowpack.tsx).
// Most flakes are soft dots (cheap to composite on the Pi); a few larger ones are six-armed
// crystals. Same transform-only animation approach as the autumn leaves (.hh-snow-* in
// globals.css).

export function WinterBackdrop({ theme }: { theme: DashboardTheme }) {
  const a = theme.isLight ? 0.6 : 0.22;
  const ice = theme.isLight ? '255,255,255' : '215,236,255';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: [
          // Frost gathers at the corners, like a cold window.
          `radial-gradient(40% 45% at 0% 0%, rgba(${ice},${a}), transparent 70%)`,
          `radial-gradient(40% 45% at 100% 0%, rgba(${ice},${a}), transparent 70%)`,
          `radial-gradient(45% 40% at 0% 100%, rgba(${ice},${a * 0.8}), transparent 70%)`,
          `radial-gradient(45% 40% at 100% 100%, rgba(${ice},${a * 0.8}), transparent 70%)`,
          `radial-gradient(60% 50% at 50% 0%, rgba(150,210,245,${theme.isLight ? 0.18 : 0.12}), transparent 75%)`,
        ].join(', '),
      }}
    />
  );
}

function Crystal({ size, color }: { size: number; color: string }) {
  // One arm with two pairs of barbs, rotated six times.
  const arm = 'M50 50 L50 8 M50 22 L41 14 M50 22 L59 14 M50 34 L43 28 M50 34 L57 28';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <g stroke={color} strokeWidth={5} strokeLinecap="round" fill="none">
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <path key={r} d={arm} transform={`rotate(${r} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}

// Fixed seed: identical snowfall on every load and between the server and client renders.
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const DOT_COUNT = 40;
const CRYSTAL_COUNT = 10;

const FLAKES = (() => {
  const rnd = seeded(20261221);
  const total = DOT_COUNT + CRYSTAL_COUNT;
  return Array.from({ length: total }, (_, i) => {
    const crystal = i % 5 === 2; // spread the crystals evenly across the width
    // Bigger flakes fall a little faster, the way near snow does against far snow.
    const size = crystal ? Math.round(22 + rnd() * 14) : Math.round(4 + rnd() * 7);
    const fall = crystal ? 26 + rnd() * 10 : 30 + rnd() * 18 - size;
    return {
      crystal,
      left: ((i + rnd()) / total) * 100,
      size,
      fall,
      sway: 5 + rnd() * 4,
      delay: -rnd() * fall,
      drift: Math.round((rnd() - 0.5) * 160),
      opacity: crystal ? 0.8 : 0.45 + rnd() * 0.45,
    };
  });
})();

export function WinterForeground({ theme }: { theme: DashboardTheme }) {
  // White snow vanishes against Daylight Glass, so there it gets a faint cool outline.
  const flake = '#ffffff';
  const edge = theme.isLight ? '0 0 0 1px rgba(90,120,165,.35), 0 1px 3px rgba(60,90,140,.25)' : '0 0 6px rgba(220,235,255,.55)';
  return (
    <>
      <SnowBank theme={theme} />
      <SnowCaps theme={theme} />
      {FLAKES.map((f, i) => (
        <div
          key={i}
          className="hh-leaf-fall"
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${f.left}%`,
              animationDuration: `${f.fall}s`,
              animationDelay: `${f.delay}s`,
              '--hh-drift': `${f.drift}px`,
              opacity: f.opacity,
            } as CSSProperties
          }
        >
          <div className={f.crystal ? 'hh-snow-spin' : 'hh-snow-sway'} style={{ animationDuration: `${f.sway}s`, animationDelay: `${f.delay}s` }}>
            {f.crystal ? (
              <div style={{ filter: theme.isLight ? 'drop-shadow(0 0 1px rgba(70,100,150,.6))' : 'drop-shadow(0 0 3px rgba(220,235,255,.6))' }}>
                <Crystal size={f.size} color={flake} />
              </div>
            ) : (
              <div style={{ width: f.size, height: f.size, borderRadius: '50%', background: flake, boxShadow: edge }} />
            )}
          </div>
        </div>
      ))}
    </>
  );
}
