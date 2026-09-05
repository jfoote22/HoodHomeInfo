import { NextResponse } from 'next/server';

// Live whale sightings from Acartia (https://acartia.io), the open Salish Sea sightings
// data cooperative that aggregates Orca Network, Whale Alert / Conserve.io "Spotter",
// and others. The /sightings/current endpoint is public (no key) and returns the most
// recent ~100 reports with real lat/lng, species, and observer comments.
//
// The previous implementation scraped the old orcanetwork.org sightings page, which
// no longer exists (404), so it always fell back to placeholder pins.

const ACARTIA_URL = 'https://acartia.io/api/v1/sightings/current';

// Only keep reports the marine map can actually show: Puget Sound / Hood Canal /
// Admiralty Inlet / southern Whidbey basin (matches HOOD_CANAL_BOUNDS in MarineMapPanel,
// padded a bit so pins near the edge still count).
const BBOX = { minLat: 47.0, maxLat: 48.8, minLng: -123.7, maxLng: -122.1 };
const MAX_AGE_HOURS = 24 * 7;
const MAX_SIGHTINGS = 40;
const CACHE_TTL_MS = 10 * 60 * 1000;

// Orca Network relays a *moving* pod as a stream of reports rather than one record, so a
// single pod tracked up Saratoga Passage can produce 40+ rows in a day. Ungrouped, those
// duplicates bury every other species and consume the whole MAX_SIGHTINGS budget, leaving
// the map a smear of identical pins and the "Latest sightings" box repeating one pod three
// times. Collapse a run of reports about the same group into one sighting at its most
// recent position; `reports` remembers how many observations backed it.
// Reports are matched on plausible travel rather than a fixed radius, because the two cases
// look nothing alike in the data: an overnight lull leaves an 11-hour gap in which the pod
// drifted 2 km (same group), while two different groups reporting the same headcount show up
// 45 km apart six minutes apart (impossible for a whale). Roughly 12 km of positional slack
// plus 12 km/h of sustained travel separates them cleanly.
const CLUSTER_HOURS = 14; // long enough to bridge a night with no observers out
const CLUSTER_SLACK_KM = 12;
const CLUSTER_SPEED_KMH = 12;

export type Species = 'orca' | 'humpback' | 'gray' | 'minke' | 'porpoise' | 'other';

export interface LiveSighting {
  id: string;
  lat: number;
  lng: number;
  species: Species;
  label: string;
  count: number | null;
  comments: string;
  photoUrl: string | null;
  trusted: boolean;
  observedAt: string; // ISO, UTC
  hoursAgo: number;
  source: string;
  /** How many raw Acartia reports were collapsed into this sighting (1 = a single report). */
  reports: number;
}

interface AcartiaRow {
  ssemmi_id?: string;
  entry_id?: string;
  data_source_name?: string;
  data_source_entity?: string;
  data_source_id?: number | string;
  created?: string; // "YYYY-MM-DD HH:MM:SS" (UTC)
  photo_url?: string;
  no_sighted?: number | string;
  latitude?: number | string;
  longitude?: number | string;
  type?: string;
  trusted?: number | boolean;
  data_source_comments?: string;
}

let cache: { at: number; payload: { sightings: LiveSighting[]; fetchedAt: string; source: string } } | null = null;

function classify(type: string, comments: string): Species {
  const t = `${type} ${comments}`.toLowerCase();
  if (/orca|killer whale|\bsrkw\b|bigg|transient|\bt\d{2,3}\b|\b[jkl][\s-]?pod\b/.test(t)) return 'orca';
  if (/humpback/.test(t)) return 'humpback';
  if (/gray whale|grey whale|\bgray\b/.test(t)) return 'gray';
  if (/minke/.test(t)) return 'minke';
  if (/porpoise|dolphin/.test(t)) return 'porpoise';
  return 'other';
}

// `type` is Acartia's own species string ("Southern Resident Orca", "Gray Whale", …) and is
// far more reliable than the freeform comment. Reading only the comment made identical
// reports of one pod label themselves differently — "J pod northbound" became "J-Pod Orca"
// while "Spread out Js northbound" fell through to a bare "Orca" — which then blocked them
// from grouping together.
function labelFor(species: Species, comments: string, type: string): string {
  const c = comments;
  const both = `${type} ${comments}`;
  if (species === 'orca') {
    const pod = c.match(/\b([JKL])[\s-]?pod\b/i) || c.match(/\b([JKL])s\b/);
    if (pod) return `${pod[1].toUpperCase()}-Pod Orca`;
    if (/southern resident|\bsrkw\b/i.test(both)) return 'Resident Orca';
    const t = c.match(/\bT\d{2,3}[A-Z]?\d?s?\b/);
    if (t) return `Bigg's Orca · ${t[0]}`;
    if (/bigg|transient/i.test(both)) return "Bigg's Orca";
    return 'Orca';
  }
  if (species === 'humpback') return 'Humpback Whale';
  if (species === 'gray') return 'Gray Whale';
  if (species === 'minke') return 'Minke Whale';
  if (species === 'porpoise') return /dall/i.test(c) ? "Dall's Porpoise" : 'Harbor Porpoise';
  return 'Whale';
}

