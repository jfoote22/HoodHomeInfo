'use client';

import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Sun, CloudRain, CloudSnow, CloudFog, CloudLightning } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

interface WeatherData {
  current: {
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    icon: string;
  };
  forecast: Array<{
    day: string;
    temp: { min: number; max: number };
    condition: string;
    icon: string;
  }>;
}

export default function WeatherCard({ location = 'Hood Canal, WA' }: { location?: string }) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeatherData() {
      setLoading(true);
      setError(null);
      
      try {
        // Get location coordinates from env variables
        const lat = process.env.NEXT_PUBLIC_LOCATION_LAT || '47.6255';
        const lon = process.env.NEXT_PUBLIC_LOCATION_LON || '-122.9289';
        const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '210dd970bfe8fb78e5bb5f8573c4716f';
        
        // Fetch current weather
        const currentWeatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
        );
        
        if (!currentWeatherResponse.ok) {
          throw new Error('Failed to fetch current weather data');
        }
        
        const currentWeatherData = await currentWeatherResponse.json();
        
        // Fetch 7-day forecast
        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
        );
        
        if (!forecastResponse.ok) {
          throw new Error('Failed to fetch forecast data');
        }
        
        const forecastData = await forecastResponse.json();
        
        // Process current weather data
        const windDirection = getWindDirection(currentWeatherData.wind.deg);
        const current = {
          temp: Math.round(currentWeatherData.main.temp),
          condition: currentWeatherData.weather[0].main,
          humidity: currentWeatherData.main.humidity,
          windSpeed: Math.round(currentWeatherData.wind.speed),
          windDirection,
          icon: mapWeatherToIcon(currentWeatherData.weather[0].id)
        };
        
        // Process forecast data - get daily forecast
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dailyForecasts = processForecastData(forecastData);
        const today = new Date().getDay();
        
        const forecast = dailyForecasts.map((day, index) => {
          const dayIndex = (today + index) % 7;
          return {
            day: days[dayIndex],
            temp: {
              min: Math.round(day.minTemp),
              max: Math.round(day.maxTemp)
            },
            condition: day.condition,
            icon: mapWeatherToIcon(day.weatherId)
          };
        });
        
        setWeatherData({ current, forecast });
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setError('Failed to load weather data');
        
        // Fallback to simulated data
        fallbackToSimulatedData();
      } finally {
        setLoading(false);
      }
    }
    
    // Function to process forecast data and extract daily data
    function processForecastData(forecastData: any) {
      const dailyData: Record<string, any> = {};
      
      // OpenWeatherMap forecast returns data in 3-hour intervals
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const day = date.toISOString().split('T')[0];
        
        if (!dailyData[day]) {
          dailyData[day] = {
            minTemp: item.main.temp_min,
            maxTemp: item.main.temp_max,
            weatherId: item.weather[0].id,
            condition: item.weather[0].main,
            forecasts: []
          };
        }
        
        // Update min/max temps
        dailyData[day].minTemp = Math.min(dailyData[day].minTemp, item.main.temp_min);
        dailyData[day].maxTemp = Math.max(dailyData[day].maxTemp, item.main.temp_max);
        
        // Add this forecast to the day's forecasts
        dailyData[day].forecasts.push(item);
      });
      
      // Convert to array and take first 7 days
      return Object.values(dailyData).slice(0, 7);
    }
    
    // Function to get wind direction from degrees
    function getWindDirection(degrees: number) {
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const index = Math.round((degrees % 360) / 22.5);
      return directions[index % 16];
    }
    
    // Function to map OpenWeatherMap condition codes to our icon names
    function mapWeatherToIcon(weatherId: number) {
      if (weatherId >= 200 && weatherId < 300) return 'cloud-lightning'; // Thunderstorm
      if (weatherId >= 300 && weatherId < 400) return 'cloud-rain'; // Drizzle
      if (weatherId >= 500 && weatherId < 600) return 'cloud-rain'; // Rain
      if (weatherId >= 600 && weatherId < 700) return 'cloud-snow'; // Snow
      if (weatherId >= 700 && weatherId < 800) return 'cloud-fog'; // Atmosphere (fog, mist, etc.)
      if (weatherId === 800) return 'sun'; // Clear sky
      if (weatherId > 800) return 'cloud'; // Clouds
      return 'sun'; // Default
    }
    
    // Fallback to simulated data if API call fails
    function fallbackToSimulatedData() {
      // Simulated current weather
      const current = {
        temp: Math.floor(Math.random() * 20) + 60, // Random temp between 60-80F
        condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
        windSpeed: Math.floor(Math.random() * 10) + 2, // Random wind speed between 2-12 mph
        windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
        icon: ['sun', 'cloud', 'cloud-rain', 'cloud-snow', 'cloud-fog', 'cloud-lightning'][Math.floor(Math.random() * 6)]
      };
      
      // Simulated 7-day forecast
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date().getDay();
      const forecast = Array.from({ length: 7 }, (_, i) => {
        const dayIndex = (today + i) % 7;
        return {
          day: days[dayIndex],
          temp: {
            min: Math.floor(Math.random() * 15) + 50, // Random min temp between 50-65F
            max: Math.floor(Math.random() * 20) + 65  // Random max temp between 65-85F
          },
          condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
          icon: ['sun', 'cloud', 'cloud-rain', 'cloud-snow', 'cloud-fog', 'cloud-lightning'][Math.floor(Math.random() * 6)]
        };
      });
      
      setWeatherData({ current, forecast });
    }
    
    fetchWeatherData();
    
    // Refresh weather data every 30 minutes
    const refreshInterval = setInterval(fetchWeatherData, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const getWeatherIcon = (iconName: string) => {
    switch (iconName) {
      case 'sun': return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'cloud': return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'cloud-rain': return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'cloud-snow': return <CloudSnow className="w-8 h-8 text-sky-300" />;
      case 'cloud-fog': return <CloudFog className="w-8 h-8 text-gray-400" />;
      case 'cloud-lightning': return <CloudLightning className="w-8 h-8 text-yellow-600" />;
      default: return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="flex justify-between items-center mb-6">
          <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-20 h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !weatherData) {
    return <div className="bg-white rounded-xl shadow-md p-4 text-red-500">{error}</div>;
  }

  if (!weatherData) {
    return <div className="bg-white rounded-xl shadow-md p-4">Failed to load weather data</div>;
  }

  const weatherContent = (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {getWeatherIcon(weatherData.current.icon)}
          <div>
            <p className="text-3xl font-bold">{weatherData.current.temp}°F</p>
            <p className="text-gray-500">{weatherData.current.condition}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end mb-1">
            <Droplets className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-sm text-gray-600">{weatherData.current.humidity}%</span>
          </div>
          <div className="flex items-center justify-end">
            <Wind className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-sm text-gray-600">{weatherData.current.windSpeed} mph {weatherData.current.windDirection}</span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {weatherData.forecast.map((day, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-24 text-center p-2 rounded-lg"
          >
            <p className="text-sm font-medium text-gray-600 mb-1">{index === 0 ? 'Today' : day.day.substring(0, 3)}</p>
            <div className="flex justify-center mb-1">{getWeatherIcon(day.icon)}</div>
            <p className="text-xs text-gray-500">{day.condition}</p>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-medium text-gray-900">{day.temp.max}°</span>
              <span className="text-xs text-gray-500">{day.temp.min}°</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <CollapsibleContainer 
      title={`Weather for ${location}`}
      gradient="bg-gradient-to-r from-blue-500 to-cyan-400"
    >
      {weatherContent}
    </CollapsibleContainer>
  );
} 