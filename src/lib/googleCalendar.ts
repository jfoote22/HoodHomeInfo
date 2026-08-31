// Google Calendar access for the "Our Events" panel and the "Add to calendar" button.
//
// Uses a Google *service account* (no browser OAuth dance, works from Vercel):
//   1. Google Cloud console -> create project -> enable "Google Calendar API"
//   2. IAM & Admin -> Service Accounts -> create one -> Keys -> Add key (JSON) -> download
//   3. Put the JSON into env GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or base64 of it)
//   4. In Google Calendar (bravefoote@gmail.com) -> Settings -> share the calendar with the
//      service account's email ("Make changes to events")
//   5. OUR_CALENDAR_ID=bravefoote@gmail.com
// Tokens are minted with a signed JWT (RS256 via node:crypto) - no extra dependencies.

import { createSign } from 'crypto';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  url: string | null;
  source: 'google' | 'ics' | 'hermes';
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/calendar';
const TZ = 'America/Los_Angeles';
let tokenCache: { token: string; exp: number } | null = null;

/**
 * The household calendar. NEXT_PUBLIC_OUR_CALENDAR_ID is what the hover embed renders
 * (see CalendarView), so it is honoured here too - otherwise setting only the public id
 * would leave the list reading a different calendar than the one on screen.
 */
export function calendarId(): string {
  return (process.env.OUR_CALENDAR_ID || process.env.NEXT_PUBLIC_OUR_CALENDAR_ID || 'bravefoote@gmail.com').trim();
}

// Why the configured key could not be used, if it was set at all. A malformed key used to
// be indistinguishable from "no calendar configured": both returned null and the panel just
// looked like an empty calendar. Messages describe the shape of the problem, never a value.
let saProblem: string | null = null;

export function serviceAccount(): ServiceAccount | null {
  saProblem = null;
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null; // simply not configured - not an error
  let text: string;
  try {
    text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8');
  } catch {
    saProblem = 'GOOGLE_SERVICE_ACCOUNT_JSON is neither raw JSON nor valid base64';
    return null;
  }
  let sa: any;
  try {
    sa = JSON.parse(text);
  } catch {
    saProblem = 'GOOGLE_SERVICE_ACCOUNT_JSON is set but is not valid JSON (raw JSON needs the private key newlines escaped as \\n - or store base64 of the whole key file)';
    return null;
  }
  if (!sa?.client_email || !sa?.private_key) {
    saProblem = 'GOOGLE_SERVICE_ACCOUNT_JSON parsed but has no client_email/private_key - is it a service-account key file?';
    return null;
  }
  return { client_email: sa.client_email, private_key: String(sa.private_key).replace(/\\n/g, '\n'), token_uri: sa.token_uri };
}

export function googleConfigured(): boolean {
  return serviceAccount() !== null;
}

