'use client';

import { useState, useEffect } from 'react';

export interface TideInfo {
  type: 'High' | 'Low';
  time: string;
  height?: string;
}

export interface WeatherInfo {
  temp: number;
  condition: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
}

export interface LocalData {
  time: string;
  weather?: WeatherInfo;
  tides?: {
    current?: TideInfo;
    next: TideInfo;
    today: TideInfo[];
  };
  sunrise?: string;
  sunset?: string;
}

export function useLocalData() {
  const [localData, setLocalData] = useState<LocalData>({
    time: new Date().toLocaleTimeString(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalData(prev => ({
        ...prev,
        time: new Date().toLocaleTimeString()
      }));
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch weather, tides, and sun data
  useEffect(() => {
    async function fetchLocalData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a production app, we would make real API calls here
        // For now, we're simulating the data

        // Simulated weather data
        const weatherData: WeatherInfo = {
          temp: Math.floor(Math.random() * 20) + 60, // Random temp between 60-80F
          condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
          windSpeed: Math.floor(Math.random() * 10) + 2, // Random wind speed between 2-12 mph
          windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)]
        };

        // Generate simulated tides
        const now = new Date();
        const tideTypes: ('High' | 'Low')[] = ['High', 'Low', 'High', 'Low'];
        const tideHours = [3, 9, 15, 21]; // Simulated tide times at 3am, 9am, 3pm, 9pm
        
        const todayTides = tideTypes.map((type, index) => {
          const tideTime = new Date(now);
          tideTime.setHours(tideHours[index], 0, 0, 0);
          
          return {
            type,
            time: tideTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            height: type === 'High' ? 
              `${(Math.random() * 2 + 10).toFixed(1)} ft` : 
              `${(Math.random() * 2 + 1).toFixed(1)} ft`
          };
        });

        // Find current and next tide
        let currentTideIndex = -1;
        for (let i = 0; i < todayTides.length; i++) {
          const tideTime = new Date(now);
          const [hours, minutes] = todayTides[i].time.split(':');
          tideTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          if (tideTime <= now && (i === todayTides.length - 1 || new Date(now).setHours(parseInt(todayTides[i+1].time.split(':')[0]), parseInt(todayTides[i+1].time.split(':')[1]), 0, 0) > now.getTime())) {
            currentTideIndex = i;
            break;
          }
        }
        
        const nextTideIndex = (currentTideIndex + 1) % todayTides.length;

        // Calculate sunrise and sunset times (simulated)
        const sunriseHour = 6;
        const sunriseMinute = 30;
        const sunsetHour = 20;
        const sunsetMinute = 15;

        const sunrise = `${sunriseHour}:${sunriseMinute.toString().padStart(2, '0')} AM`;
        const sunset = `${sunsetHour - 12}:${sunsetMinute.toString().padStart(2, '0')} PM`;

        setLocalData({
          time: new Date().toLocaleTimeString(),
          weather: weatherData,
          tides: {
            current: currentTideIndex >= 0 ? todayTides[currentTideIndex] : undefined,
            next: todayTides[nextTideIndex],
            today: todayTides
          },
          sunrise,
          sunset
        });
      } catch (err) {
        setError('Error fetching local data');
        console.error('Error fetching local data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLocalData();
    
    // In a real app, you might want to refresh this data periodically
    const dataRefreshInterval = setInterval(fetchLocalData, 30 * 60 * 1000); // Refresh every 30 minutes
    
    return () => clearInterval(dataRefreshInterval);
  }, []);

  return { localData, isLoading, error };
} 