'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';
import type { DashboardEvent } from '../../lib/hooks/useDashboardEvents';
import { matchesOurEvent } from '../../lib/hooks/useOurEvents';

const SCROLL_PX_PER_SEC = 14; // gentle, readable from the couch
const HOLD_MS = 4500; // pause at top/bottom before reversing
const INTERACTION_PAUSE_MS = 45000; // stop auto-scroll while someone is picking an event
const MAX_LIST_ROWS = 30; // the calendar view shows the rest

const SOURCE_LABEL: Record<string, string> = {
  'north-mason-chamber': 'North Mason Chamber',
  'explore-hood-canal': 'Explore Hood Canal',
  hermes: 'Howie',
};

function minutesAgo(from: Date | null, now: Date): string {
  if (!from) return '';
  const m = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)}h ago`;
}

/** Title that glides sideways when it's wider than its box so the whole thing can be read. */
function MarqueeText({ text, style }: { text: string; style: React.CSSProperties }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      const span = textRef.current;
      if (!box || !span) return;
      const overflow = span.scrollWidth - box.clientWidth;
      setShift(overflow > 4 ? -overflow - 6 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [text]);

  const duration = Math.max(10, Math.min(26, Math.abs(shift) / 18 + 9));
  return (
    <div ref={boxRef} style={{ ...style, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <span
        ref={textRef}
        className={shift ? 'hh-marquee' : undefined}
        style={shift ? ({ '--hh-shift': `${shift}px`, '--hh-duration': `${duration}s` } as React.CSSProperties) : { display: 'inline-block', whiteSpace: 'nowrap' }}
      >
        {text}
      </span>
    </div>
  );
}

type AddState = 'idle' | 'adding' | 'added' | 'error' | 'link';

function EventRow({
  event,
  theme,
  isLast,
  going,
  selected,
  onSelect,
  onAdd,
  addState,
  writable,
}: {
  event: DashboardEvent;
  theme: DashboardTheme;
  isLast: boolean;
  going: boolean;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
  addState: AddState;
  writable: boolean;
}) {
  const isToday = event.dayLabel === 'TODAY';
  const highlight = going || selected;
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          borderRadius: 14,
          padding: '6px 8px',
          margin: '0 -8px',
          background: selected ? `${theme.accentA}1a` : going ? `${theme.accentB}14` : 'transparent',
          border: `1px solid ${selected ? `${theme.accentA}66` : going ? `${theme.accentB}55` : 'transparent'}`,
          transition: 'background .25s, border-color .25s',
          outline: 'none',
        }}
      >
        <div
          style={{
            width: 80,
            height: 60,
            borderRadius: 12,
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
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
            <span style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 22, color: highlight ? theme.text : theme.dim, letterSpacing: 1 }}>
              {event.start.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'America/Los_Angeles' })}
            </span>
          )}
          {going && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                fontFamily: FONT_FAMILIES.mono,
                fontSize: 9,
                letterSpacing: '.16em',
                textAlign: 'center',
                padding: '2px 0',
                background: theme.accentB,
                color: theme.isLight ? '#fff' : '#1a1206',
                fontWeight: 700,
              }}
            >
              GOING
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MarqueeText text={event.title} style={{ fontSize: 17, fontWeight: 600, color: theme.text }} />
          <MarqueeText text={event.dateLabel} style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.muted, marginTop: 3 }} />
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

      {/* Action row appears when selected */}
      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 2px 98px' }}>
          {going ? (
            <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.accentB }}>✓ On our calendar</span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (addState === 'idle' || addState === 'error' || addState === 'link') onAdd();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: FONT_FAMILIES.body,
                fontSize: 14,
                fontWeight: 600,
                color: theme.isLight ? '#fff' : '#04121f',
                background: addState === 'added' ? theme.accentB : `linear-gradient(135deg, ${theme.accentA}, #0ea5e9)`,
                border: 'none',
                borderRadius: 999,
                padding: '8px 14px',
                cursor: 'pointer',
                boxShadow: `0 4px 14px ${theme.accentA}55`,
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <rect x={3} y={5} width={18} height={16} rx={3} />
                <path d="M3 10h18M8 3v4M16 3v4" />
                {addState !== 'added' && <path d="M12 13v5M9.5 15.5h5" />}
                {addState === 'added' && <path d="M8.5 15.5l2.3 2.3 4.7-4.8" />}
              </svg>
              {addState === 'adding' ? 'Adding…' : addState === 'added' ? 'Added to calendar' : addState === 'error' ? 'Failed — retry' : addState === 'link' ? 'Opened Google Calendar' : writable ? 'Add to calendar' : 'Add to calendar (opens Google)'}
            </button>
          )}
          <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, color: theme.dim }}>tap again to close</span>
        </div>
      )}
      {!isLast && <div style={{ height: 1, background: theme.isLight ? 'rgba(20,34,47,.08)' : 'rgba(255,255,255,.06)', margin: '12px 0' }} />}
    </div>
  );
}

