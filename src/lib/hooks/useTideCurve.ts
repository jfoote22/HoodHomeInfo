'use client';

import { useEffect, useState } from 'react';

const TZ = 'America/Los_Angeles';

export interface TideDayBand {
  /** "TODAY" / "SUN" / "MON" */
  label: string;
  isToday: boolean;
  x0: number;
  x1: number;
  /** hi/lo extremes inside this day, already projected to SVG coords */
  extremes: { x: number; y: number; type: 'High' | 'Low'; timeLabel: string; height: number }[];
}

export interface TideCurveData {
  /** Full 3-day curve (dim) */
  linePath: string;
  /** Today's slice of the curve (bright) + its area fill */
  todayLinePath: string;
  todayAreaPath: string;
  areaPath: string; // alias of todayAreaPath kept for older callers
  days: TideDayBand[];
  highMarker: { x: number; y: number; label: string } | null; // today's next high
  lowMarker: { x: number; y: number; label: string } | null; // today's next low
  nowDot: { x: number; y: number } | null;
  nowHeightLabel: string;
  trend: 'rising' | 'falling' | null;
  trendRateLabel: string;
  highLowSummary: string;
  stationName: string;
  isFallback: boolean;
  viewW: number;
  viewH: number;
}

interface RawTide {
  type: 'High' | 'Low';
  time: string;
  date: string;
  height: string;
  timestamp: number;
}

const VIEW_W = 380;
const VIEW_H = 120;
const PAD_TOP = 24;
const PAD_BOTTOM = 16;
const DAYS_SHOWN = 3;

function cubicInterpolate(y0: number, y1: number, y2: number, y3: number, mu: number) {
  const mu2 = mu * mu;
  const a0 = y3 - y2 - y0 + y1;
  const a1 = y0 - y1 - a0;
  const a2 = y2 - y0;
  const a3 = y1;
  return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3;
}

function buildCurve(sorted: RawTide[], stepsPerSegment = 24) {
  const points: { t: number; h: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const startH = parseFloat(start.height);
    const endH = parseFloat(end.height);
    const prevH = i > 0 ? parseFloat(sorted[i - 1].height) : startH;
    const nextH = i < sorted.length - 2 ? parseFloat(sorted[i + 2].height) : endH;
    points.push({ t: start.timestamp, h: startH });
    for (let step = 1; step < stepsPerSegment; step++) {
      const mu = step / stepsPerSegment;
      points.push({ t: start.timestamp + mu * (end.timestamp - start.timestamp), h: cubicInterpolate(prevH, startH, endH, nextH, mu) });
    }
  }
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    points.push({ t: last.timestamp, h: parseFloat(last.height) });
  }
  return points;
}

function heightAt(points: { t: number; h: number }[], target: number): number | null {
  if (points.length === 0) return null;
  if (target <= points[0].t) return points[0].h;
  if (target >= points[points.length - 1].t) return points[points.length - 1].h;
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].t <= target && points[i + 1].t >= target) {
      const span = points[i + 1].t - points[i].t || 1;
      const mu = (target - points[i].t) / span;
      return points[i].h + (points[i + 1].h - points[i].h) * mu;
    }
  }
  return points[points.length - 1].h;
}

function formatMarkerTime(timeStr: string): string {
  // "2:18 PM" -> "2:18p"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  const [, h, m, ap] = match;
  return `${parseInt(h, 10)}:${m}${ap.toLowerCase()[0]}`;
}

/** Midnight (Pacific) of the day containing `t`, as a UTC instant. */
function startOfPacificDay(t: number): number {
  const d = new Date(t);
  const ymd = d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
  // Find the instant where Pacific clock reads 00:00 on that date.
  const guess = Date.parse(`${ymd}T00:00:00Z`);
  const offsetMin = (() => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(new Date(guess));
    const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-8';
    const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return -480;
    return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
  })();
  return guess - offsetMin * 60000;
}

function dayLabel(t: number, isToday: boolean): string {
  if (isToday) return 'TODAY';
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }).toUpperCase();
}

function toPath(points: { x: number; y: number }[]): string {
  return points.length ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') : '';
}

