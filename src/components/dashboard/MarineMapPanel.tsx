'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DivIcon, LatLngBounds, type Map as LeafletMap } from 'leaflet';
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

function pingIcon(color: string, isLight: boolean, hoursAgo: number, recent: boolean, rank?: number) {
  // Older reports fade; anything from the last 24h keeps the pulsing ring. The three newest
  // sightings carry a numbered tag matching the "Latest sightings" box.
  const alpha = rank ? 1 : hoursAgo <= 24 ? 1 : hoursAgo <= 72 ? 0.7 : 0.45;
  const size = recent ? 34 : 26;
  const dot = recent ? 12 : 9;
  const ink = isLight ? '#fff' : '#0d1729';
  return new DivIcon({
    className: '',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;opacity:${alpha}">
        <div style="position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:${color};opacity:.16"></div>
        <div style="position:absolute;width:${dot}px;height:${dot}px;border-radius:50%;background:${color};border:2px solid ${ink}"></div>
        ${recent ? `<div class="hh-ping-ring" style="position:absolute;width:${dot}px;height:${dot}px;border-radius:50%;border:2px solid ${color};"></div>` : ''}
        ${rank ? `<div style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:${color};color:${ink};border:1.5px solid ${ink};font:700 11px/15px ${FONT_FAMILIES.mono};text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.5)">${rank}</div>` : ''}
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

function FitBoundsOnce({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(HOOD_CANAL_BOUNDS, { padding: [10, 10], animate: false });
    // One click further out than the fitted view, for more of the Sound on the wall display.
    map.setZoom(map.getZoom() - 1, { animate: false });
    onReady(map);
  }, [map, onReady]);
  return null;
}

function formatClock(now: Date) {
  const day = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function MarineMapPanel({ theme }: { theme: DashboardTheme }) {
  const { sightings: sightingsState, now } = useDashboardData();
  const { sightings, last24h, isPlaceholder } = sightingsState;
  const [map, setMap] = useState<LeafletMap | null>(null);

  const tileUrl = theme.isLight
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // Three newest sightings, numbered 1-3 both in the box and on their map pins.
  const latest = useMemo(() => [...sightings].sort((a, b) => a.hoursAgo - b.hoursAgo).slice(0, 3), [sightings]);
  const rankById = useMemo(() => new Map(latest.map((s, i) => [s.id, i + 1])), [latest]);

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
        <FitBoundsOnce onReady={setMap} />
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
            icon={pingIcon(speciesColor(s.species, theme), theme.isLight, s.hoursAgo, s.hoursAgo <= 24, rankById.get(s.id))}
            zIndexOffset={rankById.has(s.id) ? 1000 : s.hoursAgo <= 24 ? 500 : 0}
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
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(0deg, rgba(6,12,22,.55), transparent)', pointerEvents: 'none', zIndex: OVERLAY_Z - 1 }} />

      {/* Title + clock */}
      <div style={{ position: 'absolute', top: 26, left: 30, pointerEvents: 'none', zIndex: OVERLAY_Z }}>
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, letterSpacing: '.24em', color: '#9ec7ef', textTransform: 'uppercase' }}>
          Union, WA <span style={{ color: '#c3d3e4', opacity: 0.9 }}>· {formatClock(now)}</span>
        </div>
        <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 46, lineHeight: 0.95, letterSpacing: 1, color: '#f4f8fd' }}>MARINE MAP</div>
      </div>

      {/* Latest sightings, numbered to match the tags on their pins */}
      {latest.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 96,
            left: 30,
            width: 300,
            background: 'rgba(10,20,32,.62)',
            border: '1px solid rgba(255,255,255,.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: 14,
            padding: '10px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'none',
            zIndex: OVERLAY_Z,
          }}
        >
          <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 10, letterSpacing: '.16em', color: '#9ec7ef', textTransform: 'uppercase' }}>
            Latest sightings
          </div>
          {latest.map((s, i) => {
            const color = speciesColor(s.species, theme);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: color,
                    color: theme.isLight ? '#fff' : '#0d1729',
                    fontFamily: FONT_FAMILIES.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#f4f8fd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.label}
                  {s.count ? <span style={{ color: '#c3d3e4', fontWeight: 400 }}> · {s.count}</span> : null}
                </span>
                <span style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 11, color: '#c3d3e4', flexShrink: 0 }}>{s.hoursAgoLabel}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Zoom, kept quiet: two small glyphs bottom-left */}
      <div style={{ position: 'absolute', bottom: 22, left: 24, display: 'flex', gap: 6, zIndex: OVERLAY_Z }}>
        {[
          { glyph: '+', label: 'Zoom in', go: () => map?.zoomIn() },
          { glyph: '−', label: 'Zoom out', go: () => map?.zoomOut() },
        ].map((b) => (
          <button
            key={b.glyph}
            onClick={b.go}
            title={b.label}
            aria-label={b.label}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.12)',
              background: 'rgba(10,20,32,.45)',
              color: '#c3d3e4',
              fontFamily: FONT_FAMILIES.mono,
              fontSize: 17,
              lineHeight: 1,
              cursor: 'pointer',
              opacity: 0.55,
              padding: 0,
            }}
          >
            {b.glyph}
          </button>
        ))}
      </div>

      {/* Top-right: legend + LIVE on one row */}
      <div style={{ position: 'absolute', top: 30, right: 30, display: 'flex', alignItems: 'center', gap: 10, zIndex: OVERLAY_Z }}>
        {(legend.length ? legend : (['orca'] as SightingSpecies[])).map((sp) => (
          <span key={sp} style={glassPill}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: speciesColor(sp, theme) }} />
            {SPECIES_LABEL[sp]}
          </span>
        ))}
        <span style={{ ...glassPill, gap: 9, padding: '8px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isPlaceholder ? '#f59e0b' : theme.liveGreen, animation: isPlaceholder ? undefined : 'dashboardBlink 1.6s infinite' }} />
          {liveLabel}
        </span>
      </div>
    </div>
  );
}
