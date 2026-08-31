// The "Our Events" list: which calendar the list reads, and how the merged rows are
// narrowed to the upcoming window.
//
// Plain ESM (not .ts) so `node --test` can exercise it against fixture feeds with a frozen
// clock and no network - see weatherHourly.mjs.

/** @typedef {import('./googleCalendar').CalendarEvent} CalendarEvent */

/** How long a finished event stays on the list, so "on now / just ended" does not vanish. */
const GRACE_MS = 60 * 60 * 1000;
/** Assumed length of an event with no DTEND: a whole day for all-day, two hours otherwise. */
const ASSUMED_HOURS = { allDay: 24, timed: 2 };

/**
 * Read URLs for a Google Calendar that is shared publicly - the same condition the hover
 * embed already relies on, so this needs no service account, no API key and no secret
 * address. Google serves the feed from two interchangeable hosts; the legacy one is tried
 * only if the current one does not answer.
 *
 * @param {string} calendarId e.g. the id the embed's `src` uses
 * @returns {string[]} candidate .ics URLs, best first
 */
export function publicIcsUrls(calendarId) {
  const id = String(calendarId || '').trim();
  if (!id) return [];
  const path = `calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;
  return [`https://calendar.google.com/${path}`, `https://www.google.com/${path}`];
}

/** @param {string} s */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The same event reaching us from two sources (say the calendar feed and Howie's page) is
 * one row. Keyed on the title plus the hour it starts, so a feed that rounds seconds
 * differently still collapses.
 * @param {CalendarEvent[]} list
 * @returns {CalendarEvent[]}
 */
function dedupe(list) {
  const seen = new Set();
  return list.filter((e) => {
    const key = `${norm(e.title)}|${String(e.start).slice(0, 13)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** @param {CalendarEvent} e @returns {{ start: number, end: number } | null} */
function span(e) {
  const start = new Date(e.start).getTime();
  if (!Number.isFinite(start)) return null;
  const end = e.end ? new Date(e.end).getTime() : NaN;
  if (Number.isFinite(end) && end > start) return { start, end };
  // An all-day event runs to the end of its day - keeping only the first two hours used to
  // drop it from the list by mid-morning Pacific.
  return { start, end: start + (e.allDay ? ASSUMED_HOURS.allDay : ASSUMED_HOURS.timed) * 3600 * 1000 };
}

/**
 * @typedef {{ name: string, ok: boolean, events: CalendarEvent[] }} SourceResult
 *   `ok` means the source was configured and answered - NOT that it had anything to say.
 *   An empty week on a calendar we can read is still a connected calendar.
 */

/**
 * Merge every source into the list the panel renders.
 *
 * @param {SourceResult[]} groups
 * @param {number} nowMs current time in epoch ms
 * @param {{ windowDays?: number }} [opts]
 * @returns {{ events: CalendarEvent[], sources: string[] }}
 */
export function mergeOurEvents(groups, nowMs, opts = {}) {
  const windowDays = opts.windowDays ?? 28;
  const list = Array.isArray(groups) ? groups : [];
  /** @type {CalendarEvent[]} */
  const all = [];
  const sources = [];
  for (const g of list) {
    if (!g) continue;
    if (g.ok) sources.push(g.name);
    if (Array.isArray(g.events)) all.push(...g.events);
  }
  const events = dedupe(all)
    .map((e) => ({ e, at: span(e) }))
    .filter(({ at }) => at !== null && at.end >= nowMs - GRACE_MS && at.start <= nowMs + windowDays * 86400000)
    .sort((a, b) => a.at.start - b.at.start)
    .map(({ e }) => e);
  return { events, sources };
}

/**
 * The public key Google's own embed JavaScript ships to every browser that loads a
 * calendar embed, used here to make the same Calendar v3 call the embed makes. It is not a
 * household secret, it is not the weather key, and it grants nothing beyond what any
 * visitor to a *public* calendar already gets - which is why it can live in the repo.
 */
export const PUBLIC_EMBED_API_KEY = 'AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs';
/** The host the embed's client calls; www.googleapis.com serves the identical response. */
export const PUBLIC_CALENDAR_API_HOST = 'https://clients6.google.com';

/**
 * The credential-free read the embed itself performs: Calendar v3 `events.list` against a
 * publicly shared calendar. Preferred over the public .ics because Google serves it for
 * every calendar the embed can render (basic.ics is 404/429 for plenty of them) and
 * because `singleEvents` expands recurring events, which the .ics parser cannot do.
 *
 * Requires exactly the permission the embed already requires - Calendar settings ->
 * "Make available to public" - and no env var of its own.
 *
 * @param {string} calendarId
 * @param {{ nowMs?: number, windowDays?: number, maxResults?: number, key?: string }} [opts]
 * @returns {string | null} null when there is no calendar to read
 */
export function publicCalendarApiUrl(calendarId, opts = {}) {
  const id = String(calendarId || '').trim();
  if (!id) return null;
  const now = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const windowDays = opts.windowDays ?? 28;
  const u = new URL(`${PUBLIC_CALENDAR_API_HOST}/calendar/v3/calendars/${encodeURIComponent(id)}/events`);
  u.searchParams.set('key', opts.key || PUBLIC_EMBED_API_KEY);
  u.searchParams.set('singleEvents', 'true'); // expand recurring events into instances
  u.searchParams.set('orderBy', 'startTime'); // only legal alongside singleEvents
  u.searchParams.set('timeMin', new Date(now - 24 * 3600 * 1000).toISOString());
  u.searchParams.set('timeMax', new Date(now + windowDays * 86400000).toISOString());
  u.searchParams.set('maxResults', String(opts.maxResults ?? 250));
  return u.toString();
}

/**
 * Map a Calendar v3 `events.list` body into the rows the panel renders. All-day events
 * arrive as `date` (no time) and timed ones as `dateTime`, which is the only signal we get
 * for the "All day" label.
 *
 * @param {any} body parsed JSON from publicCalendarApiUrl()
 * @returns {CalendarEvent[]}
 */
export function mapPublicCalendarEvents(body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  return items
    .map((it) => {
      if (!it || it.status === 'cancelled') return null;
      const allDay = Boolean(it.start?.date && !it.start?.dateTime);
      const start = new Date(it.start?.dateTime || it.start?.date || '');
      if (Number.isNaN(start.getTime())) return null;
      const rawEnd = it.end?.dateTime || it.end?.date || '';
      const end = rawEnd ? new Date(rawEnd) : null;
      return {
        id: String(it.id || `public-${start.toISOString()}`),
        title: String(it.summary || 'Busy'),
        start: start.toISOString(),
        end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        allDay,
        location: it.location || null,
        description: it.description || null,
        url: it.htmlLink || null,
        source: 'google',
      };
    })
    .filter((e) => e !== null);
}