export function useTideCurve() {
  const [data, setData] = useState<TideCurveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/tides/reliable?days=4', { cache: 'no-store' });
        const json = await res.json();
        const tides: RawTide[] = Array.isArray(json.tides) ? json.tides : [];
        const sorted = [...tides].sort((a, b) => a.timestamp - b.timestamp);
        if (cancelled) return;
        if (sorted.length < 2) {
          setData(null);
          return;
        }

        const now = Date.now();
        const domainStart = startOfPacificDay(now);
        const dayStarts: number[] = [domainStart];
        for (let i = 1; i <= DAYS_SHOWN; i++) dayStarts.push(startOfPacificDay(dayStarts[i - 1] + 26 * 36e5));
        const domainEnd = dayStarts[DAYS_SHOWN];

        const curve = buildCurve(sorted);
        const inWindow = sorted.filter((t) => t.timestamp >= domainStart && t.timestamp <= domainEnd);
        const heights = (inWindow.length ? inWindow : sorted).map((t) => parseFloat(t.height));
        const minH = Math.min(...heights);
        const maxH = Math.max(...heights) || minH + 1;
        const range = maxH - minH || 1;

        const toXY = (t: number, h: number) => ({
          x: ((t - domainStart) / (domainEnd - domainStart)) * VIEW_W,
          y: PAD_TOP + (VIEW_H - PAD_TOP - PAD_BOTTOM) * (1 - (h - minH) / range),
        });

        const windowPoints = curve.filter((p) => p.t >= domainStart && p.t <= domainEnd).map((p) => ({ ...toXY(p.t, p.h), t: p.t }));
        const linePath = toPath(windowPoints);

        const todayEnd = dayStarts[1];
        const todayPoints = windowPoints.filter((p) => p.t >= domainStart && p.t <= todayEnd);
        const todayLinePath = toPath(todayPoints);
        const todayAreaPath = todayPoints.length
          ? `${todayLinePath} L${todayPoints[todayPoints.length - 1].x.toFixed(1)},${VIEW_H} L${todayPoints[0].x.toFixed(1)},${VIEW_H} Z`
          : '';

        const days: TideDayBand[] = [];
        for (let i = 0; i < DAYS_SHOWN; i++) {
          const s = dayStarts[i];
          const e = dayStarts[i + 1];
          days.push({
            label: dayLabel(s + 12 * 36e5, i === 0),
            isToday: i === 0,
            x0: toXY(s, 0).x,
            x1: toXY(e, 0).x,
            extremes: sorted
              .filter((t) => t.timestamp >= s && t.timestamp < e)
              .map((t) => ({ ...toXY(t.timestamp, parseFloat(t.height)), type: t.type, timeLabel: formatMarkerTime(t.time), height: parseFloat(t.height) })),
          });
        }

        const nextHigh = sorted.find((t) => t.timestamp >= now && t.type === 'High');
        const nextLow = sorted.find((t) => t.timestamp >= now && t.type === 'Low');
        const highMarker = nextHigh ? { ...toXY(nextHigh.timestamp, parseFloat(nextHigh.height)), label: `HIGH ${formatMarkerTime(nextHigh.time)}` } : null;
        const lowMarker = nextLow ? { ...toXY(nextLow.timestamp, parseFloat(nextLow.height)), label: `LOW ${formatMarkerTime(nextLow.time)}` } : null;

        const nowH = heightAt(curve, now);
        const nowDot = nowH !== null ? toXY(now, nowH) : null;

        const hBefore = heightAt(curve, now - 20 * 60 * 1000);
        const hAfter = heightAt(curve, now + 20 * 60 * 1000);
        let trend: 'rising' | 'falling' | null = null;
        let trendRateLabel = '';
        if (hBefore !== null && hAfter !== null) {
          trend = hAfter >= hBefore ? 'rising' : 'falling';
          const ratePerHr = (hAfter - hBefore) / (40 / 60);
          trendRateLabel = `${Math.abs(ratePerHr).toFixed(1)} ft/hr`;
        }

        const todaysHighs = days[0].extremes.filter((t) => t.type === 'High').map((t) => t.height);
        const todaysLows = days[0].extremes.filter((t) => t.type === 'Low').map((t) => t.height);
        const highSummary = todaysHighs.length ? Math.max(...todaysHighs).toFixed(1) : null;
        const lowSummary = todaysLows.length ? Math.min(...todaysLows).toFixed(1) : null;

        setData({
          linePath,
          todayLinePath,
          todayAreaPath,
          areaPath: todayAreaPath,
          days,
          highMarker,
          lowMarker,
          nowDot,
          nowHeightLabel: nowH !== null ? `${nowH >= 0 ? '+' : ''}${nowH.toFixed(1)}ft` : '--',
          trend,
          trendRateLabel,
          highLowSummary: highSummary && lowSummary ? `High +${highSummary} · Low +${lowSummary}` : '',
          stationName: json.stationName || 'Union, Hood Canal',
          isFallback: !json.isReliable || Boolean(json.error),
          viewW: VIEW_W,
          viewH: VIEW_H,
        });
      } catch (err) {
        console.error('Error loading tide curve:', err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading };
}
