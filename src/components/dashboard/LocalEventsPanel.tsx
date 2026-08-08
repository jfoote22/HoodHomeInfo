'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardEvents } from '../../lib/hooks/useDashboardEvents';

export default function LocalEventsPanel({ theme }: { theme: DashboardTheme }) {
  const { events, isPlaceholder } = useDashboardEvents();

  return (
    <div
      style={{
        flex: 0.95,
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
        minHeight: 0,
        fontFamily: FONT_FAMILIES.body,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Local Events
        </span>
        <span style={{ fontSize: 13, color: theme.muted }}>Hood Canal area</span>
      </div>

      {events.map((event, i) => (
        <div key={event.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 80,
                height: 60,
                borderRadius: 12,
                background: `repeating-linear-gradient(135deg, ${theme.eventStripeA}, ${theme.eventStripeA} 7px, ${theme.eventStripeB} 7px, ${theme.eventStripeB} 14px)`,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.06)' : 'rgba(255,255,255,.06)'}`,
              }}
            >
              <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 9, color: theme.dim }}>photo</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: theme.text }}>{event.title}</div>
              <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.muted, marginTop: 3 }}>{event.dateLabel}</div>
            </div>
            <span
              style={{
                fontFamily: FONT_FAMILIES.mono,
                fontSize: 12,
                color: theme.dayPillText,
                background: theme.dayPillBg,
                padding: '5px 10px',
                borderRadius: 8,
              }}
            >
              {event.dayLabel}
            </span>
          </div>
          {i < events.length - 1 && <div style={{ height: 1, background: theme.isLight ? 'rgba(20,34,47,.08)' : 'rgba(255,255,255,.06)', marginTop: 14 }} />}
        </div>
      ))}

      <div style={{ marginTop: 'auto', fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.dim, letterSpacing: '.04em' }}>
        {isPlaceholder ? 'Example events · connect an events API key to go live' : 'Auto-updating · refreshed hourly'}
      </div>
    </div>
  );
}
