'use client';

import { useState } from 'react';
import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherCard';
import TideChart from '../components/TideChart';
import SkyView from '../components/SkyView';
import EventList from '../components/EventList';
import HomeChatBot from '../components/HomeChatBot';
import LunarPhase from '../components/LunarPhase';
import LayoutToggle from '../components/LayoutToggle';

export default function Home() {
  const [isFullWidth, setIsFullWidth] = useState(false);

  const handleLayoutToggle = (fullWidth: boolean) => {
    setIsFullWidth(fullWidth);
  };

  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Hero and Weather Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-2 mb-8 items-start pt-4">
        <div className="flex flex-col justify-start h-full">
          <Hero />
        </div>
        <div className="flex items-center justify-center h-full pt-2">
          <div className="w-full">
            <WeatherCard />
          </div>
        </div>
      </div>
      
      {/* Information and Events Section */}
      <div className="max-w-[98%] mx-auto px-2 mb-6 relative">
        <div className={`transition-all duration-500 ease-in-out ${isFullWidth ? 'opacity-100 visible' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          {/* Full-width layout - Info section on top, Events below */}
          <div className="flex flex-col gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 max-h-[35vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold text-indigo-900 mb-4">Need More Information?</h2>
              <HomeChatBot fullWidth={true} />
            </div>
            
            <div className="w-full overflow-hidden">
              <EventList fullWidth={true} />
            </div>
          </div>
        </div>
        
        <div className={`transition-all duration-500 ease-in-out ${!isFullWidth ? 'opacity-100 visible' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          {/* Side-by-side layout (original) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-indigo-900 mb-4">Need More Information?</h2>
              <HomeChatBot fullWidth={false} />
            </div>
            
            <div className="w-full overflow-hidden">
              <EventList fullWidth={false} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Full-width Tide Chart */}
      <div className="w-full mb-6">
        <TideChart />
      </div>
      
      {/* Lunar and Sky Section */}
      <div className="max-w-[98%] mx-auto px-2 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <LunarPhase />
          </div>
          <div>
            <SkyView />
          </div>
        </div>
      </div>

      {/* Layout Toggle Button */}
      <LayoutToggle onToggle={handleLayoutToggle} />
    </main>
  );
}
