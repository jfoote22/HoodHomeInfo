'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icons
const createOrcaIcon = (type: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const colors = {
    'Resident': '#22c55e', // Green
    'Transient': '#f59e0b', // Amber
    'Offshore': '#3b82f6',  // Blue
    'Unknown': '#6b7280'    // Gray
  };
  
  const sizes = {
    small: 20,
    medium: 30,
    large: 40
  };
  
  const iconSize = sizes[size];
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${colors[type] || colors.Unknown}" stroke="white" stroke-width="2"/>
        <path d="M8 10 C8 8, 10 8, 12 8 C14 8, 16 8, 16 10 L16 14 C16 16, 14 16, 12 16 C10 16, 8 16, 8 14 Z" fill="white"/>
        <circle cx="10" cy="11" r="1" fill="${colors[type] || colors.Unknown}"/>
        <circle cx="14" cy="11" r="1" fill="${colors[type] || colors.Unknown}"/>
        <path d="M10 13 Q12 15, 14 13" stroke="${colors[type] || colors.Unknown}" stroke-width="1" fill="none"/>
      </svg>
    `)}`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
    popupAnchor: [0, -iconSize / 2]
  });
};

interface OrcaSighting {
  id: string;
  lat: number;
  lng: number;
  pod: string;
  species: string;
  count: number;
  date: string;
  time: string;
  location: string;
  behavior: string;
  observer: string;
  confidence: 'High' | 'Medium' | 'Low';
  type: 'Resident' | 'Transient' | 'Offshore' | 'Unknown';
}

