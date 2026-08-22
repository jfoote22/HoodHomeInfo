'use client';

import { useMemo } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { moonInfo } from '../../lib/moon';

/**
 * Small moon-phase glyph + two lines of facts, sized to sit between the big temperature
 * and the conditions text in the Weather & Tides header. The lit portion is drawn
 * geometrically from the illumination fraction, with the correct side lit for
 * waxing (right) vs waning (left) as seen from the northern hemisphere.
 */
function MoonGlyph({ fraction, size, theme }: { fraction: number; size: number; theme: DashboardTheme }) {
  const r = size / 2;
  const lit = theme.isLight ? '#f3f6fa' : '#eef3fa';
  const litStroke = theme.isLight ? 'rgba(20,34,47,.25)' : 'rgba(255,255,255,.18)';
  const dark = theme.isLight ? '#b9c6d6' : '#1b2a44';

  // Terminator: an ellipse whose x-radius sweeps from +r (full) through 0 (quarter) to -r.
  // Build the lit region as a path: outer half-circle on the lit side + terminator curve.
  const waxing = fraction < 0.5;
  const illum = (1 - Math.cos(2 * Math.PI * fraction)) / 2; // 0..1
  // x-radius of terminator ellipse: +r at new (hidden), 0 at quarter, -r at full
  const k = Math.cos(2 * Math.PI * fraction); // 1 at new, -1 at full
  const rx = Math.abs(k) * r;
  const sweepOuter = waxing ? 1 : 0; // lit limb on the right when waxing
  // Terminator bulges toward the lit side when < half lit, toward dark side when > half.
  const bulgeTowardLit = illum < 0.5;
  const sweepTerm = (waxing ? 1 : 0) ^ (bulgeTowardLit ? 1 : 0);

  const top = `${r},0`;
  const bottom = `${r},${size}`;
  const path = `M ${top} A ${r} ${r} 0 0 ${sweepOuter} ${bottom} A ${rx} ${r} 0 0 ${sweepTerm} ${top} Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={r} cy={r} r={r - 0.5} fill={dark} stroke={litStroke} strokeWidth={1} />
      {illum > 0.005 && <path d={path} fill={lit} />}
      {/* faint craters so a full moon doesn't read as a blank disc */}
      <g fill={theme.isLight ? 'rgba(20,34,47,.12)' : 'rgba(13,23,41,.22)'}>
        <circle cx={r * 0.72} cy={r * 0.78} r={r * 0.16} />
        <circle cx={r * 1.22} cy={r * 1.18} r={r * 0.11} />
        <circle cx={r * 1.05} cy={r * 0.62} r={r * 0.07} />
      </g>
    </svg>
  );
}

export default function MoonPhaseBadge({ theme, now }: { theme: DashboardTheme; now: Date }) {
  // Recompute at most once per hour - moon phase doesn't move faster than that matters.
  const hourKey = Math.floor(now.getTime() / 3600000);
  const moon = useMemo(() => moonInfo(new Date(hourKey * 3600000)), [hourKey]);

  const pct = Math.round(moon.illumination * 100);
  const next =
    moon.phase === 'Full Moon' || moon.phase === 'New Moon'
      ? null
      : moon.waxing
        ? { label: 'Full', date: moon.nextFull }
        : { label: 'New', date: moon.nextNew };
  const nextLabel = next ? `${next.label} ${next.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}` : '';

  return (
    <div
      title={`${moon.phase} · ${pct}% illuminated · ${moon.ageDays.toFixed(1)} days old`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0, padding: '0 4px' }}
    >
      <MoonGlyph fraction={moon.fraction} size={34} theme={theme} />
      <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, letterSpacing: '.06em', color: theme.bodySecondary, whiteSpace: 'nowrap', textAlign: 'center' }}>
        {moon.phase}
      </div>
      <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, color: theme.dim, whiteSpace: 'nowrap', textAlign: 'center' }}>
        {pct}%{nextLabel ? ` · ${nextLabel}` : ''}
      </div>
    </div>
  );
}
