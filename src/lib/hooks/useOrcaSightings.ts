'use client';

import { useEffect, useState } from 'react';

export type SightingSpecies = 'orca' | 'humpback' | 'gray' | 'minke' | 'porpoise' | 'other';

/** An earlier reported position of the same group, drawn behind the pin as its track. */
export interface TrailPoint {
  lat: number;
  lng: number;
  hoursAgo: number;
}

export interface GeoSighting {
  id: string;
  lat: number;
  lng: number;
  label: string;
  species: SightingSpecies;
  hoursAgo: number;
  hoursAgoLabel: string;
  comments: string;
  /** The observer's own words, trimmed to something readable at wall-display distance. */
  note: string;
  count: number | null;
  observedAt: string;
  /** How many raw reports the API grouped into this sighting (1 = a single report). */
  reports: number;
  /** Older positions of this same group, newest first. Empty when reports === 1. */
  trail: TrailPoint[];
}

export interface SightingsState {
  sightings: GeoSighting[];
  /** Distinct animal groups seen in the last 24 hours. */
  last24h: number;
  /** Raw observations called in over the same 24 hours - always >= last24h. */
  reports24h: number;
  /** How many days back the map's window reaches. */
  windowDays: number;
  isPlaceholder: boolean;
  loading: boolean;
  fetchedAt: string | null;
}

function ageLabel(hours: number): string {
  if (hours < 1) return '<1h ago';
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const PLACEHOLDER: GeoSighting[] = [
  { id: 'demo-1', lat: 47.55, lng: -122.95, label: 'J-Pod Orca', species: 'orca', hoursAgo: 2, hoursAgoLabel: '2h ago', comments: 'Example sighting', note: 'Example sighting', count: null, observedAt: '', reports: 1, trail: [] },
  { id: 'demo-2', lat: 48.15, lng: -122.75, label: 'Orca', species: 'orca', hoursAgo: 4, hoursAgoLabel: '4h ago', comments: 'Example sighting', note: 'Example sighting', count: null, observedAt: '', reports: 1, trail: [] },
  { id: 'demo-3', lat: 48.4, lng: -122.6, label: 'Minke Whale', species: 'minke', hoursAgo: 4, hoursAgoLabel: '4h ago', comments: 'Example sighting', note: 'Example sighting', count: null, observedAt: '', reports: 1, trail: [] },
];

export function useOrcaSightings(): SightingsState {
  const [state, setState] = useState<SightingsState>({ sightings: [], last24h: 0, reports24h: 0, windowDays: 5, isPlaceholder: true, loading: true, fetchedAt: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/orca-sightings/live', { cache: 'no-store' });
        const data = await res.json();
        const raw: any[] = Array.isArray(data.sightings) ? data.sightings : [];
        if (cancelled) return;

        const parsed: GeoSighting[] = raw.map((s) => ({
          id: String(s.id),
          lat: Number(s.lat),
          lng: Number(s.lng),
          label: String(s.label || 'Whale'),
          species: (s.species as SightingSpecies) || 'other',
          hoursAgo: Number(s.hoursAgo) || 0,
          hoursAgoLabel: ageLabel(Number(s.hoursAgo) || 0),
          comments: String(s.comments || ''),
          note: String(s.note || ''),
          count: s.count ?? null,
          observedAt: String(s.observedAt || ''),
          reports: Number(s.reports) > 0 ? Number(s.reports) : 1,
          trail: Array.isArray(s.trail)
            ? s.trail
                .map((t: any) => ({ lat: Number(t.lat), lng: Number(t.lng), hoursAgo: Number(t.hoursAgo) || 0 }))
                .filter((t: TrailPoint) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
            : [],
        }));

        if (parsed.length === 0) {
          setState({ sightings: PLACEHOLDER, last24h: 0, reports24h: 0, windowDays: Number(data.windowDays) || 5, isPlaceholder: true, loading: false, fetchedAt: data.fetchedAt || null });
        } else {
          const groups24h = parsed.filter((s) => s.hoursAgo <= 24).length;
          setState({
            sightings: parsed,
            last24h: Number.isFinite(Number(data.groups24h)) ? Number(data.groups24h) : groups24h,
            // Fall back to summing the groups' own report counts if the API predates the field.
            reports24h:
              Number(data.reports24h) ||
              parsed.filter((s) => s.hoursAgo <= 24).reduce((n, s) => n + s.reports, 0),
            windowDays: Number(data.windowDays) || 5,
            isPlaceholder: false,
            loading: false,
            fetchedAt: data.fetchedAt || null,
          });
        }
      } catch (err) {
        console.error('Error loading whale sightings:', err);
        if (!cancelled) setState((prev) => ({ ...prev, sightings: prev.sightings.length ? prev.sightings : PLACEHOLDER, isPlaceholder: prev.sightings.length === 0 || prev.isPlaceholder, loading: false }));
      }
    }

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
