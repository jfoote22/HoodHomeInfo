'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { calendarEmbedUrl, resolveCalendarId } from '../../lib/calendarEmbed.mjs';

// Google Calendar's own embed UI, shown over the live panels while someone is using it
// (see useCalendarReveal in MarineDashboard). The embed is read-only and only shows a
// calendar the viewer can see — for the kiosk that means the calendar must be public
// (Calendar settings → Access permissions → "Make available to public").

const CALENDAR_ID = resolveCalendarId(process.env.NEXT_PUBLIC_OUR_CALENDAR_ID);
// Google's embed never refreshes itself; reload it when it's re-revealed after this long.
const STALE_MS = 5 * 60 * 1000;
/** Dispatch on window after changing the calendar through the API so the embed reloads. */
export const CALENDAR_CHANGED_EVENT = 'hh:calendar-changed';

export default function CalendarView({ theme, active }: { theme: DashboardTheme; active: boolean }) {
  const [loadKey, setLoadKey] = useState(0);
  const loadedAt = useRef(Date.now());

  useEffect(() => {
    if (!active || Date.now() - loadedAt.current < STALE_MS) return;
    loadedAt.current = Date.now();
    setLoadKey((k) => k + 1);
  }, [active]);

  // The Our Events panel announces edits it made through the API (see CALENDAR_CHANGED_EVENT).
  useEffect(() => {
    const onChanged = () => {
      loadedAt.current = Date.now();
      setLoadKey((k) => k + 1);
    };
    window.addEventListener(CALENDAR_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CALENDAR_CHANGED_EVENT, onChanged);
  }, []);

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
        src={calendarEmbedUrl(CALENDAR_ID, { mode: 'WEEK' }) ?? undefined}
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
