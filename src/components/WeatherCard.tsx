'use client';

import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Sun, CloudRain, CloudSnow, CloudFog, CloudLightning } from 'lucide-react';

// Mock data watermark component
const MockDataWatermark = () => (
  <div className="absolute bottom-0 right-0 z-50 bg-red-600 text-white text-xs px-2 py-1 rounded-tl-md font-bold opacity-80">
    MOCK DATA
  </div>
);

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
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    async function fetchWeatherData() {
      setLoading(true);
      setError(null);
      setIsMockData(false);
      
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
        setIsMockData(true); // Mark as mock data when falling back
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

  const getWeatherIcon = (iconName: string, className: string = 'w-8 h-8') => {
    switch (iconName) {
      case 'sun': return <Sun className={`${className} text-yellow-500`} />;
      case 'cloud': return <Cloud className={`${className} text-gray-500`} />;
      case 'cloud-rain': return <CloudRain className={`${className} text-blue-500`} />;
      case 'cloud-snow': return <CloudSnow className={`${className} text-sky-300`} />;
      case 'cloud-fog': return <CloudFog className={`${className} text-gray-400`} />;
      case 'cloud-lightning': return <CloudLightning className={`${className} text-yellow-600`} />;
      default: return <Sun className={`${className} text-yellow-500`} />;
    }
  };

  if (loading) {
    return (
      <div className="h-full rounded-xl p-6 bg-gradient-to-r from-blue-50 to-sky-50 shadow-md animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 pt-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !weatherData) {
    return <div className="h-full rounded-xl p-6 bg-gradient-to-r from-blue-50 to-sky-50 shadow-md text-red-500">{error}</div>;
  }

  if (!weatherData) {
    return <div className="h-full rounded-xl p-6 bg-gradient-to-r from-blue-50 to-sky-50 shadow-md">Failed to load weather data</div>;
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-xl text-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative group hover:shadow-blue-500/25 transition-all duration-700">
      {/* Atmospheric glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
      
      <div className="relative p-4 z-10">
        {/* Current Weather - Compact Display */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-white/90 mb-2">Current Conditions</h3>
          <div className="flex items-center justify-center mb-4">
            <div className="mr-4">
              {getWeatherIcon(weatherData.current.icon, 'w-12 h-12')}
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-1 font-mono">{weatherData.current.temp}°</div>
              <p className="text-lg text-white/90 font-medium">{weatherData.current.condition}</p>
            </div>
          </div>
          
          {/* Weather details - Compact */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm border border-white/20">
              <div className="flex items-center justify-center mb-1">
                <Droplets className="w-4 h-4 mr-1 text-cyan-300" />
                <span className="text-sm font-medium text-white">Humidity</span>
              </div>
              <div className="text-lg font-bold text-white text-center">{weatherData.current.humidity}%</div>
            </div>
            <div className="bg-white/10 rounded-xl p-2 backdrop-blur-sm border border-white/20">
              <div className="flex items-center justify-center mb-1">
                <Wind className="w-4 h-4 mr-1 text-sky-300" />
                <span className="text-sm font-medium text-white">Wind</span>
              </div>
              <div className="text-lg font-bold text-white text-center">{weatherData.current.windSpeed} mph {weatherData.current.windDirection}</div>
            </div>
          </div>
        </div>
        
        {/* Compact 7-day Forecast */}
        <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20">
          <h4 className="text-base font-semibold text-white mb-3 text-center">7-Day Forecast</h4>
          <div className="grid grid-cols-7 gap-1">
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="text-center bg-white/5 rounded-lg p-2 border border-white/10">
                <p className="text-xs font-semibold text-white/90 mb-1">
                  {index === 0 ? 'Today' : index === 1 ? 'Tom' : day.day.substring(0, 3)}
                </p>
                <div className="my-1">
                  {getWeatherIcon(day.icon, 'w-6 h-6 mx-auto')}
                </div>
                <div className="space-y-0">
                  <p className="text-sm font-bold text-white">{day.temp.max}°</p>
                  <p className="text-xs text-white/70">{day.temp.min}°</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Show watermark for mock data */}
        {isMockData && (
          <div className="absolute top-4 right-4 z-20 bg-red-500/90 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-sm border border-red-300/50">
            MOCK DATA
          </div>
        )}
      </div>
    </div>
  );
} 