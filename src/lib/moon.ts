// Moon phase math - no API needed. Accurate to a few hours, which is plenty for a wall display.

const SYNODIC_DAYS = 29.530588853;
// A recent well-documented new moon: 2000-01-06 18:14 UTC (JPL).
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent';

export interface MoonInfo {
  /** 0..1 through the synodic month (0 = new, 0.5 = full) */
  fraction: number;
  /** days since new moon */
  ageDays: number;
  /** 0..1 illuminated disc fraction */
  illumination: number;
  waxing: boolean;
  phase: MoonPhaseName;
  nextFull: Date;
  nextNew: Date;
}

export function moonInfo(at: Date = new Date()): MoonInfo {
  const elapsed = (at.getTime() - REF_NEW_MOON_MS) / 86400000;
  const ageDays = ((elapsed % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const fraction = ageDays / SYNODIC_DAYS;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const waxing = fraction < 0.5;

  // Principal phases get a ~1.3-day window so they read as "Full Moon" on the day itself.
  const near = (target: number) => Math.abs(fraction - target) < 0.022 || Math.abs(fraction - target + 1) < 0.022;
  let phase: MoonPhaseName;
  if (near(0)) phase = 'New Moon';
  else if (near(0.25)) phase = 'First Quarter';
  else if (near(0.5)) phase = 'Full Moon';
  else if (near(0.75)) phase = 'Last Quarter';
  else if (fraction < 0.25) phase = 'Waxing Crescent';
  else if (fraction < 0.5) phase = 'Waxing Gibbous';
  else if (fraction < 0.75) phase = 'Waning Gibbous';
  else phase = 'Waning Crescent';

  const daysToFull = ((0.5 - fraction + 1) % 1) * SYNODIC_DAYS;
  const daysToNew = ((1 - fraction) % 1) * SYNODIC_DAYS;
  const nextFull = new Date(at.getTime() + (daysToFull < 0.5 ? 0 : daysToFull) * 86400000);
  const nextNew = new Date(at.getTime() + (daysToNew < 0.5 ? 0 : daysToNew) * 86400000);

  return { fraction, ageDays, illumination, waxing, phase, nextFull, nextNew };
}
