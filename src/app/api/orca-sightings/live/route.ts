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

function labelFor(species: Species, comments: string): string {
  const c = comments;
  if (species === 'orca') {
    const pod = c.match(/\b([JKL])[\s-]?pod\b/i);
    if (pod) return `${pod[1].toUpperCase()}-Pod Orca`;
    if (/southern resident|\bsrkw\b/i.test(c)) return 'Resident Orca';
    const t = c.match(/\bT\d{2,3}[A-Z]?\d?s?\b/);
    if (t) return `Bigg's Orca · ${t[0]}`;
    if (/bigg|transient/i.test(c)) return "Bigg's Orca";
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

    const sightings: LiveSighting[] = rows
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
          label: labelFor(species, comments),
          count: Number.isFinite(countNum) && countNum > 0 ? countNum : null,
          comments,
          photoUrl: r.photo_url ? String(r.photo_url) : null,
          trusted: Boolean(Number(r.trusted)),
          observedAt: observed.toISOString(),
          hoursAgo: Math.max(0, Math.round(hoursAgo * 10) / 10),
          source: r.data_source_entity || r.data_source_name || 'Acartia',
        };
      })
      .filter((s): s is LiveSighting => s !== null)
      .sort((a, b) => a.hoursAgo - b.hoursAgo)
      .slice(0, MAX_SIGHTINGS);

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
