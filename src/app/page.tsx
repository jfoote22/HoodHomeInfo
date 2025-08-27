'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PersistentStatusBar from '../components/PersistentStatusBar';
import AtmosphericBackground from '../components/AtmosphericBackground';
import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherCard';
import TideChart from '../components/TideChart';
import SkyView from '../components/SkyView';
import EventList from '../components/EventList';
import HomeChatBot from '../components/HomeChatBot';
import LunarPhase from '../components/LunarPhase';
import LayoutToggle from '../components/LayoutToggle';

// Import OrcaMap with SSR disabled
const OrcaMap = dynamic(() => import('../components/EnhancedOrcaMap'), { ssr: false });

export default function Home() {
  const [isFullWidth, setIsFullWidth] = useState(false);

  const handleLayoutToggle = (fullWidth: boolean) => {
    setIsFullWidth(fullWidth);
  };

  return (
    <AtmosphericBackground>
      <PersistentStatusBar />
      <main className="h-screen overflow-hidden pt-12 flex flex-col">
      {/* Main Content Grid - 2x3 Layout */}
      <div className="flex-1 px-4 py-4 grid grid-cols-12 grid-rows-2 gap-4 min-h-0 max-h-full">
        {/* Top Row - Primary Information */}
        <div className="col-span-4 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          <WeatherCard />
        </div>
        
        <div className="col-span-5 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          <TideChart />
        </div>
        
        <div className="col-span-3 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          <LunarPhase />
        </div>
      
        {/* Bottom Row - Secondary Information */}
        <div className="col-span-4 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          <EventList fullWidth={false} />
        </div>
        
        <div className="col-span-4 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
          <SkyView />
        </div>
        
        <div className="col-span-4 row-span-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg flex flex-col">
          <div className="px-4 py-2 border-b border-white/20">
            <h2 className="text-lg font-bold text-white flex items-center">
              <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>
              Orca Sightings
            </h2>
          </div>
          <div className="flex-1 min-h-0">
            <OrcaMap />
          </div>
        </div>
      </div>
      
      {/* Layout Control - Fixed position */}
      <div className="fixed bottom-6 right-6 z-40">
        <LayoutToggle onToggle={handleLayoutToggle} />
      </div>
    </main>
    </AtmosphericBackground>
  );
}
