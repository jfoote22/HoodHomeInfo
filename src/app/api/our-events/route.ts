import { NextResponse } from 'next/server';
import { listUpcoming, googleConfigured, calendarId, type CalendarEvent } from '../../../lib/googleCalendar';
import { parseIcs } from '../../../lib/ics';
import { loadHermesDocument } from '../../../lib/hermesStore';
import { parseHermesHtml, slug } from '../../../lib/hermesParse';

const HERMES_EVENTS_URL = (process.env.HERMES_EVENTS_URL || '').trim();

// "Our Events" = the household's own calendar (bravefoote@gmail.com).
// Sources, merged and deduped (first wins):
//   1. Google Calendar via service account (GOOGLE_SERVICE_ACCOUNT_JSON + OUR_CALENDAR_ID)
//   2. Hermes: the "Bravefoote Calendar" section of its HTML page (pushed document, or the LAN
//      page via HERMES_EVENTS_URL) or an ourEvents[] array in its JSON push
//   3. A private/public ICS feed (OUR_CALENDAR_ICS_URL)

const CACHE_TTL_MS = 5 * 60 * 1000;
const WINDOW_DAYS = 28;
const ICS_URL = (process.env.OUR_CALENDAR_ICS_URL || '').trim();

let cache: { at: number; payload: any } | null = null;

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedupe(list: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const key = `${norm(e.title)}|${e.start.slice(0, 13)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fromGoogle(): Promise<CalendarEvent[]> {
  if (!googleConfigured()) return [];
  return listUpcoming(WINDOW_DAYS, 100);
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

async function fromHermes(): Promise<CalendarEvent[]> {
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
  return out;
}

async function fromIcs(): Promise<CalendarEvent[]> {
  if (!ICS_URL) return [];
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(ICS_URL, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`ICS HTTP ${res.status}`);
    return parseIcs(await res.text());
  } finally {
    clearTimeout(t);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (cache && Date.now() - cache.at < CACHE_TTL_MS && searchParams.get('refresh') !== '1') {
    return NextResponse.json({ ...cache.payload, cached: true });
  }
  const results = await Promise.allSettled([fromGoogle(), fromHermes(), fromIcs()]);
  const names = ['google', 'hermes', 'ics'];
  const sources: string[] = [];
  const errors: string[] = [];
  const all: CalendarEvent[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.length) sources.push(names[i]);
      all.push(...r.value);
    } else {
      errors.push(`${names[i]}: ${String(r.reason).slice(0, 160)}`);
      console.error(`our-events ${names[i]} failed:`, r.reason);
    }
  });
  const now = Date.now();
  const events = dedupe(all)
    .filter((e) => {
      const start = new Date(e.start).getTime();
      // All-day events stay listed through the whole day, not just the first two hours.
      const end = e.end ? new Date(e.end).getTime() : start + (e.allDay ? 24 : 2) * 3600 * 1000;
      return end >= now - 3600 * 1000 && start <= now + WINDOW_DAYS * 86400000;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const payload = {
    events,
    sources,
    errors,
    calendar: calendarId(),
    writable: googleConfigured(),
    fetchedAt: new Date().toISOString(),
  };
  if (events.length || !cache) cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
