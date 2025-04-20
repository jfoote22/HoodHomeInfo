'use client';

import { useState } from 'react';
// import dynamic from 'next/dynamic';
import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherCard';
import TideChart from '../components/TideChart';
import SkyView from '../components/SkyView';
import EventList from '../components/EventList';
import HomeChatBot from '../components/HomeChatBot';
import LunarPhase from '../components/LunarPhase';
import LayoutToggle from '../components/LayoutToggle';

// Import OrcaMap with SSR disabled - temporarily disabled for deployment
// const OrcaMap = dynamic(() => import('../components/OrcaMap'), { ssr: false });

export default function Home() {
  const [isFullWidth, setIsFullWidth] = useState(false);

  const handleLayoutToggle = (fullWidth: boolean) => {
    setIsFullWidth(fullWidth);
  };

  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Hero and Weather Section - horizontally aligned */}
      <div className="flex flex-col lg:flex-row gap-6 mx-2 mb-8 pt-4">
        <div className="w-full lg:w-1/2">
          <Hero />
        </div>
        <div className="w-full lg:w-1/2">
          <WeatherCard />
        </div>
      </div>
      
      {/* Information and Events Section */}
      <div className="max-w-[98%] mx-auto px-2 mb-6 relative">
        <div className={`transition-all duration-500 ease-in-out ${isFullWidth ? 'opacity-100 visible' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          {/* Full-width layout - Info section on top, Events below */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 max-h-[17vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-indigo-900 mb-2">Need More Information?</h2>
              <HomeChatBot fullWidth={true} />
            </div>
            
            <div className="w-full overflow-hidden h-[17vh]">
              <EventList fullWidth={true} />
            </div>
          </div>
        </div>
        
        <div className={`transition-all duration-500 ease-in-out ${!isFullWidth ? 'opacity-100 visible' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          {/* Side-by-side layout (original) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 max-h-[25vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-indigo-900 mb-2">Need More Information?</h2>
              <HomeChatBot fullWidth={false} />
            </div>
            
            <div className="w-full overflow-hidden h-[25vh]">
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
      <div className="max-w-[98%] mx-auto px-2 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <LunarPhase />
          </div>
          <div>
            <SkyView />
          </div>
        </div>
      </div>

      {/* Orca Whale Watching Map - temporarily removed for deployment */}
      {/*
      <div className="max-w-[98%] mx-auto px-2 pb-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-4">
          <h2 className="text-2xl font-semibold text-indigo-900 mb-4">Orca Whale Sightings Map</h2>
          <p className="text-gray-600 mb-4">Track recent orca sightings in the Hood Canal area. Red markers show real-time sightings, orange for recent sightings, and blue for historical data.</p>
          <OrcaMap />
        </div>
      </div>
      */}

      {/* Layout Toggle Button */}
      <LayoutToggle onToggle={handleLayoutToggle} />
    </main>
  );
}
