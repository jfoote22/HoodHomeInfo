'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ScaleToFit from './ScaleToFit';
import AIVoiceAgentPanel from './AIVoiceAgentPanel';
import WeatherTidesPanel from './WeatherTidesPanel';
import LocalEventsPanel from './LocalEventsPanel';
import SportsPanel from './SportsPanel';
import OurEventsPanel from './OurEventsPanel';
import CalendarView from './CalendarView';
import KioskBehaviors from './KioskBehaviors';
import { DashboardDataProvider } from './DashboardDataContext';
import { useDashboardTheme } from './DashboardThemeContext';
import { FONT_FAMILIES } from './theme';

// Leaflet touches `window`, so the map panel can't be server-rendered.
const MarineMapPanel = dynamic(() => import('./MarineMapPanel'), { ssr: false });

// The live panels (map, sports, weather/tides, AI) and the full calendar view take turns in
// the center+right area, crossfading every ROTATE_MS. ?rotate=<seconds> overrides; ?rotate=0
// disables (panels only); ?view=calendar starts on the calendar.
const DEFAULT_ROTATE_MS = 30000;
const FADE_MS = 1400;

function useRotation() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [rotateMs, setRotateMs] = useState(DEFAULT_ROTATE_MS);
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const r = qs.get('rotate');
    const ms = r !== null && r !== '' ? Math.max(0, Number(r)) * 1000 : DEFAULT_ROTATE_MS;
    setRotateMs(Number.isFinite(ms) ? ms : DEFAULT_ROTATE_MS);
    if (qs.get('view') === 'calendar') setShowCalendar(true);
  }, []);
  useEffect(() => {
    if (!rotateMs) return;
    const id = setInterval(() => setShowCalendar((v) => !v), rotateMs);
    return () => clearInterval(id);
  }, [rotateMs]);
  return { showCalendar, rotateMs };
}

export default function MarineDashboard() {
  const { theme, themeId, toggleTheme } = useDashboardTheme();
  const { showCalendar } = useRotation();

  return (
    <DashboardDataProvider>
      <KioskBehaviors />
      <ScaleToFit background={theme.isLight ? '#0b0e13' : '#000'}>
        <div
          style={{
            width: 1920,
            height: 1080,
            background: theme.screenBg,
            display: 'grid',
            gridTemplateColumns: '392px 1fr 428px',
            gap: 22,
            padding: 26,
            color: theme.text,
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: FONT_FAMILIES.body,
            position: 'relative',
          }}
        >
          {/* Left column: Our Events (top quarter) over Local Events (bottom three quarters) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0, minWidth: 0 }}>
            <OurEventsPanel theme={theme} />
            <LocalEventsPanel theme={theme} />
          </div>

          {/* Center + right: live panels <-> calendar view, crossfading */}
          <div style={{ gridColumn: '2 / 4', position: 'relative', minHeight: 0, minWidth: 0 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 428px',
                gap: 22,
                opacity: showCalendar ? 0 : 1,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                pointerEvents: showCalendar ? 'none' : 'auto',
              }}
              aria-hidden={showCalendar}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0, minWidth: 0 }}>
                <div style={{ flex: 2, minHeight: 0 }}>
                  <MarineMapPanel theme={theme} />
                </div>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 22 }}>
                  <SportsPanel team="mariners" theme={theme} />
                  <SportsPanel team="seahawks" theme={theme} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0 }}>
                <WeatherTidesPanel theme={theme} />
                <AIVoiceAgentPanel theme={theme} compact />
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: showCalendar ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                pointerEvents: showCalendar ? 'auto' : 'none',
              }}
              aria-hidden={!showCalendar}
            >
              <CalendarView theme={theme} />
            </div>
          </div>

          <button
            onClick={toggleTheme}
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              fontFamily: FONT_FAMILIES.mono,
              fontSize: 10,
              letterSpacing: '.08em',
              color: theme.dim,
              background: 'transparent',
              border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.12)' : 'rgba(255,255,255,.08)'}`,
              borderRadius: 999,
              padding: '4px 10px',
              cursor: 'pointer',
              opacity: 0.5,
            }}
            title="Switch theme"
          >
            {themeId === 'command-center' ? 'Daylight Glass' : 'Command Center'}
          </button>
        </div>
      </ScaleToFit>
    </DashboardDataProvider>
  );
}
