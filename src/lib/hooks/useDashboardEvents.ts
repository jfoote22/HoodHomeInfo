'use client';

import { useEffect, useState } from 'react';

export interface DashboardEvent {
  id: string;
  title: string;
  /** e.g. "Aug 22 · 1:00 PM · McReavy House" */
  dateLabel: string;
  /** Pill text: TODAY / TMRW / SAT ... */
  dayLabel: string;
  imageUrl: string | null;
  url: string | null;
  start: Date;
  venue: string | null;
  source: string;
}

export interface EventsState {
  events: DashboardEvent[];
  isPlaceholder: boolean;
  loading: boolean;
  fetchedAt: Date | null;
  sources: string[];
}

const TZ = 'America/Los_Angeles';

const PLACEHOLDER: DashboardEvent[] = [
  { id: 'demo-1', title: 'Hood Canal Seafood Festival', dateLabel: 'Jun 15 · Union waterfront', dayLabel: 'SAT', imageUrl: null, url: null, start: new Date(), venue: null, source: 'demo' },
  { id: 'demo-2', title: 'Union Farmers Market', dateLabel: 'Jun 16 · Alderbrook lawn', dayLabel: 'SUN', imageUrl: null, url: null, start: new Date(), venue: null, source: 'demo' },
  { id: 'demo-3', title: 'Waterfront Art Walk', dateLabel: 'Jun 22 · Belfair', dayLabel: 'SAT', imageUrl: null, url: null, start: new Date(), venue: null, source: 'demo' },
];

function dayKey(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD in Pacific time
}

export function dayPill(start: Date, now = new Date()): string {
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 86400000));
  const k = dayKey(start);
  if (k === today) return 'TODAY';
  if (k === tomorrow) return 'TMRW';
  return start.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }).toUpperCase();
}

function buildDateLabel(start: Date, allDay: boolean, venue: string | null, city: string | null): string {
  const date = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
  const time = allDay ? null : start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(' ', '').toLowerCase();
  const place = venue || city;
  return [date, time, place].filter(Boolean).join(' · ');
}

export function useDashboardEvents(): EventsState {
  const [state, setState] = useState<EventsState>({ events: PLACEHOLDER, isPlaceholder: true, loading: true, fetchedAt: null, sources: [] });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/events/live', { cache: 'no-store' });
        const json = await res.json();
        const raw: any[] = Array.isArray(json.events) ? json.events : [];
        if (cancelled) return;

        const now = new Date();
        const mapped: DashboardEvent[] = raw
          .map((e) => {
            const start = new Date(e.start);
            if (Number.isNaN(start.getTime())) return null;
            return {
              id: String(e.id),
              title: String(e.title),
              dateLabel: buildDateLabel(start, Boolean(e.allDay), e.venue || null, e.city || null),
              dayLabel: dayPill(start, now),
              imageUrl: e.imageUrl || null,
              url: e.url || null,
              start,
              venue: e.venue || null,
              source: String(e.source || ''),
            } as DashboardEvent;
          })
          .filter((e): e is DashboardEvent => e !== null);

        if (mapped.length === 0) {
          setState({ events: PLACEHOLDER, isPlaceholder: true, loading: false, fetchedAt: null, sources: [] });
        } else {
          setState({
            events: mapped,
            isPlaceholder: false,
            loading: false,
            fetchedAt: json.fetchedAt ? new Date(json.fetchedAt) : new Date(),
            sources: Array.isArray(json.sources) ? json.sources : [],
          });
        }
      } catch (err) {
        console.error('Error loading events:', err);
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
