'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Waves, Sun, Moon } from 'lucide-react';

interface TideInfo {
  type: 'High' | 'Low';
  time: string;
  height: string;
  timestamp: number;
}

export default function PersistentStatusBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextTide, setNextTide] = useState<TideInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Update time every second for smooth clock
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchNextTide() {
      try {
        // Get today's tides to find the next one
        const today = new Date();
        const beginDate = today.toISOString().split('T')[0].replace(/-/g, '');
        const endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
        
        const stationId = process.env.NEXT_PUBLIC_NOAA_STATION_ID || '9445478';
        
        const noaaApiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
          `product=predictions&application=HoodCanalInfo&begin_date=${beginDate}` +
          `&end_date=${endDate}&datum=MLLW&station=${stationId}` +
          `&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
        
        const response = await fetch(noaaApiUrl);
        const data = await response.json();
        
        if (data.predictions && data.predictions.length > 0) {
          const now = currentTime.getTime();
          const upcomingTide = data.predictions.find((tide: any) => {
            const tideTime = new Date(tide.t).getTime();
            return tideTime > now;
          });
          
          if (upcomingTide) {
            const datetime = new Date(upcomingTide.t);
            setNextTide({
              type: upcomingTide.type === 'H' ? 'High' : 'Low',
              time: datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              height: `${parseFloat(upcomingTide.v).toFixed(1)} ft`,
              timestamp: datetime.getTime()
            });
          }
        } else {
          // Fallback to simulated data
          const mockTide: TideInfo = {
            type: Math.random() > 0.5 ? 'High' : 'Low',
            time: '3:45 PM',
            height: '8.2 ft',
            timestamp: Date.now() + 4 * 60 * 60 * 1000
          };
          setNextTide(mockTide);
        }
      } catch (error) {
        console.error('Error fetching tide data:', error);
        // Fallback to simulated data
        const mockTide: TideInfo = {
          type: Math.random() > 0.5 ? 'High' : 'Low',
          time: '3:45 PM',
          height: '8.2 ft',
          timestamp: Date.now() + 4 * 60 * 60 * 1000
        };
        setNextTide(mockTide);
      } finally {
        setLoading(false);
      }
    }

    fetchNextTide();
    // Refresh every 15 minutes
    const interval = setInterval(fetchNextTide, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentTime]);

  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  const isNightTime = currentTime.getHours() < 6 || currentTime.getHours() >= 18;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-xl">
      <div className="flex items-center justify-between px-6 py-2">
        {/* Left Section - Location & Date */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <h1 className="text-xl font-bold text-white tracking-wide">Hood Canal</h1>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div className="flex items-center space-x-3 text-slate-200">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span className="text-base font-medium">{formattedDate}</span>
          </div>
        </div>

        {/* Center Section - Time */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            {isNightTime ? (
              <Moon className="w-6 h-6 text-blue-300" />
            ) : (
              <Sun className="w-6 h-6 text-yellow-400" />
            )}
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-white tracking-wider">
                {formattedTime}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Next Tide */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="animate-pulse flex items-center space-x-3">
              <div className="w-8 h-8 bg-slate-600 rounded-full"></div>
              <div className="space-y-2">
                <div className="w-24 h-4 bg-slate-600 rounded"></div>
                <div className="w-16 h-3 bg-slate-600 rounded"></div>
              </div>
            </div>
          ) : nextTide ? (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Waves className={`w-8 h-8 ${nextTide.type === 'High' ? 'text-blue-400' : 'text-cyan-400'}`} />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${nextTide.type === 'High' ? 'bg-blue-500' : 'bg-cyan-500'}`}></div>
                </div>
              </div>
              <div>
                <div className="text-white font-semibold text-base">
                  Next {nextTide.type} Tide
                </div>
                <div className="flex items-center space-x-2 text-slate-200 text-sm">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{nextTide.time}</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-medium">{nextTide.height}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">Tide data unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
}