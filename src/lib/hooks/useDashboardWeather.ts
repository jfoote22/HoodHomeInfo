'use client';

import { useEffect, useState } from 'react';

export interface HourlyPoint {
  label: string;
  tempF: number;
  icon: string;
}

export interface DailyPoint {
  /** "Sun", "Mon" ... */
  day: string;
  hiF: number;
  loF: number;
  icon: string;
}

export interface DashboardWeather {
  tempF: number;
  condition: string;
  hiF: number;
  loF: number;
  windMph: number;
  windDir: string;
  icon: string;
  hourly: HourlyPoint[];
  /** The next three days after today */
  daily: DailyPoint[];
  isFallback: boolean;
}

export function useDashboardWeather() {
  const [weather, setWeather] = useState<DashboardWeather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/weather/reliable', { cache: 'no-store' });
        const json = await res.json();
        if (json.error) throw new Error(json.details || 'weather error');
        if (cancelled) return;

        const forecast: any[] = Array.isArray(json.forecast) ? json.forecast : [];
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Los_Angeles' });
        const today = forecast[0];
        // forecast[0] is usually today; late in the evening OWM's list may start tomorrow.
        const upcoming = forecast[0]?.day === todayName ? forecast.slice(1, 4) : forecast.slice(0, 3);
        setWeather({
          tempF: json.current?.temp ?? 55,
          condition: json.current?.condition ?? 'Clear',
          hiF: today?.temp?.max ?? json.current?.temp ?? 60,
          loF: today?.temp?.min ?? json.current?.temp ?? 45,
          windMph: json.current?.windSpeed ?? 5,
          windDir: json.current?.windDirection ?? 'NW',
          icon: json.current?.icon ?? 'sun',
          // Future forecast points only - the hero above already shows the current temp,
          // so a synthetic "NOW" column here would just repeat it.
          hourly: Array.isArray(json.hourly) ? json.hourly : [],
          daily: upcoming.map((d: any) => ({
            day: String(d.day || ''),
            hiF: Math.round(d.temp?.max ?? 0),
            loF: Math.round(d.temp?.min ?? 0),
            icon: d.icon || 'sun',
          })),
          isFallback: !json.isReliable,
        });
      } catch (err) {
        console.error('Error loading weather:', err);
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { weather, loading };
}
