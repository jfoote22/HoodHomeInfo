// The Google Calendar embed the dashboard shows: the hover CalendarView (WEEK) and the
// "Our Events" optional Week/Month views are the same calendar on the same host, built here
// so the two can never drift apart. "Our Events" defaults to its own native rows - see
// shouldShowAgendaEmbed.
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

/** Embed modes the panel can ask for; anything else falls back to the hover view. */
const EMBED_MODES = new Set(['WEEK', 'MONTH', 'AGENDA']);

/**
 * The embed URL for one calendar.
 *
 * @param {string | null | undefined} calendarId
 * @param {{ mode?: 'WEEK' | 'MONTH' | 'AGENDA', tz?: string }} [opts]
 * @returns {string | null} null when there is no calendar to show
 */
export function calendarEmbedUrl(calendarId, opts = {}) {
  const id = String(calendarId || '').trim();
  if (!id) return null;
  const u = new URL(CALENDAR_EMBED_HOST);
  u.searchParams.set('src', id);
  u.searchParams.set('ctz', opts.tz || CALENDAR_EMBED_TZ);
  u.searchParams.set('mode', EMBED_MODES.has(opts.mode) ? opts.mode : 'WEEK');
  // Strip Google's own chrome - the panel already has a title and the kiosk has no printer.
  u.searchParams.set('showTitle', '0');
  u.searchParams.set('showPrint', '0');
  u.searchParams.set('showCalendars', '0');
  u.searchParams.set('showTz', '0');
  u.searchParams.set('wkst', '1');
  return u.toString();
}

/**
 * The views the "Our Events" panel offers. LIST is our own rows - the day chip, title and
 * date/time/location line that Local Events uses - and is the default; WEEK and MONTH are
 * the Google embed, offered as a small explicit choice.
 */
export const VIEW_LIST = 'list';
export const VIEW_WEEK = 'week';
export const VIEW_MONTH = 'month';
export const CALENDAR_VIEWS = [VIEW_LIST, VIEW_WEEK, VIEW_MONTH];
/** Native rows, always - see shouldShowAgendaEmbed for why the embed is not the default. */
export const DEFAULT_CALENDAR_VIEW = VIEW_LIST;

/**
 * Normalise whatever the panel is holding into one of CALENDAR_VIEWS. Unknown, empty and
 * undefined all mean the native list, so a stale or hand-edited value can never strand the
 * kiosk inside the iframe.
 *
 * @param {string | null | undefined} view
 * @returns {string}
 */
export function resolveCalendarView(view) {
  const v = String(view || '')
    .trim()
    .toLowerCase();
  return CALENDAR_VIEWS.includes(v) ? v : DEFAULT_CALENDAR_VIEW;
}

/**
 * Google's embed mode for a view, or null when the view is our own rows.
 *
 * @param {string | null | undefined} view
 * @returns {'WEEK' | 'MONTH' | null}
 */
export function embedModeForView(view) {
  const v = resolveCalendarView(view);
  if (v === VIEW_WEEK) return 'WEEK';
  if (v === VIEW_MONTH) return 'MONTH';
  return null;
}

/**
 * Should the panel hand its body to the Google embed instead of rendering native rows?
 *
 * Only when the viewer asked for WEEK or MONTH. The list view stays native even with
 * nothing to show: on the kiosk, Google's own UI - its header, its nav, its typography -
 * eats the panel, so an empty list is better read as "nothing on the calendar" than as a
 * wall of Google chrome. The embed had been the fallback for an empty list, which made it
 * the *default* view in practice, because the credential-free read paths return no rows
 * for a calendar that is not shared publicly.
 *
 * Note what is deliberately absent: `rows`. An empty list does not summon the embed, and a
 * full one does not dismiss it - the view is the viewer's choice, not a consequence of how
 * the fetch went.
 *
 * @param {{ loading?: boolean, view?: string | null, calendarId?: string | null }} state
 * @returns {boolean}
 */
export function shouldShowAgendaEmbed(state = {}) {
  if (state.loading) return false; // nothing to switch to yet
  if (embedModeForView(state.view) === null) return false; // the native list is the default
  return String(state.calendarId || '').trim().length > 0;
}
