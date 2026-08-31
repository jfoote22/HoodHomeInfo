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
