import { NextResponse } from 'next/server';

// Seattle sports for the wall display, from ESPN's public site API (no key).
//   GET /api/sports?team=mariners | seahawks
// Returns a normalized payload: record/standing, last result, live game (if any),
// next games, and recent headlines with trade/roster moves flagged.

const TEAMS = {
  mariners: { sport: 'baseball', league: 'mlb', abbrev: 'sea', espnId: '12', seasonTypes: [2, 3], name: 'Mariners' },
  seahawks: { sport: 'football', league: 'nfl', abbrev: 'sea', espnId: '26', seasonTypes: [1, 2, 3], name: 'Seahawks' },
} as const;
type TeamKey = keyof typeof TEAMS;

const CACHE_TTL_MS = 5 * 60 * 1000;
const LIVE_TTL_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;
const TZ = 'America/Los_Angeles';

export interface GameSummary {
  id: string;
  date: string; // ISO
  dateLabel: string; // "Sat Aug 22"
  timeLabel: string; // "4:15 PM"
  isHome: boolean;
  opponent: string; // "Cubs"
  opponentAbbrev: string; // "CHC"
  opponentLogo: string | null;
  state: 'pre' | 'in' | 'post';
  statusDetail: string; // "Final", "Top 7th", "8/23 - 4:10 PM"
  ourScore: number | null;
  theirScore: number | null;
  result: 'W' | 'L' | 'T' | null;
  seasonType: string; // "Preseason" | "Regular Season" | "Postseason"
}

export interface NewsItem {
  headline: string;
  published: string;
  isMove: boolean; // trade / signing / IR / call-up etc.
  url: string | null;
}

export interface SportsPayload {
  team: TeamKey;
  name: string;
  displayName: string;
  logo: string | null;
  color: string;
  altColor: string;
  record: string | null;
  homeRecord: string | null;
  roadRecord: string | null;
  standing: string | null;
  lastGame: GameSummary | null;
  liveGame: GameSummary | null;
  nextGames: GameSummary[];
  news: NewsItem[];
  fetchedAt: string;
}

const cache = new Map<TeamKey, { at: number; payload: SportsPayload }>();

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal, headers: { 'User-Agent': 'HoodCanalMarineDashboard/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const MOVE_RE = /\b(trade[sd]?|trading|acquir\w*|sign(?:s|ed|ing)?|re-sign\w*|releas\w*|waive[sd]?|claim(?:s|ed)?|call(?:s|ed)? up|option(?:s|ed)?|designat\w*|DFA|injured reserve|\bIR\b|activat\w*|promot\w*|extension|contract|cut[s]?\b|roster move|waivers?|deal\b|agree\w*|swap)/i;

function pickLogo(logos: any[] | undefined): string | null {
  if (!Array.isArray(logos) || !logos.length) return null;
  const dark = logos.find((l) => Array.isArray(l.rel) && l.rel.includes('dark'));
  return (dark || logos[0]).href || null;
}

function summarizeEvent(ev: any, ourAbbrev: string, seasonTypeName: string): GameSummary | null {
  const comp = ev?.competitions?.[0];
  if (!comp || !Array.isArray(comp.competitors)) return null;
  const us = comp.competitors.find((c: any) => String(c.team?.abbreviation || '').toLowerCase() === ourAbbrev);
  const them = comp.competitors.find((c: any) => c !== us);
  if (!us || !them) return null;
  const d = new Date(ev.date);
  const state = (comp.status?.type?.state || 'pre') as 'pre' | 'in' | 'post';
  const toNum = (v: any) => {
    const n = typeof v === 'object' && v !== null ? Number(v.value ?? v.displayValue) : Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const ourScore = toNum(us.score);
  const theirScore = toNum(them.score);
  let result: GameSummary['result'] = null;
  if (state === 'post' && ourScore !== null && theirScore !== null) result = ourScore > theirScore ? 'W' : ourScore < theirScore ? 'L' : 'T';
  return {
    id: String(ev.id),
    date: d.toISOString(),
    dateLabel: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ }),
    timeLabel: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }),
    isHome: us.homeAway === 'home',
    opponent: them.team?.shortDisplayName || them.team?.name || them.team?.displayName || 'TBD',
    opponentAbbrev: them.team?.abbreviation || '',
    opponentLogo: pickLogo(them.team?.logos) || them.team?.logo || null,
    state,
    statusDetail: comp.status?.type?.shortDetail || comp.status?.type?.description || '',
    ourScore,
    theirScore,
    result,
    seasonType: seasonTypeName,
  };
}