/** Describes a broken GOOGLE_SERVICE_ACCOUNT_JSON; null when it is usable or simply unset. */
export function serviceAccountError(): string | null {
  serviceAccount();
  return saProblem;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function accessToken(): Promise<string> {
  const sa = serviceAccount();
  if (!sa) throw new Error('Google service account not configured');
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token;

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(sa.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`Google token HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return tokenCache.token;
}

function toEvent(item: any): CalendarEvent | null {
  if (!item || item.status === 'cancelled') return null;
  const startRaw = item.start?.dateTime || item.start?.date;
  if (!startRaw) return null;
  const allDay = !item.start?.dateTime;
  const start = allDay ? localMidnight(item.start.date) : new Date(startRaw);
  const endRaw = item.end?.dateTime || item.end?.date;
  const end = endRaw ? (allDay ? localMidnight(endRaw) : new Date(endRaw)) : null;
  if (Number.isNaN(start.getTime())) return null;
  return {
    id: String(item.id),
    title: String(item.summary || '(untitled)'),
    start: start.toISOString(),
    end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
    allDay,
    location: item.location || null,
    description: item.description || null,
    url: item.htmlLink || null,
    source: 'google',
  };
}

/** Midnight of a YYYY-MM-DD in the dashboard timezone. */
function localMidnight(ymd: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(guess);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-8';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0)) : -480;
  return new Date(guess.getTime() - offsetMin * 60000);
}

export async function listUpcoming(days = 21, max = 50): Promise<CalendarEvent[]> {
  const token = await accessToken();
  const timeMin = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const timeMax = new Date(Date.now() + days * 86400000).toISOString();
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: String(max), timeZone: TZ });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Calendar list HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return (json.items || []).map(toEvent).filter((e: CalendarEvent | null): e is CalendarEvent => e !== null);
}

export interface NewCalendarEvent {
  title: string;
  start: string; // ISO
  end?: string | null;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
  url?: string | null;
}

export async function insertEvent(ev: NewCalendarEvent): Promise<CalendarEvent> {
  const token = await accessToken();
  const start = new Date(ev.start);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid start');
  const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 2 * 3600 * 1000);
  const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
  const body: any = {
    summary: ev.title,
    location: ev.location || undefined,
    description: [ev.description, ev.url ? `More info: ${ev.url}` : null, 'Added from the Hood Canal dashboard'].filter(Boolean).join('\n\n'),
    source: ev.url ? { title: ev.title, url: ev.url } : undefined,
  };
  if (ev.allDay) {
    const endDay = new Date(start.getTime() + 86400000);
    body.start = { date: ymd(start) };
    body.end = { date: ymd(endDay) };
  } else {
    body.start = { dateTime: start.toISOString(), timeZone: TZ };
    body.end = { dateTime: end.toISOString(), timeZone: TZ };
  }
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar insert HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const created = toEvent(await res.json());
  if (!created) throw new Error('Calendar returned an unexpected event');
  return created;
}

export interface DeleteTarget {
  id?: string | null;
  source?: string | null;
  title: string;
  start: string; // ISO
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function deleteById(token: string, id: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404 || res.status === 410) return false; // already gone
  if (!res.ok) throw new Error(`Google Calendar delete HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return true;
}

/**
 * Delete an event. Events that came from Google carry their Google id; ones that reached us
 * via Hermes or an ICS feed don't, so those are matched by title on the same local day.
 */
export async function deleteEvent(target: DeleteTarget): Promise<{ deleted: boolean; id: string | null }> {
  const token = await accessToken();
  if (target.id && target.source === 'google') {
    return { deleted: await deleteById(token, target.id), id: target.id };
  }
  const start = new Date(target.start);
  if (Number.isNaN(start.getTime())) throw new Error('Invalid start');
  const day = start.toLocaleDateString('en-CA', { timeZone: TZ });
  const timeMin = new Date(start.getTime() - 36 * 3600 * 1000).toISOString();
  const timeMax = new Date(start.getTime() + 36 * 3600 * 1000).toISOString();
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', maxResults: '50', timeZone: TZ, q: target.title });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId())}/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google Calendar search HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const want = normTitle(target.title);
  const match = (json.items || [])
    .map(toEvent)
    .filter((e: CalendarEvent | null): e is CalendarEvent => e !== null)
    .find((e: CalendarEvent) => normTitle(e.title) === want && new Date(e.start).toLocaleDateString('en-CA', { timeZone: TZ }) === day);
  if (!match) return { deleted: false, id: null };
  // Recurring instances have ids like "<base>_20260907"; deleting the instance id removes
  // just that occurrence, which is what someone tapping one row expects.
  return { deleted: await deleteById(token, match.id), id: match.id };
}

/** Pre-filled "add to Google Calendar" link - used as a fallback when no service account is set. */
export function templateLink(ev: NewCalendarEvent): string {
  const start = new Date(ev.start);
  const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 2 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const fmtDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, '');
  const dates = ev.allDay ? `${fmtDay(start)}/${fmtDay(new Date(start.getTime() + 86400000))}` : `${fmt(start)}/${fmt(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: [ev.description, ev.url].filter(Boolean).join('\n'),
    location: ev.location || '',
    ctz: TZ,
    // Open in the household Google account (switches the signed-in profile, or prompts to
    // sign in) and preselect that calendar, instead of whatever profile the browser is on.
    authuser: calendarId(),
    src: calendarId(),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
