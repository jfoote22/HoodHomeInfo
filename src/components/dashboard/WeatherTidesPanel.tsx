'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { WeatherIcon } from './weatherIcons';
import { useDashboardData } from './DashboardDataContext';
import MoonPhaseBadge from './MoonPhaseBadge';

export default function WeatherTidesPanel({ theme }: { theme: DashboardTheme }) {
  const { weather, tide, now } = useDashboardData();
  const hairline = theme.isLight ? 'rgba(20,34,47,.08)' : 'rgba(255,255,255,.06)';
  const viewW = tide?.viewW ?? 380;
  const viewH = tide?.viewH ?? 120;

  return (
    <div
      style={{
        flex: 1.05,
        background: theme.panelBg,
        backdropFilter: theme.panelBackdropBlur,
        WebkitBackdropFilter: theme.panelBackdropBlur,
        border: `1px solid ${theme.panelBorder}`,
        borderRadius: 22,
        boxShadow: theme.panelShadow,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        fontFamily: FONT_FAMILIES.body,
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12, letterSpacing: '.22em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Weather &amp; Tides
        </span>
        <span style={{ fontSize: 13, color: theme.muted }}>Union, WA</span>
      </div>

      {/* Today - the hero. Two rows: the big reading, then the words. NWS conditions can be
          long ("Slight Chance Light Rain"), so the text row is the one that flexes. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <WeatherIcon icon={weather?.icon || 'sun'} size={48} theme={theme} />
            <span style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 64, lineHeight: 0.85, color: theme.text }}>
              {weather ? Math.round(weather.tempF) : '--'}°
            </span>
          </div>
          <MoonPhaseBadge theme={theme} now={now} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div
            style={{
              fontSize: 16,
              color: theme.bodySecondary,
              fontWeight: 600,
              lineHeight: 1.2,
              minWidth: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={weather?.condition || undefined}
          >
            {weather?.condition || '—'}
            {weather?.isFallback && (
              <span title="OpenWeather could not be reached; these are placeholder values" style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, fontWeight: 400, letterSpacing: '.12em', color: theme.accentB, marginLeft: 8, textTransform: 'uppercase' }}>
                Estimated
              </span>
            )}
          </div>
          <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12.5, color: theme.muted, whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right', lineHeight: 1.45 }}>
            <div>
              H {weather ? Math.round(weather.hiF) : '--'}° · L {weather ? Math.round(weather.loF) : '--'}°
            </div>
            <div>
              Wind {weather?.windMph ?? '--'}mph {weather?.windDir ?? ''}
            </div>
          </div>
        </div>
      </div>

      {/* Today's hourly strip - upcoming 3-hour forecast points (no "now"; that's the hero above) */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(weather?.hourly || []).slice(0, 5).map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 12,
              padding: '9px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.muted }}>{h.label}</div>
            <div style={{ margin: '3px 0' }}>
              <WeatherIcon icon={h.icon} size={22} theme={theme} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{h.tempF}°</div>
          </div>
        ))}
      </div>

      {/* Next three days - quieter, secondary */}
      <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${hairline}`, paddingTop: 10 }}>
        {(weather?.daily || []).slice(0, 3).map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '4px 0', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, letterSpacing: '.1em', color: theme.muted, textTransform: 'uppercase' }}>
              {d.day}
            </span>
            <WeatherIcon icon={d.icon} size={20} theme={theme} />
            <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 12.5, color: theme.bodySecondary, whiteSpace: 'nowrap' }}>
              <span style={{ color: theme.text, fontWeight: 700 }}>{d.hiF}°</span>
              <span style={{ color: theme.dim }}>/{d.loF}°</span>
            </span>
          </div>
        ))}
        {!weather?.daily?.length && <div style={{ flex: 1, fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.dim, textAlign: 'center' }}>forecast loading…</div>}
      </div>

      {/* Tides - 3 days, today emphasized */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, letterSpacing: '.16em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Tide Graph
        </span>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.muted }}>next 3 days</span>
      </div>

      <svg viewBox={`0 0 ${viewW} ${viewH}`} style={{ width: '100%', height: 88, overflow: 'visible' }}>
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.accentA} stopOpacity={theme.isLight ? 0.3 : 0.38} />
            <stop offset="1" stopColor={theme.accentA} stopOpacity={0} />
          </linearGradient>
        </defs>
        {tide && (
          <>
            {/* Day bands + labels */}
            {tide.days.map((d) => (
              <g key={d.label}>
                {d.isToday && <rect x={d.x0} y={0} width={d.x1 - d.x0} height={viewH} fill={theme.accentA} opacity={theme.isLight ? 0.05 : 0.06} rx={6} />}
                {!d.isToday && <line x1={d.x0} y1={4} x2={d.x0} y2={viewH - 2} stroke={hairline} strokeWidth={1} />}
                <text
                  x={d.x0 + 6}
                  y={11}
                  fill={d.isToday ? theme.accentA : theme.dim}
                  fontFamily={FONT_FAMILIES.mono}
                  fontSize={9}
                  letterSpacing={1}
                  fontWeight={d.isToday ? 700 : 400}
                >
                  {d.label}
                </text>
              </g>
            ))}

            {/* Full 3-day curve (dim) then today's slice on top (bright) */}
            <path d={tide.linePath} fill="none" stroke={theme.accentA} strokeWidth={1.5} opacity={0.35} />
            <path d={tide.todayAreaPath} fill="url(#tideGrad)" />
            <path d={tide.todayLinePath} fill="none" stroke={theme.accentA} strokeWidth={2.5} />

            {/* Hi/lo dots: today's get labels, later days just small ticks */}
            {tide.days.flatMap((d) =>
              d.extremes.map((e, i) =>
                d.isToday ? (
                  <g key={`${d.label}-${i}`}>
                    <circle cx={e.x} cy={e.y} r={3.5} fill={e.type === 'High' ? theme.accentA : theme.muted} />
                    <text
                      x={e.x}
                      y={e.type === 'High' ? e.y - 7 : e.y + 12}
                      textAnchor="middle"
                      fill={e.type === 'High' ? theme.accentA : theme.muted}
                      fontFamily={FONT_FAMILIES.mono}
                      fontSize={8.5}
                    >
                      {e.timeLabel}
                    </text>
                  </g>
                ) : (
                  <circle key={`${d.label}-${i}`} cx={e.x} cy={e.y} r={2.2} fill={e.type === 'High' ? theme.accentA : theme.muted} opacity={0.6} />
                ),
              ),
            )}

            {tide.nowDot && (
              <>
                <circle cx={tide.nowDot.x} cy={tide.nowDot.y} r={5} fill={theme.accentB} />
                <circle cx={tide.nowDot.x} cy={tide.nowDot.y} r={5} fill="none" stroke={theme.accentB} strokeWidth={2}>
                  <animate attributeName="r" values="5;14" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </>
        )}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_FAMILIES.mono, fontSize: 13, color: theme.bodySecondary }}>
        <span>
          Now <span style={{ color: theme.accentB }}>{tide?.nowHeightLabel || '--'}</span>{' '}
          {tide?.trend ? (tide.trend === 'rising' ? 'rising' : 'falling') : ''}
        </span>
        <span style={{ color: theme.muted }}>{tide?.highLowSummary || ''}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FONT_FAMILIES.mono, fontSize: 13, color: theme.bodySecondary, marginBottom: 4 }}>
        <span style={{ fontSize: 11, letterSpacing: '.16em', color: theme.eyebrow, textTransform: 'uppercase' }}>Tide Direction</span>
        <span>
          <span style={{ color: theme.text, fontWeight: 600 }}>{tide?.trendRateLabel || '—'}</span>{' '}
          <span style={{ color: theme.muted }}>{tide?.trend ? (tide.trend === 'rising' ? 'flooding' : 'ebbing') : ''}</span>
        </span>
      </div>
    </div>
  );
}
