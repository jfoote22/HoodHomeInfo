'use client';

import { useEffect, useState } from 'react';
import type { HermesQuote } from '../hermesParse';

export type { HermesQuote } from '../hermesParse';

const POLL_MS = 5 * 60 * 1000;

/** Market quotes for the bottom ticker (from Hermes' "Stock Watch" section). */
export function useStocks(): { quotes: HermesQuote[]; loading: boolean } {
  const [quotes, setQuotes] = useState<HermesQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/stocks', { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (Array.isArray(json.quotes)) setQuotes(json.quotes);
      } catch (err) {
        console.error('Error loading stocks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { quotes, loading };
}