export default function EnhancedOrcaMap() {
  const [sightings, setSightings] = useState<OrcaSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPod, setSelectedPod] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<string>('7days');
  const [isMockData, setIsMockData] = useState(false);

  // Puget Sound bounds for better map focus
  const pugetSoundBounds = new LatLngBounds(
    [46.8, -123.2], // Southwest corner
    [48.8, -122.0]  // Northeast corner
  );

  useEffect(() => {
    async function fetchOrcaSightings() {
      setLoading(true);
      try {
        // Try to fetch real data first
        const response = await fetch('/api/orca-sightings/live');
        const data = await response.json();
        
        if (data.sightings && data.sightings.length > 0) {
          setSightings(data.sightings);
        } else {
          // Fallback to enhanced simulated data
          fallbackToSimulatedData();
          setIsMockData(true);
        }
      } catch (error) {
        console.error('Error fetching orca data:', error);
        fallbackToSimulatedData();
        setIsMockData(true);
      } finally {
        setLoading(false);
      }
    }

    function fallbackToSimulatedData() {
      // Enhanced simulated orca sightings across Puget Sound
      const locations = [
        { name: "Hood Canal", lat: 47.6255, lng: -122.9289, likelihood: 0.3 },
        { name: "San Juan Islands", lat: 48.5444, lng: -123.0960, likelihood: 0.9 },
        { name: "Strait of Juan de Fuca", lat: 48.1500, lng: -123.8000, likelihood: 0.8 },
        { name: "Elliott Bay", lat: 47.6062, lng: -122.3321, likelihood: 0.4 },
        { name: "Admiralty Inlet", lat: 48.1000, lng: -122.7500, likelihood: 0.6 },
        { name: "Saratoga Passage", lat: 48.2000, lng: -122.5000, likelihood: 0.5 },
        { name: "Deception Pass", lat: 48.4044, lng: -122.6100, likelihood: 0.7 },
        { name: "Lime Kiln Point", lat: 48.5158, lng: -123.1525, likelihood: 0.95 },
        { name: "Race Rocks", lat: 48.2983, lng: -123.5318, likelihood: 0.8 },
        { name: "Point No Point", lat: 47.9121, lng: -122.5265, likelihood: 0.4 }
      ];

      const pods = ['J-Pod', 'K-Pod', 'L-Pod', 'T065A', 'T077', 'T137', 'Unknown'];
      const behaviors = ['Foraging', 'Traveling', 'Socializing', 'Resting', 'Hunting'];
      const observers = ['Whale Watch Boat', 'Ferry Passenger', 'Shore Observer', 'Research Team', 'Airplane Pilot'];
      
      const mockSightings: OrcaSighting[] = [];
      
      locations.forEach((location, index) => {
        // Generate sightings based on likelihood
        if (Math.random() < location.likelihood) {
          const daysAgo = Math.floor(Math.random() * 14);
          const sightingDate = new Date();
          sightingDate.setDate(sightingDate.getDate() - daysAgo);
          
          // Add some random offset to location
          const latOffset = (Math.random() - 0.5) * 0.05;
          const lngOffset = (Math.random() - 0.5) * 0.05;
          
          const podType = Math.random() > 0.7 ? 'Resident' : Math.random() > 0.5 ? 'Transient' : 'Offshore';
          
          mockSightings.push({
            id: `sighting-${index}-${Date.now()}`,
            lat: location.lat + latOffset,
            lng: location.lng + lngOffset,
            pod: pods[Math.floor(Math.random() * pods.length)],
            species: 'Orcinus orca',
            count: Math.floor(Math.random() * 12) + 1,
            date: sightingDate.toLocaleDateString(),
            time: `${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '00' : '30'} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
            location: location.name,
            behavior: behaviors[Math.floor(Math.random() * behaviors.length)],
            observer: observers[Math.floor(Math.random() * observers.length)],
            confidence: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low',
            type: podType as 'Resident' | 'Transient' | 'Offshore'
          });
        }
      });

      setSightings(mockSightings);
    }

    fetchOrcaSightings();
    
    // Refresh every hour
    const interval = setInterval(fetchOrcaSightings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredSightings = sightings.filter(sighting => {
    if (selectedPod !== 'All' && sighting.pod !== selectedPod) return false;
    
    if (timeFilter !== 'all') {
      const sightingDate = new Date(sighting.date);
      const now = new Date();
      const daysDiff = (now.getTime() - sightingDate.getTime()) / (1000 * 3600 * 24);
      
      switch (timeFilter) {
        case '1day':
          return daysDiff <= 1;
        case '3days':
          return daysDiff <= 3;
        case '7days':
          return daysDiff <= 7;
        case '30days':
          return daysDiff <= 30;
      }
    }
    
    return true;
  });

  const uniquePods = ['All', ...Array.from(new Set(sightings.map(s => s.pod)))];

  if (loading) {
    return (
      <div className="h-96 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 mx-auto border-4 border-cyan-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-white text-lg">Loading orca sighting data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Compact controls */}
      <div className="p-2 bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-indigo-600/20 border-b border-white/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <select
              value={selectedPod}
              onChange={(e) => setSelectedPod(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 text-sm backdrop-blur-sm"
            >
              {uniquePods.map(pod => (
                <option key={pod} value={pod} className="bg-slate-800">{pod}</option>
              ))}
            </select>
            
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-2 py-1 text-sm backdrop-blur-sm"
            >
              <option value="7days" className="bg-slate-800">Last Week</option>
              <option value="30days" className="bg-slate-800">Last Month</option>
            </select>
          </div>
          
          <div className="text-white/90 text-sm font-medium">
            {filteredSightings.length} sightings
          </div>
        </div>
        
        {/* Compact Legend */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-white/90 text-xs">Resident</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-white/90 text-xs">Transient</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-white/90 text-xs">Offshore</span>
          </div>
        </div>
      </div>
      
      {/* Compact Map */}
      <div className="h-40 relative">
        <MapContainer
          bounds={pugetSoundBounds}
          className="h-full w-full z-0"
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {filteredSightings.map((sighting) => (
            <Marker
              key={sighting.id}
              position={[sighting.lat, sighting.lng]}
              icon={createOrcaIcon(sighting.type, 'medium')}
            >
              <Popup className="custom-popup">
                <div className="p-2 max-w-xs">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">{sighting.pod}</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Location:</strong> {sighting.location}</div>
                    <div><strong>Date:</strong> {sighting.date} at {sighting.time}</div>
                    <div><strong>Count:</strong> {sighting.count} individuals</div>
                    <div><strong>Behavior:</strong> {sighting.behavior}</div>
                    <div><strong>Observer:</strong> {sighting.observer}</div>
                    <div><strong>Type:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                        sighting.type === 'Resident' ? 'bg-green-100 text-green-800' :
                        sighting.type === 'Transient' ? 'bg-amber-100 text-amber-800' :
                        sighting.type === 'Offshore' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sighting.type}
                      </span>
                    </div>
                    <div><strong>Confidence:</strong>
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                        sighting.confidence === 'High' ? 'bg-green-100 text-green-800' :
                        sighting.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sighting.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Mock data indicator */}
        {isMockData && (
          <div className="absolute top-4 right-4 z-10 bg-red-500/90 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-sm border border-red-300/50">
            SIMULATED DATA
          </div>
        )}
      </div>
      
      {/* Compact Statistics */}
      <div className="p-2 bg-gradient-to-r from-slate-900/50 via-cyan-900/50 to-blue-900/50 border-t border-white/20">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{filteredSightings.length}</div>
            <div className="text-white/70 text-xs">Sightings</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">
              {filteredSightings.reduce((sum, s) => sum + s.count, 0)}
            </div>
            <div className="text-white/70 text-xs">Individuals</div>
          </div>
        </div>
      </div>
    </div>
  );
}