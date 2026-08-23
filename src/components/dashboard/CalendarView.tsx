'use client';

import { useMemo } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';
import { dayKey, matchesOurEvent } from '../../lib/hooks/useOurEvents';

// Full calendar view that alternates with the live panels: a 3-week grid starting with the
// current week. Each day lists our calendar events (amber, first) and local events (blue).

const TZ = 'America/Los_Angeles';
const MAX_CHIPS = 7;

function weeksToShow(now: Date): number {
  const wd = new Date(`${now.toLocaleDateString('en-CA', { timeZone: TZ })}T12:00:00Z`).getUTCDay();
  return wd >= 4 ? 4 : 3; // Thu/Fri/Sat: add a week so the view isn't mostly history
}

interface Chip {
  id: string;
  title: string;
  time: string;
  kind: 'ours' | 'local' | 'going';
  start: Date;
}

function startOfWeekPacific(now: Date): Date {
  // Sunday 00:00 in Pacific time, expressed as a UTC instant.
  const ymd = now.toLocaleDateString('en-CA', { timeZone: TZ });
  const weekday = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // stable weekday for that date
  const guess = new Date(`${ymd}T00:00:00Z`);
  guess.setUTCDate(guess.getUTCDate() - weekday);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(guess);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-8';
  const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const off = m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0)) : -480;
  return new Date(guess.getTime() - off * 60000);
}

export default function CalendarView({ theme }: { theme: DashboardTheme }) {
  const { events, ourEvents, now } = useDashboardData();
  const mono = FONT_FAMILIES.mono;

  const WEEKS = weeksToShow(now);
  const { days, rangeLabel } = useMemo(() => {
    const start = startOfWeekPacific(now);
    const list: { key: string; date: Date; chips: Chip[]; isToday: boolean; isPast: boolean }[] = [];
    const todayKey = dayKey(now);
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(start.getTime() + i * 86400000 + 12 * 3600000); // noon-ish to dodge DST edges
      const key = dayKey(d);
      list.push({ key, date: d, chips: [], isToday: key === todayKey, isPast: key < todayKey });
    }
    const byKey = new Map(list.map((d) => [d.key, d]));
    const fmtTime = (d: Date, allDay: boolean) => (allDay ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(' ', '').toLowerCase().replace(':00', ''));

    for (const o of ourEvents.events) {
      const cell = byKey.get(dayKey(o.start));
      if (cell) cell.chips.push({ id: `o-${o.id}`, title: o.title, time: fmtTime(o.start, o.allDay), kind: 'ours', start: o.start });
    }
    for (const e of events.events) {
      const cell = byKey.get(dayKey(e.start));
      if (!cell) continue;
      const going = matchesOurEvent(e.title, e.start, ourEvents.events);
      if (going) continue; // already shown as "ours" on that day
      cell.chips.push({ id: `l-${e.id}`, title: e.title, time: fmtTime(e.start, false), kind: 'local', start: e.start });
    }
    list.forEach((c) => c.chips.sort((a, b) => (a.kind === 'ours' ? 0 : 1) - (b.kind === 'ours' ? 0 : 1) || a.start.getTime() - b.start.getTime()));
    const first = list[0].date;
    const last = list[list.length - 1].date;
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
    return { days: list, rangeLabel: `${fmt(first)} – ${fmt(last)}` };
  }, [events.events, ourEvents.events, now, WEEKS]);

  const hairline = theme.isLight ? 'rgba(20,34,47,.1)' : 'rgba(255,255,255,.08)';
  const monthOf = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', timeZone: TZ });

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
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>Calendar · {WEEKS} weeks</div>
          <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 40, lineHeight: 1, color: theme.text, letterSpacing: 0.5 }}>{rangeLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontFamily: mono, fontSize: 12, color: theme.muted }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: theme.accentB }} /> Our events
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: theme.accentA, opacity: 0.8 }} /> Local events
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <div key={d} style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.16em', color: theme.dim, textAlign: 'center', paddingBottom: 2 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${WEEKS}, 1fr)`, gap: 6 }}>
        {days.map((d) => {
          const dayNum = d.date.toLocaleDateString('en-US', { day: 'numeric', timeZone: TZ });
          const showMonth = dayNum === '1' || d === days[0];
          return (
            <div
              key={d.key}
              style={{
                minHeight: 0,
                borderRadius: 12,
                border: `1px solid ${d.isToday ? theme.accentA : hairline}`,
                background: d.isToday ? `${theme.accentA}12` : theme.isLight ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.025)',
                opacity: d.isPast ? 0.45 : 1,
                padding: '7px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 18, color: d.isToday ? theme.accentA : theme.text }}>
                  {showMonth ? `${monthOf(d.date)} ` : ''}
                  {dayNum}
                </span>
                {d.isToday && <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '.16em', color: theme.accentA }}>TODAY</span>}
              </div>
              {d.chips.slice(0, MAX_CHIPS).map((c) => {
                const ours = c.kind === 'ours';
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: ours ? `${theme.accentB}26` : `${theme.accentA}14`,
                      borderLeft: `3px solid ${ours ? theme.accentB : theme.accentA}`,
                      borderRadius: 6,
                      padding: '3px 6px',
                      minWidth: 0,
                    }}
                  >
                    {c.time && <span style={{ fontFamily: mono, fontSize: 10, color: ours ? theme.accentB : theme.muted, flexShrink: 0 }}>{c.time}</span>}
                    <span style={{ fontSize: 12, fontWeight: ours ? 700 : 500, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                  </div>
                );
              })}
              {d.chips.length > MAX_CHIPS && <div style={{ fontFamily: mono, fontSize: 10, color: theme.dim }}>+{d.chips.length - MAX_CHIPS} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
