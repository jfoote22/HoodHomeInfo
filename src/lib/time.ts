// Time helpers for the Union, WA dashboard. Every upstream feed reports in a different
// frame (NOAA lst_ldt = station local time, OpenWeather = unix UTC, GrowthZone = naive
// Pacific), and the server might be running in UTC (Vercel) or Pacific (a PC under the
// TV). Everything here pins to the dashboard's own timezone so output is identical
// wherever it's rendered.

// DASHBOARD_TZ / hourLabel live in tz.mjs so the pure helpers stay importable from a
// plain `node --test` run; this module stays the single import site for app code.
import { DASHBOARD_TZ } from './tz.mjs';
export { DASHBOARD_TZ, hourLabel } from './tz.mjs';

/** Offset (minutes east of UTC) that DASHBOARD_TZ has at the given instant. */
export function tzOffsetMinutes(at: Date, tz: string = DASHBOARD_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-8';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return -480;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
}

/**
 * Parse a naive local timestamp ("2026-08-22 15:27", "2026-08-22T15:27:00") that is
 * known to be in DASHBOARD_TZ into a real instant.
 */
export function localToDate(naive: string, tz: string = DASHBOARD_TZ): Date | null {
  const m = naive.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, hh = '00', mm = '00', ss = '00'] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss);
  // Offset at the guessed instant is right except within an hour of a DST switch,
  // which is fine for tides and event listings.
  const offset = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - offset * 60000);
}

export function fmtTime(d: Date, tz: string = DASHBOARD_TZ): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
}

export function fmtDate(d: Date, tz: string = DASHBOARD_TZ): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz });
}

/** "YYYY-MM-DD" in the dashboard timezone - handy as a grouping key. */
export function dayKey(d: Date, tz: string = DASHBOARD_TZ): string {
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}
