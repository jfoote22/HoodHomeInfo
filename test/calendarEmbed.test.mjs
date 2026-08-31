// Unit tests for the Google Calendar embed the dashboard falls back to. No network, no
// build step: `node --test` imports the real module the components import.
//
// The point of the module is that the hover CalendarView (WEEK) and the "Our Events"
// fallback (AGENDA) cannot drift onto different hosts or different calendars, so most of
// what is asserted here is that the two URLs differ in exactly one parameter.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CALENDAR_EMBED_HOST,
  CALENDAR_EMBED_TZ,
  DEFAULT_CALENDAR_ID,
  calendarEmbedUrl,
  resolveCalendarId,
  shouldShowAgendaEmbed,
} from '../src/lib/calendarEmbed.mjs';

const ID = 'fixture-calendar@example.com';

test('embed url points at Google with the calendar as src', () => {
  const u = new URL(calendarEmbedUrl(ID));
  assert.equal(`${u.origin}${u.pathname}`, CALENDAR_EMBED_HOST);
  assert.equal(u.searchParams.get('src'), ID);
  assert.equal(u.searchParams.get('ctz'), CALENDAR_EMBED_TZ);
  // The id carries an "@" - it has to survive as a query value, not as a raw character.
  assert.ok(u.search.includes(encodeURIComponent(ID)));
});

test('mode is WEEK by default and AGENDA on request', () => {
  assert.equal(new URL(calendarEmbedUrl(ID)).searchParams.get('mode'), 'WEEK');
  assert.equal(new URL(calendarEmbedUrl(ID, { mode: 'WEEK' })).searchParams.get('mode'), 'WEEK');
  assert.equal(new URL(calendarEmbedUrl(ID, { mode: 'AGENDA' })).searchParams.get('mode'), 'AGENDA');
  // An unknown mode must not reach Google as-is; the hover view is the safe default.
  assert.equal(new URL(calendarEmbedUrl(ID, { mode: 'MONTH' })).searchParams.get('mode'), 'WEEK');
});

test('the agenda fallback and the hover embed differ only in mode', () => {
  const week = new URL(calendarEmbedUrl(ID, { mode: 'WEEK' }));
  const agenda = new URL(calendarEmbedUrl(ID, { mode: 'AGENDA' }));
  assert.equal(agenda.origin, week.origin);
  assert.equal(agenda.pathname, week.pathname);
  const differing = [...week.searchParams.keys()].filter((k) => week.searchParams.get(k) !== agenda.searchParams.get(k));
  assert.deepEqual(differing, ['mode']);
});

test("Google's own chrome is turned off", () => {
  const p = new URL(calendarEmbedUrl(ID, { mode: 'AGENDA' })).searchParams;
  for (const key of ['showTitle', 'showPrint', 'showCalendars', 'showTz']) assert.equal(p.get(key), '0');
});

test('a custom timezone is honoured', () => {
  assert.equal(new URL(calendarEmbedUrl(ID, { tz: 'America/New_York' })).searchParams.get('ctz'), 'America/New_York');
});

test('no calendar means no url at all', () => {
  for (const empty of [undefined, null, '', '   ']) assert.equal(calendarEmbedUrl(empty), null);
});

test('the first configured id wins, otherwise the household calendar', () => {
  assert.equal(resolveCalendarId('a@example.com', 'b@example.com'), 'a@example.com');
  // Unset in the browser bundle -> whatever the API reported reading.
  assert.equal(resolveCalendarId(undefined, 'b@example.com'), 'b@example.com');
  assert.equal(resolveCalendarId('', '   ', null), DEFAULT_CALENDAR_ID);
  assert.equal(resolveCalendarId(), DEFAULT_CALENDAR_ID);
  assert.equal(resolveCalendarId('  a@example.com  '), 'a@example.com');
});

test('an empty list with a calendar shows the agenda embed', () => {
  assert.equal(shouldShowAgendaEmbed({ loading: false, rows: [], calendarId: ID }), true);
});

test('a list of our own is never replaced by the embed', () => {
  assert.equal(shouldShowAgendaEmbed({ loading: false, rows: [{ id: 'x' }], calendarId: ID }), false);
});

test('the embed waits until the list has actually loaded', () => {
  // Otherwise the panel would flash the embed on every refresh before the rows arrive.
  assert.equal(shouldShowAgendaEmbed({ loading: true, rows: [], calendarId: ID }), false);
});

test('a source failure still shows the calendar, not error copy', () => {
  // The live case: public .ics answers 404, so the list is empty and the read path failed -
  // the embed reads the calendar from the browser and does not care.
  assert.equal(shouldShowAgendaEmbed({ loading: false, rows: [], calendarId: ID }), true);
  assert.equal(calendarEmbedUrl(ID, { mode: 'AGENDA' })?.startsWith(CALENDAR_EMBED_HOST), true);
});

test('with no calendar configured there is nothing to embed', () => {
  for (const empty of [undefined, null, '', '  ']) {
    assert.equal(shouldShowAgendaEmbed({ loading: false, rows: [], calendarId: empty }), false);
  }
  assert.equal(shouldShowAgendaEmbed({}), false);
});
