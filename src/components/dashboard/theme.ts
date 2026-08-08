// Design tokens ported from the "Union, WA — Marine Wall Dashboard" design handoff
// (design_handoff_marine_dashboard/README.md + Marine Dashboard.dc.html + MarineMap.dc.html).
// Two approved themes, same layout/copy/map — only these tokens differ.

export type ThemeId = 'command-center' | 'daylight-glass';

export interface DashboardTheme {
  id: ThemeId;
  label: string;
  sublabel: string;
  isLight: boolean;

  screenBg: string;
  panelBg: string;
  panelBackdropBlur?: string;
  panelBorder: string;
  panelShadow: string;

  text: string;
  eyebrow: string;
  muted: string;
  dim: string;
  bodySecondary: string;

  commandBarBg: string;
  commandBarBorder: string;
  commandBarShadow?: string;

  // Primary blue used for UI chrome: wake word, last-response card, tide line, NOW chip.
  accentA: string;
  // Amber used for trend text + tide "now" dot pulse.
  accentB: string;
  // Amber used specifically for weather icon fills (slightly different hex per theme in source).
  iconAccent: string;

  liveGreen: string;
  eventStripeA: string;
  eventStripeB: string;
  dayPillBg: string;
  dayPillText: string;

  // The stylized marine map keeps its own accent pair per the source dc-import props,
  // which does not always match the UI accentA/accentB above.
  map: {
    water: string;
    land: string;
    landDark: string;
    roads: string;
    ink: string;
    waterInk: string;
    accentA: string;
    accentB: string;
  };
}

export const COMMAND_CENTER: DashboardTheme = {
  id: 'command-center',
  label: 'Command Center',
  sublabel: 'sleek dark, glassy overlays',
  isLight: false,

  screenBg: 'radial-gradient(120% 90% at 18% 0%, #0c1a2e 0%, #070d18 62%)',
  panelBg: '#0d1729',
  panelBorder: 'rgba(255,255,255,.07)',
  panelShadow: '0 18px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04)',

  text: '#e8eef7',
  eyebrow: '#7f93ad',
  muted: '#8ba0bd',
  dim: '#5c6b7d',
  bodySecondary: '#cfdcec',

  commandBarBg: '#0a1322',
  commandBarBorder: 'rgba(255,255,255,.09)',

  accentA: '#38bdf8',
  accentB: '#f59e0b',
  iconAccent: '#f5b301',

  liveGreen: '#4ade80',
  eventStripeA: '#16233a',
  eventStripeB: '#1b2b45',
  dayPillBg: 'rgba(56,189,248,.1)',
  dayPillText: '#38bdf8',

  map: {
    water: '#0a2236',
    land: '#2b333c',
    landDark: '#232a32',
    roads: '#3c4650',
    ink: '#eaf1fb',
    waterInk: '#7fb4e6',
    accentA: '#38bdf8',
    accentB: '#f59e0b',
  },
};

export const DAYLIGHT_GLASS: DashboardTheme = {
  id: 'daylight-glass',
  label: 'Daylight Glass',
  sublabel: 'bright, airy, frosted panels',
  isLight: true,

  screenBg: 'linear-gradient(160deg, #eef3f9, #dbe6f2)',
  panelBg: 'rgba(255,255,255,.72)',
  panelBackdropBlur: 'blur(18px)',
  panelBorder: 'rgba(255,255,255,.9)',
  panelShadow: '0 20px 50px rgba(31,54,84,.14)',

  text: '#16222f',
  eyebrow: '#6b7a8c',
  muted: '#5c6b7d',
  dim: '#94a3b5',
  bodySecondary: '#33475c',

  commandBarBg: '#ffffff',
  commandBarBorder: 'rgba(20,34,47,.12)',
  commandBarShadow: '0 6px 16px rgba(31,54,84,.08)',

  accentA: '#0284c7',
  accentB: '#ea9008',
  iconAccent: '#f5a623',

  liveGreen: '#4ade80',
  eventStripeA: '#d3deea',
  eventStripeB: '#c4d2e2',
  dayPillBg: 'rgba(2,132,199,.1)',
  dayPillText: '#0369a1',

  map: {
    water: '#0e2a40',
    land: '#7d8ea3',
    landDark: '#6d7e93',
    roads: '#cdd8e4',
    ink: '#f2f7fc',
    waterInk: '#cfe4fb',
    accentA: '#38bdf8',
    accentB: '#f5a623',
  },
};

export const THEMES: Record<ThemeId, DashboardTheme> = {
  'command-center': COMMAND_CENTER,
  'daylight-glass': DAYLIGHT_GLASS,
};

export const FONT_FAMILIES = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Public Sans', sans-serif",
  mono: "'Space Mono', monospace",
};
