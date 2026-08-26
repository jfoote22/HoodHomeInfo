'use client';

import { useEffect, useState } from 'react';
import type { MlbLivePayload } from '../../app/api/mlb/live/route';

export type { MlbLivePayload, MlbLiveGame, MlbPlayer, MlbLineSide } from '../../app/api/mlb/live/route';

const LIVE_POLL_MS = 20 * 1000;
const IDLE_POLL_MS = 2 * 60 * 1000;

/** Live Mariners game state from /api/mlb/live; polls every 20s during a game. */
export function useMlbLive(enabled: boolean) {
  const [data, setData] = useState<MlbLivePayload | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      let live = false;
      try {
        const res = await fetch('/api/mlb/live', { cache: 'no-store' });
        const json = (await res.json()) as MlbLivePayload;
        if (cancelled) return;
        live = Boolean(json.live && json.game);
        setData(json);
      } catch (err) {
        console.error('Error loading MLB live feed:', err);
      } finally {
        if (!cancelled) timer = setTimeout(load, live ? LIVE_POLL_MS : IDLE_POLL_MS);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  return data;
}
