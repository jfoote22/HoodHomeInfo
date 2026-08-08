'use client';

import { DashboardThemeProvider } from '../components/dashboard/DashboardThemeContext';
import MarineDashboard from '../components/dashboard/MarineDashboard';

// The Union, WA marine wall dashboard - see design_handoff_marine_dashboard/README.md
// for the full spec this was built from. Older component-grid layout previously
// rendered here is still in src/components/ (WeatherCard, TideChart, EnhancedOrcaMap,
// EventList, HomeChatBot, etc.) if you want to reference or fall back to it.
export default function Home() {
  return (
    <DashboardThemeProvider>
      <MarineDashboard />
    </DashboardThemeProvider>
  );
}
