// The Google Calendar embed the dashboard shows: the hover CalendarView (WEEK) and the
// "Our Events" agenda fallback (AGENDA) are the same calendar on the same host, built here
// so the two can never drift apart.
//
// The embed needs no credential of its own - it renders whatever the viewer can see, which
// for the kiosk means the calendar is shared publicly (Calendar settings -> Access
// permissions -> "Make available to public"). That is the same permission the public .ics
// read path wants, except the embed keeps working when that feed is not served.
//
// Plain ESM (not .ts) so `node --test` can exercise it without a build step - see
// ourEventsList.mjs.

export const CALENDAR_EMBED_TZ = 'America/Los_Angeles';
export const CALENDAR_EMBED_HOST = 'https://calendar.google.com/calendar/embed';
/** The household calendar, used when no id is configured. */
export const DEFAULT_CALENDAR_ID = 'bravefoote@gmail.com';

/**
 * First configured id wins, so a client panel and the hover embed can pass the same
 * candidates and land on the same `src`. NEXT_PUBLIC_OUR_CALENDAR_ID is what the browser
 * knows; the id reported by /api/our-events (OUR_CALENDAR_ID server-side) is the tie-break
 * so a server-only setting still points the embed at the calendar the list reads.
 *
 * @param {...(string | null | undefined)} candidates
 * @returns {string}
 */
export function resolveCalendarId(...candidates) {
  for (const c of candidates) {
    const id = String(c || '').trim();
    if (id) return id;
  }
  return DEFAULT_CALENDAR_ID;
}

/**
 * The embed URL for one calendar.
 *
 * @param {string | null | undefined} calendarId
 * @param {{ mode?: 'WEEK' | 'AGENDA', tz?: string }} [opts]
 * @returns {string | null} null when there is no calendar to show
 */
export function calendarEmbedUrl(calendarId, opts = {}) {
  const id = String(calendarId || '').trim();
  if (!id) return null;
  const u = new URL(CALENDAR_EMBED_HOST);
  u.searchParams.set('src', id);
  u.searchParams.set('ctz', opts.tz || CALENDAR_EMBED_TZ);
  u.searchParams.set('mode', opts.mode === 'AGENDA' ? 'AGENDA' : 'WEEK');
  // Strip Google's own chrome - the panel already has a title and the kiosk has no printer.
  u.searchParams.set('showTitle', '0');
  u.searchParams.set('showPrint', '0');
  u.searchParams.set('showCalendars', '0');
  u.searchParams.set('showTz', '0');
  u.searchParams.set('wkst', '1');
  return u.toString();
}

/**
 * Should "Our Events" fall back to the agenda embed instead of its own rows?
 *
 * The JSON list can come back empty for two very different reasons - the calendar really is
 * empty, or nothing could read it (no service account, no feed, public .ics not served).
 * Either way the embed can still show the calendar, because it is the viewer's own browser
 * asking Google. So: no rows and a calendar to point at -> show the calendar. A fetch error
 * is not a reason to render error copy over a calendar we can still display.
 *
 * @param {{ loading?: boolean, rows?: unknown[], calendarId?: string | null }} state
 * @returns {boolean}
 */
export function shouldShowAgendaEmbed(state = {}) {
  if (state.loading) return false; // wait for the list before replacing it
  if (Array.isArray(state.rows) && state.rows.length > 0) return false;
  return String(state.calendarId || '').trim().length > 0;
}
