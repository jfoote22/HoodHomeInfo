'use client';

import { useState, useEffect } from 'react';
import CollapsibleContainer from './CollapsibleContainer';

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
    <CollapsibleContainer 
      title="Lunar Cycle Information"
      gradient="bg-gradient-to-r from-indigo-500 to-purple-500"
    >
      <div className="p-4">
        {/* Moon phase title and age */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-1">{lunarData.phase}</h3>
          <p className="text-base text-gray-600">Current Moon Age: {lunarData.age} days</p>
        </div>
        
        {/* Enhanced realistic moon visualization */}
        <div className="flex justify-center my-8">
          <div className="relative">
            {/* Realistic moon rendering using CSS */}
            <div className="w-64 h-64 rounded-full relative overflow-hidden shadow-xl border-4 border-gray-100">
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
              
              {/* Moon surface details overlay */}
              <div className="absolute inset-0 opacity-10" 
                style={{
                  backgroundImage: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 10%), radial-gradient(circle at 70% 65%, rgba(255,255,255,0.3) 0%, transparent 10%), radial-gradient(circle at 40% 60%, rgba(255,255,255,0.3) 0%, transparent 10%), radial-gradient(circle at 60% 30%, rgba(255,255,255,0.3) 0%, transparent 10%)"
                }}
              ></div>
            </div>
            
            {/* Illumination percentage indicator */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-base font-semibold text-indigo-800 bg-white px-6 py-2 rounded-full shadow-md border border-indigo-100">
              {lunarData.illumination}% illuminated
            </div>
          </div>
        </div>
        
        {/* Next full moon and new moon info */}
        <div className="mt-8 space-y-4">
          <div className="bg-indigo-50 p-5 rounded-lg shadow-md border border-indigo-100">
            <h4 className="text-lg font-semibold text-indigo-800 mb-2">Next Full Moon</h4>
            <p className="text-lg text-gray-800">{lunarData.nextFullMoon}</p>
          </div>
          
          <div className="bg-blue-50 p-5 rounded-lg shadow-md border border-blue-100">
            <h4 className="text-lg font-semibold text-blue-800 mb-2">Next New Moon</h4>
            <p className="text-lg text-gray-800">{lunarData.nextNewMoon}</p>
          </div>
        </div>
        
        {/* Lunar cycle effects section */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="text-lg font-medium mb-2 text-gray-700">Lunar Cycle Effects</h4>
          <p className="text-base text-gray-600">
            The lunar cycle affects tides, with higher tides during full and new moons (spring tides)
            and lower tides during quarter moons (neap tides).
          </p>
        </div>
      </div>
    </CollapsibleContainer>
  );
} 