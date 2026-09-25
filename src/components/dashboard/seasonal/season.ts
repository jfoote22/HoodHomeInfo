'use client';

import { useEffect, useState } from 'react';
import { DASHBOARD_TZ } from '../../../lib/time';

// Seasonal flair is purely decorative: it layers art behind and in front of the panels and
// never changes their layout or content. The season follows the calendar in Union's time zone;
// ?season=fall|winter|spring|summer pins one (handy for previewing), ?season=off or the toggle
// beside the theme button turns the decorations off on this device.

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type SeasonSetting = Season | 'auto' | 'off';

const STORAGE_KEY = 'hoodhome-season';
const SETTINGS: SeasonSetting[] = ['auto', 'off', 'spring', 'summer', 'fall', 'winter'];

// Astronomical seasons, using the usual equinox/solstice dates. They drift by a day between
// years, which a decoration can live with.
const STARTS: { season: Season; month: number; day: number }[] = [
  { season: 'spring', month: 3, day: 20 },
  { season: 'summer', month: 6, day: 21 },
  { season: 'fall', month: 9, day: 22 },
  { season: 'winter', month: 12, day: 21 },
];

export function seasonFor(date: Date): Season {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: DASHBOARD_TZ, month: 'numeric', day: 'numeric' }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const key = month * 100 + day;
  let current: Season = 'winter'; // Jan 1 up to the spring equinox
  for (const s of STARTS) if (key >= s.month * 100 + s.day) current = s.season;
  return current;
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Autumn',
  winter: 'Winter',
};

function readSetting(): SeasonSetting {
  const fromUrl = new URLSearchParams(window.location.search).get('season') as SeasonSetting | null;
  if (fromUrl && SETTINGS.includes(fromUrl)) {
    window.localStorage.setItem(STORAGE_KEY, fromUrl);
    return fromUrl;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY) as SeasonSetting | null;
  return stored && SETTINGS.includes(stored) ? stored : 'auto';
}

/** The season to decorate for, or null when decorations are off (or before mount, so the
 *  server render and the first client render agree). */
export function useSeason() {
  const [setting, setSetting] = useState<SeasonSetting | null>(null);
  const [calendarSeason, setCalendarSeason] = useState<Season>('fall');

  useEffect(() => {
    setSetting(readSetting());
    const tick = () => setCalendarSeason(seasonFor(new Date()));
    tick();
    // The kiosk runs for weeks; roll over to the next season without a reload.
    const id = setInterval(tick, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const season: Season | null =
    setting === null || setting === 'off' ? null : setting === 'auto' ? calendarSeason : setting;

  const toggle = () => {
    const next: SeasonSetting = season ? 'off' : 'auto';
    window.localStorage.setItem(STORAGE_KEY, next);
    setSetting(next);
  };

  return { season, calendarSeason, toggle };
}
