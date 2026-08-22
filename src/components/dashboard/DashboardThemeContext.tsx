'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { DashboardTheme, ThemeId, THEMES, COMMAND_CENTER } from './theme';

interface ThemeContextValue {
  theme: DashboardTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  toggleTheme: () => void;
}

const DashboardThemeContext = createContext<ThemeContextValue>({
  theme: COMMAND_CENTER,
  themeId: 'command-center',
  setThemeId: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'hoodhome-dashboard-theme';

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('command-center');

  useEffect(() => {
    // URL param lets the TV kiosk URL pin a theme (e.g. /?theme=daylight-glass);
    // otherwise fall back to whatever was last toggled on this device.
    const fromUrl = new URLSearchParams(window.location.search).get('theme') as ThemeId | null;
    if (fromUrl && THEMES[fromUrl]) {
      setThemeIdState(fromUrl);
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES[stored]) {
      setThemeIdState(stored);
    }
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const toggleTheme = () => {
    setThemeId(themeId === 'command-center' ? 'daylight-glass' : 'command-center');
  };

  return (
    <DashboardThemeContext.Provider value={{ theme: THEMES[themeId], themeId, setThemeId, toggleTheme }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}
