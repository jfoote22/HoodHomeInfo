import { NextResponse } from 'next/server';

// Live Mariners game from MLB's own Stats API (statsapi.mlb.com - public, no key, ~15s behind
// the pitch). Used by the Mariners panel's live mode; ESPN (/api/sports) still supplies the
// record, schedule, and headlines.
//
//   GET /api/mlb/live            -> { live: true, game: MlbLiveGame }  while a game is in progress
//                                -> { live: false, next: {...} | null } otherwise (today's game, if any)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEAM_ID = 136; // Seattle Mariners
const TZ = 'America/Los_Angeles';
const LIVE_TTL_MS = 15 * 1000;
const IDLE_TTL_MS = 2 * 60 * 1000;
const API = 'https://statsapi.mlb.com/api';

export interface MlbLineSide {
  abbrev: string;
  name: string;
  runs: number;
  hits: number;
  errors: number;
  isUs: boolean;
}

export interface MlbPlayer {
  name: string;
  /** e.g. "1-for-3, HR" today / ".271 AVG" season for batters; "2.1 IP · 3 H · 1 ER · 4 K" for pitchers */
  line: string;
  season: string;
}

export interface MlbLiveGame {
  gamePk: number;
  status: string; // "In Progress", "Delayed", ...
  inning: number;
  inningOrdinal: string; // "6th"
  inningState: string; // Top / Middle / Bottom / End
  isTop: boolean;
  balls: number;
  strikes: number;
  outs: number;
  runners: { first: boolean; second: boolean; third: boolean };
  away: MlbLineSide;
  home: MlbLineSide;
  innings: { num: number; away: number | null; home: number | null }[];
  batter: MlbPlayer | null;
  onDeck: string | null;
  pitcher: MlbPlayer | null;
  /** most recent completed plays, newest first */
  lastPlays: string[];
  fetchedAt: string;
}

export interface MlbLivePayload {
  live: boolean;
  game: MlbLiveGame | null;
  next: { gamePk: number; status: string; gameDate: string; opponent: string; isHome: boolean } | null;
  fetchedAt: string;
}

