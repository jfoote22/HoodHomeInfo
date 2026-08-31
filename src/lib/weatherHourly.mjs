// The near-term "hourly" strip under the weather hero.
//
// OpenWeatherMap's free forecast tier is 3-hour resolution, so these are real forecast
// points at their actual times, not fabricated hourly data. `item.dt` is unix UTC and
// `dt_txt` is ALSO UTC (not local), so only `dt` is ever read here.
//
// Plain ESM (not .ts) so `node --test` can import it without a build step - see tz.mjs.

import { hourLabel } from './tz.mjs';

/**
 * @typedef {{ label: string, tempF: number, icon: string }} HourlyPoint
 */

/**
 * Upcoming forecast points, labelled in the dashboard timezone ("11PM", "2AM").
 *
 * Strictly future instants only: a slot whose time has already passed is history, and the
 * hero above the strip already shows the current temperature, so there is never a "NOW"
 * column here.
 *
 * @param {any[]} list OpenWeatherMap forecast.list entries
 * @param {number} nowMs current time in epoch ms
 * @param {{ count?: number, fallbackTempF?: number, iconFor?: (id: number) => string }} [opts]
 * @returns {HourlyPoint[]}
 */
export function futureHourly(list, nowMs, opts = {}) {
  const count = opts.count ?? 4;
  const fallbackTempF = opts.fallbackTempF ?? 55;
  const iconFor = opts.iconFor ?? (() => 'sun');

  return (Array.isArray(list) ? list : [])
    .filter((item) => Number.isFinite(item?.dt) && item.dt * 1000 > nowMs)
    .sort((a, b) => a.dt - b.dt)
    .slice(0, count)
    .map((item) => ({
      label: hourLabel(new Date(item.dt * 1000)),
      tempF: Math.round(item.main?.temp ?? item.main?.temp_max ?? fallbackTempF),
      icon: iconFor(item.weather?.[0]?.id ?? 800),
    }));
}
