'use client';

import { useEffect, useState } from 'react';

export interface DashboardEvent {
  id: string;
  title: string;
  dateLabel: string;
  dayLabel: string;
}

interface RawEvent {
  id: string;
  title: string;
  date: string; // e.g. "Sat, Jun 15"
  time: string;
  location: string;
  category: string;
}

const PLACEHOLDER: DashboardEvent[] = [
  { id: 'demo-1', title: 'Hood Canal Seafood Festival', dateLabel: 'Jun 15 · Union waterfront', dayLabel: 'SAT' },
  { id: 'demo-2', title: 'Union Farmers Market', dateLabel: 'Jun 16 · Alderbrook lawn', dayLabel: 'SUN' },
  { id: 'demo-3', title: 'Waterfront Art Walk', dateLabel: 'Jun 22 · Belfair', dayLabel: 'SAT' },
];

export function useDashboardEvents() {
  const [events, setEvents] = useState<DashboardEvent[]>(PLACEHOLDER);
  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/events/live', { cache: 'no-store' });
        const json = await res.json();
        const raw: RawEvent[] = Array.isArray(json.events) ? json.events : [];

        if (cancelled) return;

        if (raw.length === 0) {
          setIsPlaceholder(true);
          setEvents(PLACEHOLDER);
        } else {
          const mapped = raw.slice(0, 3).map((e) => {
            const [weekday, monthDay] = e.date.split(',').map((s) => s.trim());
            return {
              id: e.id,
              title: e.title,
              dateLabel: `${monthDay || e.date} · ${e.location}`,
              dayLabel: (weekday || '').toUpperCase().slice(0, 3) || '--',
            };
          });
          setIsPlaceholder(false);
          setEvents(mapped);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        if (!cancelled) {
          setIsPlaceholder(true);
          setEvents(PLACEHOLDER);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { events, isPlaceholder, loading };
}
