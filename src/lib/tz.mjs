// Timezone primitives for the Union, WA dashboard.
//
// Plain ESM (not .ts) on purpose: this repo has no build step for tests, so keeping the
// pure, side-effect-free time helpers here lets `node --test` import them directly.
// App code keeps importing them from ./time, which re-exports everything below.

export const DASHBOARD_TZ = 'America/Los_Angeles';

/**
 * Hour label like "1PM" in the dashboard timezone.
 * @param {Date} d
 * @param {string} [tz]
 * @returns {string}
 */
export function hourLabel(d, tz = DASHBOARD_TZ) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', timeZone: tz }).replace(/\s/g, '').toUpperCase();
}
