'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DivIcon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useDashboardData } from './DashboardDataContext';
import type { GeoSighting, SightingSpecies } from '../../lib/hooks/useOrcaSightings';

const UNION_WA: [number, number] = [47.3583, -123.0953]; // Alderbrook / Great Bend, Union WA
// Hood Canal + central/south Puget Sound + Admiralty Inlet. Leaflet panes render at
// z-index 400-700, so every overlay below uses OVERLAY_Z to stay on top of the tiles.
const HOOD_CANAL_BOUNDS = new LatLngBounds([47.1, -123.45], [48.3, -122.2]);
const OVERLAY_Z = 1000;

const SPECIES_LABEL: Record<SightingSpecies, string> = {
  orca: 'Orca',
  humpback: 'Humpback',
  gray: 'Gray whale',
  minke: 'Minke',
  porpoise: 'Porpoise',
  other: 'Whale',
};

function speciesColor(species: SightingSpecies, theme: DashboardTheme): string {
  if (species === 'orca') return theme.map.accentA; // blue - per design
  if (species === 'porpoise') return '#9fb3c8'; // quiet grey-blue so porpoises don't shout
  return theme.map.accentB; // amber for humpback / gray / minke / other whales
}

function pingIcon(color: string, isLight: boolean, hoursAgo: number, recent: boolean) {
  // Older reports fade; anything from the last 24h keeps the pulsing ring.
  const alpha = hoursAgo <= 24 ? 1 : hoursAgo <= 72 ? 0.7 : 0.45;
  const size = recent ? 34 : 26;
  const dot = recent ? 12 : 9;
  return new DivIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;opacity:${alpha}">
        <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:.16"></div>
        <div style="position:absolute;width:${dot}px;height:${dot}px;border-radius:50%;background:${color};border:2px solid ${isLight ? '#fff' : '#0d1729'}"></div>
        ${recent ? `<div class="hh-ping-ring" style="position:absolute;width:${dot}px;height:${dot}px;border-radius:50%;border:2px solid ${color};"></div>` : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function unionIcon(color: string, ink: string) {
  return new DivIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid ${ink};transform:rotate(45deg);border-radius:3px;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBoundsOnce() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(HOOD_CANAL_BOUNDS, { padding: [10, 10] });
  }, [map]);
  return null;
}

function formatClock(now: Date) {
  const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function MarineMapPanel({ theme }: { theme: DashboardTheme }) {
  const { sightings: sightingsState, tide, now } = useDashboardData();
  const { sightings, last24h, isPlaceholder } = sightingsState;

  const tileUrl = theme.isLight
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const tideDirectionLabel = tide?.trend ? (tide.trend === 'rising' ? 'flooding' : 'ebbing') : '—';
  const tideRateLabel = tide?.trendRateLabel || '—';

  // Legend only lists species actually on the map right now (max 3 chips).
  const legend = useMemo(() => {
    const order: SightingSpecies[] = ['orca', 'humpback', 'gray', 'minke', 'porpoise', 'other'];
    const present = new Set(sightings.map((s) => s.species));
    return order.filter((s) => present.has(s)).slice(0, 3);
  }, [sightings]);

  const liveLabel = isPlaceholder
    ? 'EXAMPLE · no live feed'
    : last24h > 0
      ? `LIVE · ${last24h} sighting${last24h === 1 ? '' : 's'} · 24h`
      : `LIVE · ${sightings.length} this week`;

  const glassPill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(10,20,32,.6)',
    border: '1px solid rgba(255,255,255,.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: 999,
    padding: '7px 14px',
    fontSize: 14,
    color: '#dbe6f2',
  };

  return (
    <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', border: `1px solid ${theme.panelBorder}`, boxShadow: theme.panelShadow, height: '100%' }}>
      <MapContainer
        center={UNION_WA}
        zoom={9}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <FitBoundsOnce />
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · sightings <a href="https://acartia.io">Acartia</a>'
        />
        <Marker position={UNION_WA} icon={unionIcon(theme.map.accentB, theme.map.ink)}>
          <Popup>Union, WA</Popup>
        </Marker>
        {sightings.map((s: GeoSighting) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={pingIcon(speciesColor(s.species, theme), theme.isLight, s.hoursAgo, s.hoursAgo <= 24)}
            zIndexOffset={s.hoursAgo <= 24 ? 500 : 0}
          >
            <Popup>
              <strong>{s.label}</strong>
              {s.count ? ` · ${s.count}` : ''}
              <br />
              {s.hoursAgoLabel}
              {s.comments ? (
                <>
                  <br />
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{s.comments.slice(0, 160)}</span>
                </>
              ) : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legibility scrims */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(180deg, rgba(6,12,22,.78), transparent)', pointerEvents: 'none', zIndex: OVERLAY_Z - 1 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(0deg, rgba(6,12,22,.68), transparent)', pointerEvents: 'none', zIndex: OVERLAY_Z - 1 }} />

      {/* Title + clock */}
      <div style={{ position: 'absolute', top: 26, left: 30, pointerEvents: 'none', zIndex: OVERLAY_Z }}>
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, letterSpacing: '.24em', color: '#9ec7ef', textTransform: 'uppercase' }}>
          Union, WA <span style={{ color: '#c3d3e4', opacity: 0.9 }}>· {formatClock(now)}</span>
        </div>
        <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 54, lineHeight: 0.95, letterSpacing: 1, color: '#f4f8fd' }}>MARINE MAP</div>
      </div>

      {/* Live badge */}
      <div style={{ ...glassPill, position: 'absolute', top: 30, right: 30, gap: 9, padding: '8px 14px', zIndex: OVERLAY_Z }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPlaceholder ? '#f59e0b' : theme.liveGreen, animation: isPlaceholder ? undefined : 'dashboardBlink 1.6s infinite' }} />
        {liveLabel}
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 26, left: 30, display: 'flex', gap: 10, zIndex: OVERLAY_Z }}>
        {(legend.length ? legend : (['orca'] as SightingSpecies[])).map((sp) => (
          <span key={sp} style={glassPill}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: speciesColor(sp, theme) }} />
            {SPECIES_LABEL[sp]}
          </span>
        ))}
      </div>

      {/* Tide direction badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 26,
          right: 30,
          zIndex: OVERLAY_Z,
          background: 'rgba(10,20,32,.62)',
          border: '1px solid rgba(255,255,255,.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: 16,
          padding: '14px 18px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, letterSpacing: '.16em', color: '#9ec7ef', textTransform: 'uppercase', marginBottom: 6 }}>
          Tide Direction
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f4f8fd' }}>
          {tideRateLabel} <span style={{ color: '#c3d3e4', fontWeight: 400 }}>{tideDirectionLabel}</span>
        </div>
      </div>
    </div>
  );
}
