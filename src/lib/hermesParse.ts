// Parser for the Hermes "Local WA Events + Bravefoote Calendar" page (HTML) and its JSON
// equivalent. Shared by /api/events/live (local events) and /api/our-events (calendar).
//
// HTML shape:
//   <section class="city"><h2>City -or- "Bravefoote Calendar"</h2>
//     <h3>Category</h3>
//     <article class="event"><pre>• Title
//        Date &amp; time: Sat, Aug 29 and Sat, Sep 5, 2026, 10:00 AM–3:00 PM
//        Venue / location: Belfair Elementary School, 22900 WA-3, Belfair
//        Category: Farmers Market
//        Link: <a href="...">...</a>
//        free-text description</pre></article>

import * as cheerio from 'cheerio';
import { localToDate } from './time';

export interface HermesItem {
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  venue: string | null;
  city: string | null;
  category: string | null;
  url: string | null;
  description: string | null;
  /** true when the card sits under the calendar section (Bravefoote Calendar) */
  isCalendar: boolean;
  /** index of this occurrence when a card lists several dates */
  occurrence: number;
}

const DOW = '(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|nesday|rsday|urday)?';
const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember)?';
const DATE_TOKEN = new RegExp(`^(?:${DOW},?\\s+)?(${MON})\\.?\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?$`, 'i');
const TIME_TOKEN = /(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?/;
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const CALENDAR_SECTION = /bravefoote|our calendar|calendar events|gmail/i;

export function hermesYear(html: string): number {
  const m = html.match(/Window:[^<]*?(\d{4})/) || html.match(/(\d{4})-\d{2}-\d{2}/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

/** "Sat, Aug 29 and Sat, Sep 5, 2026, 10:00 AM–3:00 PM" -> one entry per date, with the time range. */
export function expandHermesDates(text: string, defaultYear: number): { start: Date; end: Date | null; allDay: boolean }[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/\s*[,;]\s*|\s+and\s+|\s*&\s*/i).map((x) => x.trim()).filter(Boolean);
  const dates: { y: number; m: number; d: number }[] = [];
  let explicitYear: number | null = null;
  let timePart: string | null = null;
  for (const part of parts) {
    const dm = part.match(DATE_TOKEN);
    if (dm) {
      const monKey = dm[1].slice(0, 3).toLowerCase();
      dates.push({ y: dm[3] ? parseInt(dm[3], 10) : 0, m: MONTHS[monKey] ?? 0, d: parseInt(dm[2], 10) });
      if (dm[3]) explicitYear = parseInt(dm[3], 10);
    } else if (/^\d{4}$/.test(part)) {
      explicitYear = parseInt(part, 10);
    } else if (TIME_TOKEN.test(part) || /all day|noon|midnight/i.test(part)) {
      timePart = timePart ? `${timePart} ${part}` : part;
    }
  }
  if (!dates.length) return [];
  let sh = 0;
  let sm = 0;
  let eh: number | null = null;
  let em = 0;
  let allDay = true;
  if (timePart) {
    const times = Array.from(timePart.matchAll(new RegExp(TIME_TOKEN.source, 'g')));
    if (times.length) {
      const t0 = times[0];
      sh = parseInt(t0[1], 10) % 12 + (/p/i.test(t0[3]) ? 12 : 0);
      sm = t0[2] ? parseInt(t0[2], 10) : 0;
      allDay = false;
      if (times[1]) {
        eh = parseInt(times[1][1], 10) % 12 + (/p/i.test(times[1][3]) ? 12 : 0);
        em = times[1][2] ? parseInt(times[1][2], 10) : 0;
      }
    } else if (/noon/i.test(timePart)) {
      sh = 12;
      allDay = false;
    }
  }
  const year = explicitYear || defaultYear;
  return dates
    .map(({ y, m, d }) => {
      const yy = y || year;
      const pad = (n: number) => String(n).padStart(2, '0');
      const start = localToDate(`${yy}-${pad(m + 1)}-${pad(d)}T${pad(sh)}:${pad(sm)}`);
      if (!start) return null;
      let end: Date | null = null;
      if (eh !== null) {
        end = localToDate(`${yy}-${pad(m + 1)}-${pad(d)}T${pad(eh)}:${pad(em)}`);
        if (end && end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
      }
      return { start, end, allDay };
    })
    .filter((x): x is { start: Date; end: Date | null; allDay: boolean } => x !== null);
}

export function parseHermesHtml(body: string): HermesItem[] {
  const $ = cheerio.load(body);
  const year = hermesYear(body);
  const out: HermesItem[] = [];
  $('article.event').each((_, el) => {
    const $el = $(el);
    const sectionTitle = $el.closest('section.city').find('h2').first().text().trim();
    const isCalendar = CALENDAR_SECTION.test(sectionTitle);
    const categoryHeading = $el.prevAll('h3').first().text().trim() || null;
    const link = $el.find('a[href]').first().attr('href') || null;
    const text = $el.find('pre').text() || $el.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const titleLine = lines.find((l) => l.startsWith('•')) || lines[0];
    const title = titleLine.replace(/^•\s*/, '').trim();
    if (!title || /^Local events window|^Window:|^#/i.test(title)) return;
    const field = (label: RegExp) => {
      const l = lines.find((x) => label.test(x));
      return l ? l.replace(label, '').trim() : '';
    };
    const when = field(/^Date(?:\s*&amp;|\s*&)?\s*time:\s*/i) || field(/^Date:\s*/i) || field(/^When:\s*/i);
    const where = field(/^Venue(?:\s*\/\s*location)?:\s*/i) || field(/^Location:\s*/i) || field(/^Where:\s*/i);
    const cat = field(/^Category:\s*/i) || categoryHeading;
    const labeled = /^(•|Date|Venue|Location|Where|When|Category|Link|Description):?/i;
    const description = lines.filter((l) => l !== titleLine && !labeled.test(l)).join(' ').trim() || field(/^Description:\s*/i) || null;
    const occurrences = expandHermesDates(when, year);
    if (!occurrences.length) return;
    const whereParts = where.split(',').map((x) => x.trim()).filter(Boolean);
    const venue = whereParts[0] || null;
    const cityFromWhere = whereParts.length > 1 ? whereParts[whereParts.length - 1].replace(/\s*WA.*$/i, '').trim() : null;
    const isCalendarCard = isCalendar || /^calendar$/i.test(cat || '');
    occurrences.forEach(({ start, end, allDay }, i) => {
      out.push({
        title,
        start,
        end,
        allDay,
        venue: venue && !/^google calendar$/i.test(venue) ? venue : null,
        city: cityFromWhere || (isCalendarCard ? null : sectionTitle || null),
        category: cat,
        url: link && /^https?:/i.test(link) ? link : null,
        description,
        isCalendar: isCalendarCard,
        occurrence: i,
      });
    });
  });
  return out;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
