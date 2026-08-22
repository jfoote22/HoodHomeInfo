'use client';

import { useEffect, useState } from 'react';

export type SightingSpecies = 'orca' | 'humpback' | 'gray' | 'minke' | 'porpoise' | 'other';

export interface GeoSighting {
  id: string;
  lat: number;
  lng: number;
  label: string;
  species: SightingSpecies;
  hoursAgo: number;
  hoursAgoLabel: string;
  comments: string;
  count: number | null;
  observedAt: string;
}

export interface SightingsState {
  sightings: GeoSighting[];
  /** Sightings observed in the last 24 hours (what the LIVE badge counts). */
  last24h: number;
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
  { id: 'demo-1', lat: 47.55, lng: -122.95, label: 'J-Pod Orca', species: 'orca', hoursAgo: 2, hoursAgoLabel: '2h ago', comments: 'Example sighting', count: null, observedAt: '' },
  { id: 'demo-2', lat: 48.15, lng: -122.75, label: 'Orca', species: 'orca', hoursAgo: 4, hoursAgoLabel: '4h ago', comments: 'Example sighting', count: null, observedAt: '' },
  { id: 'demo-3', lat: 48.4, lng: -122.6, label: 'Minke Whale', species: 'minke', hoursAgo: 4, hoursAgoLabel: '4h ago', comments: 'Example sighting', count: null, observedAt: '' },
];

export function useOrcaSightings(): SightingsState {
  const [state, setState] = useState<SightingsState>({ sightings: [], last24h: 0, isPlaceholder: true, loading: true, fetchedAt: null });

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
          count: s.count ?? null,
          observedAt: String(s.observedAt || ''),
        }));

        if (parsed.length === 0) {
          setState({ sightings: PLACEHOLDER, last24h: 0, isPlaceholder: true, loading: false, fetchedAt: data.fetchedAt || null });
        } else {
          setState({
            sightings: parsed,
            last24h: parsed.filter((s) => s.hoursAgo <= 24).length,
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
    const interval = setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
