'use client';

import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useSportsTeam, GameSummary, NewsItem } from '../../lib/hooks/useSportsTeam';

// Brand palettes (official-ish). ESPN also sends color/altColor but these read better on the TV.
const BRAND = {
  mariners: { primary: '#0C2C56', accent: '#005C5C', highlight: '#C4CED4', glow: '#00a3a3', label: 'MLB · AL WEST' },
  seahawks: { primary: '#002244', accent: '#69BE28', highlight: '#A5ACAF', glow: '#69BE28', label: 'NFL · NFC WEST' },
} as const;

function TeamGlyph({ team, size }: { team: 'mariners' | 'seahawks'; size: number }) {
  // Simple vector marks so the panel still has identity if the logo CDN is unreachable.
  if (team === 'mariners') {
    // compass rose
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#C4CED4" strokeWidth="3" opacity=".9" />
        <polygon points="50,6 58,50 50,94 42,50" fill="#C4CED4" />
        <polygon points="6,50 50,42 94,50 50,58" fill="#005C5C" />
        <polygon points="50,6 58,50 50,50" fill="#ffffff" opacity=".55" />
        <circle cx="50" cy="50" r="7" fill="#0C2C56" stroke="#C4CED4" strokeWidth="2" />
      </svg>
    );
  }
  // hawk-ish swoosh
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d="M8 58 C 30 28, 62 24, 92 40 C 70 38, 52 46, 40 60 C 30 70, 18 70, 8 58 Z" fill="#A5ACAF" />
      <path d="M22 54 C 40 40, 60 38, 80 44 C 60 46, 46 54, 36 64 Z" fill="#002244" />
      <circle cx="72" cy="41" r="4" fill="#69BE28" />
    </svg>
  );
}

function Logo({ src, team, size, opacity = 1 }: { src: string | null; team: 'mariners' | 'seahawks'; size: number; opacity?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', opacity, display: 'block' }} loading="lazy" />;
  }
  return <TeamGlyph team={team} size={size} />;
}

function OppLogo({ g, size }: { g: GameSummary; size: number }) {
  return g.opponentLogo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={g.opponentLogo} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', display: 'block' }} loading="lazy" />
  ) : (
    <span style={{ width: size, height: size, display: 'grid', placeItems: 'center', fontFamily: FONT_FAMILIES.mono, fontSize: 10, color: 'rgba(255,255,255,.7)' }}>{g.opponentAbbrev}</span>
  );
}

function relDay(iso: string): string {
  const tz = 'America/Los_Angeles';
  const key = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
  const d = new Date(iso);
  const now = new Date();
  if (key(d) === key(now)) return 'TODAY';
  if (key(d) === key(new Date(now.getTime() + 86400000))) return 'TMRW';
  if (key(d) === key(new Date(now.getTime() - 86400000))) return 'YDAY';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz });
}

