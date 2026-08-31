// Minimal iCalendar (.ics) parser - enough for a Google Calendar feed, public or "secret
// address". Handles VEVENT with DTSTART/DTEND (DATE or DATE-TIME, UTC "Z" or TZID),
// SUMMARY, LOCATION, DESCRIPTION, URL, UID, folded lines, and basic escaping. Recurring
// events (RRULE) are NOT expanded - only their first instance is returned. For full
// fidelity use the Google service-account path instead.
//
// Plain ESM (not .ts) so `node --test` can feed it a fixture feed without a build step -
// see tz.mjs and weatherHourly.mjs.

/** @typedef {import('./googleCalendar').CalendarEvent} CalendarEvent */

const TZ = 'America/Los_Angeles';

/** @param {string} text @returns {string[]} */
function unfold(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .reduce((acc, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && acc.length) acc[acc.length - 1] += line.slice(1);
      else acc.push(line);
      return acc;
    }, /** @type {string[]} */ ([]));
}

/** @param {string} v */
function unescape(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}

/** @param {Date} at @param {string} tz */
function tzOffsetMinutes(at, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(at);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
}

/**
 * Parse an iCal date/time value into a Date. `tzid` applies to floating DATE-TIME values.
 * @param {string} value
 * @param {string | null} tzid
 * @param {boolean} isDate
 * @returns {{ date: Date, allDay: boolean } | null}
 */
function parseIcalDate(value, tzid, isDate) {
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

/**
 * @param {string} text
 * @returns {CalendarEvent[]}
 */
export function parseIcs(text) {
  const lines = unfold(text);
  /** @type {CalendarEvent[]} */
  const events = [];
  /** @type {Record<string, { params: Record<string, string>, value: string }> | null} */
  let cur = null;
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
    /** @type {Record<string, string>} */
    const params = {};
    for (const p of paramParts) {
      const [k, v] = p.split('=');
      if (k && v) params[k.toUpperCase()] = v.replace(/^"|"$/g, '');
    }
    cur[name.toUpperCase()] = { params, value };
  }
  return events;
}
