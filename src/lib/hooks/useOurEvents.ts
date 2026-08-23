'use client';

import { useCallback, useEffect, useState } from 'react';

const TZ = 'America/Los_Angeles';

export interface OurEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  url: string | null;
  source: 'google' | 'ics' | 'hermes';
  dayLabel: string; // TODAY / TMRW / SAT
  dateLabel: string; // Aug 24
  timeLabel: string; // 6:00pm or "All day"
}

export interface OurEventsState {
  events: OurEvent[];
  loading: boolean;
  writable: boolean; // service account configured -> "+ Add" writes directly
  calendar: string;
  sources: string[];
  fetchedAt: Date | null;
  refresh: () => void;
}

export function dayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

export function dayPill(start: Date, now = new Date()): string {
  const k = dayKey(start);
  if (k === dayKey(now)) return 'TODAY';
  if (k === dayKey(new Date(now.getTime() + 86400000))) return 'TMRW';
  return start.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }).toUpperCase();
}

export function normTitle(s: string): string {
  return s.toLowerCase().replace(/[’'".,!?:;()\-–—&/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Does a local event match one of our calendar events (same day + similar title)? */
export function matchesOurEvent(title: string, start: Date, ours: OurEvent[]): OurEvent | null {
  const k = dayKey(start);
  const t = normTitle(title);
  if (!t) return null;
  for (const o of ours) {
    if (dayKey(o.start) !== k) continue;
    const ot = normTitle(o.title);
    if (!ot) continue;
    if (ot === t) return o;
    if (t.length >= 8 && ot.includes(t)) return o;
    if (ot.length >= 8 && t.includes(ot)) return o;
  }
  return null;
}

export function useOurEvents(): OurEventsState {
  const [state, setState] = useState<Omit<OurEventsState, 'refresh'>>({ events: [], loading: true, writable: false, calendar: '', sources: [], fetchedAt: null });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/our-events${tick ? '?refresh=1' : ''}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        const now = new Date();
        const events: OurEvent[] = (Array.isArray(json.events) ? json.events : [])
          .map((e: any) => {
            const start = new Date(e.start);
            if (Number.isNaN(start.getTime())) return null;
            return {
              id: String(e.id),
              title: String(e.title),
              start,
              end: e.end ? new Date(e.end) : null,
              allDay: Boolean(e.allDay),
              location: e.location || null,
              url: e.url || null,
              source: e.source || 'google',
              dayLabel: dayPill(start, now),
              dateLabel: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ }),
              timeLabel: e.allDay ? 'All day' : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(' ', '').toLowerCase(),
            } as OurEvent;
          })
          .filter(Boolean);
        setState({ events, loading: false, writable: Boolean(json.writable), calendar: json.calendar || '', sources: json.sources || [], fetchedAt: json.fetchedAt ? new Date(json.fetchedAt) : new Date() });
      } catch (err) {
        console.error('Error loading our events:', err);
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    }
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { ...state, refresh };
}
