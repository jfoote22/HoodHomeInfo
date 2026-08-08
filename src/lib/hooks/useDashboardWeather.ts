'use client';

import { useEffect, useState } from 'react';

export interface HourlyPoint {
  label: string;
  tempF: number;
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

        const today = json.forecast?.[0];
        setWeather({
          tempF: json.current?.temp ?? 55,
          condition: json.current?.condition ?? 'Clear',
          hiF: today?.temp?.max ?? json.current?.temp ?? 60,
          loF: today?.temp?.min ?? json.current?.temp ?? 45,
          windMph: json.current?.windSpeed ?? 5,
          windDir: json.current?.windDirection ?? 'NW',
          icon: json.current?.icon ?? 'sun',
          hourly: [
            { label: 'NOW', tempF: json.current?.temp ?? 55, icon: json.current?.icon ?? 'sun' },
            ...(json.hourly || []),
          ],
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
