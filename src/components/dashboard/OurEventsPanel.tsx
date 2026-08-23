'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';

const MAX_ROWS = 3;

export default function OurEventsPanel({ theme }: { theme: DashboardTheme }) {
  const { ourEvents } = useDashboardData();
  const rows = ourEvents.events.slice(0, MAX_ROWS);
  const extra = Math.max(0, ourEvents.events.length - rows.length);
  const mono = FONT_FAMILIES.mono;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        background: theme.panelBg,
        backdropFilter: theme.panelBackdropBlur,
        WebkitBackdropFilter: theme.panelBackdropBlur,
        border: `1px solid ${theme.accentB}55`,
        borderRadius: 22,
        boxShadow: theme.panelShadow,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: FONT_FAMILIES.body,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: `linear-gradient(90deg, ${theme.accentB}, ${theme.accentB}00)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.22em', color: theme.accentB, textTransform: 'uppercase' }}>Our Events</span>
        <span style={{ fontSize: 12, color: theme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
          {ourEvents.calendar || 'calendar'}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((e) => {
          const isToday = e.dayLabel === 'TODAY';
          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: isToday ? (theme.isLight ? '#fff' : '#1a1206') : theme.accentB,
                  background: isToday ? theme.accentB : `${theme.accentB}1f`,
                  border: `1px solid ${theme.accentB}55`,
                  padding: '3px 8px',
                  borderRadius: 8,
                  flexShrink: 0,
                  minWidth: 46,
                  textAlign: 'center',
                }}
              >
                {e.dayLabel}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: theme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.dateLabel} · {e.timeLabel}
                  {e.location ? ` · ${e.location}` : ''}
                </div>
              </div>
            </div>
          );
        })}
        {!ourEvents.loading && rows.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 11, color: theme.dim, lineHeight: 1.5, marginTop: 4 }}>
            Nothing on the calendar yet.
            <br />
            Tap a local event below, then <span style={{ color: theme.accentB }}>+ Add to calendar</span>.
          </div>
        )}
        {ourEvents.loading && <div style={{ fontFamily: mono, fontSize: 11, color: theme.dim }}>Loading calendar…</div>}
      </div>

      <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {extra > 0 ? `+${extra} more on the calendar view · ` : ''}
        {ourEvents.writable ? 'Synced with Google Calendar' : ourEvents.sources.includes('hermes') ? 'Via Hermes' : ourEvents.sources.includes('ics') ? 'Via calendar feed' : 'Calendar not connected'}
      </div>
    </div>
  );
}
