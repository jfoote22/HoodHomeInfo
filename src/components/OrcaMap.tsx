'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface OrcaSighting {
  id: string;
  lat: number;
  lng: number;
  date: string;
  location: string;
  details: string;
}

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 47.6255,
  lng: -122.9289
};

const mapOptions = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  mapTypeId: 'terrain'
};

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ', Washington, USA')}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function OrcaMap() {
  const [sightings, setSightings] = useState<OrcaSighting[]>([]);
  const [selectedSighting, setSelectedSighting] = useState<OrcaSighting | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    async function fetchAndGeocodeSightings() {
      setLoading(true);
      try {
        const res = await fetch('/api/orca-sightings/live');
        const { sightings } = await res.json();
        // Geocode all locations in parallel, filter out those that fail
        const geocoded = await Promise.all(
          sightings.map(async (s: any, idx: number) => {
            const geo = await geocodeLocation(s.location);
            if (geo) {
              return {
                id: `${s.date}-${s.location}-${idx}`,
                lat: geo.lat,
                lng: geo.lng,
                date: s.date,
                location: s.location,
                details: s.details,
              };
            }
            return null;
          })
        );
        setSightings(geocoded.filter(Boolean) as OrcaSighting[]);
      } catch (err) {
        setSightings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAndGeocodeSightings();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <div className="relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={8}
          onLoad={onMapLoad}
          options={mapOptions}
        >
          {/* Orca sightings markers */}
          {sightings.map((sighting) => (
            <Marker
              key={sighting.id}
              position={{ lat: sighting.lat, lng: sighting.lng }}
              onClick={() => setSelectedSighting(sighting)}
              icon={'/images/marker-blue.png'}
            />
          ))}
          {/* Info Window for selected sighting */}
          {selectedSighting && (
            <InfoWindow
              position={{ lat: selectedSighting.lat, lng: selectedSighting.lng }}
              onCloseClick={() => setSelectedSighting(null)}
            >
              <div className="p-2 max-w-xs">
                <div className="font-semibold text-sm border-b pb-1 mb-1">Orca Sighting</div>
                <div className="text-xs mb-1"><b>Date:</b> {selectedSighting.date}</div>
                <div className="text-xs mb-1"><b>Location:</b> {selectedSighting.location}</div>
                <div className="text-xs"><b>Details:</b> {selectedSighting.details}</div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
        {/* Map legend */}
        <div className="absolute bottom-2 left-2 bg-white p-2 rounded-md shadow-md text-xs text-black">
          <div className="font-semibold mb-1">Sighting Markers:</div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
            <span>Live Sightings (from Orca Network)</span>
          </div>
        </div>
      </div>
    </LoadScript>
  );
} 