'use client';

import dynamic from 'next/dynamic';
import ScaleToFit from './ScaleToFit';
import AIVoiceAgentPanel from './AIVoiceAgentPanel';
import WeatherTidesPanel from './WeatherTidesPanel';
import LocalEventsPanel from './LocalEventsPanel';
import SportsPanel from './SportsPanel';
import KioskBehaviors from './KioskBehaviors';
import { DashboardDataProvider } from './DashboardDataContext';
import { useDashboardTheme } from './DashboardThemeContext';
import { FONT_FAMILIES } from './theme';

// Leaflet touches `window`, so the map panel can't be server-rendered.
const MarineMapPanel = dynamic(() => import('./MarineMapPanel'), { ssr: false });

export default function MarineDashboard() {
  const { theme, themeId, toggleTheme } = useDashboardTheme();

  return (
    <DashboardDataProvider>
      <KioskBehaviors />
      <ScaleToFit background={theme.isLight ? '#0b0e13' : '#000'}>
        <div
          style={{
            width: 1920,
            height: 1080,
            background: theme.screenBg,
            display: 'grid',
            gridTemplateColumns: '392px 1fr 428px',
            gap: 22,
            padding: 26,
            color: theme.text,
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: FONT_FAMILIES.body,
            position: 'relative',
          }}
        >
          <AIVoiceAgentPanel theme={theme} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0, minWidth: 0 }}>
            <div style={{ flex: 2, minHeight: 0 }}>
              <MarineMapPanel theme={theme} />
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 22 }}>
              <SportsPanel team="mariners" theme={theme} />
              <SportsPanel team="seahawks" theme={theme} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0 }}>
            <WeatherTidesPanel theme={theme} />
            <LocalEventsPanel theme={theme} />
          </div>

          <button
            onClick={toggleTheme}
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              fontFamily: FONT_FAMILIES.mono,
              fontSize: 10,
              letterSpacing: '.08em',
              color: theme.dim,
              background: 'transparent',
              border: `1px solid ${theme.isLight ? 'rgba(20,34,47,.12)' : 'rgba(255,255,255,.08)'}`,
              borderRadius: 999,
              padding: '4px 10px',
              cursor: 'pointer',
              opacity: 0.5,
            }}
            title="Switch theme"
          >
            {themeId === 'command-center' ? 'Daylight Glass' : 'Command Center'}
          </button>
        </div>
      </ScaleToFit>
    </DashboardDataProvider>
  );
}
