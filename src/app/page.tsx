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
      {/* Top Section - Current Conditions & Essential Info */}
      <section className="flex-none px-2 pb-2">
        <div className="grid grid-cols-12 gap-3 h-64">
          {/* Left: Current Weather */}
          <div className="col-span-4">
            <WeatherCard />
          </div>
          
          {/* Center: Tide Chart */}
          <div className="col-span-5">
            <TideChart />
          </div>
          
          {/* Right: Lunar & Time Info */}
          <div className="col-span-3">
            <LunarPhase />
          </div>
        </div>
      </section>
      
      {/* Bottom Section - Events, Sky, and Orca Info */}
      <section className="flex-1 px-2 min-h-0">
        <div className="grid grid-cols-12 gap-3 h-full">
          {/* Left: Events Calendar */}
          <div className="col-span-4">
            <div className="h-full">
              <EventList fullWidth={false} />
            </div>
          </div>
          
          {/* Center: Sky View */}
          <div className="col-span-4">
            <div className="h-full">
              <SkyView />
            </div>
          </div>
          
          {/* Right: Orca Map */}
          <div className="col-span-4">
            <div className="h-full">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 h-full flex flex-col">
                <div className="p-3 border-b border-white/20">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>
                    Orca Sightings
                  </h3>
                </div>
                <div className="flex-1 min-h-0">
                  <OrcaMap />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      


      {/* Layout Control - Bottom Corner */}
      <div className="absolute bottom-4 right-4 z-40">
        <LayoutToggle onToggle={handleLayoutToggle} />
      </div>
    </main>
    </AtmosphericBackground>
  );
}
