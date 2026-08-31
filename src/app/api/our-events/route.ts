import { NextResponse } from 'next/server';
import { listUpcoming, googleConfigured, serviceAccountError, calendarId, type CalendarEvent } from '../../../lib/googleCalendar';
import { parseIcs } from '../../../lib/ics.mjs';
import { publicIcsUrls, publicCalendarApiUrl, mapPublicCalendarEvents, mergeOurEvents } from '../../../lib/ourEventsList.mjs';
import { loadHermesDocument } from '../../../lib/hermesStore';
import { parseHermesHtml, slug } from '../../../lib/hermesParse';

const HERMES_EVENTS_URL = (process.env.HERMES_EVENTS_URL || '').trim();

// "Our Events" = the household's own calendar - the same one the hover embed renders.
// Sources, merged and deduped (first wins):
//   1. Google Calendar via service account (GOOGLE_SERVICE_ACCOUNT_JSON + OUR_CALENDAR_ID).
//      Read *and* write; needed for the "+ Add" and delete buttons.
//   2. Hermes: the household-calendar section of its HTML page (pushed document, or the LAN
//      page via HERMES_EVENTS_URL) or an ourEvents[] array in its JSON push
//   3. A private ICS feed (OUR_CALENDAR_ICS_URL)
//   4. The public calendar in calendarId() - no credential at all, exactly like the embed:
//      Calendar v3 events.list through the embed's own browser-shipped key, then the public
//      .ics as a second try. This is the read path when none of the above is configured, so
//      the list shows the calendar the embed is already showing instead of nothing.
// Rows from here fill the panel's native list, which is now its default view whether or not
// it has anything in it (src/lib/calendarEmbed.mjs). An empty response means the list says
// "nothing on the calendar yet", not that the panel hands itself to Google's UI.

const CACHE_TTL_MS = 5 * 60 * 1000;
const WINDOW_DAYS = 28;
const ICS_URL = (process.env.OUR_CALENDAR_ICS_URL || '').trim();

let cache: { at: number; payload: any } | null = null;

/** A source that answered (`ok`) is a connected calendar even when its next weeks are empty. */
type SourceResult = { name: string; ok: boolean; events: CalendarEvent[] };

async function fromGoogle(): Promise<SourceResult> {
  // A key that is set but unreadable is a misconfiguration, not an empty calendar - throw so
  // it lands in the response's `errors` instead of silently rendering as "nothing on the
  // calendar yet".
  const problem = serviceAccountError();
  if (problem) throw new Error(problem);
  if (!googleConfigured()) return { name: 'google', ok: false, events: [] };
  return { name: 'google', ok: true, events: await listUpcoming(WINDOW_DAYS, 100) };
}

function hermesJsonToOurs(parsed: any): CalendarEvent[] {
  const list: any[] = Array.isArray(parsed?.ourEvents) ? parsed.ourEvents : Array.isArray(parsed?.calendar) ? parsed.calendar : [];
  return list
    .map((e: any): CalendarEvent | null => {
      if (!e?.title || !e?.start) return null;
      const start = new Date(e.start);
      if (Number.isNaN(start.getTime())) return null;
      const end = e.end ? new Date(e.end) : null;
      return {
        id: String(e.id || `${slug(String(e.title))}-${start.toISOString()}`),
        title: String(e.title),
        start: start.toISOString(),
        end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        allDay: Boolean(e.allDay),
        location: e.location || e.venue || null,
        description: e.description || null,
        url: e.url || null,
        source: 'hermes',
      };
    })
    .filter((e: CalendarEvent | null): e is CalendarEvent => e !== null);
}

function hermesHtmlToOurs(body: string): CalendarEvent[] {
  return parseHermesHtml(body)
    .filter((it) => it.isCalendar)
    .map((it) => ({
      id: `hermes-cal-${slug(it.title)}-${it.start.toISOString()}`,
      title: it.title,
      start: it.start.toISOString(),
      end: it.end ? it.end.toISOString() : null,
      allDay: it.allDay,
      location: it.venue || it.city || null,
      description: it.description,
      url: it.url,
      source: 'hermes' as const,
    }));
}

