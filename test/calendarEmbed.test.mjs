// Unit tests for the Google Calendar embed and the view the "Our Events" panel opens on. No
// network, no build step: `node --test` imports the real module the components import.
//
// Two things are asserted here. First, that the hover CalendarView (WEEK) and the "Our
// Events" embed views cannot drift onto different hosts or different calendars. Second, and
// the reason this module changed: that List is the default view and always shows the
// household's events - our own rows when the read found some, the cropped AGENDA embed when
// it found none, because a credential-free 404 is not an empty calendar.

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
  AGENDA_HEADER_CROP_PX,
  calendarEmbedUrl,
  embedModeForView,
  panelEmbedMode,
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

test('the panel embed and the hover embed are the same calendar on the same host', () => {
  const week = new URL(calendarEmbedUrl(ID, { mode: 'WEEK' }));
  const month = new URL(calendarEmbedUrl(ID, { mode: 'MONTH' }));
  const agenda = new URL(calendarEmbedUrl(ID, { mode: 'AGENDA' }));
  for (const u of [month, agenda]) {
    assert.equal(u.origin, week.origin);
    assert.equal(u.pathname, week.pathname);
    assert.equal(u.searchParams.get('src'), week.searchParams.get('src'));
  }
  // Week and Month are one parameter apart: the two navigable views are otherwise identical.
  const differing = [...week.searchParams.keys()].filter((k) => week.searchParams.get(k) !== month.searchParams.get(k));
  assert.deepEqual(differing, ['mode']);
});

test("Google's own chrome is turned off in every mode", () => {
  for (const mode of ['WEEK', 'MONTH', 'AGENDA']) {
    const p = new URL(calendarEmbedUrl(ID, { mode })).searchParams;
    for (const key of ['showTitle', 'showPrint', 'showCalendars', 'showTz']) assert.equal(p.get(key), '0');
    // The panel's own chips are the switcher. Google's view tabs are a second, much bigger
    // copy of them, and they are off everywhere - this is the "giant Week/Month buttons".
    assert.equal(p.get('showTabs'), '0');
  }
});

test('the agenda body drops the date range and the arrows too', () => {
  // Nothing to navigate in a glance view: what is left should read as rows.
  const agenda = new URL(calendarEmbedUrl(ID, { mode: 'AGENDA' })).searchParams;
  assert.equal(agenda.get('showNav'), '0');
  assert.equal(agenda.get('showDate'), '0');
  // Week and Month keep both - that header is the reason to open them.
  for (const mode of ['WEEK', 'MONTH']) {
    const p = new URL(calendarEmbedUrl(ID, { mode })).searchParams;
    assert.equal(p.get('showNav'), null);
    assert.equal(p.get('showDate'), null);
  }
});

