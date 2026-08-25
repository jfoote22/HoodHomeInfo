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
import { DashboardDataProvider } from './DashboardDataContext';
import { useDashboardTheme } from './DashboardThemeContext';
import { FONT_FAMILIES } from './theme';

// Leaflet touches `window`, so the map panel can't be server-rendered.
const MarineMapPanel = dynamic(() => import('./MarineMapPanel'), { ssr: false });

// The live panels (map, sports, weather/tides, AI) are the default view. Hovering the
// Our Events panel fades the Google Calendar in over them; it stays while the pointer is
// over it or someone has clicked into it, and fades back out IDLE_MS after the pointer goes
// idle on the page. ?view=calendar pins the calendar on.
const IDLE_MS = 3000;
// The calendar is a cross-origin iframe, so pointer movement inside it is invisible to us.
// A mouse parked over it would otherwise keep the calendar up forever on the wall display.
const PARKED_MS = 3 * 60 * 1000;
const FADE_MS = 1400;

function useCalendarReveal(calendarRef: React.RefObject<HTMLDivElement>) {
  const [show, setShow] = useState(false);
  const pinned = useRef(false);
  const overCalendar = useRef(false);
  const engaged = useRef(false); // the iframe has focus: an event was clicked and not clicked away from
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parkedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (parkedTimer.current) clearTimeout(parkedTimer.current);
    idleTimer.current = parkedTimer.current = null;
  };
  const armIdle = useCallback(() => {
    clearTimers();
    if (pinned.current || overCalendar.current || engaged.current) return;
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
    const iframeFocused = () => {
      const el = document.activeElement;
      return el?.tagName === 'IFRAME' && !!calendarRef.current?.contains(el);
    };
    const onActivity = () => {
      if (!overCalendar.current && !engaged.current) armIdle();
    };
    const onBlur = () => {
      if (iframeFocused()) {
        engaged.current = true;
        clearTimers();
      }
    };
    const onFocus = () => {
      engaged.current = false;
      armIdle();
    };
    const opts = { passive: true } as const;
    window.addEventListener('mousemove', onActivity, opts);
    window.addEventListener('pointerdown', onActivity, opts);
    window.addEventListener('wheel', onActivity, opts);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, opts);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('wheel', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      clearTimers();
    };
  }, [show, armIdle, calendarRef]);

  const onCalendarEnter = useCallback(() => {
    overCalendar.current = true;
    clearTimers();
    if (!pinned.current) parkedTimer.current = setTimeout(() => setShow(false), PARKED_MS);
  }, []);
  const onCalendarLeave = useCallback(() => {
    overCalendar.current = false;
    armIdle();
  }, [armIdle]);

  return { show, reveal, onCalendarEnter, onCalendarLeave };
}

export default function MarineDashboard() {
  const { theme, themeId, toggleTheme } = useDashboardTheme();
  const calendarRef = useRef<HTMLDivElement>(null);
  const { show: showCalendar, reveal, onCalendarEnter, onCalendarLeave } = useCalendarReveal(calendarRef);

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
            <div onMouseEnter={reveal} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <OurEventsPanel theme={theme} />
            </div>
            <LocalEventsPanel theme={theme} />
          </div>

          {/* Center + right: live panels, with the calendar fading in over them on demand */}
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
              ref={calendarRef}
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
