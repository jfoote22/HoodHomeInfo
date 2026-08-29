'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useStocks, HermesQuote } from '../../lib/hooks/useStocks';

// Market ticker across the bottom of the wall display. Quotes come from Hermes' "Stock Watch"
// section; the scroll is a pure CSS marquee (see .hh-ticker-track in globals.css) so it never
// re-renders React on the Pi.

export const TICKER_HEIGHT = 44;

const UP = '#4ade80';
const DOWN = '#f87171';

function label(q: HermesQuote): string {
  // Indexes (^GSPC) read better by name than by symbol.
  return q.symbol.startsWith('^') ? q.name : q.symbol;
}

function price(q: HermesQuote): string {
  return q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Quote({ q, theme }: { q: HermesQuote; theme: DashboardTheme }) {
  const dir = q.changePct === null ? 0 : q.changePct > 0 ? 1 : q.changePct < 0 ? -1 : 0;
  const color = dir > 0 ? UP : dir < 0 ? DOWN : theme.muted;
  const arrow = dir > 0 ? '▲' : dir < 0 ? '▼' : '·';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 14, fontWeight: 700, letterSpacing: '.08em', color: theme.text }}>{label(q)}</span>
      <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 14, color: theme.bodySecondary }}>{price(q)}</span>
      <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, color }}>
        {arrow} {q.change !== null ? `${q.change > 0 ? '+' : ''}${q.change.toFixed(2)}` : ''}
        {q.changePct !== null ? ` (${q.changePct > 0 ? '+' : ''}${q.changePct.toFixed(2)}%)` : ''}
      </span>
    </span>
  );
}

export default function StockTicker({ theme }: { theme: DashboardTheme }) {
  const { quotes, loading } = useStocks();
  const hairline = theme.isLight ? 'rgba(20,34,47,.1)' : 'rgba(255,255,255,.08)';

  // Two copies of the list, translated -50%: a seamless loop. Pace it by content length so
  // the speed stays the same whether Hermes sends 4 quotes or 12.
  const duration = Math.max(45, quotes.length * 9);

  return (
    <div
      style={{
        height: TICKER_HEIGHT,
        background: theme.panelBg,
        backdropFilter: theme.panelBackdropBlur,
        WebkitBackdropFilter: theme.panelBackdropBlur,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 16,
        boxShadow: theme.panelShadow,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 16px',
        overflow: 'hidden',
        fontFamily: FONT_FAMILIES.body,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          fontFamily: FONT_FAMILIES.mono,
          fontSize: 11,
          letterSpacing: '.22em',
          color: theme.eyebrow,
          textTransform: 'uppercase',
          flexShrink: 0,
          borderRight: `1px solid ${hairline}`,
          paddingRight: 14,
        }}
      >
        Market
      </span>

      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {quotes.length > 0 ? (
          <div className="hh-ticker-track" style={{ display: 'inline-flex', alignItems: 'baseline', willChange: 'transform', animationDuration: `${duration}s` }}>
            {[...quotes, ...quotes].map((q, i) => (
              <span key={`${q.symbol}-${i}`} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                <Quote q={q} theme={theme} />
                <span style={{ color: theme.dim, padding: '0 20px' }}>·</span>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, color: theme.dim }}>
            {loading ? 'Loading market prices…' : 'Market prices unavailable'}
          </span>
        )}
      </div>
    </div>
  );
}