test("Google's page gutter is cropped away, and nothing below it is", () => {
  assert.equal(typeof AGENDA_HEADER_CROP_PX, 'number');
  assert.ok(AGENDA_HEADER_CROP_PX > 0, 'the agenda body starts on a row, not on page padding');
  // In the measured render the gutter ends at 14px and today's row starts there. Cropping
  // past it would clip the day the panel most needs to show.
  assert.ok(AGENDA_HEADER_CROP_PX <= 14, 'a gutter crop, never into the first day row');
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

// --- what the List view puts in the panel body -----------------------------------------
// The live failure this supersedes: List rendered "nothing on the calendar yet" while Week
// and Month, in the same panel, showed the household's events. Every credential-free read
// path answers 404 for this calendar (it is shared with the household, not with the public),
// so the empty list was never a fact about the calendar. List is still the default view -
// but its body is our rows when we have them and the same calendar's agenda when we do not.

test('the default view is the list', () => {
  assert.equal(DEFAULT_CALENDAR_VIEW, VIEW_LIST);
  assert.equal(embedModeForView(DEFAULT_CALENDAR_VIEW), null); // list is not a Google mode
});

test('rows fill the list with our own native rows', () => {
  const rows = [{ id: 'a' }, { id: 'b' }];
  assert.equal(panelEmbedMode({ loading: false, view: VIEW_LIST, rows, calendarId: ID }), null);
  assert.equal(shouldShowAgendaEmbed({ loading: false, view: VIEW_LIST, rows, calendarId: ID }), false);
  // A count works as well as an array - the panel passes whatever it has.
  assert.equal(panelEmbedMode({ loading: false, view: VIEW_LIST, rows: 3, calendarId: ID }), null);
});

test('an empty list shows the calendar through the agenda embed, not an empty panel', () => {
  assert.equal(panelEmbedMode({ loading: false, view: VIEW_LIST, rows: [], calendarId: ID }), 'AGENDA');
  // Same for the untouched default, and for a list that has not been given rows at all.
  assert.equal(panelEmbedMode({ loading: false, calendarId: ID }), 'AGENDA');
  assert.equal(panelEmbedMode({ loading: false, view: DEFAULT_CALENDAR_VIEW, rows: 0, calendarId: ID }), 'AGENDA');
});

test('a 404 read is not a calendar we read and found empty', () => {
  // The 404 reaches the panel as zero rows, exactly like a genuinely quiet month would. The
  // panel cannot tell them apart, so it must not assert the calendar is empty in either
  // case: while there is a calendar to embed, the body is the calendar.
  const four04 = { loading: false, view: VIEW_LIST, rows: [], calendarId: ID };
  assert.equal(panelEmbedMode(four04), 'AGENDA');
  assert.equal(shouldShowAgendaEmbed(four04), true);
  // Tapping List does not opt out of the events either - List is a view, not a data source.
  assert.equal(panelEmbedMode({ ...four04, view: 'LIST' }), 'AGENDA');
});

test('Week and Month show their own embed mode, on request', () => {
  for (const [view, mode] of [[VIEW_WEEK, 'WEEK'], [VIEW_MONTH, 'MONTH']]) {
    assert.equal(embedModeForView(view), mode);
    assert.equal(panelEmbedMode({ loading: false, view, rows: [], calendarId: ID }), mode);
    // Rows do not pull the viewer back out of the view they picked.
    assert.equal(panelEmbedMode({ loading: false, view, rows: [{ id: 'x' }], calendarId: ID }), mode);
  }
});

test('the three views map onto three distinct bodies', () => {
  const rows = [{ id: 'x' }];
  assert.deepEqual(
    CALENDAR_VIEWS.map((view) => panelEmbedMode({ loading: false, view, rows, calendarId: ID })),
    [null, 'WEEK', 'MONTH'],
  );
  // With no rows, only the List body changes - to the same calendar, in agenda form.
  assert.deepEqual(
    CALENDAR_VIEWS.map((view) => panelEmbedMode({ loading: false, view, rows: [], calendarId: ID })),
    ['AGENDA', 'WEEK', 'MONTH'],
  );
});

test('nothing is embedded until the list has actually loaded', () => {
  // Otherwise every refresh would flash the iframe before the rows arrive.
  for (const view of CALENDAR_VIEWS) {
    assert.equal(panelEmbedMode({ loading: true, view, rows: [], calendarId: ID }), null);
  }
});

test('with no calendar configured there is nothing to embed', () => {
  for (const empty of [undefined, null, '', '  ']) {
    for (const view of CALENDAR_VIEWS) {
      assert.equal(panelEmbedMode({ loading: false, view, rows: [], calendarId: empty }), null);
    }
  }
  assert.equal(panelEmbedMode({}), null);
  assert.equal(shouldShowAgendaEmbed({}), false);
});

test('an unknown or stale view is the list, and the list still shows the events', () => {
  for (const bad of ['agenda', 'AGENDA', 'day', 'year', '', '   ', null, undefined, 0, {}]) {
    assert.equal(resolveCalendarView(bad), VIEW_LIST);
    assert.equal(panelEmbedMode({ loading: false, view: bad, rows: [{ id: 'x' }], calendarId: ID }), null);
    assert.equal(panelEmbedMode({ loading: false, view: bad, rows: [], calendarId: ID }), 'AGENDA');
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

test('every body the panel can show is a url it can actually load', () => {
  for (const rows of [[], [{ id: 'x' }]]) {
    for (const view of CALENDAR_VIEWS) {
      const mode = panelEmbedMode({ loading: false, view, rows, calendarId: ID });
      if (mode === null) continue;
      const p = new URL(calendarEmbedUrl(ID, { mode })).searchParams;
      assert.equal(p.get('mode'), mode);
      assert.equal(p.get('src'), ID);
      assert.equal(p.get('showTabs'), '0');
    }
  }
});
