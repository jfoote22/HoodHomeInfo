'use client';

import { useMemo, useState } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';
import type { OurEvent } from '../../lib/hooks/useOurEvents';

// A native, legible calendar rendered from the household calendar data (/api/our-events,
// read server-side via the service account). Replaces the old Google Calendar iframe embed,
// which forced every kiosk viewer to sign in and rendered Google's own (illegible) UI.
// Revealed on hover over the Our Events panel (see useCalendarReveal in MarineDashboard).

type ViewMode = 'month' | 'week';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** The local days an event covers (all-day events can span several; Google's end date is exclusive). */
function eventDays(e: OurEvent): string[] {
  const start = new Date(e.start);
  if (e.allDay && e.end) {
    const days: string[] = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const end = new Date(e.end);
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur < last && days.length < 60) {
      days.push(localKey(cur));
      cur = addDays(cur, 1);
    }
    return days.length ? days : [localKey(start)];
  }
  return [localKey(start)];
}

function EventChip({ e, theme }: { e: OurEvent; theme: DashboardTheme }) {
  return (
    <div
      title={`${e.title}${e.allDay ? '' : ` · ${e.timeLabel}`}${e.location ? ` · ${e.location}` : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: `${theme.accentB}22`,
        borderRadius: 6,
        padding: '2px 6px',
        overflow: 'hidden',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.accentB, flexShrink: 0 }} />
      {!e.allDay && (
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, color: theme.muted, flexShrink: 0 }}>{e.timeLabel}</span>
      )}
      <span style={{ fontSize: 12, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
    </div>
  );
}

export default function CalendarView({ theme }: { theme: DashboardTheme; active?: boolean }) {
  const { ourEvents } = useDashboardData();
  const [view, setView] = useState<ViewMode>('month');
  const today = useMemo(() => new Date(), []);
  const todayKey = localKey(today);
  const mono = FONT_FAMILIES.mono;

  const byDay = useMemo(() => {
    const m = new Map<string, OurEvent[]>();
    for (const e of ourEvents.events) {
      for (const k of eventDays(e)) {
        const arr = m.get(k);
        if (arr) arr.push(e);
        else m.set(k, [e]);
      }
    }
    m.forEach((arr) => {
      arr.sort((a, b) => (a.allDay === b.allDay ? a.start.getTime() - b.start.getTime() : a.allDay ? -1 : 1));
    });
    return m;
  }, [ourEvents.events]);

  const weeks = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(monthEnd), 6);
    const total = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
    const out: Date[][] = [];
    for (let i = 0; i < total; i += 7) out.push(Array.from({ length: 7 }, (_, d) => addDays(gridStart, i + d)));
    return out;
  }, [today]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, d) => addDays(startOfWeek(today), d)), [today]);

  const headerLabel =
    view === 'month'
      ? today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : (() => {
          const ws = startOfWeek(today);
          const we = addDays(ws, 6);
          const sameMonth = ws.getMonth() === we.getMonth();
          const a = ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const b = we.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
          return `${a} – ${b}`;
        })();

  const cellBg = theme.isLight ? 'rgba(20,34,47,.03)' : 'rgba(255,255,255,.02)';

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
        gap: 16,
        fontFamily: FONT_FAMILIES.body,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header: eyebrow + label + month/week toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
          <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>Calendar</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: theme.text, whiteSpace: 'nowrap' }}>{headerLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {(['month', 'week'] as ViewMode[]).map((m) => {
            const on = view === m;
            return (
              <button
                key={m}
                onClick={() => setView(m)}
                style={{
                  fontFamily: mono,
                  fontSize: 12,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: on ? (theme.isLight ? '#fff' : '#0d1729') : theme.muted,
                  background: on ? theme.accentB : 'transparent',
                  border: `1px solid ${on ? theme.accentB : theme.panelBorder}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {view === 'month' ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.12em', color: theme.dim, textTransform: 'uppercase', textAlign: 'center' }}>{w}</div>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: `repeat(${weeks.length},1fr)`, gap: 8 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8, minHeight: 0 }}>
                {week.map((day) => {
                  const key = localKey(day);
                  const inMonth = day.getMonth() === today.getMonth();
                  const isToday = key === todayKey;
                  const evs = byDay.get(key) || [];
                  return (
                    <div
                      key={key}
                      style={{
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        background: isToday ? theme.dayPillBg : cellBg,
                        border: `1px solid ${isToday ? `${theme.accentB}88` : theme.panelBorder}`,
                        borderRadius: 10,
                        padding: '6px 7px',
                        opacity: inMonth ? 1 : 0.4,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: isToday ? theme.accentB : theme.muted, textAlign: 'right' }}>{day.getDate()}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                        {evs.slice(0, 3).map((e, i) => (
                          <EventChip key={`${e.id}-${i}`} e={e} theme={theme} />
                        ))}
                        {evs.length > 3 && <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim }}>+{evs.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {weekDays.map((day) => {
            const key = localKey(day);
            const isToday = key === todayKey;
            const evs = byDay.get(key) || [];
            return (
              <div
                key={key}
                style={{
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: cellBg,
                  border: `1px solid ${isToday ? `${theme.accentB}88` : theme.panelBorder}`,
                  borderRadius: 12,
                  padding: '10px 9px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.1em', color: isToday ? theme.accentB : theme.dim, textTransform: 'uppercase' }}>{WEEKDAYS[day.getDay()]}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? theme.accentB : theme.text }}>{day.getDate()}</div>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {evs.length ? (
                    evs.map((e, i) => (
                      <div
                        key={`${e.id}-${i}`}
                        title={e.title}
                        style={{ display: 'flex', flexDirection: 'column', gap: 2, background: `${theme.accentB}18`, borderLeft: `2px solid ${theme.accentB}`, borderRadius: 6, padding: '5px 7px' }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, lineHeight: 1.2 }}>{e.title}</span>
                        <span style={{ fontFamily: mono, fontSize: 10, color: theme.muted }}>
                          {e.allDay ? 'All day' : e.timeLabel}
                          {e.location ? ` · ${e.location}` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim, textAlign: 'center', marginTop: 8 }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ourEvents.calendar || 'calendar'}
        {ourEvents.loading ? ' · loading…' : ''}
      </div>
    </div>
  );
}
