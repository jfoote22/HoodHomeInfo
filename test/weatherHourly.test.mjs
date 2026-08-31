// Unit tests for the weather panel's hourly strip. No network, no build step:
// `node --test` imports the real helper (src/lib/weatherHourly.mjs) directly.

import test from 'node:test';
import assert from 'node:assert/strict';

import { futureHourly } from '../src/lib/weatherHourly.mjs';

// 9:20 PM PDT on Aug 30, 2026 - the moment the panel was showing a stale "8 PM" column.
const NOW = Date.parse('2026-08-31T04:20:00Z');
const unix = (iso) => Math.floor(Date.parse(iso) / 1000);

/** OpenWeatherMap-style 3-hour forecast points around NOW (dt is unix UTC). */
const FORECAST = [
  { dt: unix('2026-08-31T00:00:00Z'), main: { temp: 71.4 }, weather: [{ id: 800 }] }, // 5 PM PDT - past
  { dt: unix('2026-08-31T03:00:00Z'), main: { temp: 64.2 }, weather: [{ id: 800 }] }, // 8 PM PDT - past
  { dt: unix('2026-08-31T06:00:00Z'), main: { temp: 58.6 }, weather: [{ id: 801 }] }, // 11 PM PDT
  { dt: unix('2026-08-31T09:00:00Z'), main: { temp: 54.4 }, weather: [{ id: 500 }] }, // 2 AM PDT
  { dt: unix('2026-08-31T12:00:00Z'), main: { temp: 52.5 }, weather: [{ id: 803 }] }, // 5 AM PDT
  { dt: unix('2026-08-31T15:00:00Z'), main: { temp: 61.5 }, weather: [{ id: 800 }] }, // 8 AM PDT
  { dt: unix('2026-08-31T18:00:00Z'), main: { temp: 72.0 }, weather: [{ id: 800 }] }, // 11 AM PDT
];

test('drops forecast points that have already happened', () => {
  const out = futureHourly(FORECAST, NOW);
  const labels = out.map((h) => h.label);

  // 8 PM PDT is ~80 minutes before NOW: inside the old 90-minute lookback, so it used to
  // survive and show a past hour on the strip.
  assert.ok(!labels.includes('8PM'), `8PM should be dropped, got ${labels.join(',')}`);
  assert.ok(!labels.includes('5PM'));
  assert.deepEqual(labels, ['11PM', '2AM', '5AM', '8AM']);
});

test('never emits a NOW column', () => {
  const out = futureHourly(FORECAST, NOW);
  assert.ok(out.every((h) => h.label !== 'NOW'));
  assert.ok(out.every((h) => /^\d{1,2}(AM|PM)$/.test(h.label)), 'labels are PT hours');
});

test('every point returned is strictly in the future', () => {
  for (const h of futureHourly(FORECAST, NOW)) assert.ok(h.tempF > 0);
  const at = unix('2026-08-31T06:00:00Z') * 1000;
  // A point exactly at "now" has already arrived - the hero shows that temperature.
  assert.deepEqual(
    futureHourly(FORECAST, at).map((h) => h.label),
    ['2AM', '5AM', '8AM', '11AM'],
  );
  // One minute earlier and the same point is still ahead of us.
  assert.equal(futureHourly(FORECAST, at - 60000)[0].label, '11PM');
  // One minute later it is history.
  assert.equal(futureHourly(FORECAST, at + 60000)[0].label, '2AM');
});

test('a point inside the old 90-minute lookback is excluded', () => {
  const eightPm = unix('2026-08-31T03:00:00Z');
  // 80 minutes after the 8 PM slot: the old filter (now - 90min) kept it, this one does not.
  const out = futureHourly(FORECAST, (eightPm + 80 * 60) * 1000);
  assert.ok(!out.map((h) => h.label).includes('8PM'));
  assert.equal(out[0].label, '11PM');
});

test('labels are Pacific, not UTC or server-local', () => {
  // 2026-08-31T06:00:00Z is 11 PM PDT the previous day; a UTC label would read "6AM".
  const [first] = futureHourly(FORECAST, NOW);
  assert.equal(first.label, '11PM');
  assert.equal(first.tempF, 59); // rounded from 58.6
  assert.equal(first.icon, 'sun'); // default iconFor when the route does not inject one
});

test('rounds temps, maps icons and honours count', () => {
  const iconFor = (id) => (id === 500 ? 'cloud-rain' : id > 801 ? 'cloud' : 'sun');
  const out = futureHourly(FORECAST, NOW, { count: 2, iconFor });
  assert.deepEqual(out, [
    { label: '11PM', tempF: 59, icon: 'sun' },
    { label: '2AM', tempF: 54, icon: 'cloud-rain' },
  ]);
});

test('falls back to temp_max, then the hero temperature', () => {
  const list = [
    { dt: unix('2026-08-31T06:00:00Z'), main: { temp_max: 60.2 } },
    { dt: unix('2026-08-31T09:00:00Z') },
  ];
  assert.deepEqual(
    futureHourly(list, NOW, { fallbackTempF: 57 }).map((h) => h.tempF),
    [60, 57],
  );
});

test('survives a missing or malformed forecast list', () => {
  assert.deepEqual(futureHourly(undefined, NOW), []);
  assert.deepEqual(futureHourly([], NOW), []);
  assert.deepEqual(futureHourly([{ main: { temp: 60 } }, { dt: null }], NOW), []);
});

test('returns upcoming points in chronological order', () => {
  const shuffled = [FORECAST[4], FORECAST[2], FORECAST[1], FORECAST[3]];
  assert.deepEqual(
    futureHourly(shuffled, NOW).map((h) => h.label),
    ['11PM', '2AM', '5AM'],
  );
});
