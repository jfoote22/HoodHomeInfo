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
  /** true when the card sits under the weather section ("Union Wa Weather") - not an event */
  isWeather: boolean;
  /** true when the card sits under the "Stock Watch" section - not an event */
  isStock: boolean;
  /** index of this occurrence when a card lists several dates */
  occurrence: number;
}

const DOW = '(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)(?:day|nesday|rsday|urday)?';
const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)(?:uary|ruary|ch|il|e|y|ust|tember|ober|ember)?';
const DATE_TOKEN = new RegExp(`^(?:${DOW},?\\s+)?(${MON})\\.?\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?$`, 'i');
const TIME_TOKEN = /(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?/;
const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const CALENDAR_SECTION = /bravefoote|our calendar|calendar events|gmail/i;
const WEATHER_SECTION = /weather|forecast|current conditions/i;
const STOCK_SECTION = /stock|market price/i;

export function hermesYear(html: string): number {
  const m = html.match(/Window:[^<]*?(\d{4})/) || html.match(/(\d{4})-\d{2}-\d{2}/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

// "2026-08-25", "2026-08-25 10:00", "2026-08-25T10:00" - the form Hermes uses for calendar cards.
const ISO_TOKEN = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/g;

/**
 * "Sat, Aug 29 and Sat, Sep 5, 2026, 10:00 AM–3:00 PM" -> one entry per date, with the time
 * range. Also accepts ISO dates ("2026-08-25", optionally with a 24h time).
 */
export function expandHermesDates(text: string, defaultYear: number): { start: Date; end: Date | null; allDay: boolean }[] {
  const dates: { y: number; m: number; d: number }[] = [];
  let explicitYear: number | null = null;
  let timePart: string | null = null;
  // Boxed so TypeScript sees the assignment made inside the replace callback.
  const iso: { time: { h: number; m: number } | null } = { time: null };
  const cleaned = text
    .replace(ISO_TOKEN, (_, y, m, d, hh, mm) => {
      dates.push({ y: parseInt(y, 10), m: parseInt(m, 10) - 1, d: parseInt(d, 10) });
      if (hh && !iso.time) iso.time = { h: parseInt(hh, 10), m: parseInt(mm, 10) };
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  const parts = cleaned.split(/\s*[,;]\s*|\s+and\s+|\s*&\s*/i).map((x) => x.trim()).filter(Boolean);
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
  } else if (iso.time) {
    sh = iso.time.h;
    sm = iso.time.m;
    allDay = false;
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
    const isWeatherCard = WEATHER_SECTION.test(sectionTitle) || /^weather$/i.test(cat || '');
    const isStockCard = STOCK_SECTION.test(sectionTitle) || /^stocks?$/i.test(cat || '');
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
        isWeather: isWeatherCard,
        isStock: isStockCard,
        occurrence: i,
      });
    });
  });
  return out;
}

