'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { WeatherIcon } from './weatherIcons';
import { useDashboardWeather } from '../../lib/hooks/useDashboardWeather';
import { useTideCurve } from '../../lib/hooks/useTideCurve';

export default function WeatherTidesPanel({ theme }: { theme: DashboardTheme }) {
  const { weather } = useDashboardWeather();
  const { data: tide } = useTideCurve();

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
        gap: 18,
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <WeatherIcon icon={weather?.icon || 'sun'} size={52} theme={theme} />
          <span style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 74, lineHeight: 0.8, color: theme.text }}>
            {weather ? Math.round(weather.tempF) : '--'}°
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 17, color: theme.bodySecondary, fontWeight: 600 }}>{weather?.condition || '—'}</div>
          <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, color: theme.muted }}>
            H {weather ? Math.round(weather.hiF) : '--'}° · L {weather ? Math.round(weather.loF) : '--'}°
          </div>
          <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, color: theme.muted, marginTop: 3 }}>
            Wind {weather?.windMph ?? '--'}mph {weather?.windDir ?? ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(weather?.hourly || []).slice(0, 5).map((h, i) => {
          const isNow = h.label === 'NOW';
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: isNow ? `${theme.accentA}14` : 'transparent',
                border: isNow ? `1px solid ${theme.accentA}29` : '1px solid transparent',
                borderRadius: 12,
                padding: '11px 0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: isNow ? theme.accentA : theme.muted }}>{h.label}</div>
              <div style={{ margin: '4px 0' }}>
                <WeatherIcon icon={h.icon} size={22} theme={theme} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{h.tempF}°</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, letterSpacing: '.16em', color: theme.eyebrow, textTransform: 'uppercase' }}>
          Tide Graph
        </span>
        <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: theme.muted }}>next 12h</span>
      </div>

      <svg viewBox="0 0 380 110" style={{ width: '100%', height: 92 }}>
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={theme.accentA} stopOpacity={theme.isLight ? 0.28 : 0.35} />
            <stop offset="1" stopColor={theme.accentA} stopOpacity={0} />
          </linearGradient>
        </defs>
        {tide && (
          <>
            <path d={tide.areaPath} fill="url(#tideGrad)" />
            <path d={tide.linePath} fill="none" stroke={theme.accentA} strokeWidth={2.5} />
            {tide.highMarker && (
              <>
                <circle cx={tide.highMarker.x} cy={tide.highMarker.y} r={4} fill={theme.accentA} />
                <text x={tide.highMarker.x} y={tide.highMarker.y - 9} textAnchor="middle" fill={theme.accentA} fontFamily={FONT_FAMILIES.mono} fontSize={10}>
                  {tide.highMarker.label}
                </text>
              </>
            )}
            {tide.lowMarker && (
              <>
                <circle cx={tide.lowMarker.x} cy={tide.lowMarker.y} r={4} fill={theme.muted} />
                <text x={tide.lowMarker.x} y={tide.lowMarker.y + 14} textAnchor="middle" fill={theme.muted} fontFamily={FONT_FAMILIES.mono} fontSize={10}>
                  {tide.lowMarker.label}
                </text>
              </>
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
    </div>
  );
}
