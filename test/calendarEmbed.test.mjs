// Unit tests for the Google Calendar embed and the view the "Our Events" panel opens on. No
// network, no build step: `node --test` imports the real module the components import.
//
// Two things are asserted here. First, that the hover CalendarView (WEEK) and the "Our
// Events" embed views cannot drift onto different hosts or different calendars - the URLs
// differ in exactly one parameter. Second, and the reason this module changed: that the
// panel's default view is our own native rows, and that the Google iframe only ever appears
// because someone asked for Week or Month.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CALENDAR_EMBED_HOST,
  CALENDAR_EMBED_TZ,
  CALENDAR_VIEWS,
  DEFAULT_CALENDAR_ID,
  DEFAULT_CALENDAR_VIEW,
  VIEW_LIST,
  VIEW_MONTH,
  VIEW_WEEK,
  calendarEmbedUrl,
  embedModeForView,
  resolveCalendarId,
  resolveCalendarView,
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

test('mode is WEEK by default and WEEK/MONTH/AGENDA on request', () => {
  assert.equal(new URL(calendarEmbedUrl(ID)).searchParams.get('mode'), 'WEEK');
  for (const mode of ['WEEK', 'MONTH', 'AGENDA']) {
    assert.equal(new URL(calendarEmbedUrl(ID, { mode })).searchParams.get('mode'), mode);
  }
  // An unknown mode must not reach Google as-is; the hover view is the safe default.
  for (const bad of ['YEAR', 'agenda', '', null, undefined]) {
    assert.equal(new URL(calendarEmbedUrl(ID, { mode: bad })).searchParams.get('mode'), 'WEEK');
  }
});

test('the panel embed and the hover embed differ only in mode', () => {
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

// --- native list vs iframe -------------------------------------------------------------
// The behaviour this file exists to pin down: on the kiosk the Google iframe used to take
// the whole panel whenever the list came back empty, which - because the credential-free
// read paths return nothing for a calendar that is not shared publicly - made it the view
// people actually saw. Native rows are the default now, and the iframe is opt-in.

test('the default view is the native list, not the iframe', () => {
  assert.equal(DEFAULT_CALENDAR_VIEW, VIEW_LIST);
  assert.equal(embedModeForView(DEFAULT_CALENDAR_VIEW), null);
  // No view passed at all is the same as the default - a caller that has not migrated yet
  // gets native rows rather than a wall of Google chrome.
  assert.equal(shouldShowAgendaEmbed({ loading: false, calendarId: ID }), false);
});

test('an empty list stays native and does not summon the iframe', () => {
  // Was true before this change; it is the whole regression.
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows: [], calendarId: ID }), false);
});

test('a source failure stays native too', () => {
  // The live case: the public read answers 404, so the list is empty and the read path
  // failed. That is still not a reason to replace the panel with Google's UI.
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows: [], calendarId: ID }), false);
});

test('a list of our own is never replaced by the iframe', () => {
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows: [{ id: 'x' }], calendarId: ID }), false);
});

test('Week and Month show the iframe, on request', () => {
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_WEEK, calendarId: ID }), true);
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_MONTH, calendarId: ID }), true);
  assert.equal(embedModeForView(VIEW_WEEK), 'WEEK');
  assert.equal(embedModeForView(VIEW_MONTH), 'MONTH');
});

test('rows do not decide the view either way', () => {
  // Picking Week with a full list keeps Week; an empty list keeps List. The viewer chose.
  const full = [{ id: 'x' }];
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_WEEK, rows: full, calendarId: ID }), true);
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows: full, calendarId: ID }), false);
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_WEEK, rows: [], calendarId: ID }), true);
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows: [], calendarId: ID }), false);
});

test('the iframe waits until the list has actually loaded', () => {
  // Otherwise switching to Week would flash the embed on every refresh.
  assert.equal(shouldShowAgendaEmbed({ loading: true, view: VIEW_WEEK, calendarId: ID }), false);
  assert.equal(shouldShowAgendaEmbed({ loading: true, view: VIEW_LIST, calendarId: ID }), false);
});

test('with no calendar configured there is nothing to embed', () => {
  for (const empty of [undefined, null, '', '  ']) {
    assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_WEEK, calendarId: empty }), false);
  }
  assert.equal(shouldShowAgendaEmbed({}), false);
});

test('an unknown or stale view can never strand the kiosk in the iframe', () => {
  for (const bad of ['agenda', 'AGENDA', 'day', 'year', '', '   ', null, undefined, 0, {}]) {
    assert.equal(resolveCalendarView(bad), VIEW_LIST);
    assert.equal(shouldShowAgendaEmbed({ loading: false, view: bad, calendarId: ID }), false);
  }
});

test('view names are normalised, so a stored "WEEK" still means week', () => {
  assert.equal(resolveCalendarView('WEEK'), VIEW_WEEK);
  assert.equal(resolveCalendarView('  Month '), VIEW_MONTH);
  assert.equal(resolveCalendarView(VIEW_LIST), VIEW_LIST);
});

test('the switcher offers list first, then the two embed views', () => {
  assert.deepEqual(CALENDAR_VIEWS, [VIEW_LIST, VIEW_WEEK, VIEW_MONTH]);
  assert.equal(CALENDAR_VIEWS[0], DEFAULT_CALENDAR_VIEW);
  // Exactly one view is native; the rest map to a real Google mode the URL builder accepts.
  const native = CALENDAR_VIEWS.filter((v) => embedModeForView(v) === null);
  assert.deepEqual(native, [VIEW_LIST]);
  for (const v of CALENDAR_VIEWS.filter((v) => embedModeForView(v) !== null)) {
    const mode = embedModeForView(v);
    assert.equal(new URL(calendarEmbedUrl(ID, { mode })).searchParams.get('mode'), mode);
  }
});

test('the optional embed views keep Google chrome stripped', () => {
  // "Small optional view" only holds if Google is not re-adding its own header and nav.
  for (const v of [VIEW_WEEK, VIEW_MONTH]) {
    const p = new URL(calendarEmbedUrl(ID, { mode: embedModeForView(v) })).searchParams;
    for (const key of ['showTitle', 'showPrint', 'showCalendars', 'showTz']) assert.equal(p.get(key), '0');
  }
});
