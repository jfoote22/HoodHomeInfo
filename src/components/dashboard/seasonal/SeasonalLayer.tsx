'use client';

import type { ReactNode } from 'react';
import type { DashboardTheme } from '../theme';
import type { Season } from './season';
import { FallBackdrop, FallForeground } from './fall';
import { WinterBackdrop, WinterForeground } from './winter';

// Two decoration layers per season, both pointer-events:none so nothing on the dashboard
// changes behaviour:
//  - back:  sits behind every panel (the dashboard grid is isolated, so z-index -1 lands
//           between the screen background and the panels) and shows through the gutters,
//           the outer margin, and the frosted panels of the light theme.
//  - front: a light touch over everything, e.g. a few falling leaves. Kept sparse so the
//           wall display stays readable, and above Leaflet's panes (which reach z-index 1000).
// Seasons without art yet simply render nothing.

type LayerProps = { theme: DashboardTheme };

const DECOR: Partial<Record<Season, { back?: (p: LayerProps) => ReactNode; front?: (p: LayerProps) => ReactNode }>> = {
  fall: { back: FallBackdrop, front: FallForeground },
  winter: { back: WinterBackdrop, front: WinterForeground },
};

/** Seasons that have art, in calendar order, for the season button to cycle through. */
export const DECORATED_SEASONS = (['spring', 'summer', 'fall', 'winter'] as Season[]).filter((s) => DECOR[s]);

export default function SeasonalLayer({ season, layer, theme }: { season: Season | null; layer: 'back' | 'front'; theme: DashboardTheme }) {
  const render = season ? DECOR[season]?.[layer] : undefined;
  if (!render) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: layer === 'back' ? -1 : 5000,
      }}
    >
      {render({ theme })}
    </div>
  );
}
