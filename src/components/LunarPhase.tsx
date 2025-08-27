'use client';

import { useState, useEffect } from 'react';
import CollapsibleContainer from './CollapsibleContainer';

// Calculated data badge component
const CalculatedDataBadge = () => (
  <div className="absolute bottom-0 right-0 z-50 bg-blue-600 text-white text-xs px-2 py-1 rounded-tl-md font-bold opacity-80">
    CALCULATED DATA
  </div>
);

interface LunarPhaseInfo {
  phase: string;
  illumination: number;
  age: number;
  nextFullMoon: string;
  nextNewMoon: string;
}

export default function LunarPhase() {
  const [lunarData, setLunarData] = useState<LunarPhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Function to calculate moon phase
    // This is a simplified calculation and not 100% accurate
    const calculateMoonPhase = () => {
      const currentDate = new Date();
      
      // Get days since known new moon (Jan 6, 2000)
      const knownNewMoon = new Date(2000, 0, 6, 18, 14);
      const daysSinceKnown = (currentDate.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
      
      // Moon orbital period is approximately 29.53 days
      const lunarCycle = 29.53;
      
      // Calculate current position in lunar cycle (0 to 29.53)
      const moonAge = daysSinceKnown % lunarCycle;
      
      // Calculate moon phase based on age
      let phase = '';
      let illumination = 0;
      
      if (moonAge < 1) {
        phase = 'New Moon';
        illumination = moonAge * 50; // 0-50%
      } else if (moonAge < 7.38) {
        phase = 'Waxing Crescent';
        illumination = 50 * (1 + (moonAge - 1) / 6.38); // 50-100%
      } else if (moonAge < 8.38) {
        phase = 'First Quarter';
        illumination = 50;
      } else if (moonAge < 14.77) {
        phase = 'Waxing Gibbous';
        illumination = 50 + 50 * ((moonAge - 8.38) / 6.39); // 50-100%
      } else if (moonAge < 15.77) {
        phase = 'Full Moon';
        illumination = 100;
      } else if (moonAge < 22.15) {
        phase = 'Waning Gibbous';
        illumination = 100 - 50 * ((moonAge - 15.77) / 6.38); // 100-50%
      } else if (moonAge < 23.15) {
        phase = 'Last Quarter';
        illumination = 50;
      } else {
        phase = 'Waning Crescent';
        illumination = 50 * (1 - (moonAge - 23.15) / 6.38); // 50-0%
      }
      
      // Calculate next full moon date
      const daysToFullMoon = (15.77 - moonAge + lunarCycle) % lunarCycle;
      const nextFullMoon = new Date(currentDate.getTime() + daysToFullMoon * 24 * 60 * 60 * 1000);
      
      // Calculate next new moon date
      const daysToNewMoon = (29.53 - moonAge) % lunarCycle;
      const nextNewMoon = new Date(currentDate.getTime() + daysToNewMoon * 24 * 60 * 60 * 1000);
      
      return {
        phase,
        illumination: Math.round(illumination),
        age: Math.round(moonAge * 10) / 10,
        nextFullMoon: nextFullMoon.toLocaleDateString(undefined, { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        }),
        nextNewMoon: nextNewMoon.toLocaleDateString(undefined, { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })
      };
    };
    
    setLunarData(calculateMoonPhase());
    setLoading(false);
  }, []);

  if (loading || !lunarData) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col text-white">
      {/* Section Header */}
      <div className="px-4 py-2 border-b border-white/20">
        <h2 className="text-lg font-bold text-white flex items-center">
          <span className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
          Lunar Phase
        </h2>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {/* Compact Moon phase title and age */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center mb-1">
            <h3 className="text-lg font-bold text-white">{lunarData.phase}</h3>
            <div className="ml-1 text-xs bg-blue-600 text-white px-1 py-0.5 rounded font-medium">
              CALC
            </div>
          </div>
          <p className="text-sm text-white/80">Age: {lunarData.age} days</p>
        </div>
        
        {/* Compact moon visualization */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            {/* Compact moon rendering */}
            <div className="w-24 h-24 rounded-full relative overflow-hidden shadow-lg border-2 border-white/30">
              {/* Moon base - dark side */}
              <div className="absolute inset-0 bg-gray-900"></div>
              
              {/* Moon texture overlay for realism */}
              <div className="absolute inset-0 opacity-20" 
                style={{
                  backgroundImage: "radial-gradient(circle, transparent 0%, rgba(0,0,0,0.2) 100%), radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 70%), radial-gradient(circle at 70% 65%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 40% 60%, rgba(255,255,255,0.3) 0%, transparent 50%)"
                }}
              ></div>
              
              {/* Illuminated part of the moon based on phase */}
              {lunarData.phase === 'New Moon' && (
                <div className="absolute inset-0 opacity-0"></div>
              )}
              
              {lunarData.phase === 'Full Moon' && (
                <div className="absolute inset-0 bg-gray-100" style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(238,238,238,1) 50%, rgba(220,220,220,1) 100%)"
                }}></div>
              )}
              
              {/* Waxing Crescent - right side getting illuminated */}
              {lunarData.phase.includes('Waxing Crescent') && (
                <div className="absolute inset-y-0 right-0 bg-gray-100 shadow-inner" 
                  style={{
                    width: `${lunarData.illumination/2}%`,
                    borderRadius: "0 100% 100% 0",
                    backgroundImage: "radial-gradient(circle at right, rgba(255,255,255,1) 0%, rgba(220,220,220,1) 100%)"
                  }}
                ></div>
              )}
              
              {/* Waxing Gibbous - left side shadow receding */}
              {lunarData.phase.includes('Waxing Gibbous') && (
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gray-100" style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(238,238,238,1) 50%, rgba(220,220,220,1) 100%)"
                  }}></div>
                  <div 
                    className="absolute inset-y-0 left-0 bg-gray-900 shadow-inner"
                    style={{
                      width: `${100 - lunarData.illumination}%`,
                      borderRadius: "100% 0 0 100%"
                    }}
                  ></div>
                </div>
              )}
              
              {/* Waning Gibbous - right side shadow growing */}
              {lunarData.phase.includes('Waning Gibbous') && (
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gray-100" style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(238,238,238,1) 50%, rgba(220,220,220,1) 100%)"
                  }}></div>
                  <div 
                    className="absolute inset-y-0 right-0 bg-gray-900 shadow-inner"
                    style={{
                      width: `${100 - lunarData.illumination}%`,
                      borderRadius: "0 100% 100% 0"
                    }}
                  ></div>
                </div>
              )}
              
              {/* Waning Crescent - left side remaining illuminated */}
              {lunarData.phase.includes('Waning Crescent') && (
                <div className="absolute inset-y-0 left-0 bg-gray-100 shadow-inner" 
                  style={{
                    width: `${lunarData.illumination/2}%`,
                    borderRadius: "100% 0 0 100%",
                    backgroundImage: "radial-gradient(circle at left, rgba(255,255,255,1) 0%, rgba(220,220,220,1) 100%)"
                  }}
                ></div>
              )}
              
              {/* First Quarter - right half illuminated */}
              {lunarData.phase === 'First Quarter' && (
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gray-100" style={{
                  backgroundImage: "radial-gradient(circle at right, rgba(255,255,255,1) 0%, rgba(220,220,220,1) 100%)"
                }}></div>
              )}
              
              {/* Last Quarter - left half illuminated */}
              {lunarData.phase === 'Last Quarter' && (
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gray-100" style={{
                  backgroundImage: "radial-gradient(circle at left, rgba(255,255,255,1) 0%, rgba(220,220,220,1) 100%)"
                }}></div>
              )}
            </div>
          </div>
        </div>
        
        {/* Compact Illumination percentage */}
        <div className="w-full bg-white/20 rounded-full h-1 mb-1">
          <div 
            className="bg-indigo-400 h-1 rounded-full" 
            style={{ width: `${lunarData.illumination}%` }}
          ></div>
        </div>
        <p className="text-center text-xs text-white/80 mb-3">
          Illumination: {lunarData.illumination}%
        </p>
        
        {/* Compact Next moon events */}
        <div className="space-y-2 text-xs flex-1">
          <div className="bg-white/10 p-2 rounded-lg border border-white/20">
            <h4 className="font-medium text-white mb-1">Next Full Moon</h4>
            <p className="text-indigo-300 text-xs">{lunarData.nextFullMoon.split(',')[0]}</p>
          </div>
          <div className="bg-white/10 p-2 rounded-lg border border-white/20">
            <h4 className="font-medium text-white mb-1">Next New Moon</h4>
            <p className="text-indigo-300 text-xs">{lunarData.nextNewMoon.split(',')[0]}</p>
          </div>
        </div>
        
        {/* Calculated data watermark */}
        <div className="absolute top-2 right-2 z-20 bg-blue-500/90 text-white text-xs px-2 py-1 rounded font-bold">
          CALC
        </div>
      </div>
    </div>
  );
} 