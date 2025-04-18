'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, ChevronDown } from 'lucide-react';
import HomeChatBot from './HomeChatBot';

export default function Hero() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrollIndicator, setScrollIndicator] = useState(true);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    // Hide scroll indicator after scrolling
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setScrollIndicator(false);
      } else {
        setScrollIndicator(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  return (
    <div className="relative min-h-[60vh] bg-gradient-to-b from-blue-900 via-indigo-800 to-purple-900 text-white flex flex-col items-center justify-center px-4 py-16 mb-8">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/50 via-indigo-800/50 to-purple-800/50 bg-cover bg-center opacity-70">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>
      
      <div className="relative z-10 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-2">
          Hood Canal
        </h1>
        <h2 className="text-xl md:text-3xl font-light mb-6">
          Local Information Hub
        </h2>
        
        <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full mb-8">
          <div className="flex items-center mr-6">
            {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
              <Sun className="w-5 h-5 mr-2 text-yellow-300" />
            ) : (
              <Moon className="w-5 h-5 mr-2 text-blue-200" />
            )}
            <span className="text-xl font-semibold">{formattedTime}</span>
          </div>
          <div className="text-sm md:text-base text-blue-100">
            {formattedDate}
          </div>
        </div>
        
        <p className="max-w-xl text-blue-100 mb-8">
          Your complete guide to Hood Canal&apos;s weather, tides, celestial events, and local happenings.
          Always stay informed about what&apos;s happening around you.
        </p>
      </div>
      
      <div className="relative z-10 w-full max-w-2xl mx-auto mt-4 mb-4">
        <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">Need More Information?</h2>
          <HomeChatBot />
        </div>
      </div>
      
      {scrollIndicator && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center animate-bounce">
          <ChevronDown className="w-8 h-8 text-white/70" />
        </div>
      )}
    </div>
  );
} 