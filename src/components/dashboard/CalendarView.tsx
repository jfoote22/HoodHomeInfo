'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';

// Google Calendar's own embed UI, shown over the live panels while someone is using it
// (see useCalendarReveal in MarineDashboard). The embed is read-only and only shows a
// calendar the viewer can see — for the kiosk that means the calendar must be public
// (Calendar settings → Access permissions → "Make available to public").

const TZ = 'America/Los_Angeles';
const CALENDAR_ID = process.env.NEXT_PUBLIC_OUR_CALENDAR_ID || 'bravefoote@gmail.com';
// Google's embed never refreshes itself; reload it when it's re-revealed after this long.
const STALE_MS = 5 * 60 * 1000;

function embedUrl(): string {
  const u = new URL('https://calendar.google.com/calendar/embed');
  u.searchParams.set('src', CALENDAR_ID);
  u.searchParams.set('ctz', TZ);
  u.searchParams.set('mode', 'WEEK');
  u.searchParams.set('showTitle', '0');
  u.searchParams.set('showPrint', '0');
  u.searchParams.set('showCalendars', '0');
  u.searchParams.set('showTz', '0');
  u.searchParams.set('wkst', '1');
  return u.toString();
}

export default function CalendarView({ theme, active }: { theme: DashboardTheme; active: boolean }) {
  const [loadKey, setLoadKey] = useState(0);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    if (!active || Date.now() - loadedAt.current < STALE_MS) return;
    loadedAt.current = Date.now();
    setLoadKey((k) => k + 1);
  }, [active]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.panelBg,
        backdropFilter: theme.panelBackdropBlur,
        WebkitBackdropFilter: theme.panelBackdropBlur,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 22,
        boxShadow: theme.panelShadow,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: FONT_FAMILIES.body,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>Calendar</div>
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.muted }}>{CALENDAR_ID}</div>
      </div>
      <iframe
        key={loadKey}
        title="Google Calendar"
        src={embedUrl()}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          border: 0,
          borderRadius: 14,
          background: '#fff',
          // Google's embed is light-only; invert it to sit on the dark theme.
          filter: theme.isLight ? undefined : 'invert(0.92) hue-rotate(180deg)',
        }}
      />
    </div>
  );
}
