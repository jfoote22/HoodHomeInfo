import type { DashboardTheme } from '../theme';
import type { Season } from './season';

// A season can recolour the dashboard's chrome on top of the base theme (Command Center or
// Daylight Glass). The layout and copy never change, only these tokens. The sports panels keep
// the base theme on purpose: their team colours are their own.
// The whale-pin species colours (map.accentA/accentB) are data, so they are left alone too.

type Overrides = Partial<Omit<DashboardTheme, 'map'>> & { map?: Partial<DashboardTheme['map']> };

// Autumn on Hood Canal: fir and moss greens, with pumpkin for the warm accent.
const FALL_DARK: Overrides = {
  screenBg: 'radial-gradient(120% 90% at 18% 0%, #17220f 0%, #0a0f08 62%)',
  panelBg: '#121a11',
  panelBorder: 'rgba(200,220,160,.08)',
  panelShadow: '0 18px 50px rgba(0,0,0,.5), inset 0 1px 0 rgba(220,235,190,.04)',

  text: '#eef2e6',
  eyebrow: '#96a57c',
  muted: '#a2ad8b',
  dim: '#6b7560',
  bodySecondary: '#d6ddc6',

  commandBarBg: '#0f160e',
  commandBarBorder: 'rgba(200,220,160,.1)',

  accentA: '#a3c35a',
  accentA2: '#65a30d',
  accentB: '#f08a24',
  iconAccent: '#f5b301',

  eventStripeA: '#1a2517',
  eventStripeB: '#223020',
  dayPillBg: 'rgba(163,195,90,.12)',
  dayPillText: '#b5d16c',

  map: {
    chromeRgb: '16,24,14',
    scrimRgb: '9,14,8',
    chromeEyebrow: '#b9d38a',
    chromeText: '#cfd8bf',
    chromeNote: '#bcc8a8',
    chromeFaint: '#8f9d78',
    chromePill: '#e2e9d4',
    darkTileClass: 'hh-dark-tiles-fall',
  },
};

const FALL_LIGHT: Overrides = {
  screenBg: 'linear-gradient(160deg, #f1f4e8, #dde5cc)',
  panelBg: 'rgba(253,255,248,.74)',
  panelBorder: 'rgba(255,255,250,.9)',
  panelShadow: '0 20px 50px rgba(52,70,30,.14)',

  text: '#1d2916',
  eyebrow: '#6d7a58',
  muted: '#5d6a4b',
  dim: '#98a286',
  bodySecondary: '#38472b',

  commandBarBorder: 'rgba(29,41,22,.12)',
  commandBarShadow: '0 6px 16px rgba(52,70,30,.08)',

  accentA: '#4d7c0f',
  accentA2: '#65a30d',
  accentB: '#c2620c',

  eventStripeA: '#dce5ca',
  eventStripeB: '#cdd9b7',
  dayPillBg: 'rgba(77,124,15,.1)',
  dayPillText: '#3f6212',

  map: {
    chromeRgb: '16,24,14',
    scrimRgb: '9,14,8',
    chromeEyebrow: '#b9d38a',
    chromeText: '#cfd8bf',
    chromeNote: '#bcc8a8',
    chromeFaint: '#8f9d78',
    chromePill: '#e2e9d4',
  },
};

const PALETTES: Partial<Record<Season, { dark: Overrides; light: Overrides }>> = {
  fall: { dark: FALL_DARK, light: FALL_LIGHT },
};

export function seasonalTheme(base: DashboardTheme, season: Season | null): DashboardTheme {
  const palette = season ? PALETTES[season] : undefined;
  if (!palette) return base;
  const o = base.isLight ? palette.light : palette.dark;
  return { ...base, ...o, map: { ...base.map, ...o.map } };
}
