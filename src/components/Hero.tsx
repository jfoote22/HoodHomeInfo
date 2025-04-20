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
    <div className={`relative bg-gradient-to-b from-blue-900 via-indigo-800 to-purple-900 text-white flex flex-col items-center justify-center px-4 ${isExpanded ? 'py-10' : 'py-6'} rounded-xl shadow-md transition-all duration-300`}>
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/50 via-indigo-800/50 to-purple-800/50 bg-cover bg-center opacity-70">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>
      
      {/* Toggle button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-1 right-3 text-white/70 hover:text-white focus:outline-none z-10"
        aria-label={isExpanded ? "Collapse header" : "Expand header"}
      >
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      
      <div className="relative z-10 text-center w-full max-w-lg">
        <div className={`flex ${isExpanded ? 'flex-col' : 'flex-row flex-wrap'} items-center justify-center gap-4`}>
          <h1 className={`${isExpanded ? 'text-5xl md:text-6xl' : 'text-3xl'} font-bold transition-all duration-300`}>
            Hood Canal
          </h1>
          
          <div className={`bg-white/10 backdrop-blur-sm px-5 py-3 rounded-lg transition-all duration-300 ${isExpanded ? 'w-full' : 'ml-2'}`}>
            <div className="flex items-center justify-center">
              {currentTime.getHours() >= 6 && currentTime.getHours() < 18 ? (
                <Sun className={`${isExpanded ? 'w-7 h-7 mr-3' : 'w-5 h-5 mr-2'} text-yellow-300 transition-all duration-300`} />
              ) : (
                <Moon className={`${isExpanded ? 'w-7 h-7 mr-3' : 'w-5 h-5 mr-2'} text-blue-200 transition-all duration-300`} />
              )}
              <span className={`${isExpanded ? 'text-4xl' : 'text-xl'} font-bold transition-all duration-300`}>{formattedTime}</span>
            </div>
            {isExpanded && (
              <div className="text-lg text-blue-100 mt-2">
                {formattedDate}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 