let cache: { at: number; payload: MlbLivePayload } | null = null;

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`MLB ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function pacificDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000).toLocaleDateString('en-CA', { timeZone: TZ });
}

function batterLine(stats: any): string {
  const b = stats?.batting || {};
  const ab = Number(b.atBats || 0);
  const h = Number(b.hits || 0);
  const extras: string[] = [];
  if (b.homeRuns) extras.push(`${b.homeRuns} HR`);
  if (b.rbi) extras.push(`${b.rbi} RBI`);
  if (b.baseOnBalls) extras.push(`${b.baseOnBalls} BB`);
  return ab || h ? `${h}-for-${ab}${extras.length ? ', ' + extras.join(', ') : ''}` : extras.join(', ') || 'first AB';
}

function pitcherLine(stats: any): string {
  const p = stats?.pitching || {};
  return `${p.inningsPitched ?? '0.0'} IP · ${p.hits ?? 0} H · ${p.earnedRuns ?? 0} ER · ${p.baseOnBalls ?? 0} BB · ${p.strikeOuts ?? 0} K · ${p.numberOfPitches ?? 0} P`;
}

function buildGame(feed: any): MlbLiveGame {
  const ld = feed.liveData || {};
  const ls = ld.linescore || {};
  const gd = feed.gameData || {};
  const teams = gd.teams || {};
  const box = ld.boxscore?.teams || {};
  const side = (key: 'away' | 'home'): MlbLineSide => ({
    abbrev: teams[key]?.abbreviation || (key === 'away' ? 'AWY' : 'HME'),
    name: teams[key]?.teamName || teams[key]?.name || key,
    runs: Number(ls.teams?.[key]?.runs ?? 0),
    hits: Number(ls.teams?.[key]?.hits ?? 0),
    errors: Number(ls.teams?.[key]?.errors ?? 0),
    isUs: Number(teams[key]?.id) === TEAM_ID,
  });
  const player = (id: number | undefined) => {
    if (!id) return null;
    return box.home?.players?.[`ID${id}`] || box.away?.players?.[`ID${id}`] || null;
  };
  const off = ls.offense || {};
  const def = ls.defense || {};
  const batterBox = player(off.batter?.id);
  const pitcherBox = player(def.pitcher?.id);
  const plays: any[] = ld.plays?.allPlays || [];
  const lastPlays = plays
    .filter((p) => p?.about?.isComplete && p?.result?.description)
    .slice(-4)
    .reverse()
    .map((p) => String(p.result.description).replace(/\s+/g, ' ').trim());

  return {
    gamePk: Number(feed.gamePk),
    status: gd.status?.detailedState || 'In Progress',
    inning: Number(ls.currentInning || 0),
    inningOrdinal: ls.currentInningOrdinal || '',
    inningState: ls.inningState || (ls.isTopInning ? 'Top' : 'Bottom'),
    isTop: Boolean(ls.isTopInning),
    balls: Number(ls.balls ?? 0),
    strikes: Number(ls.strikes ?? 0),
    outs: Number(ls.outs ?? 0),
    runners: { first: Boolean(off.first), second: Boolean(off.second), third: Boolean(off.third) },
    away: side('away'),
    home: side('home'),
    innings: (ls.innings || []).map((i: any) => ({ num: Number(i.num), away: i.away?.runs ?? null, home: i.home?.runs ?? null })),
    batter: off.batter
      ? { name: off.batter.fullName, line: batterLine(batterBox?.stats), season: batterBox?.seasonStats?.batting?.avg ? `${batterBox.seasonStats.batting.avg} AVG` : '' }
      : null,
    onDeck: off.onDeck?.fullName || null,
    pitcher: def.pitcher
      ? { name: def.pitcher.fullName, line: pitcherLine(pitcherBox?.stats), season: pitcherBox?.seasonStats?.pitching?.era ? `${pitcherBox.seasonStats.pitching.era} ERA` : '' }
      : null,
    lastPlays,
    fetchedAt: new Date().toISOString(),
  };
}

async function load(): Promise<MlbLivePayload> {
  // Yesterday is included so a game that runs past midnight Pacific still counts as live.
  const sched = await getJson(`${API}/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=${pacificDate(-1)}&endDate=${pacificDate(0)}`);
  const games: any[] = (sched.dates || []).flatMap((d: any) => d.games || []);
  const live = games.find((g) => g.status?.abstractGameState === 'Live');
  const fetchedAt = new Date().toISOString();
  if (live) {
    const feed = await getJson(`${API}/v1.1/game/${live.gamePk}/feed/live`);
    return { live: true, game: buildGame(feed), next: null, fetchedAt };
  }
  const today = games.filter((g) => String(g.officialDate) === pacificDate(0));
  const upcoming = today.find((g) => g.status?.abstractGameState === 'Preview') || today[today.length - 1] || null;
  const next = upcoming
    ? {
        gamePk: Number(upcoming.gamePk),
        status: upcoming.status?.detailedState || '',
        gameDate: upcoming.gameDate,
        opponent: Number(upcoming.teams?.home?.team?.id) === TEAM_ID ? upcoming.teams?.away?.team?.teamName || upcoming.teams?.away?.team?.name : upcoming.teams?.home?.team?.teamName || upcoming.teams?.home?.team?.name,
        isHome: Number(upcoming.teams?.home?.team?.id) === TEAM_ID,
      }
    : null;
  return { live: false, game: null, next, fetchedAt };
}

export async function GET() {
  const ttl = cache?.payload.live ? LIVE_TTL_MS : IDLE_TTL_MS;
  if (cache && Date.now() - cache.at < ttl) return NextResponse.json({ ...cache.payload, cached: true });
  try {
    const payload = await load();
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    console.error('mlb live failed:', err);
    if (cache) return NextResponse.json({ ...cache.payload, cached: true, stale: true });
    return NextResponse.json({ live: false, game: null, next: null, fetchedAt: new Date().toISOString(), error: String(err) }, { status: 502 });
  }
}
