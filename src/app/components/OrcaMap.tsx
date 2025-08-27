import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// Get the API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Define the container style for the map
const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem'
};

// Center on Puget Sound area
const center = {
  lat: 47.6255,
  lng: -122.9289
};

// Use types that match marker color logic
const sightings = [
  { id: 1, type: 'realtime', lat: 47.6355, lng: -122.9389, date: '2023-05-15', pod: 'J Pod' },
  { id: 2, type: 'recent', lat: 47.7062, lng: -122.4321, date: '2023-05-16', pod: 'Unknown' },
  { id: 3, type: 'historical', lat: 47.5062, lng: -122.2321, date: '2023-05-17', pod: 'Unknown' },
  { id: 4, type: 'realtime', lat: 47.8062, lng: -122.5321, date: '2023-05-18', pod: 'K Pod' },
];

// Map the sighting type to a marker color
const getMarkerColor = (type: string) => {
  switch (type) {
    case 'realtime':
      return 'red';
    case 'recent':
      return 'orange';
    case 'historical':
      return 'blue';
    default:
      return 'red';
  }
};

interface OrcaMapProps {
  className?: string;
}

const OrcaMap: React.FC<OrcaMapProps> = ({ className = '' }) => {
  const [selectedSighting, setSelectedSighting] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const mapOptions: google.maps.MapOptions = {
    mapTypeControl: true,
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.TERRAIN,
  };

  return (
    <div className={`p-4 bg-white rounded-lg shadow-lg ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Recent Orca Sightings</h2>
      
      {!apiKey ? (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment.
        </div>
      ) : (
        <>
          <LoadScript
            googleMapsApiKey={apiKey}
            onLoad={() => setIsLoaded(true)}
          >
            {!isLoaded && (
              <div className="flex justify-center items-center h-[400px] bg-gray-100 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
              </div>
            )}
            
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={10}
              options={mapOptions}
            >
              {sightings.map((sighting) => (
                <Marker
                  key={sighting.id}
                  position={{ lat: sighting.lat, lng: sighting.lng }}
                  icon={{
                    url: `/images/marker-${getMarkerColor(sighting.type)}.png`,
                  }}
                  onClick={() => setSelectedSighting(sighting)}
                />
              ))}
              
              {selectedSighting && (
                <InfoWindow
                  position={{ lat: selectedSighting.lat, lng: selectedSighting.lng }}
                  onCloseClick={() => setSelectedSighting(null)}
                >
                  <div className="p-2">
                    <h3 className="font-bold">{selectedSighting.pod}</h3>
                    <p>Type: {selectedSighting.type}</p>
                    <p>Date: {selectedSighting.date}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>
              <span className="text-black">Real-time</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
              <span className="text-black">Recent</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-600 mr-2"></div>
              <span className="text-black">Historical</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrcaMap; 