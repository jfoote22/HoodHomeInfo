'use client';

import { useEffect, useState } from 'react';

export interface GeoSighting {
  id: string;
  lat: number;
  lng: number;
  label: string;
  species: 'orca' | 'minke';
  hoursAgoLabel: string;
}

interface RawSighting {
  date: string;
  location: string;
  details: string;
}

// Named-region lookup for the Puget Sound / Hood Canal area. The scraped Orca Network
// feed only gives free-text location names (no lat/lng), so sightings are geocoded to
// the nearest known region rather than an exact position - consistent with not publishing
// precise live whale coordinates. Reused/expanded from the region list in the previous
// EnhancedOrcaMap.tsx implementation.
const GEOCODE_TABLE: Array<{ match: RegExp; lat: number; lng: number; name: string }> = [
  { match: /hood canal|union|great bend|belfair|hoodsport|seabeck|brinnon/i, lat: 47.5, lng: -123.0, name: 'Hood Canal' },
  { match: /san juan/i, lat: 48.5444, lng: -123.096, name: 'San Juan Islands' },
  { match: /juan de fuca/i, lat: 48.15, lng: -123.8, name: 'Strait of Juan de Fuca' },
  { match: /elliott bay|seattle/i, lat: 47.6062, lng: -122.3321, name: 'Elliott Bay' },
  { match: /admiralty inlet/i, lat: 48.1, lng: -122.75, name: 'Admiralty Inlet' },
  { match: /saratoga passage/i, lat: 48.2, lng: -122.5, name: 'Saratoga Passage' },
  { match: /deception pass/i, lat: 48.4044, lng: -122.61, name: 'Deception Pass' },
  { match: /lime kiln/i, lat: 48.5158, lng: -123.1525, name: 'Lime Kiln Point' },
  { match: /race rocks/i, lat: 48.2983, lng: -123.5318, name: 'Race Rocks' },
  { match: /point no point|kingston/i, lat: 47.9121, lng: -122.5265, name: 'Point No Point' },
  { match: /possession sound|everett/i, lat: 47.95, lng: -122.35, name: 'Possession Sound' },
  { match: /rich passage|bainbridge/i, lat: 47.58, lng: -122.53, name: 'Rich Passage' },
];

const DEFAULT_REGION = { lat: 47.5, lng: -123.0, name: 'Hood Canal' }; // fall back near Union, WA

function guessSpecies(text: string): 'orca' | 'minke' | null {
  const t = text.toLowerCase();
  if (t.includes('minke')) return 'minke';
  if (t.includes('orca') || t.includes('killer whale') || /\bj[\s-]?pod\b|\bk[\s-]?pod\b|\bl[\s-]?pod\b/.test(t)) return 'orca';
  return null;
}

function guessLabel(raw: RawSighting): string {
  const t = `${raw.details} ${raw.location}`;
  const podMatch = t.match(/\b([JKL])[\s-]?pod\b/i);
  if (podMatch) return `${podMatch[1].toUpperCase()}-Pod Orca`;
  if (/minke/i.test(t)) return 'Minke Whale';
  if (/orca|killer whale/i.test(t)) return 'Orca';
  return 'Sighting';
}

function hoursAgoLabel(dateText: string): string {
  const parsed = Date.parse(dateText);
  if (Number.isNaN(parsed)) return 'recent';
  const hours = Math.round((Date.now() - parsed) / (1000 * 60 * 60));
  if (hours < 0 || hours > 24 * 14) return 'recent';
  if (hours < 1) return '<1h ago';
  return `${hours}h ago`;
}

// Deterministic small jitter so multiple sightings geocoded to the same named region
// don't stack exactly on top of each other on the map.
function jitter(seed: number) {
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x) - 0.5) * 0.06;
}

const PLACEHOLDER: GeoSighting[] = [
  { id: 'demo-1', lat: 47.55, lng: -122.95, label: 'J-Pod Orca', species: 'orca', hoursAgoLabel: '2h ago' },
  { id: 'demo-2', lat: 48.15, lng: -122.75, label: 'Orca', species: 'orca', hoursAgoLabel: '4h ago' },
  { id: 'demo-3', lat: 48.4, lng: -122.6, label: 'Minke Whale', species: 'minke', hoursAgoLabel: '4h ago' },
  { id: 'demo-4', lat: 47.45, lng: -123.05, label: 'Pod', species: 'orca', hoursAgoLabel: '2h ago' },
];

export function useOrcaSightings() {
  const [sightings, setSightings] = useState<GeoSighting[]>([]);
  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/orca-sightings/live', { cache: 'no-store' });
        const data = await res.json();
        const raw: RawSighting[] = Array.isArray(data.sightings) ? data.sightings : [];

        const parsed: GeoSighting[] = raw
          .map((r, i) => {
            const species = guessSpecies(`${r.details} ${r.location}`);
            if (!species) return null;
            const region = GEOCODE_TABLE.find((g) => g.match.test(r.location) || g.match.test(r.details)) || DEFAULT_REGION;
            return {
              id: `sighting-${i}`,
              lat: region.lat + jitter(i + 1),
              lng: region.lng + jitter(i + 17),
              label: guessLabel(r),
              species,
              hoursAgoLabel: hoursAgoLabel(r.date),
            } as GeoSighting;
          })
          .filter((s): s is GeoSighting => s !== null)
          .slice(0, 8);

        if (cancelled) return;

        if (parsed.length === 0) {
          setIsPlaceholder(true);
          setSightings(PLACEHOLDER);
        } else {
          setIsPlaceholder(false);
          setSightings(parsed);
        }
      } catch (err) {
        console.error('Error loading orca sightings:', err);
        if (!cancelled) {
          setIsPlaceholder(true);
          setSightings(PLACEHOLDER);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30 * 60 * 1000); // Orca Network doesn't update faster than this
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { sightings, isPlaceholder, loading };
}
