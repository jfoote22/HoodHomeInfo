'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ScaleToFit from './ScaleToFit';
import AIVoiceAgentPanel from './AIVoiceAgentPanel';
import WeatherTidesPanel from './WeatherTidesPanel';
import LocalEventsPanel from './LocalEventsPanel';
import SportsPanel from './SportsPanel';
import OurEventsPanel from './OurEventsPanel';
import CalendarView from './CalendarView';
import KioskBehaviors from './KioskBehaviors';
import StockTicker, { TICKER_HEIGHT } from './StockTicker';
import { DashboardDataProvider } from './DashboardDataContext';
import { useDashboardTheme } from './DashboardThemeContext';
import { FONT_FAMILIES } from './theme';

// Leaflet touches `window`, so the map panel can't be server-rendered.
const MarineMapPanel = dynamic(() => import('./MarineMapPanel'), { ssr: false });

// The live panels (map, sports, weather/tides, AI) are the default view. Hovering the
// Our Events panel fades the native calendar in over them; it stays while the pointer is
// over it, and fades back out IDLE_MS after the pointer goes idle. ?view=calendar pins it on.
const IDLE_MS = 3000;
const FADE_MS = 1400;

function useCalendarReveal() {
  const [show, setShow] = useState(false);
  const pinned = useRef(false);
  const overCalendar = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = null;
  };
  const armIdle = useCallback(() => {
    clearIdle();
    if (pinned.current || overCalendar.current) return;
    idleTimer.current = setTimeout(() => setShow(false), IDLE_MS);
  }, []);
  const reveal = useCallback(() => {
    setShow(true);
    armIdle();
  }, [armIdle]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'calendar') {
      pinned.current = true;
      setShow(true);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const onActivity = () => {
      if (!overCalendar.current) armIdle();
    };
    const opts = { passive: true } as const;
    window.addEventListener('mousemove', onActivity, opts);
    window.addEventListener('pointerdown', onActivity, opts);
    window.addEventListener('wheel', onActivity, opts);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, opts);
    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearIdle();
    };
  }, [show, armIdle]);

  const onCalendarEnter = useCallback(() => {
    overCalendar.current = true;
    clearIdle();
  }, []);
  const onCalendarLeave = useCallback(() => {
    overCalendar.current = false;
    armIdle();
  }, [armIdle]);

  return { show, reveal, onCalendarEnter, onCalendarLeave };
}

export default function MarineDashboard() {
  const { theme, themeId, toggleTheme } = useDashboardTheme();
  const { show: showCalendar, reveal, onCalendarEnter, onCalendarLeave } = useCalendarReveal();

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
            // Panels on top, the market ticker across the bottom.
            gridTemplateRows: `1fr ${TICKER_HEIGHT}px`,
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
          <div style={{ gridRow: 1, display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0, minWidth: 0 }}>
            <div onMouseEnter={reveal} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <OurEventsPanel theme={theme} />
            </div>
            <LocalEventsPanel theme={theme} />
          </div>

          {/* Center + right: live panels, with the calendar fading in over them on demand */}
          <div style={{ gridColumn: '2 / 4', gridRow: 1, position: 'relative', minHeight: 0, minWidth: 0 }}>
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
              onMouseEnter={onCalendarEnter}
              onMouseLeave={onCalendarLeave}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: showCalendar ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                pointerEvents: showCalendar ? 'auto' : 'none',
              }}
              aria-hidden={!showCalendar}
            >
              <CalendarView theme={theme} active={showCalendar} />
            </div>
          </div>

          <div style={{ gridColumn: '1 / 4', gridRow: 2, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <StockTicker theme={theme} />
            </div>

          <button
            onClick={toggleTheme}
            style={{
              flexShrink: 0,
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
        </div>
      </ScaleToFit>
    </DashboardDataProvider>
  );
}
