'use client';

import { useState, useEffect } from 'react';

interface WeatherCondition {
  condition: string;
  temp: number;
  icon: string;
}

interface AtmosphericBackgroundProps {
  children: React.ReactNode;
}

export default function AtmosphericBackground({ children }: AtmosphericBackgroundProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [backgroundStyle, setBackgroundStyle] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch current weather for background theming
    async function fetchWeather() {
      try {
        const lat = process.env.NEXT_PUBLIC_LOCATION_LAT || '47.6255';
        const lon = process.env.NEXT_PUBLIC_LOCATION_LON || '-122.9289';
        const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '210dd970bfe8fb78e5bb5f8573c4716f';
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`
        );
        
        if (response.ok) {
          const data = await response.json();
          setWeather({
            condition: data.weather[0].main,
            temp: Math.round(data.main.temp),
            icon: data.weather[0].icon
          });
        }
      } catch (error) {
        console.error('Error fetching weather for background:', error);
        // Fallback weather
        setWeather({
          condition: 'Clear',
          temp: 72,
          icon: '01d'
        });
      }
    }

    fetchWeather();
    // Refresh weather every 30 minutes
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeDecimal = hour + minute / 60;
    
    // Define time periods with smooth transitions
    let timeTheme = '';
    let weatherOverlay = '';

    // Time-based theming
    if (timeDecimal >= 5 && timeDecimal < 7) {
      // Dawn
      timeTheme = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)';
    } else if (timeDecimal >= 7 && timeDecimal < 10) {
      // Morning
      timeTheme = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    } else if (timeDecimal >= 10 && timeDecimal < 17) {
      // Day
      timeTheme = 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)';
    } else if (timeDecimal >= 17 && timeDecimal < 19) {
      // Golden Hour
      timeTheme = 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)';
    } else if (timeDecimal >= 19 && timeDecimal < 21) {
      // Sunset
      timeTheme = 'linear-gradient(135deg, #ff8a80 0%, #ff80ab 50%, #b39ddb 100%)';
    } else {
      // Night
      timeTheme = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)';
    }

    // Weather-based overlay
    if (weather) {
      switch (weather.condition.toLowerCase()) {
        case 'rain':
        case 'drizzle':
          weatherOverlay = ', linear-gradient(135deg, rgba(54, 84, 134, 0.4) 0%, rgba(66, 153, 225, 0.3) 100%)';
          break;
        case 'snow':
          weatherOverlay = ', linear-gradient(135deg, rgba(247, 250, 252, 0.6) 0%, rgba(226, 232, 240, 0.4) 100%)';
          break;
        case 'clouds':
          weatherOverlay = ', linear-gradient(135deg, rgba(113, 128, 150, 0.3) 0%, rgba(160, 174, 192, 0.2) 100%)';
          break;
        case 'clear':
          if (timeDecimal >= 7 && timeDecimal < 17) {
            weatherOverlay = ', linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)';
          }
          break;
        case 'thunderstorm':
          weatherOverlay = ', linear-gradient(135deg, rgba(45, 55, 72, 0.6) 0%, rgba(74, 85, 104, 0.4) 100%)';
          break;
        default:
          weatherOverlay = '';
      }
    }

    // Combine time theme with weather overlay
    const finalBackground = `${timeTheme}${weatherOverlay}`;
    
    // Add Hood Canal specific imagery overlay
    const hoodCanalOverlay = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm0 0c0 11.046 8.954 20 20 20s20-8.954 20-20-8.954-20-20-20-20 8.954-20 20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

    setBackgroundStyle(`${finalBackground}, ${hoodCanalOverlay}`);
  }, [currentTime, weather]);

  return (
    <div 
      className="min-h-screen transition-all duration-[30000ms] ease-in-out relative"
      style={{ 
        background: backgroundStyle,
        backgroundSize: '400px 400px, 60px 60px',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Atmospheric effects overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle moving gradients for atmosphere */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0 animate-pulse"
            style={{
              background: 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
              animation: 'float 20s ease-in-out infinite'
            }}
          />
        </div>
        
        {/* Weather-specific particle effects */}
        {weather?.condition === 'Rain' && (
          <div className="absolute inset-0 opacity-30">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-px h-4 bg-blue-200 opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `rain ${Math.random() * 2 + 1}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        )}
        
        {weather?.condition === 'Snow' && (
          <div className="absolute inset-0 opacity-40">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-70"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `snow ${Math.random() * 3 + 2}s linear infinite`,
                  animationDelay: `${Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          25% { transform: translateY(-20px) translateX(10px) scale(1.02); }
          50% { transform: translateY(-10px) translateX(20px) scale(0.98); }
          75% { transform: translateY(-30px) translateX(-10px) scale(1.01); }
        }
        
        @keyframes rain {
          0% { transform: translateY(-100vh) translateX(0); opacity: 1; }
          100% { transform: translateY(100vh) translateX(-20px); opacity: 0; }
        }
        
        @keyframes snow {
          0% { transform: translateY(-100vh) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(50px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}