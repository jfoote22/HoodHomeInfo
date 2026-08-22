'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';

const MAX_ROWS = 4;

const SOURCE_LABEL: Record<string, string> = {
  'north-mason-chamber': 'North Mason Chamber',
  'explore-hood-canal': 'Explore Hood Canal',
  hermes: 'Hermes',
};

function minutesAgo(from: Date | null, now: Date): string {
  if (!from) return '';
  const m = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export default function LocalEventsPanel({ theme }: { theme: DashboardTheme }) {
  const { events: eventsState, now } = useDashboardData();
  const { events, isPlaceholder, fetchedAt, sources } = eventsState;
  const rows = events.slice(0, MAX_ROWS);

  const footer = isPlaceholder
    ? 'Example events · live feeds unavailable right now'
    : `Auto-updating · ${sources.map((s) => SOURCE_LABEL[s] || s).join(' + ')} · pulled ${minutesAgo(fetchedAt, now)}`;

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
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Local Events
        </span>
        <span style={{ fontSize: 13, color: theme.muted }}>Hood Canal area</span>
      </div>

      {rows.map((event, i) => {
        const isToday = event.dayLabel === 'TODAY';
        return (
          <div key={event.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 80,
                  height: 60,
                  borderRadius: 12,
                  flexShrink: 0,
                  overflow: 'hidden',
                  background: event.imageUrl
                    ? theme.eventStripeA
                    : `repeating-linear-gradient(135deg, ${theme.eventStripeA}, ${theme.eventStripeA} 7px, ${theme.eventStripeB} 7px, ${theme.eventStripeB} 14px)`,
                  display: 'grid',
                  placeItems: 'center',
                  border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.06)' : 'rgba(255,255,255,.06)'}`,
                }}
              >
                {event.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                ) : (
                  <span style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 22, color: theme.dim, letterSpacing: 1 }}>
                    {event.start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/Los_Angeles' })}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</div>
                <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {event.dateLabel}
                </div>
              </div>
              <span
                style={{
                  fontFamily: FONT_FAMILIES.mono,
                  fontSize: 12,
                  color: isToday ? (theme.isLight ? '#fff' : '#04121f') : theme.dayPillText,
                  background: isToday ? theme.accentA : theme.dayPillBg,
                  padding: '5px 10px',
                  borderRadius: 8,
                  flexShrink: 0,
                }}
              >
                {event.dayLabel}
              </span>
            </div>
            {i < rows.length - 1 && <div style={{ height: 1, background: theme.isLight ? 'rgba(20,34,47,.08)' : 'rgba(255,255,255,.06)', marginTop: 14 }} />}
          </div>
        );
      })}

      <div style={{ marginTop: 'auto', fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.dim, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {footer}
      </div>
    </div>
  );
}
