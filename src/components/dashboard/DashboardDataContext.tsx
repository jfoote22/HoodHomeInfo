'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useDashboardWeather, DashboardWeather } from '../../lib/hooks/useDashboardWeather';
import { useTideCurve, TideCurveData } from '../../lib/hooks/useTideCurve';
import { useOrcaSightings, SightingsState } from '../../lib/hooks/useOrcaSightings';
import { useDashboardEvents, EventsState } from '../../lib/hooks/useDashboardEvents';
import { useOurEvents, OurEventsState } from '../../lib/hooks/useOurEvents';

/**
 * One place that owns every live data feed for the wall display, so each panel reads
 * shared state instead of firing its own copy of the same fetch (the map and the
 * weather panel both need tides; the AI panel needs everything for its briefing).
 */
export interface DashboardData {
  weather: DashboardWeather | null;
  tide: TideCurveData | null;
  sightings: SightingsState;
  events: EventsState;
  /** The household calendar (bravefoote@gmail) - "Our Events" */
  ourEvents: OurEventsState;
  /** Ticks once a minute - drives the clock and "updated N min ago" labels. */
  now: Date;
}

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { weather } = useDashboardWeather();
  const { data: tide } = useTideCurve();
  const sightings = useOrcaSightings();
  const events = useDashboardEvents();
  const ourEvents = useOurEvents();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Align the first tick to the top of the next minute so the clock flips on time.
    const msToNextMinute = 60000 - (Date.now() % 60000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return <DashboardDataContext.Provider value={{ weather, tide, sightings, events, ourEvents, now }}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used inside <DashboardDataProvider>');
  return ctx;
}

/** Short, plain-English summary of the live conditions, used by the AI panel as its
 *  idle "last response" and injected into chat requests as grounding context. */
export function buildBriefing(data: DashboardData): string {
  const parts: string[] = [];
  const { weather, tide, sightings, ourEvents } = data;

  if (weather) {
    parts.push(`It's ${Math.round(weather.tempF)}° and ${weather.condition.toLowerCase()} in Union, WA — high ${Math.round(weather.hiF)}°, low ${Math.round(weather.loF)}°, wind ${weather.windMph} mph ${weather.windDir}.`);
  }
  if (tide) {
    const trend = tide.trend === 'rising' ? 'flooding' : tide.trend === 'falling' ? 'ebbing' : null;
    const nextBits = [tide.highMarker?.label, tide.lowMarker?.label].filter(Boolean).map((l) => (l as string).replace(/^(HIGH|LOW)\s+/, (m) => m.toLowerCase()));
    let s = `Tide is ${tide.nowHeightLabel}${trend ? ` and ${trend}` : ''}`;
    if (nextBits.length) s += `; next ${nextBits.join(', ')}`;
    parts.push(s + '.');
  }
  if (!sightings.isPlaceholder && sightings.sightings.length) {
    const recent = sightings.sightings.filter((s) => s.hoursAgo <= 24);
    const orcas = recent.filter((s) => s.species === 'orca').length;
    const nearest = sightings.sightings[0];
    if (recent.length) {
      parts.push(`${recent.length} whale sighting${recent.length === 1 ? '' : 's'} reported in Puget Sound in the last 24h${orcas ? ` (${orcas} orca)` : ''}; latest: ${nearest.label} ${nearest.hoursAgoLabel}.`);
    } else {
      parts.push(`No whale reports in the last 24h; most recent was ${nearest.label} ${nearest.hoursAgoLabel}.`);
    }
  }
  const upcomingOurs = ourEvents?.events?.filter((e) => e.start.getTime() > Date.now() - 3600000).slice(0, 2) || [];
  if (upcomingOurs.length) {
    parts.push(`On our calendar: ${upcomingOurs.map((e) => `${e.title} (${e.dayLabel.toLowerCase()} ${e.timeLabel})`).join('; ')}.`);
  }
  return parts.join(' ');
}

const MAX_LOCAL_FOR_AI = 40;

/** Every event both panels know about, one line each, so the AI can answer questions about
 *  the household calendar and the local listings instead of guessing or web-searching. */
export function buildEventsContext(data: DashboardData): string {
  const { events, ourEvents } = data;
  const day = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
  const blocks: string[] = [];

  const ours = ourEvents?.events?.filter((e) => e.start.getTime() > Date.now() - 3600000) || [];
  blocks.push(
    ours.length
      ? `OUR CALENDAR (${ourEvents.calendar || 'household Google Calendar'}):\n` +
          ours.map((e) => `- ${e.title} — ${day(e.start)}, ${e.timeLabel}${e.location ? `, ${e.location}` : ''}`).join('\n')
      : 'OUR CALENDAR: nothing upcoming.',
  );

  const local = events?.isPlaceholder ? [] : events?.events?.slice(0, MAX_LOCAL_FOR_AI) || [];
  if (local.length) {
    const more = (events?.events?.length || 0) - local.length;
    blocks.push(
      `LOCAL EVENTS around Hood Canal / Belfair / Union / Bremerton (${events.events.length} listed):\n` +
        local.map((e) => `- ${e.title} — ${e.dateLabel}`).join('\n') +
        (more > 0 ? `\n(+${more} more not shown)` : ''),
    );
  }
  return blocks.join('\n\n');
}