export default function LocalEventsPanel({ theme }: { theme: DashboardTheme }) {
  const { events: eventsState, ourEvents, now } = useDashboardData();
  const { isPlaceholder, fetchedAt, sources } = eventsState;
  const events = eventsState.events.slice(0, MAX_LIST_ROWS);

  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addStates, setAddStates] = useState<Record<string, AddState>>({});
  const pauseUntilRef = useRef(0);
  const hoverRef = useRef(false);

  const pauseScroll = () => {
    pauseUntilRef.current = Date.now() + INTERACTION_PAUSE_MS;
  };

  // Slow ping-pong auto-scroll when the list is taller than the viewport. Pauses while the
  // pointer is over the list or for a while after someone taps an event.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!viewport || !list) return;
    let raf = 0;
    let last = performance.now();
    let dir = 1;
    let holdUntil = last + HOLD_MS;
    let pos = 0;

    const tick = (t: number) => {
      const max = Math.max(0, list.scrollHeight - viewport.clientHeight);
      setCanScroll(max > 2);
      const paused = hoverRef.current || Date.now() < pauseUntilRef.current;
      if (max <= 2) {
        pos = 0;
        setOffset(0);
      } else if (!paused && t >= holdUntil) {
        const dt = (t - last) / 1000;
        pos = Math.min(max, Math.max(0, pos + dir * SCROLL_PX_PER_SEC * dt));
        if (pos >= max) {
          dir = -1;
          holdUntil = t + HOLD_MS;
        } else if (pos <= 0) {
          dir = 1;
          holdUntil = t + HOLD_MS;
        }
        setOffset(pos);
      }
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [events.length]);

  const select = (id: string) => {
    pauseScroll();
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const addToCalendar = async (event: DashboardEvent) => {
    pauseScroll();
    setAddStates((s) => ({ ...s, [event.id]: 'adding' }));
    try {
      const res = await fetch('/api/calendar/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          start: event.start.toISOString(),
          end: null,
          allDay: false,
          location: event.venue,
          description: event.dateLabel,
          url: event.url,
        }),
      });
      const json = await res.json();
      if (json.ok && json.added) {
        setAddStates((s) => ({ ...s, [event.id]: 'added' }));
        ourEvents.refresh();
        setTimeout(() => setSelectedId((cur) => (cur === event.id ? null : cur)), 2500);
      } else if (json.fallbackUrl) {
        window.open(json.fallbackUrl, '_blank', 'noopener');
        setAddStates((s) => ({ ...s, [event.id]: 'link' }));
      } else {
        throw new Error(json.error || 'add failed');
      }
    } catch (err) {
      console.error('add to calendar failed:', err);
      setAddStates((s) => ({ ...s, [event.id]: 'error' }));
    }
  };

  const footer = isPlaceholder
    ? 'Example events · live feeds unavailable right now'
    : `Auto-updating · ${events.length} upcoming · ${sources.map((s) => SOURCE_LABEL[s] || s).join(' + ')} · pulled ${minutesAgo(fetchedAt, now)}`;
  const fadeColor = theme.isLight ? '255,255,255' : '13,23,41';

  return (
    <div
      style={{
        flex: 3,
        minHeight: 0,
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
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Local Events
        </span>
        <span style={{ fontSize: 13, color: theme.muted }}>
          Hood Canal area
          {canScroll && <span style={{ color: theme.dim }}> · {events.length}</span>}
        </span>
      </div>

      <div
        ref={viewportRef}
        style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}
        onMouseEnter={() => {
          hoverRef.current = true;
        }}
        onMouseLeave={() => {
          hoverRef.current = false;
        }}
      >
        <div ref={listRef} style={{ transform: `translateY(${-offset}px)`, willChange: 'transform' }}>
          {events.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              theme={theme}
              isLast={i === events.length - 1}
              going={Boolean(matchesOurEvent(event.title, event.start, ourEvents.events)) || addStates[event.id] === 'added'}
              selected={selectedId === event.id}
              onSelect={() => select(event.id)}
              onAdd={() => addToCalendar(event)}
              addState={addStates[event.id] || 'idle'}
              writable={ourEvents.writable}
            />
          ))}
        </div>
        {canScroll && (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, background: `linear-gradient(rgba(${fadeColor},${offset > 2 ? 0.95 : 0}), rgba(${fadeColor},0))`, pointerEvents: 'none', transition: 'opacity .4s' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, background: `linear-gradient(rgba(${fadeColor},0), rgba(${fadeColor},0.95))`, pointerEvents: 'none' }} />
          </>
        )}
      </div>

      <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.dim, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {footer}
      </div>
    </div>
  );
}
