// Minimal iCalendar (.ics) parser - enough for a Google Calendar "secret address" feed.
// Handles VEVENT with DTSTART/DTEND (DATE or DATE-TIME, UTC "Z" or TZID), SUMMARY,
// LOCATION, DESCRIPTION, URL, UID, folded lines, and basic escaping. Recurring events
// (RRULE) are NOT expanded - only their first instance is returned. For full fidelity
// use the Google service-account path instead.

import type { CalendarEvent } from './googleCalendar';

const TZ = 'America/Los_Angeles';

function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce<string[]>((acc, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && acc.length) acc[acc.length - 1] += line.slice(1);
      else acc.push(line);
      return acc;
    }, []);
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
}

/** Parse an iCal date/time value into a Date. `tzid` applies to floating DATE-TIME values. */
function parseIcalDate(value: string, tzid: string | null, isDate: boolean): { date: Date; allDay: boolean } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (isDate || !hh) {
    // all-day: midnight in the dashboard timezone
    const guess = Date.UTC(+y, +mo - 1, +d);
    return { date: new Date(guess - tzOffsetMinutes(new Date(guess), TZ) * 60000), allDay: true };
  }
  const guess = Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss || 0));
  if (z) return { date: new Date(guess), allDay: false };
  const tz = tzid || TZ;
  let offset = 0;
  try {
    offset = tzOffsetMinutes(new Date(guess), tz);
  } catch {
    offset = tzOffsetMinutes(new Date(guess), TZ);
  }
  return { date: new Date(guess - offset * 60000), allDay: false };
}

export function parseIcs(text: string): CalendarEvent[] {
  const lines = unfold(text);
  const events: CalendarEvent[] = [];
  let cur: Record<string, { params: Record<string, string>; value: string }> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur) {
        const ds = cur.DTSTART;
        if (ds) {
          const start = parseIcalDate(ds.value, ds.params.TZID || null, ds.params.VALUE === 'DATE');
          const de = cur.DTEND;
          const end = de ? parseIcalDate(de.value, de.params.TZID || null, de.params.VALUE === 'DATE') : null;
          if (start && cur.STATUS?.value !== 'CANCELLED') {
            events.push({
              id: cur.UID?.value || `${cur.SUMMARY?.value || 'event'}-${start.date.toISOString()}`,
              title: unescape(cur.SUMMARY?.value || '(untitled)'),
              start: start.date.toISOString(),
              end: end ? end.date.toISOString() : null,
              allDay: start.allDay,
              location: cur.LOCATION ? unescape(cur.LOCATION.value) || null : null,
              description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION.value) || null : null,
              url: cur.URL?.value || null,
              source: 'ics',
            });
          }
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const left = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name, ...paramParts] = left.split(';');
    const params: Record<string, string> = {};
    for (const p of paramParts) {
      const [k, v] = p.split('=');
      if (k && v) params[k.toUpperCase()] = v.replace(/^"|"$/g, '');
    }
    cur[name.toUpperCase()] = { params, value };
  }
  return events;
}
