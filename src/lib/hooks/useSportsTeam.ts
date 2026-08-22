'use client';

import { useEffect, useState } from 'react';
import type { SportsPayload } from '../../app/api/sports/route';

export type { SportsPayload, GameSummary, NewsItem } from '../../app/api/sports/route';

export function useSportsTeam(team: 'mariners' | 'seahawks') {
  const [data, setData] = useState<SportsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      let live = false;
      try {
        const res = await fetch(`/api/sports?team=${team}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.details || json.error);
        live = Boolean(json.liveGame);
        setData(json as SportsPayload);
        setError(null);
      } catch (err) {
        console.error(`Error loading ${team}:`, err);
        if (!cancelled) setError(String(err));
      } finally {
        // Poll faster while a game is in progress.
        if (!cancelled) timer = setTimeout(load, live ? 60 * 1000 : 5 * 60 * 1000);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [team]);

  return { data, error };
}
