// Unit tests for the "Our Events" list path. No network, no build step: `node --test`
// imports the real modules (src/lib/ourEventsList.mjs + src/lib/ics.mjs) and feeds them a
// fixture calendar feed against a frozen clock.
//
// Frozen now = 2026-08-31T04:20:00Z = 9:20 PM PDT on Sunday Aug 30, 2026. Every instant
// below is written in UTC on purpose: the list is Pacific, so a rule that only holds when
// the server also runs in Pacific is the bug, not the test.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PUBLIC_CALENDAR_API_HOST,
  PUBLIC_EMBED_API_KEY,
  mapPublicCalendarEvents,
  mergeOurEvents,
  publicCalendarApiUrl,
  publicIcsUrls,
  publicReadError,
} from '../src/lib/ourEventsList.mjs';
import { parseIcs } from '../src/lib/ics.mjs';

const NOW = Date.parse('2026-08-31T04:20:00Z'); // 9:20 PM PDT, Sun Aug 30 2026
const HOUR = 3600 * 1000;
const ID = 'household@example.com'; // a fixture calendar, not the household's real id

/** A Google-style feed for the household calendar. Titles are fixtures, not real events. */
const FEED = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:all-day-today
SUMMARY:Fixture all day today
DTSTART;VALUE=DATE:20260830
DTEND;VALUE=DATE:20260831
END:VEVENT
BEGIN:VEVENT
UID:ended-earlier
SUMMARY:Fixture ended earlier
DTSTART:20260831T020000Z
DTEND:20260831T030000Z
END:VEVENT
BEGIN:VEVENT
UID:later-tonight
SUMMARY:Fixture later tonight
DTSTART:20260831T053000Z
DTEND:20260831T063000Z
LOCATION:Union
END:VEVENT
BEGIN:VEVENT
UID:tomorrow-local
SUMMARY:Fixture tomorrow morning
DTSTART;TZID=America/Los_Angeles:20260831T090000
DTEND;TZID=America/Los_Angeles:20260831T100000
END:VEVENT
BEGIN:VEVENT
UID:far-future
SUMMARY:Fixture past the window
DTSTART:20261115T190000Z
DTEND:20261115T200000Z
END:VEVENT
BEGIN:VEVENT
UID:called-off
SUMMARY:Fixture cancelled
STATUS:CANCELLED
DTSTART:20260831T053000Z
END:VEVENT
END:VCALENDAR`;

const publicFeed = () => ({ name: 'public', ok: true, events: parseIcs(FEED) });
const titles = (r) => r.events.map((e) => e.title);

test('reads the same calendar the embed does, with no credential', () => {
  const urls = publicIcsUrls(ID);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], 'https://calendar.google.com/calendar/ical/household%40example.com/public/basic.ics');
  assert.equal(urls[1], 'https://www.google.com/calendar/ical/household%40example.com/public/basic.ics');
  // No key, no token, no secret address anywhere in the URL.
  for (const u of urls) assert.ok(!/key=|token|private/i.test(u), u);
  assert.deepEqual(publicIcsUrls(''), []);
  assert.deepEqual(publicIcsUrls(undefined), []);
});

test('a public feed fills the list the panel renders', () => {
  const { events, sources } = mergeOurEvents([publicFeed()], NOW);
  assert.deepEqual(sources, ['public']);
  assert.deepEqual(titles({ events }), ['Fixture all day today', 'Fixture later tonight', 'Fixture tomorrow morning']);
  assert.ok(events.every((e) => e.source === 'ics'));
});

test('keeps an all-day event that started this morning Pacific', () => {
  const { events } = mergeOurEvents([publicFeed()], NOW);
  const allDay = events.find((e) => e.allDay);
  // Aug 30 in Pacific began at 07:00Z - 21h20m before "now" - and runs to 07:00Z Aug 31.
  assert.equal(allDay.start, '2026-08-30T07:00:00.000Z');
  assert.equal(allDay.end, '2026-08-31T07:00:00.000Z');
  // Still listed at 11:59 PM PDT, dropped once Pacific rolls into the next day + the grace.
  assert.ok(titles(mergeOurEvents([publicFeed()], Date.parse('2026-08-31T06:59:00Z'))).includes('Fixture all day today'));
  assert.ok(!titles(mergeOurEvents([publicFeed()], Date.parse('2026-08-31T08:01:00Z'))).includes('Fixture all day today'));
});

test('drops what has already finished and what is past the window', () => {
  const t = titles(mergeOurEvents([publicFeed()], NOW));
  assert.ok(!t.includes('Fixture ended earlier'), 'ended 80 minutes ago');
  assert.ok(!t.includes('Fixture past the window'), '76 days out');
  assert.ok(!t.includes('Fixture cancelled'));
  // The window is configurable and inclusive of its far edge.
  assert.ok(titles(mergeOurEvents([publicFeed()], NOW, { windowDays: 90 })).includes('Fixture past the window'));
});

test('an event still running stays on the list for an hour after it ends', () => {
  const running = { id: 'a', title: 'Fixture running now', start: '2026-08-31T03:50:00Z', end: '2026-08-31T04:50:00Z', allDay: false, source: 'ics' };
  const justEnded = { ...running, id: 'b', title: 'Fixture just ended', start: '2026-08-31T02:40:00Z', end: '2026-08-31T03:40:00Z' };
  const longGone = { ...running, id: 'c', title: 'Fixture long gone', start: '2026-08-31T00:00:00Z', end: '2026-08-31T01:00:00Z' };
  const t = titles(mergeOurEvents([{ name: 'public', ok: true, events: [running, justEnded, longGone] }], NOW));
  assert.deepEqual(t, ['Fixture just ended', 'Fixture running now']);
});

test('an event with no end is assumed two hours long, all-day a full day', () => {
  const open = { id: 'a', title: 'Fixture open ended', start: '2026-08-31T03:00:00Z', end: null, allDay: false, source: 'ics' };
  const stale = { ...open, id: 'b', title: 'Fixture stale', start: '2026-08-31T00:30:00Z' };
  const allDay = { ...open, id: 'c', title: 'Fixture bare all day', start: '2026-08-30T07:00:00Z', allDay: true };
  const t = titles(mergeOurEvents([{ name: 'public', ok: true, events: [open, stale, allDay] }], NOW));
  assert.deepEqual(t, ['Fixture bare all day', 'Fixture open ended']);
});

test('rows come back in chronological order', () => {
  const { events } = mergeOurEvents([publicFeed()], NOW);
  const starts = events.map((e) => Date.parse(e.start));
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
});

test('the same event from two sources is one row, first source wins', () => {
  const ics = parseIcs(FEED).filter((e) => e.title === 'Fixture later tonight');
  const google = ics.map((e) => ({ ...e, id: 'from-google', source: 'google', start: '2026-08-31T05:30:41Z' }));
  const { events } = mergeOurEvents(
    [
      { name: 'google', ok: true, events: google },
      { name: 'public', ok: true, events: ics },
    ],
    NOW,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'google');
});

test('a calendar we can read is connected even when the next four weeks are empty', () => {
  // The regression: sources used to be reported only when a source returned rows, so a
  // working calendar with a quiet month rendered as "Calendar not connected".
  const { events, sources } = mergeOurEvents([{ name: 'public', ok: true, events: [] }], NOW);
  assert.deepEqual(events, []);
  assert.deepEqual(sources, ['public']);
});

test('a source that is not configured is never reported as connected', () => {
  const { sources } = mergeOurEvents(
    [
      { name: 'google', ok: false, events: [] },
      { name: 'hermes', ok: false, events: [] },
      { name: 'ics', ok: false, events: [] },
      { name: 'public', ok: true, events: parseIcs(FEED) },
    ],
    NOW,
  );
  assert.deepEqual(sources, ['public']);
});

test('survives junk from any source', () => {
  assert.deepEqual(mergeOurEvents([], NOW), { events: [], sources: [] });
  assert.deepEqual(mergeOurEvents(undefined, NOW), { events: [], sources: [] });
  const { events } = mergeOurEvents(
    [null, { name: 'public', ok: true, events: [{ id: 'x', title: 'Fixture undated', start: 'not a date', end: null, allDay: false, source: 'ics' }] }],
    NOW,
  );
  assert.deepEqual(events, []);
  assert.deepEqual(parseIcs('not a calendar at all'), []);
});

// --- the credential-free read the embed itself makes -------------------------------------
// Calendar v3 events.list through the key Google's embed JavaScript ships to every browser.
// It needs no env var; it needs the calendar to be shared publicly, which is exactly what
// the embed needs too.

test('the public read is Calendar v3 for the calendar, keyed by the embed key', () => {
  const u = new URL(publicCalendarApiUrl(ID, { nowMs: NOW }));
  assert.equal(u.origin, PUBLIC_CALENDAR_API_HOST);
  assert.equal(u.pathname, `/calendar/v3/calendars/${encodeURIComponent(ID)}/events`);
  assert.equal(u.searchParams.get('key'), PUBLIC_EMBED_API_KEY);
  // The id carries an "@" - it is a path segment here, so it has to be escaped.
  assert.ok(u.pathname.includes('%40'));
});

test('recurring events are expanded and the result comes back in order', () => {
  // orderBy=startTime is only legal alongside singleEvents=true - ask for one without the
  // other and Google answers 400, which would read as "calendar unreadable".
  const p = new URL(publicCalendarApiUrl(ID, { nowMs: NOW })).searchParams;
  assert.equal(p.get('singleEvents'), 'true');
  assert.equal(p.get('orderBy'), 'startTime');
});

test('the window asked for matches the window the list keeps', () => {
  const p = new URL(publicCalendarApiUrl(ID, { nowMs: NOW, windowDays: 28 })).searchParams;
  // A day of slack behind now, so an event that started this morning is still fetched and
  // then trimmed by mergeOurEvents' own grace period rather than never arriving.
  assert.ok(Date.parse(p.get('timeMin')) <= NOW);
  assert.equal(Date.parse(p.get('timeMax')), NOW + 28 * 86400000);
  assert.equal(new URL(publicCalendarApiUrl(ID, { nowMs: NOW, windowDays: 7 })).searchParams.get('timeMax'), new Date(NOW + 7 * 86400000).toISOString());
});

test('no calendar means no read at all', () => {
  for (const empty of [undefined, null, '', '   ']) assert.equal(publicCalendarApiUrl(empty), null);
});

test('v3 items become list rows, timed and all-day alike', () => {
  const rows = mapPublicCalendarEvents({
    items: [
      {
        id: 'timed-1',
        summary: 'Fixture later tonight',
        location: 'Union',
        htmlLink: 'https://example.com/e/1',
        start: { dateTime: '2026-08-31T05:30:00Z' },
        end: { dateTime: '2026-08-31T06:30:00Z' },
      },
      { id: 'allday-1', summary: 'Fixture all day today', start: { date: '2026-08-30' }, end: { date: '2026-08-31' } },
    ],
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((e) => [e.id, e.allDay, e.location, e.source]),
    [
      ['timed-1', false, 'Union', 'google'],
      ['allday-1', true, null, 'google'],
    ],
  );
  assert.equal(rows[0].start, '2026-08-31T05:30:00.000Z');
  assert.equal(rows[0].end, '2026-08-31T06:30:00.000Z');
  assert.equal(rows[0].url, 'https://example.com/e/1');
});

test('cancelled, undated and malformed items are dropped, not rendered', () => {
  const rows = mapPublicCalendarEvents({
    items: [
      { id: 'gone', summary: 'Fixture cancelled', status: 'cancelled', start: { dateTime: '2026-08-31T05:30:00Z' } },
      { id: 'nodate', summary: 'Fixture with no start' },
      { id: 'baddate', summary: 'Fixture with a bad start', start: { dateTime: 'not-a-date' } },
      null,
      { id: 'keep', summary: 'Fixture kept', start: { dateTime: '2026-08-31T05:30:00Z' } },
    ],
  });
  assert.deepEqual(rows.map((e) => e.id), ['keep']);
});

test('an error body or an empty calendar is zero rows, never a throw', () => {
  // Google answers 404 with this shape for a calendar that is not shared publicly. The
  // route turns the status into a source miss; the mapper must not add a crash on top.
  for (const body of [{ error: { code: 404, message: 'Not Found' } }, { items: [] }, {}, null, undefined, 'nope']) {
    assert.deepEqual(mapPublicCalendarEvents(body), []);
  }
});

test('rows from the public read survive the merge into the list', () => {
  const events = mapPublicCalendarEvents({
    items: [
      { id: 'later', summary: 'Fixture later tonight', start: { dateTime: '2026-08-31T05:30:00Z' }, end: { dateTime: '2026-08-31T06:30:00Z' } },
      { id: 'far', summary: 'Fixture past the window', start: { dateTime: '2026-11-15T19:00:00Z' }, end: { dateTime: '2026-11-15T20:00:00Z' } },
    ],
  });
  const merged = mergeOurEvents([{ name: 'public', ok: true, events }], NOW, { windowDays: 28 });
  assert.deepEqual(merged.sources, ['public']);
  assert.deepEqual(merged.events.map((e) => e.id), ['later']); // the far one is past the window
});

// --- a miss is a miss, not an empty calendar ---------------------------------------------
// The live failure: the credential-free reads answer 404 for this household's calendar, and
// zero rows looked exactly like a calendar with nothing on it. The read has to keep the two
// apart, because "nothing on the calendar yet" was being shown for a calendar with events.

test('a 404 is not a successful empty calendar', () => {
  // Google's 404 for "not shared publicly", and the 429 the .ics hosts answer with.
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    const problem = publicReadError(status, 'calendar API');
    assert.ok(problem, `HTTP ${status} must not be read as a body`);
    assert.match(problem, new RegExp(`\\b${status}\\b`)); // the status survives into the message
  }
  // The route turns that message into a throw, so the source lands as ok:false...
  const { events, sources } = mergeOurEvents([{ name: 'public', ok: false, events: [] }], NOW);
  assert.deepEqual(events, []);
  assert.deepEqual(sources, [], 'a calendar we could not read is not a connected source');
});

test('a 2xx is read, and an empty 2xx really is an empty calendar', () => {
  for (const status of [200, 204, 299]) assert.equal(publicReadError(status, 'ICS'), null);
  // Only this shape - read OK, no rows - may be reported as a connected, quiet calendar.
  assert.deepEqual(mergeOurEvents([{ name: 'public', ok: true, events: [] }], NOW).sources, ['public']);
  assert.deepEqual(mapPublicCalendarEvents({ items: [] }), []);
});