function cleanComments(raw: string | undefined): string {
  return (raw || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/Submitted by a Whale Alert[^.]*\.?/i, '')
    .replace(/Via App/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCreated(created: string | undefined): Date | null {
  if (!created) return null;
  // Acartia timestamps come back as "YYYY-MM-DD HH:MM:SS" in UTC.
  const iso = created.includes('T') ? created : created.replace(' ', 'T');
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Equirectangular distance in km — accurate to well under a percent over the Salish Sea. */
function distanceKm(a: LiveSighting, b: LiveSighting): number {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360) * 111.32;
  const y = (b.lat - a.lat) * 110.57;
  return Math.hypot(x, y);
}

/** Two reports describe the same group if they agree on species and headcount and the pod
 *  could actually have swum between them in the elapsed time. */
function sameGroup(a: LiveSighting, b: LiveSighting): boolean {
  if (a.species !== b.species || a.count !== b.count) return false;
  const gapHours = Math.abs(a.hoursAgo - b.hoursAgo);
  if (gapHours > CLUSTER_HOURS) return false;
  return distanceKm(a, b) <= CLUSTER_SLACK_KM + CLUSTER_SPEED_KMH * gapHours;
}

/** Input must be sorted newest-first. Each cluster keeps the newest report's position and
 *  chains backwards from its own oldest member, so a pod tracked across a whole day stays
 *  one sighting instead of thirty. */
function clusterReports(list: LiveSighting[]): LiveSighting[] {
  const clusters: { newest: LiveSighting; oldest: LiveSighting; reports: number }[] = [];
  for (const s of list) {
    const hit = clusters.find((c) => sameGroup(c.oldest, s));
    if (hit) {
      hit.oldest = s;
      hit.reports += 1;
    } else {
      clusters.push({ newest: s, oldest: s, reports: 1 });
    }
  }
  return clusters.map((c) => ({ ...c.newest, reports: c.reports }));
}

async function fetchAcartia(): Promise<AcartiaRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(ACARTIA_URL, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'HoodCanalMarineDashboard/1.0' },
    });
    if (!res.ok) throw new Error(`Acartia HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('refresh') === '1';
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.payload, cached: true });
  }

  try {
    const rows = await fetchAcartia();
    const now = Date.now();

    const reported: LiveSighting[] = rows
      .map((r): LiveSighting | null => {
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (lat < BBOX.minLat || lat > BBOX.maxLat || lng < BBOX.minLng || lng > BBOX.maxLng) return null;

        const observed = parseCreated(r.created);
        if (!observed) return null;
        const hoursAgo = (now - observed.getTime()) / 36e5;
        if (hoursAgo < -1 || hoursAgo > MAX_AGE_HOURS) return null;

        const comments = cleanComments(r.data_source_comments);
        const species = classify(r.type || '', comments);
        const countNum = Number(r.no_sighted);

        return {
          id: String(r.entry_id || r.ssemmi_id || `${r.data_source_id}-${r.created}`),
          lat,
          lng,
          species,
          label: labelFor(species, comments, r.type || ''),
          count: Number.isFinite(countNum) && countNum > 0 ? countNum : null,
          comments,
          photoUrl: r.photo_url ? String(r.photo_url) : null,
          trusted: Boolean(Number(r.trusted)),
          observedAt: observed.toISOString(),
          hoursAgo: Math.max(0, Math.round(hoursAgo * 10) / 10),
          source: r.data_source_entity || r.data_source_name || 'Acartia',
          reports: 1,
        };
      })
      .filter((s): s is LiveSighting => s !== null)
      .sort((a, b) => a.hoursAgo - b.hoursAgo);

    // Group first, then cap: capping raw reports let one heavily-tracked pod use every slot
    // and pushed the rest of the week — humpback, minke, porpoise, gray — off the map.
    const sightings = clusterReports(reported).slice(0, MAX_SIGHTINGS);

    const payload = { sightings, fetchedAt: new Date().toISOString(), source: 'acartia' };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    console.error('Acartia sightings fetch failed:', err);
    // Serve stale cache if we have it rather than blanking the map.
    if (cache) return NextResponse.json({ ...cache.payload, cached: true, stale: true });
    return NextResponse.json({ error: 'Failed to fetch sightings', details: String(err), sightings: [] }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
