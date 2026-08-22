import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { localToDate, fmtTime, fmtDate, DASHBOARD_TZ } from '../../../../lib/time';

// Local events aggregator for the Union / Hood Canal dashboard.
//
// Sources, merged and sorted by start time:
//   1. Hermes file  - optional JSON dropped by a separate local agent (data/hermes-events.json)
//   2. North Mason Chamber of Commerce (GrowthZone/ChamberMaster calendar) - Union, Belfair,
//      Allyn, Alderbrook, McReavy House, etc. Parsed from the public events listing HTML.
//   3. Explore Hood Canal (Squarespace events collection) - regional festivals.
//
// Everything is cached in-memory for 30 minutes so the TV's hourly refresh doesn't hammer
// the sources, and a stale cache is served if a source goes down.

const HERMES_EVENTS_PATH = process.env.HERMES_EVENTS_PATH || path.join(process.cwd(), 'data', 'hermes-events.json');
const NMC_LIST_URL = 'https://members.northmasonchamber.com/events/';
const EHC_JSON_URL = 'https://www.explorehoodcanal.com/events?format=json';

const CACHE_TTL_MS = 30 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_EVENTS = 20;
const MAX_DETAIL_FETCHES = 16;
const FETCH_TIMEOUT_MS = 15000;
const UA = 'Mozilla/5.0 (compatible; HoodCanalMarineDashboard/1.0)';
const TZ = DASHBOARD_TZ;

export interface LiveEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string | null; // ISO
  allDay: boolean;
  venue: string | null;
  city: string | null;
  imageUrl: string | null;
  url: string | null;
  category: string | null;
  source: 'hermes' | 'north-mason-chamber' | 'explore-hood-canal';
  // Legacy fields kept for older components that still read them.
  date: string;
  time: string;
  location: string;
}

let cache: { at: number; payload: { events: LiveEvent[]; sources: string[]; fetchedAt: string } } | null = null;
const detailCache = new Map<string, { at: number; venue: string | null; city: string | null }>();

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { 'User-Agent': UA, Accept: 'text/html,application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}



function toLegacy(e: Omit<LiveEvent, 'date' | 'time' | 'location'>): LiveEvent {
  const start = new Date(e.start);
  return {
    ...e,
    date: fmtDate(start),
    time: e.allDay ? 'All day' : fmtTime(start),
    location: [e.venue, e.city].filter(Boolean).join(', ') || 'Hood Canal area',
  };
}

// ---------- Source 1: Hermes file ----------
async function loadHermes(): Promise<LiveEvent[]> {
  try {
    const raw = await readFile(HERMES_EVENTS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.events)) return [];
    return parsed.events
      .map((e: any): LiveEvent | null => {
        // Hermes writes human dates ("Sat, Aug 15" + "10:00 AM"); try to resolve to the next such date.
        const start = e.start ? new Date(e.start) : parseHumanDate(e.date, e.time);
        if (!start || Number.isNaN(start.getTime())) return null;
        return toLegacy({
          id: `hermes-${e.id}`,
          title: String(e.title),
          start: start.toISOString(),
          end: null,
          allDay: !e.time,
          venue: e.location || null,
          city: null,
          imageUrl: e.imageUrl || null,
          url: e.url || null,
          category: e.category || null,
          source: 'hermes',
        });
      })
      .filter((e: LiveEvent | null): e is LiveEvent => e !== null);
  } catch {
    return [];
  }
}
function parseHumanDate(date?: string, time?: string): Date | null {
  if (!date) return null;
  const year = new Date().getFullYear();
  const candidate = new Date(`${date.replace(/^[A-Za-z]{3},\s*/, '')} ${year} ${time || '12:00 PM'}`);
  if (Number.isNaN(candidate.getTime())) return null;
  if (candidate.getTime() < Date.now() - 30 * 86400000) candidate.setFullYear(year + 1);
  return candidate;
}