export default function SportsPanel({ team, theme }: { team: 'mariners' | 'seahawks'; theme: DashboardTheme }) {
  const { data, error } = useSportsTeam(team);
  const b = BRAND[team];
  const mono = FONT_FAMILIES.mono;
  const isLive = Boolean(data?.liveGame);
  const featured = data?.liveGame || data?.lastGame || null;
  const moves = (data?.news || []).filter((n) => n.isMove).slice(0, 2);
  const headlines: NewsItem[] = moves.length ? moves : (data?.news || []).slice(0, 2);

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        borderRadius: 22,
        overflow: 'hidden',
        border: `1px solid ${theme.panelBorder}`,
        boxShadow: theme.panelShadow,
        background: `linear-gradient(135deg, ${b.primary} 0%, ${b.accent} 140%)`,
        color: '#f4f8fd',
        fontFamily: FONT_FAMILIES.body,
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 20px 16px',
        gap: 10,
      }}
    >
      {/* Brand atmosphere: big faded logo + glow */}
      <div style={{ position: 'absolute', right: -30, bottom: -40, width: 230, height: 230, opacity: 0.13, pointerEvents: 'none', filter: 'grayscale(.2)' }}>
        <Logo src={data?.logo || null} team={team} size={230} />
      </div>
      <div style={{ position: 'absolute', left: -80, top: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${b.glow}55, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: `linear-gradient(90deg, ${b.highlight}, ${b.accent})`, opacity: 0.9 }} />

      {/* Header: logo, name, record */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Logo src={data?.logo || null} team={team} size={38} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.22em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase' }}>{b.label}</div>
          <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 30, lineHeight: 1, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Seattle {data?.name || (team === 'mariners' ? 'Mariners' : 'Seahawks')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 34, lineHeight: 0.95 }}>{data?.record || '—'}</div>
          <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,.65)', letterSpacing: '.06em', marginTop: 3 }}>
            {data?.standing || (data?.lastGame?.seasonType ? data.lastGame.seasonType.toUpperCase() : 'RECORD')}
          </div>
        </div>
      </div>

      {/* Body: featured game | schedule | news */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.95fr 1.2fr', gap: 14, flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Featured: live or last result */}
        <div style={{ background: 'rgba(0,0,0,.22)', border: `1px solid ${isLive ? b.accent : 'rgba(255,255,255,.1)'}`, borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.18em', color: isLive ? b.accent : 'rgba(255,255,255,.6)', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {isLive && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'dashboardBlink 1.6s infinite' }} />}
              {isLive ? 'Live now' : 'Last game'}
            </span>
            {featured && <span style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,.55)' }}>{isLive ? featured.statusDetail : relDay(featured.date)}</span>}
          </div>
          {featured ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <OppLogo g={featured} size={26} />
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {featured.isHome ? 'vs' : '@'} {featured.opponent}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 34, lineHeight: 0.95, whiteSpace: 'nowrap' }}>
                  {featured.ourScore ?? '–'}<span style={{ color: 'rgba(255,255,255,.45)', fontSize: 20 }}> – </span>{featured.theirScore ?? '–'}
                </div>
                {featured.result ? (
                  <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: featured.result === 'W' ? '#4ade80' : featured.result === 'L' ? '#f87171' : '#fbbf24', letterSpacing: '.14em' }}>
                    {featured.result === 'W' ? 'WIN' : featured.result === 'L' ? 'LOSS' : 'TIE'}
                  </div>
                ) : (
                  <div style={{ fontFamily: mono, fontSize: 10, color: b.accent, whiteSpace: 'nowrap' }}>{featured.statusDetail}</div>
                )}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {featured.statusDetail}
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{error ? 'Feed unavailable' : 'Loading…'}</div>
          )}
        </div>

        {/* Upcoming */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', marginBottom: 2 }}>Up next</div>
          {(data?.nextGames || []).slice(0, 3).map((g) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <OppLogo g={g} size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={g.opponent}>
                  {g.isHome ? 'vs' : '@'} {g.opponentAbbrev || g.opponent}
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ color: b.highlight }}>{relDay(g.date)}</span>
                  <span style={{ color: 'rgba(255,255,255,.65)' }}> · {g.timeLabel.replace(' PM', 'p').replace(' AM', 'a')}</span>
                </div>
              </div>
            </div>
          ))}
          {data && data.nextGames.length === 0 && <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>No games scheduled</div>}
        </div>

        {/* Moves / headlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', marginBottom: 2 }}>
            {moves.length ? 'Roster moves' : 'Headlines'}
          </div>
          {headlines.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.isMove ? b.accent : b.highlight, marginTop: 6, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.headline}</div>
                <div style={{ fontFamily: mono, fontSize: 9.5, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>
                  {n.published ? new Date(n.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }) : ''}
                </div>
              </div>
            </div>
          ))}
          {data && headlines.length === 0 && <div style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,.5)' }}>No recent news</div>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 9.5, color: 'rgba(255,255,255,.45)', letterSpacing: '.05em', position: 'relative' }}>
        <span>{data ? `Home ${data.homeRecord || '–'} · Road ${data.roadRecord || '–'}` : ''}</span>
        <span>ESPN · auto-updating</span>
      </div>
    </div>
  );
}
