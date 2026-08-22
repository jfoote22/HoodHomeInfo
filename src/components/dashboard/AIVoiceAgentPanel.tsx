'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData, buildBriefing } from './DashboardDataContext';

export default function AIVoiceAgentPanel({ theme }: { theme: DashboardTheme }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const data = useDashboardData();

  // Live conditions summary: shown while idle and sent with every question so the
  // model answers from real weather / NOAA tide / sighting data instead of guessing.
  const briefing = useMemo(() => buildBriefing(data), [data]);
  const briefingRef = useRef(briefing);
  briefingRef.current = briefing;

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/grok/chat',
    initialMessages: [],
    body: { context: briefing },
  });

  // After an answer has been on screen for a while, drift back to the live briefing so
  // the wall display never shows a stale one-off answer all day.
  const [showAnswer, setShowAnswer] = useState(false);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastAssistantId = lastAssistant?.id;
  useEffect(() => {
    if (!lastAssistantId) return;
    setShowAnswer(true);
    const t = setTimeout(() => setShowAnswer(false), 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [lastAssistantId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const showingLive = !(showAnswer && lastAssistant);
  const responseText = showingLive
    ? briefing || 'Gathering live conditions for Union, WA…'
    : lastAssistant!.content;
  const cardLabel = showingLive ? 'Live briefing' : 'Last response';
  const statusLabel = isLoading ? 'Thinking' : error ? 'Offline' : 'Idle';

  return (
    <div
      style={{
        background: theme.panelBg,
        backdropFilter: theme.panelBackdropBlur,
        WebkitBackdropFilter: theme.panelBackdropBlur,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 22,
        boxShadow: theme.panelShadow,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: FONT_FAMILIES.body,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          AI Voice Agent
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            color: theme.muted,
            background: theme.isLight ? 'rgba(20,34,47,.05)' : 'rgba(255,255,255,.04)',
            border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.1)' : 'rgba(255,255,255,.07)'}`,
            padding: '5px 11px',
            borderRadius: 999,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isLoading ? theme.accentA : error ? theme.accentB : theme.muted,
              animation: isLoading ? 'dashboardBreathe 1.2s ease-in-out infinite' : undefined,
            }}
          />
          {statusLabel}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, minHeight: 0 }}>
        <div style={{ position: 'relative', width: 200, height: 200, display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 45%, ${theme.accentA}80, ${theme.accentA}00 70%)`,
              filter: 'blur(8px)',
              animation: `dashboardBreathe ${isLoading ? '1.4s' : '4.5s'} ease-in-out infinite`,
            }}
          />
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: '50%',
              background: `conic-gradient(from 130deg, ${theme.accentA}, #0ea5e9, ${theme.accentB}, ${theme.accentA})`,
              opacity: 0.9,
              filter: 'blur(1px)',
              animation: `dashboardBreathe ${isLoading ? '1.4s' : '4.5s'} ease-in-out infinite`,
            }}
          />
          <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: theme.isLight ? '#ffffff' : theme.panelBg }} />
          <div style={{ position: 'absolute', width: 166, height: 166, borderRadius: '50%', border: `1px solid ${theme.accentA}4d` }} />
        </div>
        <div style={{ textAlign: 'center', fontFamily: FONT_FAMILIES.mono, fontSize: 13, color: theme.muted, letterSpacing: '.06em' }}>
          Ambient · say <span style={{ color: theme.accentA }}>&ldquo;Hey Sound&rdquo;</span>
        </div>
      </div>

      <div
        style={{
          background: theme.isLight ? `${theme.accentA}14` : `${theme.accentA}0f`,
          border: `1px solid ${theme.accentA}38`,
          borderRadius: 16,
          padding: '16px 18px',
          maxHeight: 340,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, letterSpacing: '.18em', color: theme.accentA, textTransform: 'uppercase', marginBottom: 8 }}>
          {cardLabel}
        </div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: theme.bodySecondary, whiteSpace: 'pre-line' }}>{responseText}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: theme.commandBarBg,
          border: `1px solid ${theme.commandBarBorder}`,
          borderRadius: 999,
          padding: '11px 14px',
          boxShadow: theme.commandBarShadow,
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.accentA}, #0ea5e9)`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 14px ${theme.accentA}66`,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={theme.isLight ? '#fff' : '#04121f'} strokeWidth={2.2} strokeLinecap="round">
            <rect x={9} y={2} width={6} height={12} rx={3} fill={theme.isLight ? '#fff' : '#04121f'} stroke="none" />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about tides, sightings, events…"
          style={{
            flex: 1,
            fontSize: 15,
            color: theme.text,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontFamily: FONT_FAMILIES.mono,
            fontSize: 12,
            color: theme.dim,
            border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.15)' : 'rgba(255,255,255,.12)'}`,
            borderRadius: 6,
            padding: '3px 7px',
          }}
        >
          ⌘K
        </span>
      </form>

      <div style={{ textAlign: 'center', fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.dim, letterSpacing: '.04em' }}>
        Press ● on remote or say the wake word
      </div>
    </div>
  );
}
