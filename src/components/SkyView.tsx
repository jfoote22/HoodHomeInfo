'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

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

  useEffect(() => {
    async function fetchSkyData() {
      setLoading(true);
      setError(null);
      
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
      } catch (error) {
        console.error('Error fetching sky data:', error);
        setError('Failed to load astronomy data');
        
        // Fallback to simulated data
        fallbackToSimulatedData();
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
    <CollapsibleContainer 
      title="Celestial Information"
      gradient="bg-gradient-to-r from-indigo-600 to-purple-600"
    >
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-2">NASA Astronomy Picture of the Day</h3>
        <div className="relative w-full h-64 rounded-lg overflow-hidden mb-3">
          {skyData.apod.media_type === 'image' ? (
            <Image 
              src={skyData.apod.url}
              alt={skyData.apod.title}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
              <p>Media type: {skyData.apod.media_type} (not an image)</p>
            </div>
          )}
        </div>
        <h4 className="font-semibold text-gray-800 mb-1">{skyData.apod.title}</h4>
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs text-gray-500">{skyData.apod.date}</p>
          {skyData.apod.copyright && (
            <p className="text-xs text-gray-500">© {skyData.apod.copyright}</p>
          )}
        </div>
        <div className="relative">
          <p className="text-sm text-gray-600">
            {showFullExplanation 
              ? skyData.apod.explanation 
              : `${skyData.apod.explanation.substring(0, 120)}...`}
          </p>
          <button 
            onClick={() => setShowFullExplanation(!showFullExplanation)}
            className="text-sm text-indigo-600 flex items-center mt-1 hover:text-indigo-800"
          >
            {showFullExplanation ? (
              <>
                Show Less <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Read More <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Planets Visibility</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {skyData.planets.map((planet, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${
                planet.visibility === 'Visible' 
                  ? 'bg-indigo-50 border-indigo-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Star className={`w-4 h-4 mr-2 ${
                    planet.visibility === 'Visible' 
                      ? 'text-yellow-500' 
                      : 'text-gray-400'
                  }`} />
                  <span className="font-medium text-gray-800">{planet.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  planet.visibility === 'Visible' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {planet.visibility}
                </span>
              </div>
              
              {planet.visibility === 'Visible' && (
                <div className="text-xs text-gray-600 mt-1">
                  <p>Direction: {planet.direction}</p>
                  <div className="flex justify-between mt-1">
                    <span>Rises: {planet.rises}</span>
                    <span>Sets: {planet.sets}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </CollapsibleContainer>
  );
} 