async function fromHermes(): Promise<SourceResult> {
  const out: CalendarEvent[] = [];
  // a) the document Hermes pushed (Blob on Vercel, data/ locally)
  try {
    const doc = await loadHermesDocument();
    if (doc) {
      if (doc.kind === 'json') {
        try {
          const parsed = JSON.parse(doc.body);
          out.push(...hermesJsonToOurs(parsed));
          if (typeof parsed.html === 'string') out.push(...hermesHtmlToOurs(parsed.html));
        } catch {
          /* ignore */
        }
      } else {
        out.push(...hermesHtmlToOurs(doc.body));
      }
    }
  } catch (err) {
    console.warn('our-events: hermes document unreadable', err);
  }
  // b) the LAN page (local/dev runs)
  if (HERMES_EVENTS_URL) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(HERMES_EVENTS_URL, { cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        const body = await res.text();
        if (/json/i.test(ct) || body.trim().startsWith('{')) out.push(...hermesJsonToOurs(JSON.parse(body)));
        else out.push(...hermesHtmlToOurs(body));
      }
    } catch {
      /* LAN page not reachable from here - fine */
    }
  }
  // Only claim "via Howie" when the page actually carried household-calendar entries. Its
  // other cards are local/community events and belong to the Local Events panel, not here.
  return { name: 'hermes', ok: out.length > 0, events: out };
}

async function fetchIcs(url: string, timeoutMs: number): Promise<CalendarEvent[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`ICS HTTP ${res.status}`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('ICS response was not a calendar feed');
    return parseIcs(text);
  } finally {
    clearTimeout(t);
  }
}

async function fromIcs(): Promise<SourceResult> {
  if (!ICS_URL) return { name: 'ics', ok: false, events: [] };
  return { name: 'ics', ok: true, events: await fetchIcs(ICS_URL, 15000) };
}

/**
 * The same Calendar v3 read the embed's own JavaScript makes from the browser, with the
 * key Google ships in that JavaScript - no household secret, no service account, no env
 * var. Preferred over the public .ics: Google serves it for every calendar the embed can
 * render, and `singleEvents` expands recurring events, which the .ics parser cannot do.
 */
async function fetchPublicCalendarApi(url: string, timeoutMs: number): Promise<CalendarEvent[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    // 404 here is Google's answer for "this calendar is not shared publicly" - the same
    // shape it returns for a calendar that does not exist at all.
    if (!res.ok) throw new Error(`calendar API HTTP ${res.status}`);
    return mapPublicCalendarEvents(await res.json());
  } finally {
    clearTimeout(t);
  }
}

/**
 * The credential-free read path: a calendar shared publicly can be read by anyone, which is
 * the same permission the hover embed already needs. Skipped when a service account or an
 * explicit feed is configured, since those read the same calendar with more fidelity (and
 * can write).
 *
 * Both attempts fail for a calendar that is *not* shared publicly - the API answers 404 and
 * the .ics 404/429 - and that is a missing bonus, not a broken dashboard. A miss is logged
 * as "not a source", never as an error: the panel shows "nothing on the calendar yet", and
 * the Week/Month views still render the calendar from the viewer's own browser, where the
 * viewer's Google session is what grants access.
 */
async function fromPublicCalendar(): Promise<SourceResult> {
  if (ICS_URL || googleConfigured()) return { name: 'public', ok: false, events: [] };
  const id = calendarId();
  let last = 'no calendar id';
  const apiUrl = publicCalendarApiUrl(id, { windowDays: WINDOW_DAYS });
  if (apiUrl) {
    try {
      return { name: 'public', ok: true, events: await fetchPublicCalendarApi(apiUrl, 10000) };
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  for (const url of publicIcsUrls(id)) {
    try {
      return { name: 'public', ok: true, events: await fetchIcs(url, 10000) };
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
  }
  // Named env vars only - never an id, a URL, a key or an event title.
  console.warn(
    `our-events: public calendar unreadable (${last}) - the list will be empty. ` +
      'For rows, share the calendar publicly in Calendar settings, or set OUR_CALENDAR_ICS_URL or GOOGLE_SERVICE_ACCOUNT_JSON.',
  );
  return { name: 'public', ok: false, events: [] };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (cache && Date.now() - cache.at < CACHE_TTL_MS && searchParams.get('refresh') !== '1') {
    return NextResponse.json({ ...cache.payload, cached: true });
  }
  const settled = await Promise.allSettled([fromGoogle(), fromHermes(), fromIcs(), fromPublicCalendar()]);
  const names = ['google', 'hermes', 'ics', 'public'];
  const errors: string[] = [];
  const groups: SourceResult[] = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      groups.push(r.value);
    } else {
      errors.push(`${names[i]}: ${String(r.reason?.message ?? r.reason).slice(0, 200)}`);
      console.error(`our-events ${names[i]} failed:`, r.reason);
    }
  });
  const { events, sources } = mergeOurEvents(groups, Date.now(), { windowDays: WINDOW_DAYS });

  const payload = {
    events,
    sources,
    errors,
    calendar: calendarId(),
    writable: googleConfigured(),
    fetchedAt: new Date().toISOString(),
  };
  // Never pin a failed fetch in the cache - a transient Google error would otherwise show an
  // empty calendar for the full TTL.
  if (!errors.length && (events.length || !cache)) cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
