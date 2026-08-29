import { NextResponse } from 'next/server';
import { parseHermesStocks, type HermesQuote } from '../../../lib/hermesParse';
import { loadHermesDocument } from '../../../lib/hermesStore';

// Market prices for the bottom ticker. Hermes publishes a "Stock Watch" section (Yahoo
// Finance quotes) on its page; this route just reads that - no market API key involved.
//
//   GET /api/stocks -> { quotes: [{ name, symbol, price, change, changePct, ... }], fetchedAt }

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HERMES_EVENTS_URL = (process.env.HERMES_EVENTS_URL || '').trim();
const CACHE_TTL_MS = 2 * 60 * 1000;

let cache: { at: number; quotes: HermesQuote[] } | null = null;

async function loadQuotes(): Promise<HermesQuote[]> {
  const parse = (html: string) => parseHermesStocks(html);

  try {
    const doc = await loadHermesDocument();
    if (doc) {
      if (doc.kind === 'html') {
        const q = parse(doc.body);
        if (q.length) return q;
      } else {
        try {
          const parsed = JSON.parse(doc.body);
          if (typeof parsed.html === 'string') {
            const q = parse(parsed.html);
            if (q.length) return q;
          }
        } catch {
          /* not JSON we understand */
        }
      }
    }
  } catch (err) {
    console.warn('stocks: hermes document unreadable', err);
  }

  if (HERMES_EVENTS_URL) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(HERMES_EVENTS_URL, { cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) return parse(await res.text());
    } catch {
      /* LAN page not reachable from here - fine */
    }
  }
  return [];
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ quotes: cache.quotes, fetchedAt: new Date(cache.at).toISOString(), cached: true });
  }
  try {
    const quotes = await loadQuotes();
    if (quotes.length || !cache) cache = { at: Date.now(), quotes };
    return NextResponse.json({ quotes: cache.quotes, fetchedAt: new Date(cache.at).toISOString() });
  } catch (err) {
    console.error('stocks failed:', err);
    if (cache) return NextResponse.json({ quotes: cache.quotes, fetchedAt: new Date(cache.at).toISOString(), stale: true });
    return NextResponse.json({ quotes: [], fetchedAt: new Date().toISOString(), error: String(err) }, { status: 502 });
  }
}