export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Weather (Hermes "Union Wa Weather" section, sourced from the National Weather
// Service). Cards look like:
//   * Union current temperature        -> "53F, Slight Chance Light Rain, wind 3 mph"
//   * Union forecast: Today|Sunday|... -> "64F, Mostly Sunny. Mostly sunny, with a high near 64. ..."
// (the F is preceded by a degree sign in the real page)
// ---------------------------------------------------------------------------

export interface HermesWeatherNow {
  tempF: number;
  condition: string;
  windMph: number | null;
  windDir: string | null;
  observedAt: Date | null;
}

export interface HermesWeatherDay {
  /** the day the forecast is for */
  date: Date;
  /** "Today" / "Sunday" as Hermes labelled it */
  label: string;
  hiF: number;
  condition: string;
}

export interface HermesWeather {
  now: HermesWeatherNow | null;
  days: HermesWeatherDay[];
}

/** Icon key matching the dashboard's weatherIcons set, from NWS condition text. */
export function weatherTextToIcon(text: string): string {
  const t = text.toLowerCase();
  if (/thunder|t-storm/.test(t)) return 'cloud-lightning';
  if (/snow|flurr|sleet|wintry/.test(t)) return 'cloud-snow';
  if (/rain|shower|drizzle/.test(t)) return 'cloud-rain';
  if (/fog|haze|mist|smoke/.test(t)) return 'cloud-fog';
  if (/overcast|mostly cloudy|cloudy/.test(t)) return 'cloud';
  if (/partly (sunny|cloudy)|mostly sunny|sunny|clear|fair/.test(t)) return 'sun';
  return 'sun';
}

const DIR_WORD: Record<string, string> = { north: 'N', south: 'S', east: 'E', west: 'W', northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW' };
const DIR_RE = /\b((?:north|south|east|west|northeast|northwest|southeast|southwest)(?:\s+(?:north|south|east|west|northeast|northwest|southeast|southwest))?)\s+wind\b/i;
const TEMP_RE = /(-?\d{1,3})\s*(?:\u00b0|deg(?:rees)?)?\s*F\b/i;
const WIND_RE = /wind\s+(?:[a-z\s]*?\s)?(\d{1,3})(?:\s*(?:to|-|\u2013)\s*\d{1,3})?\s*mph/i;

/** "West southwest wind 3 to 13 mph" -> "WSW" */
function windDirection(text: string): string | null {
  const m = text.match(DIR_RE);
  if (!m) return null;
  const dir = m[1]
    .toLowerCase()
    .split(/\s+/)
    .map((w) => DIR_WORD[w] || '')
    .join('');
  return dir ? dir.slice(0, 3) : null;
}

function tempOf(text: string): number | null {
  const m = text.match(TEMP_RE);
  return m ? parseInt(m[1], 10) : null;
}

/** Text after the temperature, up to the first sentence end: the short condition. */
function conditionOf(text: string): string {
  const after = text.replace(/^[^,]*?F\s*,?\s*/i, '');
  const short = after.split(/\.\s|\.$/)[0].split(/,\s*wind\b/i)[0];
  return short.trim().replace(/\s+/g, ' ').slice(0, 60) || 'Clear';
}

/** Pull the current conditions + 3-day forecast out of a Hermes page. */
export function parseHermesWeather(body: string): HermesWeather {
  const items = parseHermesHtml(body).filter((i) => i.isWeather);
  let now: HermesWeatherNow | null = null;
  const days: HermesWeatherDay[] = [];

  for (const it of items) {
    const text = (it.description || '').replace(/\s+/g, ' ').trim();
    const temp = tempOf(text);
    if (temp === null) continue;
    const isCurrent = /current|now|conditions/i.test(it.title) && !/forecast/i.test(it.title);
    if (isCurrent) {
      if (!now) {
        const windMatch = text.match(WIND_RE);
        now = { tempF: temp, condition: conditionOf(text), windMph: windMatch ? parseInt(windMatch[1], 10) : null, windDir: windDirection(text), observedAt: it.start };
      }
    } else {
      const label = (it.title.split(/forecast:\s*/i)[1] || it.title).trim();
      days.push({ date: it.start, label, hiF: temp, condition: conditionOf(text) });
    }
  }
  days.sort((a, b) => a.date.getTime() - b.date.getTime());
  // Today's forecast text carries the wind direction the current card omits.
  if (now && !now.windDir) {
    const todayText = items.find((i) => /forecast/i.test(i.title))?.description || '';
    now.windDir = windDirection(todayText);
  }
  return { now, days };
}

// ---------------------------------------------------------------------------
// Stocks (Hermes "Stock Watch" section, quotes from Yahoo Finance). Cards look like:
//   * Tesla (TSLA)  ->  "348.75 USD (-6.06, -1.71% vs previous close). Market timestamp: ..."
// ---------------------------------------------------------------------------

export interface HermesQuote {
  /** "Tesla" */
  name: string;
  /** "TSLA", "^GSPC" */
  symbol: string;
  price: number;
  currency: string;
  /** absolute change vs previous close; null when Hermes didn't say */
  change: number | null;
  /** percent change vs previous close */
  changePct: number | null;
  url: string | null;
  asOf: string | null;
}

const QUOTE_RE = /(-?[\d,]+(?:\.\d+)?)\s*([A-Z]{3})?\s*\(\s*([+-]?[\d,]+(?:\.\d+)?)\s*,\s*([+-]?[\d.]+)\s*%/;

function num(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''));
}

/** Pull the Stock Watch quotes out of a Hermes page, in the order Hermes listed them. */
export function parseHermesStocks(body: string): HermesQuote[] {
  const out: HermesQuote[] = [];
  const seen = new Set<string>();
  for (const it of parseHermesHtml(body)) {
    if (!it.isStock) continue;
    const text = (it.description || '').replace(/\s+/g, ' ').trim();
    const m = text.match(QUOTE_RE);
    if (!m) continue;
    const titleMatch = it.title.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const name = (titleMatch ? titleMatch[1] : it.title).trim();
    const symbol = (titleMatch ? titleMatch[2] : it.title).trim().toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      name: name || symbol,
      symbol,
      price: num(m[1]),
      currency: m[2] || 'USD',
      change: m[3] ? num(m[3]) : null,
      changePct: m[4] ? parseFloat(m[4]) : null,
      url: it.url,
      asOf: it.start ? it.start.toISOString() : null,
    });
  }
  return out;
}
