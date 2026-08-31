'use client';

import { useRef, useState } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';
import { CALENDAR_CHANGED_EVENT } from './CalendarView';
import {
  CALENDAR_VIEWS,
  DEFAULT_CALENDAR_VIEW,
  VIEW_LIST,
  calendarEmbedUrl,
  embedModeForView,
  resolveCalendarId,
  shouldShowAgendaEmbed,
} from '../../lib/calendarEmbed.mjs';
import type { OurEvent } from '../../lib/hooks/useOurEvents';
import { useAutoScroll } from '../../lib/hooks/useAutoScroll';

type DeleteState = 'confirm' | 'deleting' | 'error';

export default function OurEventsPanel({ theme }: { theme: DashboardTheme }) {
  const { ourEvents } = useDashboardData();
  const rows = ourEvents.events;
  const mono = FONT_FAMILIES.mono;
  const [pending, setPending] = useState<{ id: string; state: DeleteState } | null>(null);

  // The default view is our own rows - the same compact shape Local Events uses - however
  // the fetch went. Week and Month hand the panel to the Google embed instead, which is the
  // viewer's browser asking Google directly and so keeps working when no server-side read
  // path is configured; they are an explicit choice, never the fallback for an empty list
  // (see shouldShowAgendaEmbed). Same host and same src as the hover CalendarView.
  const [view, setView] = useState<string>(DEFAULT_CALENDAR_VIEW);
  const calendarId = resolveCalendarId(process.env.NEXT_PUBLIC_OUR_CALENDAR_ID, ourEvents.calendar);
  const embedMode = shouldShowAgendaEmbed({ loading: ourEvents.loading, view, calendarId }) ? embedModeForView(view) : null;
  const embedSrc = embedMode ? calendarEmbedUrl(calendarId, { mode: embedMode }) : null;

  // Same slow ping-pong scroll as Local Events when the list outgrows the panel; holds
  // still while the pointer is over it or a delete confirmation is open.
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = hoverRef.current || pending !== null;
  useAutoScroll(viewportRef, listRef, pausedRef);

  const remove = async (e: OurEvent) => {
    setPending({ id: e.id, state: 'deleting' });
    try {
      const res = await fetch('/api/calendar/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: e.id, source: e.source, title: e.title, start: e.start.toISOString() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setPending(null);
      ourEvents.refresh();
      window.dispatchEvent(new Event(CALENDAR_CHANGED_EVENT));
    } catch (err) {
      console.error('delete failed:', err);
      setPending({ id: e.id, state: 'error' });
    }
  };

  const smallBtn = (label: string, color: string, onClick: () => void, filled = false): JSX.Element => (
    <button
      onClick={onClick}
      style={{
        fontFamily: mono,
        fontSize: 11,
        letterSpacing: '.06em',
        color: filled ? (theme.isLight ? '#fff' : '#1a1206') : color,
        background: filled ? color : 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 8,
        padding: '3px 9px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.22em', color: theme.accentB, textTransform: 'uppercase' }}>Our Events</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {CALENDAR_VIEWS.map((v: string) => {
            const on = v === view;
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={on}
                style={{
                  fontFamily: mono,
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: on ? (theme.isLight ? '#fff' : '#1a1206') : theme.muted,
                  background: on ? theme.accentB : 'transparent',
                  border: `1px solid ${theme.accentB}${on ? '' : '44'}`,
                  borderRadius: 7,
                  padding: '2px 7px',
                  cursor: 'pointer',
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {embedSrc && (
        <iframe
          title="Our calendar"
          src={embedSrc}
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            border: 0,
            borderRadius: 14,
            background: '#fff',
            // Google's embed is light-only; invert it to sit on the dark theme (as CalendarView does).
            filter: theme.isLight ? undefined : 'invert(0.92) hue-rotate(180deg)',
          }}
        />
      )}

      {!embedSrc && (
      <div
        ref={viewportRef}
        style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}
        onMouseEnter={() => {
          hoverRef.current = true;
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
          pausedRef.current = pending !== null;
        }}
      >
        <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, transform: 'translate3d(0, 0, 0)', willChange: 'transform' }}>
        {rows.map((e) => {
          const isToday = e.dayLabel === 'TODAY';
          const p = pending?.id === e.id ? pending.state : null;
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
                {p === 'confirm' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: theme.text }}>Delete this event?</span>
                    {smallBtn('Delete', '#e0564b', () => remove(e), true)}
                    {smallBtn('Keep', theme.muted, () => setPending(null))}
                  </div>
                ) : p === 'deleting' ? (
                  <div style={{ fontFamily: mono, fontSize: 11, color: theme.muted }}>Deleting…</div>
                ) : p === 'error' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: '#e0564b' }}>Couldn’t delete.</span>
                    {smallBtn('Retry', '#e0564b', () => remove(e))}
                    {smallBtn('Dismiss', theme.muted, () => setPending(null))}
                  </div>
                ) : (
                  <div style={{ fontFamily: mono, fontSize: 11, color: theme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {e.dateLabel} · {e.timeLabel}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                )}
              </div>
              {ourEvents.writable && !p && (
                <button
                  onClick={() => setPending({ id: e.id, state: 'confirm' })}
                  title="Delete from the calendar"
                  aria-label={`Delete ${e.title}`}
                  style={{
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.14)' : 'rgba(255,255,255,.1)'}`,
                    background: 'transparent',
                    color: theme.muted,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.75,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
        {!ourEvents.loading && rows.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 11, color: theme.dim, lineHeight: 1.5, marginTop: 4 }}>
            {ourEvents.errors.length > 0 ? (
              <>
                Couldn&apos;t reach the calendar.
                <br />
                <span style={{ color: theme.accentB }}>{ourEvents.errors[0]}</span>
              </>
            ) : (
              <>
                Nothing on the calendar yet.
                <br />
                Tap a local event below, then <span style={{ color: theme.accentB }}>+ Add to calendar</span>
                <br />
                &mdash; or open <span style={{ color: theme.accentB }}>Week</span> / <span style={{ color: theme.accentB }}>Month</span> above.
              </>
            )}
          </div>
        )}
        {ourEvents.loading && <div style={{ fontFamily: mono, fontSize: 11, color: theme.dim }}>Loading calendar…</div>}
        </div>
      </div>
      )}

      <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {rows.length > 0 ? `${rows.length} upcoming · ` : ''}
        {view !== VIEW_LIST ? `${ourEvents.calendar || 'calendar'} · ` : ''}
        {/* "Not connected" is only honest when no source can read the calendar. Reading the
            public calendar - the same one the embed shows - is connected, just read-only. */}
        {ourEvents.writable
          ? 'Synced with Google Calendar'
          : ourEvents.sources.includes('ics')
            ? 'Via calendar feed'
            : ourEvents.sources.includes('public')
              ? 'Read-only · public Google Calendar'
              : ourEvents.sources.includes('hermes')
                ? 'Via Howie'
                : embedSrc
                  ? 'Read-only · Google Calendar'
                  : 'Calendar not connected'}
      </div>
    </div>
  );
}
