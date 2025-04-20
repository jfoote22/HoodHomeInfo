'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, ChevronDown, ChevronUp } from 'lucide-react';

export default function Hero() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    // Prevent auto-scrolling
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    
    return () => {
      clearInterval(timer);
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
    <div className="h-full relative bg-gradient-to-b from-blue-900 via-indigo-800 to-purple-900 text-white flex flex-col items-center justify-center px-4 py-10 rounded-xl shadow-md">
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/50 via-indigo-800/50 to-purple-800/50 bg-cover bg-center opacity-70">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>
      
      <div className="relative z-10 text-center w-full max-w-lg py-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl md:text-6xl font-bold">
            Hood Canal
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-lg w-full">
            <div className="flex items-center justify-center">
              {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
                <Sun className="w-7 h-7 mr-3 text-yellow-300" />
              ) : (
                <Moon className="w-7 h-7 mr-3 text-blue-200" />
              )}
              <span className="text-4xl font-bold">{formattedTime}</span>
            </div>
            <div className="text-lg text-blue-100 mt-2">
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 