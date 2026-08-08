'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DivIcon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardTheme, FONT_FAMILIES } from './theme';
import { useOrcaSightings } from '../../lib/hooks/useOrcaSightings';
import { useTideCurve } from '../../lib/hooks/useTideCurve';

const UNION_WA: [number, number] = [47.36, -123.1]; // from the design handoff's stated coordinates

const HOOD_CANAL_BOUNDS = new LatLngBounds([47.15, -123.55], [48.55, -122.25]);

function pingIcon(color: string, isLight: boolean) {
  return new DivIcon({
    className: '',
    html: `
      <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:34px;height:34px;border-radius:50%;background:${color};opacity:.16"></div>
        <div style="position:absolute;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid ${isLight ? '#fff' : '#0d1729'}"></div>
        <div class="hh-ping-ring" style="position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid ${color};"></div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function unionIcon(color: string, ink: string) {
  return new DivIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;gap:8px;transform:translate(-4px,-4px);">
        <div style="width:16px;height:16px;background:${color};border:2px solid ${ink};transform:rotate(45deg);border-radius:3px;"></div>
      </div>
    `,
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

export default function MarineMapPanel({ theme }: { theme: DashboardTheme }) {
  const { sightings } = useOrcaSightings();
  const { data: tide } = useTideCurve();

  const tileUrl = theme.isLight
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  const orcaColor = theme.map.accentA;
  const minkeColor = theme.map.accentB;

  const tideDirectionLabel = tide?.trend ? (tide.trend === 'rising' ? 'flooding' : 'ebbing') : '—';
  const tideRateLabel = tide?.trendRateLabel || '—';

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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Marker position={UNION_WA} icon={unionIcon(theme.map.accentB, theme.map.ink)}>
          <Popup>Union, WA</Popup>
        </Marker>
        {sightings.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={pingIcon(s.species === 'minke' ? minkeColor : orcaColor, theme.isLight)}>
            <Popup>
              <strong>{s.label}</strong>
              <br />
              {s.hoursAgoLabel}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legibility scrims */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'linear-gradient(180deg, rgba(6,12,22,.78), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(0deg, rgba(6,12,22,.68), transparent)', pointerEvents: 'none' }} />

      {/* Title */}
      <div style={{ position: 'absolute', top: 26, left: 30, pointerEvents: 'none' }}>
        <div style={{ fontFamily: FONT_FAMILIES.mono, fontSize: 13, letterSpacing: '.24em', color: '#9ec7ef', textTransform: 'uppercase' }}>Union, WA</div>
        <div style={{ fontFamily: FONT_FAMILIES.display, fontWeight: 700, fontSize: 54, lineHeight: 0.95, letterSpacing: 1, color: '#f4f8fd' }}>MARINE MAP</div>
      </div>

      {/* Live badge */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          right: 30,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          background: 'rgba(10,20,32,.6)',
          border: '1px solid rgba(255,255,255,.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: 999,
          padding: '8px 14px',
          fontSize: 14,
          color: '#dbe6f2',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.liveGreen, animation: 'dashboardBlink 1.6s infinite' }} />
        LIVE · {sightings.length} sighting{sightings.length === 1 ? '' : 's'} today
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 26, left: 30, display: 'flex', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(10,20,32,.6)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '7px 14px', fontSize: 14, color: '#dbe6f2' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: orcaColor }} />
          Orca
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(10,20,32,.6)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '7px 14px', fontSize: 14, color: '#dbe6f2' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: minkeColor }} />
          Minke
        </span>
      </div>

      {/* Tide direction badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 26,
          right: 30,
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