async function buildPayload(key: TeamKey): Promise<SportsPayload> {
  const t = TEAMS[key];
  const base = `https://site.api.espn.com/apis/site/v2/sports/${t.sport}/${t.league}`;

  const [teamJson, newsJson, ...schedules] = await Promise.all([
    getJson(`${base}/teams/${t.abbrev}`),
    getJson(`${base}/news?team=${t.espnId}&limit=12`).catch(() => ({ articles: [] })),
    ...t.seasonTypes.map((st) => getJson(`${base}/teams/${t.abbrev}/schedule?seasontype=${st}`).catch(() => null)),
  ]);

  const team = teamJson?.team || {};
  const recordItems: any[] = team.record?.items || [];
  const rec = (type: string) => recordItems.find((r) => r.type === type)?.summary || null;

  const games: GameSummary[] = [];
  const seen = new Set<string>();
  schedules.forEach((s: any) => {
    if (!s?.events) return;
    const seasonName = s.season?.name || s.requestedSeason?.name || '';
    for (const ev of s.events) {
      const g = summarizeEvent(ev, t.abbrev, seasonName);
      if (g && !seen.has(g.id)) {
        seen.add(g.id);
        games.push(g);
      }
    }
  });
  games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const liveGame = games.find((g) => g.state === 'in') || null;
  const finished = games.filter((g) => g.state === 'post');
  const lastGame = finished.length ? finished[finished.length - 1] : null;
  const nextGames = games.filter((g) => g.state === 'pre').slice(0, 4);

  const news: NewsItem[] = (newsJson?.articles || [])
    .filter((a: any) => a?.headline && a.type !== 'Media')
    .slice(0, 10)
    .map((a: any) => ({
      headline: String(a.headline).trim(),
      published: a.published || '',
      isMove: MOVE_RE.test(String(a.headline)),
      url: a.links?.web?.href || null,
    }));

  return {
    team: key,
    name: t.name,
    displayName: team.displayName || `Seattle ${t.name}`,
    logo: pickLogo(team.logos),
    color: team.color ? `#${team.color}` : '#0c2c56',
    altColor: team.alternateColor ? `#${team.alternateColor}` : '#69be28',
    record: rec('total'),
    homeRecord: rec('home'),
    roadRecord: rec('road'),
    standing: team.standingSummary || null,
    lastGame,
    liveGame,
    nextGames,
    news,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = (searchParams.get('team') || '').toLowerCase() as TeamKey;
  if (!(key in TEAMS)) {
    return NextResponse.json({ error: 'team must be mariners or seahawks' }, { status: 400 });
  }
  const hit = cache.get(key);
  const ttl = hit?.payload.liveGame ? LIVE_TTL_MS : CACHE_TTL_MS;
  if (hit && Date.now() - hit.at < ttl && searchParams.get('refresh') !== '1') {
    return NextResponse.json({ ...hit.payload, cached: true });
  }
  try {
    const payload = await buildPayload(key);
    cache.set(key, { at: Date.now(), payload });
    return NextResponse.json(payload);
  } catch (err) {
    console.error(`sports/${key} failed:`, err);
    if (hit) return NextResponse.json({ ...hit.payload, cached: true, stale: true });
    return NextResponse.json({ error: 'Failed to fetch team data', details: String(err) }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
