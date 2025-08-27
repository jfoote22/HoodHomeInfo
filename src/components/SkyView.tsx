'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

// Mock data watermark component
const MockDataWatermark = () => (
  <div className="absolute bottom-0 right-0 z-50 bg-red-600 text-white text-xs px-2 py-1 rounded-tl-md font-bold opacity-80">
    MOCK DATA
  </div>
);

interface SkyData {
  apod: {
    title: string;
    url: string;
    explanation: string;
    date: string;
    copyright?: string;
    media_type: string;
  };
  planets: Array<{
    name: string;
    visibility: 'Visible' | 'Not Visible';
    direction?: string;
    rises?: string;
    sets?: string;
  }>;
}

export default function SkyView() {
  const [skyData, setSkyData] = useState<SkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  const [isMockData, setIsMockData] = useState(false);
  const [isPlanetDataMock, setIsPlanetDataMock] = useState(true); // Planets are always mock data
  const [showPlanetSection, setShowPlanetSection] = useState(false);

  useEffect(() => {
    async function fetchSkyData() {
      setLoading(true);
      setError(null);
      setIsMockData(false);
      
      try {
        // Get NASA API key from environment variables
        const nasaApiKey = process.env.NEXT_PUBLIC_NASA_API_KEY || 'DEMO_KEY';
        
        // Fetch NASA's Astronomy Picture of the Day
        const nasaApiUrl = `https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`;
        const response = await fetch(nasaApiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch NASA APOD data');
        }
        
        const apodData = await response.json();
        
        // Process APOD data - ensure we have an image URL
        // If the media type is not an image, use a placeholder
        const apod = {
          title: apodData.title || 'Astronomy Picture of the Day',
          url: apodData.media_type === 'image' ? apodData.url : 
               'https://placehold.co/800x600/062c43/e5e7eb?text=NASA+Astronomy+Picture',
          explanation: apodData.explanation || 'No explanation available.',
          date: apodData.date || new Date().toISOString().split('T')[0],
          copyright: apodData.copyright,
          media_type: apodData.media_type
        };
        
        // Simulated planet visibility - always mock data
        const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
        const directions = ['East', 'West', 'North', 'South', 'Southeast', 'Southwest', 'Northeast', 'Northwest'];
        
        const planets = planetNames.map(name => {
          const isVisible = Math.random() > 0.3; // 70% chance to be visible
          const visibility: 'Visible' | 'Not Visible' = isVisible ? 'Visible' : 'Not Visible';
          
          return {
            name,
            visibility,
            direction: isVisible ? directions[Math.floor(Math.random() * directions.length)] : undefined,
            rises: isVisible ? `${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '30' : '00'} ${Math.random() > 0.5 ? 'AM' : 'PM'}` : undefined,
            sets: isVisible ? `${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '30' : '00'} ${Math.random() > 0.5 ? 'AM' : 'PM'}` : undefined
          };
        });
        
        setSkyData({ apod, planets });
      } catch (error) {
        console.error('Error fetching sky data:', error);
        setError('Failed to load astronomy data');
        
        // Fallback to simulated data
        fallbackToSimulatedData();
        setIsMockData(true); // Mark APOD as mock data when falling back
      } finally {
        setLoading(false);
      }
    }
    
    // Fallback function for simulated data
    function fallbackToSimulatedData() {
      // Simulated APOD (Astronomy Picture of the Day)
      const apod = {
        title: 'The Night Sky Over Hood Canal',
        url: 'https://placehold.co/800x600/062c43/e5e7eb?text=Night+Sky+Over+Hood+Canal',
        explanation: 'Hood Canal at night offers spectacular views of stars and the Milky Way. ' +
          'The absence of major city lights allows for exceptional stargazing opportunities. ' +
          'In this image, you can see the core of our galaxy rising above the Olympic Mountains, ' +
          'with Jupiter and Saturn visible in the southern sky. The reflection of stars on the ' +
          'calm waters of Hood Canal creates a mirror effect, doubling the visual impact of this ' +
          'cosmic display. Taken during the new moon phase to maximize visibility of celestial objects.',
        date: new Date().toISOString().split('T')[0],
        media_type: 'image'
      };
      
      // Simulated planet visibility
      const planetNames = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
      const directions = ['East', 'West', 'North', 'South', 'Southeast', 'Southwest', 'Northeast', 'Northwest'];
      
      const planets = planetNames.map(name => {
        const isVisible = Math.random() > 0.3; // 70% chance to be visible
        const visibility: 'Visible' | 'Not Visible' = isVisible ? 'Visible' : 'Not Visible';
        
        return {
          name,
          visibility,
          direction: isVisible ? directions[Math.floor(Math.random() * directions.length)] : undefined,
          rises: isVisible ? `${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '30' : '00'} ${Math.random() > 0.5 ? 'AM' : 'PM'}` : undefined,
          sets: isVisible ? `${Math.floor(Math.random() * 12) + 1}:${Math.random() > 0.5 ? '30' : '00'} ${Math.random() > 0.5 ? 'AM' : 'PM'}` : undefined
        };
      });
      
      setSkyData({ apod, planets });
    }
    
    fetchSkyData();
    
    // Refresh sky data once per day
    const refreshInterval = setInterval(fetchSkyData, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !skyData) {
    return <div className="bg-white rounded-xl shadow-md p-4 text-red-500">{error}</div>;
  }

  if (!skyData) {
    return <div className="bg-white rounded-xl shadow-md p-4">Failed to load sky data</div>;
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/90 via-indigo-900/90 to-purple-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 relative group hover:shadow-indigo-500/25 transition-all duration-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-white/20">
        <h2 className="text-lg font-bold text-white">Night Sky</h2>
      </div>
      
      <div className="p-3 relative flex-1 flex flex-col">
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
          {skyData?.apod.media_type === 'image' ? (
            <Image 
              src={skyData.apod.url}
              alt={skyData.apod.title}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
              <p>Media type: {skyData?.apod.media_type} (not an image)</p>
            </div>
          )}
          
          {/* Show watermark on APOD if it's mock data */}
          {isMockData && (
            <div className="absolute top-0 right-0 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded-bl-md font-bold opacity-80">
              MOCK IMAGE
            </div>
          )}
        </div>
        <h4 className="font-semibold text-white mb-1 text-sm">{skyData?.apod.title}</h4>
        <p className="text-xs text-white/70 mb-2">{skyData?.apod.date}</p>
        <div className="relative flex-1">
          <p className="text-xs text-white/80 line-clamp-3">
            {skyData?.apod.explanation.substring(0, 150)}...
          </p>
        </div>
        
        {/* Compact Planet visibility */}
        <div className="mt-3 border-t border-white/20 pt-3">
          <h3 className="font-medium text-white text-sm mb-2 flex items-center">
            <Star className="w-3 h-3 mr-1" />
            Visible Planets
          </h3>
          
          <div className="grid grid-cols-3 gap-1">
            {skyData?.planets.slice(0, 3).map((planet) => (
              <div 
                key={planet.name}
                className="bg-white/10 p-1 rounded-md border border-white/20 text-center"
              >
                <div className="flex items-center justify-center mb-1">
                  <Star 
                    className={`w-3 h-3 ${
                      planet.visibility === 'Visible' ? 'text-yellow-400' : 'text-gray-400'
                    }`} 
                  />
                </div>
                <h4 className="text-xs font-medium text-white">{planet.name}</h4>
                <p className={`text-xs ${
                  planet.visibility === 'Visible' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {planet.visibility === 'Visible' ? 'Visible' : 'Hidden'}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Show main watermark if all data is mock */}
        {isMockData && (
          <div className="absolute top-2 right-2 z-20 bg-red-500/90 text-white text-xs px-2 py-1 rounded-full font-bold backdrop-blur-sm border border-red-300/50">
            MOCK
          </div>
        )}
      </div>
    </div>
  );
} 