// ---------- Source 2: North Mason Chamber (GrowthZone) ----------
async function loadNorthMasonChamber(): Promise<LiveEvent[]> {
  const html = await fetchText(NMC_LIST_URL);
  const $ = cheerio.load(html);
  const out: Omit<LiveEvent, 'date' | 'time' | 'location'>[] = [];

  $('.gz-events-card').each((_, card) => {
    const $card = $(card);
    const titleLink = $card.find('.gz-card-title a').first();
    const title = titleLink.text().trim();
    const url = titleLink.attr('href') || null;
    const startNaive = $card.find('.gz-card-date span[content]').first().attr('content') || '';
    const endNaive = $card.find('.gz-card-date meta[content]').first().attr('content') || '';
    const img = $card.find('.card-header img').first().attr('src') || null;
    const cats = $card.find('.gz-cat').map((__, c) => $(c).text().trim()).get();
    if (!title || !startNaive) return;
    const start = localToDate(startNaive);
    if (!start) return;
    const end = endNaive ? localToDate(endNaive) : null;
    const id = url ? url.split('/').filter(Boolean).pop() || title : title;
    out.push({
      id: `nmc-${id}`,
      title,
      start: start.toISOString(),
      end: end ? end.toISOString() : null,
      allDay: !/T\d{2}:\d{2}/.test(startNaive),
      venue: null,
      city: null,
      imageUrl: img && img.startsWith('http') ? img : null,
      url,
      category: cats[0] || null,
      source: 'north-mason-chamber',
    });
  });

  // Venue lives on the detail page. Fetch for the soonest few, cached for hours.
  const soon = out.filter((e) => new Date(e.start).getTime() > Date.now() - 3 * 36e5).slice(0, MAX_DETAIL_FETCHES);
  await Promise.all(
    soon.map(async (e) => {
      if (!e.url) return;
      const hit = detailCache.get(e.url);
      if (hit && Date.now() - hit.at < DETAIL_CACHE_TTL_MS) {
        e.venue = hit.venue;
        e.city = hit.city;
        return;
      }
      try {
        const dhtml = await fetchText(e.url);
        const $d = cheerio.load(dhtml);
        const locHtml = $d('.gz-event-location [itemprop="name"]').first().html() || '';
        const lines = locHtml
          .split(/<br\s*\/?>/i)
          .map((s) => cheerio.load(`<p>${s}</p>`)('p').text().replace(/ /g, ' ').trim())
          .filter(Boolean);
        const venue = lines[0] || null;
        const cityLine = lines.find((l) => /,\s*WA\b/i.test(l)) || null;
        const city = cityLine ? cityLine.replace(/,\s*WA.*$/i, '').trim() : null;
        const dimg = $d('.gz-eventdetails-card img').first().attr('src') || null;
        if (!e.imageUrl && dimg && dimg.startsWith('http')) e.imageUrl = dimg;
        detailCache.set(e.url, { at: Date.now(), venue, city });
        e.venue = venue;
        e.city = city;
      } catch (err) {
        console.warn('NMC detail fetch failed', e.url, err);
      }
    }),
  );

  return out.map(toLegacy);
}

// ---------- Source 3: Explore Hood Canal (Squarespace) ----------
async function loadExploreHoodCanal(): Promise<LiveEvent[]> {
  const text = await fetchText(EHC_JSON_URL);
  const json = JSON.parse(text);
  const items: any[] = Array.isArray(json.upcoming) ? json.upcoming : [];
  return items
    .map((it): LiveEvent | null => {
      if (!it?.title || !it?.startDate) return null;
      const start = new Date(Number(it.startDate));
      if (Number.isNaN(start.getTime())) return null;
      const loc = it.location || {};
      const venue = (loc.addressTitle || loc.addressLine1 || '').trim() || null;
      const city = (loc.addressLine2 || '').replace(/,?\s*WA.*$/i, '').trim() || null;
      return toLegacy({
        id: `ehc-${it.id || it.urlId}`,
        title: String(it.title).trim(),
        start: start.toISOString(),
        end: it.endDate ? new Date(Number(it.endDate)).toISOString() : null,
        allDay: false,
        venue,
        city,
        imageUrl: it.assetUrl ? `${it.assetUrl}?format=500w` : null,
        url: it.fullUrl ? `https://www.explorehoodcanal.com${it.fullUrl}` : null,
        category: Array.isArray(it.categories) && it.categories[0] ? String(it.categories[0]) : null,
        source: 'explore-hood-canal',
      });
    })
    .filter((e): e is LiveEvent => e !== null);
}

function dedupe(events: LiveEvent[]): LiveEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${e.start.slice(0, 13)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('refresh') === '1';
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.payload, cached: true });
  }

  const results = await Promise.allSettled([loadHermes(), loadNorthMasonChamber(), loadExploreHoodCanal()]);
  const names = ['hermes', 'north-mason-chamber', 'explore-hood-canal'];
  const sources: string[] = [];
  const all: LiveEvent[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value.length > 0) sources.push(names[i]);
      all.push(...r.value);
    } else {
      console.error(`Events source ${names[i]} failed:`, r.reason);
    }
  });

  // Keep things that are upcoming or still happening (started < 3h ago / end in future).
  const now = Date.now();
  const upcoming = dedupe(
    all.filter((e) => {
      const start = new Date(e.start).getTime();
      const end = e.end ? new Date(e.end).getTime() : start + 3 * 36e5;
      return end >= now && start < now + 120 * 86400000;
    }),
  )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, MAX_EVENTS);

  if (upcoming.length === 0 && cache) {
    return NextResponse.json({ ...cache.payload, cached: true, stale: true });
  }

  const payload = { events: upcoming, sources, fetchedAt: new Date().toISOString() };
  cache = { at: Date.now(), payload };
  return NextResponse.json(payload);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
