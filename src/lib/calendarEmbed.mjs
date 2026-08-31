// The Google Calendar embed the dashboard shows: the hover CalendarView (WEEK) and the
// "Our Events" optional Week/Month views are the same calendar on the same host, built here
// so the two can never drift apart. "Our Events" prefers its own native rows and falls back
// to the embed's AGENDA mode only when it has no rows to show - see panelEmbedMode.
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
  // Google's view tabs are a second, far louder copy of the panel's own List/Week/Month
  // chips - on the kiosk they were the biggest thing in the panel. The chips switch views;
  // the iframe never gets to offer its own set.
  u.searchParams.set('showTabs', '0');
  u.searchParams.set('wkst', '1');
  // AGENDA is the panel's glance view, not something anyone navigates: no date range and no
  // arrows either, so it reads as a list of rows rather than as Google's app. WEEK and MONTH
  // keep their nav, because there the point is to move around the calendar.
  if (u.searchParams.get('mode') === 'AGENDA') {
    u.searchParams.set('showNav', '0');
    u.searchParams.set('showDate', '0');
  }
  return u.toString();
}

/**
 * Height, in CSS pixels, of the blank gutter Google leaves above the agenda's first row. The
 * panel clips it away - pulling the iframe up by this much inside an overflow-hidden box -
 * so the AGENDA body starts on a row, under our own "Our Events" heading, instead of on
 * Google's page padding.
 *
 * Measured off the agenda embed rendered with exactly the flags above: blank to y=14, then
 * today's row (its date and the red now-line) to y=48, then the first event. Note what is
 * *not* there: with showTabs/showNav/showDate off, Google draws no header and no view tabs
 * to crop. So the crop stops at the gutter - today's row is where today's events land, and
 * cutting into it would hide the thing the panel exists to show.
 */
export const AGENDA_HEADER_CROP_PX = 14;

/**
 * The views the "Our Events" panel offers. LIST is our own rows - the day chip, title and
 * date/time/location line that Local Events uses - and is the default; WEEK and MONTH are
 * the Google embed, offered as a small explicit choice. LIST is a view, not a data source:
 * with rows it is native, with none it is the AGENDA embed showing the same events Week and
 * Month show. See panelEmbedMode.
 */
export const VIEW_LIST = 'list';
export const VIEW_WEEK = 'week';
export const VIEW_MONTH = 'month';
export const CALENDAR_VIEWS = [VIEW_LIST, VIEW_WEEK, VIEW_MONTH];
/** The list - our rows when we have them, the cropped AGENDA embed when we have none. */
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

/** @param {unknown} rows @returns {number} rows the native list would render */
function rowCount(rows) {
  if (Array.isArray(rows)) return rows.length;
  const n = Number(rows);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Which Google embed mode - if any - the panel's body should be, given how the fetch went
 * and what the viewer has asked for. `null` means our own native rows.
 *
 * The rules, in order:
 *   - still loading -> native (the list says "Loading calendar…"; no iframe flash)
 *   - no calendar id -> native (there is nothing to embed)
 *   - the viewer picked Week or Month -> that mode
 *   - List (the default, and whatever else List means):
 *       rows -> native, the compact Local-Events shape we want
 *       no rows -> AGENDA, cropped to its rows by the panel
 *
 * That last line is the point of this module. Every credential-free read path answers 404
 * for a calendar that is not shared publicly, so an empty list is far more often "we could
 * not read it" than "there is nothing on it" - and this household's calendar demonstrably
 * has events, which Week and Month show. The embed renders them because it runs in the
 * viewer's own signed-in browser. "Nothing on the calendar yet" under a calendar that
 * visibly has events is the one answer that is simply wrong, so no state produces it while
 * there is a calendar to embed.
 *
 * @param {{ loading?: boolean, view?: string | null, rows?: unknown, calendarId?: string | null }} state
 * @returns {'WEEK' | 'MONTH' | 'AGENDA' | null}
 */
export function panelEmbedMode(state = {}) {
  if (state.loading) return null;
  if (!String(state.calendarId || '').trim()) return null;
  const explicit = embedModeForView(state.view);
  if (explicit !== null) return explicit;
  return rowCount(state.rows) > 0 ? null : 'AGENDA';
}

/**
 * Does the panel hand its body to the Google embed instead of rendering native rows?
 * @param {Parameters<typeof panelEmbedMode>[0]} state
 * @returns {boolean}
 */
export function shouldShowAgendaEmbed(state = {}) {
  return panelEmbedMode(state) !== null;
}
