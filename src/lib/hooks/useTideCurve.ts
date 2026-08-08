'use client';

import { useEffect, useState } from 'react';

export interface TideCurveData {
  areaPath: string;
  linePath: string;
  highMarker: { x: number; y: number; label: string } | null;
  lowMarker: { x: number; y: number; label: string } | null;
  nowDot: { x: number; y: number } | null;
  nowHeightLabel: string;
  trend: 'rising' | 'falling' | null;
  trendRateLabel: string;
  highLowSummary: string;
  stationName: string;
  isFallback: boolean;
}

interface RawTide {
  type: 'High' | 'Low';
  time: string;
  date: string;
  height: string;
  timestamp: number;
}

const VIEW_W = 380;
const VIEW_H = 110;
const PAD_TOP = 22;
const PAD_BOTTOM = 14;

// Cubic interpolation between tide extrema, ported from TideChart.tsx's approach.
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
      const t = start.timestamp + mu * (end.timestamp - start.timestamp);
      const h = cubicInterpolate(prevH, startH, endH, nextH, mu);
      points.push({ t, h });
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
  // "02:18 PM" -> "2:18p"
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  const [, h, m, ap] = match;
  return `${parseInt(h, 10)}:${m}${ap.toLowerCase()[0]}`;
}

export function useTideCurve() {
  const [data, setData] = useState<TideCurveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/tides/reliable?days=3', { cache: 'no-store' });
        const json = await res.json();
        const tides: RawTide[] = Array.isArray(json.tides) ? json.tides : [];
        const sorted = [...tides].sort((a, b) => a.timestamp - b.timestamp);

        if (cancelled) return;

        if (sorted.length < 2) {
          setData(null);
          return;
        }

        const now = Date.now();
        const domainStart = now - 60 * 60 * 1000;
        const domainEnd = now + 11 * 60 * 60 * 1000;

        const curve = buildCurve(sorted);
        const heights = sorted.map((t) => parseFloat(t.height));
        const minH = Math.min(...heights);
        const maxH = Math.max(...heights) || minH + 1;
        const range = maxH - minH || 1;

        const toXY = (t: number, h: number) => ({
          x: ((t - domainStart) / (domainEnd - domainStart)) * VIEW_W,
          y: PAD_TOP + (VIEW_H - PAD_TOP - PAD_BOTTOM) * (1 - (h - minH) / range),
        });

        const windowPoints = curve.filter((p) => p.t >= domainStart - 20 * 60 * 1000 && p.t <= domainEnd + 20 * 60 * 1000);
        const linePoints = windowPoints.map((p) => toXY(p.t, p.h));
        const linePath = linePoints.length
          ? linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
          : '';
        const areaPath = linePoints.length
          ? `${linePath} L${linePoints[linePoints.length - 1].x.toFixed(1)},${VIEW_H} L${linePoints[0].x.toFixed(1)},${VIEW_H} Z`
          : '';

        const nextHigh = sorted.find((t) => t.timestamp >= now && t.type === 'High');
        const nextLow = sorted.find((t) => t.timestamp >= now && t.type === 'Low');

        const highMarker = nextHigh
          ? { ...toXY(nextHigh.timestamp, parseFloat(nextHigh.height)), label: `HIGH ${formatMarkerTime(nextHigh.time)}` }
          : null;
        const lowMarker = nextLow
          ? { ...toXY(nextLow.timestamp, parseFloat(nextLow.height)), label: `LOW ${formatMarkerTime(nextLow.time)}` }
          : null;

        const nowH = heightAt(curve, now);
        const nowDot = nowH !== null ? toXY(now, nowH) : null;

        const hBefore = heightAt(curve, now - 20 * 60 * 1000);
        const hAfter = heightAt(curve, now + 20 * 60 * 1000);
        let trend: 'rising' | 'falling' | null = null;
        let trendRateLabel = '';
        if (hBefore !== null && hAfter !== null) {
          trend = hAfter >= hBefore ? 'rising' : 'falling';
          const ratePerHr = ((hAfter - hBefore) / (40 / 60)).toFixed(1);
          trendRateLabel = `${Math.abs(parseFloat(ratePerHr)).toFixed(1)} ft/hr`;
        }

        const todaysHighs = sorted.filter((t) => t.type === 'High').slice(0, 2).map((t) => parseFloat(t.height));
        const todaysLows = sorted.filter((t) => t.type === 'Low').slice(0, 2).map((t) => parseFloat(t.height));
        const highSummary = todaysHighs.length ? Math.max(...todaysHighs).toFixed(1) : null;
        const lowSummary = todaysLows.length ? Math.min(...todaysLows).toFixed(1) : null;

        setData({
          areaPath,
          linePath,
          highMarker,
          lowMarker,
          nowDot,
          nowHeightLabel: nowH !== null ? `${nowH >= 0 ? '+' : ''}${nowH.toFixed(1)}ft` : '--',
          trend,
          trendRateLabel,
          highLowSummary: highSummary && lowSummary ? `High +${highSummary} · Low +${lowSummary}` : '',
          stationName: json.stationName || 'Union, Hood Canal',
          isFallback: !json.isReliable || Boolean(json.error),
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
