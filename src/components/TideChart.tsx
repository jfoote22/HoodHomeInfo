'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

// Mock data watermark component
const MockDataWatermark = () => (
  <div className="absolute bottom-0 right-0 z-50 bg-red-600 text-white text-xs px-2 py-1 rounded-tl-md font-bold opacity-80">
    MOCK DATA
  </div>
);

interface TideInfo {
  type: 'High' | 'Low';
  time: string;
  date: string;
  height: string;
  timestamp: number;
}

interface TideData {
  tides: Array<TideInfo>;
  stationName: string;
  stationId: string;
}

export default function TideChart() {
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [isMockData, setIsMockData] = useState(false);
  
  // Always start with the current day, not a selected day
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Function to format date as YYYYMMDD for API
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  };
  
  // Get the next three days including today
  const getDaysToShow = (): Date[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    return [today, tomorrow, dayAfter];
  };

  useEffect(() => {
    async function fetchTideData() {
      setLoading(true);
      setError(null);
      setIsMockData(false);
      
      try {
        // Get start and end dates for THREE days starting from today
        const daysToShow = getDaysToShow();
        const beginDate = formatDate(daysToShow[0]);
        const endDate = new Date(daysToShow[2]);
        endDate.setDate(endDate.getDate() + 1); // Add one day to include all of the third day
        const endDateStr = formatDate(endDate);
        
        // Get NOAA station ID from environment variable or use default
        const stationId = process.env.NEXT_PUBLIC_NOAA_STATION_ID || '9445478';
        const stationName = process.env.NEXT_PUBLIC_NOAA_STATION_NAME || 'Union, Hood Canal';
        
        // Fetch tide predictions from NOAA API
        const noaaApiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?` +
          `product=predictions&application=HoodCanalInfo&begin_date=${beginDate}` +
          `&end_date=${endDateStr}&datum=MLLW&station=${stationId}` +
          `&time_zone=lst_ldt&units=english&interval=hilo&format=json`;
        
        const response = await fetch(noaaApiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch tide data from NOAA');
        }
        
        const noaaData = await response.json();
        
        if (!noaaData.predictions || noaaData.predictions.length === 0) {
          throw new Error('No tide prediction data available');
        }
        
        // Process tide data
        const processedTides = noaaData.predictions.map((tide: any) => {
          const timeStr = tide.t; // Format: YYYY-MM-DD HH:MM
          const datetime = new Date(timeStr);
          
          return {
            type: tide.type === 'H' ? 'High' : 'Low',
            time: datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: datetime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
            height: `${parseFloat(tide.v).toFixed(2)} ft`,
            timestamp: datetime.getTime()
          };
        });

        setTideData({ 
          tides: processedTides, 
          stationName,
          stationId 
        });
      } catch (error) {
        console.error('Error fetching tide data:', error);
        setError('Failed to load tide data');
        
        // Fallback to simulated data
        fallbackToSimulatedData();
        setIsMockData(true); // Mark data as mock when fallback is used
      } finally {
        setLoading(false);
      }
    }
    
    // Fallback function for simulated data
    function fallbackToSimulatedData() {
      const tides: TideInfo[] = [];
      const stationId = process.env.NEXT_PUBLIC_NOAA_STATION_ID || '9445478';
      const stationName = process.env.NEXT_PUBLIC_NOAA_STATION_NAME || 'Union, Hood Canal';
      
      // Generate simulated tides for THREE days
      const daysToShow = getDaysToShow();
      
      daysToShow.forEach((day) => {
        const tideTypes: ('High' | 'Low')[] = ['Low', 'High', 'Low', 'High'];
        const tideHours = [3, 9, 15, 21]; // Simulated tide times
        
        tideTypes.forEach((type, index) => {
          const tideTime = new Date(day);
          tideTime.setHours(tideHours[index], 0, 0, 0);
          
          tides.push({
            type,
            time: tideTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: tideTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
            height: type === 'High' ? 
              `${(Math.random() * 2 + 10).toFixed(2)} ft` : 
              `${(Math.random() * 2 + 1).toFixed(2)} ft`,
            timestamp: tideTime.getTime()
          });
        });
      });

      setTideData({ 
        tides, 
        stationName,
        stationId
      });
    }
    
    fetchTideData();
    
    // Set up an interval to refresh the tide data at midnight (when the day changes)
    const checkForDayChange = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      
      // Time until next midnight in milliseconds
      const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
      
      // Set a timeout to refresh data at midnight
      const midnightTimeout = setTimeout(() => {
        fetchTideData();
        // Set up the next day's check
        checkForDayChange();
      }, timeUntilMidnight);
      
      return midnightTimeout;
    };
    
    const midnightTimeout = checkForDayChange();
    
    // Also set up a regular refresh every hour to handle any connection issues
    const hourlyRefresh = setInterval(fetchTideData, 60 * 60 * 1000);
    
    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(hourlyRefresh);
    };
  }, []);

  // Generate more data points to make curve smoother
  const generateDetailedTideCurve = (tidesToChart: TideInfo[]) => {
    if (tidesToChart.length < 2) return [];
    
    const sortedTides = [...tidesToChart].sort((a, b) => a.timestamp - b.timestamp);
    const points: { time: number; height: number }[] = [];
    
    // Helper function for cubic interpolation (approximation)
    const cubicInterpolate = (y0: number, y1: number, y2: number, y3: number, mu: number) => {
      const mu2 = mu * mu;
      const a0 = y3 - y2 - y0 + y1;
      const a1 = y0 - y1 - a0;
      const a2 = y2 - y0;
      const a3 = y1;
      return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3;
    };
    
    // Add interpolated points between each pair of actual tide points
    for (let i = 0; i < sortedTides.length - 1; i++) {
      const startTide = sortedTides[i];
      const endTide = sortedTides[i + 1];
      
      const startTime = startTide.timestamp;
      const endTime = endTide.timestamp;
      const startHeight = parseFloat(startTide.height);
      const endHeight = parseFloat(endTide.height);
      
      // Get surrounding points for cubic interpolation
      const prevHeight = i > 0 ? parseFloat(sortedTides[i - 1].height) : startHeight;
      const nextHeight = i < sortedTides.length - 2 ? parseFloat(sortedTides[i + 2].height) : endHeight;

      points.push({ time: startTime, height: startHeight });
      
      // Add more interpolated points for smoother curve
      const steps = 40;
      for (let step = 1; step < steps; step++) {
        const mu = step / steps;
        const time = startTime + mu * (endTime - startTime);
        const height = cubicInterpolate(prevHeight, startHeight, endHeight, nextHeight, mu);
        points.push({ time, height });
      }
    }
    
    // Add the last point
    if (sortedTides.length > 0) {
      const lastTide = sortedTides[sortedTides.length - 1];
      points.push({ 
        time: lastTide.timestamp, 
        height: parseFloat(lastTide.height) 
      });
    }
    
    return points;
  };
  
  // Format a date for display
  const formatTimeForAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format a date for display with date and time
  const formatDateTimeForAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })} ${date.getHours() === 0 ? '12 AM' : date.getHours() === 12 ? '12 PM' : date.getHours() > 12 ? `${date.getHours() - 12} PM` : `${date.getHours()} AM`}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  if (error && !tideData) {
    return <div className="bg-white rounded-xl shadow-md p-4 text-red-500">{error}</div>;
  }

  if (!tideData || tideData.tides.length === 0) {
    return <div className="bg-white rounded-xl shadow-md p-4">No tide data available for this date range</div>;
  }

  // Get min/max tide heights for the y-axis scaling with more padding
  const tideHeights = tideData.tides.map(tide => parseFloat(tide.height));
  const minHeight = Math.floor(Math.min(...tideHeights)) - 1; // Add padding
  const maxHeight = Math.ceil(Math.max(...tideHeights)) + 1; // Add padding
  
  // Get data for the smooth curve
  const curvePoints = generateDetailedTideCurve(tideData.tides);
  
  // Chart dimensions - compact for TV
  const chartWidth = 800;
  const chartHeight = 200;
  const padding = { top: 20, right: 15, bottom: 40, left: 35 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // Get the three days to display
  const daysToShow = getDaysToShow();
  
  // X and Y scales - for THREE days
  const threeDaysStart = daysToShow[0]; // Today
  const threeDaysEnd = new Date(daysToShow[2]); // Day after tomorrow
  threeDaysEnd.setHours(23, 59, 59, 999);
  
  const timeRange = threeDaysEnd.getTime() - threeDaysStart.getTime();
  const heightRange = maxHeight - minHeight || 1; // Avoid division by zero

  // Create path string for the smooth curve
  const pathData = curvePoints.length > 0 
    ? curvePoints.map((point, index) => {
        const x = padding.left + ((point.time - threeDaysStart.getTime()) / timeRange) * innerWidth;
        const y = padding.top + innerHeight - ((point.height - minHeight) / heightRange) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // Generate daily tick marks for x-axis (one per day + 6-hour intervals)
  const dayTicks = [];
  for (let day = 0; day < 3; day++) {
    for (let hour = 0; hour <= 18; hour += 6) {
      const tickTime = new Date(daysToShow[day]);
      tickTime.setHours(hour, 0, 0, 0);
      dayTicks.push(tickTime);
    }
  }
  
  // Group tides by date for the tide table
  const tidesByDate = tideData.tides.reduce((acc: Record<string, TideInfo[]>, tide) => {
    const date = new Date(tide.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(tide);
    return acc;
  }, {});

  return (
    <div className="h-full text-white">
      {/* Section Header */}
      <div className="px-4 py-2 border-b border-white/20">
        <h2 className="text-lg font-bold text-white flex items-center">
          <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></span>
          Tidal Information
        </h2>
        <p className="text-xs text-white/70 mt-1">Real-time NOAA predictions</p>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p className="text-gray-600">Loading tide data...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Tide chart visualization */}
            {tideData && (
              <>
                {/* Compact Chart visualization */}
                <div className="h-40 relative mb-3">
                  <div className="relative w-full bg-gradient-to-br from-white/95 to-cyan-50/95 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg overflow-hidden">
                    <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                      {/* Grid background */}
                      {Array.from({ length: heightRange + 1 }).map((_, index) => {
                        const y = padding.top + (innerHeight / heightRange) * index;
                        return (
                          <line
                            key={`grid-h-${index}`}
                            x1={padding.left}
                            y1={y}
                            x2={chartWidth - padding.right}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        );
                      })}
                      
                      {/* Vertical grid lines for days */}
                      {dayTicks.map((time, index) => {
                        const dayProgress = (time.getTime() - threeDaysStart.getTime()) / timeRange;
                        const x = padding.left + innerWidth * dayProgress;
                        const isMidnight = time.getHours() === 0;
                        return (
                          <line
                            key={`grid-v-${index}`}
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={chartHeight - padding.bottom}
                            stroke={isMidnight ? "#9ca3af" : "#e5e7eb"}
                            strokeWidth={isMidnight ? "1.5" : "1"}
                            strokeDasharray={isMidnight ? "" : "5,5"}
                          />
                        );
                      })}
                      
                      {/* Y-axis labels (tide heights) */}
                      {Array.from({ length: heightRange + 1 }).map((_, index) => {
                        const y = padding.top + (innerHeight / heightRange) * index;
                        const height = maxHeight - index;
                        return (
                          <text
                            key={`y-label-${index}`}
                            x={padding.left - 15}
                            y={y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fontSize="12"
                            fill="#6b7280"
                          >
                            {height.toFixed(1)}
                          </text>
                        );
                      })}
                      
                      {/* X-axis labels - days and major hours */}
                      {dayTicks.map((time, index) => {
                        const dayProgress = (time.getTime() - threeDaysStart.getTime()) / timeRange;
                        const x = padding.left + innerWidth * dayProgress;
                        const isMidnight = time.getHours() === 0;
                        
                        return (
                          <g key={`x-label-${index}`}>
                            <text
                              x={x}
                              y={chartHeight - padding.bottom + 20}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#6b7280"
                            >
                              {isMidnight 
                                ? time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) 
                                : time.getHours() === 12 ? 'Noon' : time.getHours() === 6 ? '6 AM' : time.getHours() === 18 ? '6 PM' : ''}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Day separation lines */}
                      {[1, 2].map((day) => {
                        const date = new Date(daysToShow[day]);
                        date.setHours(0, 0, 0, 0);
                        const x = padding.left + ((date.getTime() - threeDaysStart.getTime()) / timeRange) * innerWidth;
                        
                        return (
                          <line
                            key={`day-sep-${day}`}
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={chartHeight - padding.bottom}
                            stroke="#9ca3af"
                            strokeWidth="1.5"
                          />
                        );
                      })}

                      {/* Current time vertical line */}
                      {(() => {
                        const now = new Date();
                        const nowTime = now.getTime();
                        if (nowTime >= threeDaysStart.getTime() && nowTime <= threeDaysEnd.getTime()) {
                          const x = padding.left + ((nowTime - threeDaysStart.getTime()) / timeRange) * innerWidth;
                          return (
                            <line
                              x1={x}
                              y1={padding.top}
                              x2={x}
                              y2={chartHeight - padding.bottom}
                              stroke="#e11d48" // rose-600
                              strokeWidth="2.5"
                              strokeDasharray="4,2"
                              opacity="0.85"
                            />
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Enhanced Tide curve with gradient */}
                      <defs>
                        <linearGradient id="tideGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8"/>
                          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8"/>
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <path
                        d={pathData}
                        fill="none"
                        stroke="url(#tideGradient)"
                        strokeWidth="4"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                        className="drop-shadow-lg"
                      />
                      
                      {/* Tide points with detailed labels */}
                      {tideData.tides.map((tide, index) => {
                        const x = padding.left + ((tide.timestamp - threeDaysStart.getTime()) / timeRange) * innerWidth;
                        const y = padding.top + innerHeight - ((parseFloat(tide.height) - minHeight) / heightRange) * innerHeight;
                        
                        return (
                          <g key={`tide-point-${index}`}>
                            {/* Enhanced Point with glow effect */}
                            <circle
                              cx={x}
                              cy={y}
                              r="8"
                              fill={tide.type === 'High' ? '#0891b2' : '#3b82f6'}
                              stroke="white"
                              strokeWidth="3"
                              className="drop-shadow-lg"
                              style={{ filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' }}
                            />
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="white"
                              opacity="0.8"
                            />
                            {/* Always show labels for all points */}
                            {/* Enhanced background with gradient */}
                            <rect 
                              x={x - 35} 
                              y={tide.type === 'High' ? y - 52 : y + 12} 
                              width="70" 
                              height="42" 
                              rx="8" 
                              fill="rgba(255, 255, 255, 0.95)" 
                              stroke={tide.type === 'High' ? '#0891b2' : '#3b82f6'}
                              strokeWidth="2"
                              className="drop-shadow-lg"
                              style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))' }}
                            />
                            {/* Height label */}
                            <text
                              x={x}
                              y={tide.type === 'High' ? y - 30 : y + 28}
                              textAnchor="middle"
                              fontSize="12"
                              fontWeight="bold"
                              fill="#1e3a8a"
                            >
                              {tide.height}
                            </text>
                            {/* Time label */}
                            <text
                              x={x}
                              y={tide.type === 'High' ? y - 15 : y + 43}
                              textAnchor="middle"
                              fontSize="12"
                              fill="#4b5563"
                            >
                              {tide.time}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Today indicator */}
                      <text 
                        x={padding.left + innerWidth / 6}
                        y={padding.top - 15}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#3b82f6"
                      >
                        Today
                      </text>
                      
                      {/* Tomorrow indicator */}
                      <text 
                        x={padding.left + innerWidth / 2}
                        y={padding.top - 15}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#3b82f6"
                      >
                        Tomorrow
                      </text>
                      
                      {/* Day after tomorrow indicator */}
                      <text 
                        x={padding.left + (innerWidth * 5 / 6)}
                        y={padding.top - 15}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="bold"
                        fill="#3b82f6"
                      >
                        {daysToShow[2].toLocaleDateString(undefined, { weekday: 'short' })}
                      </text>
                    </svg>
                  </div>
                </div>
                
                
                {/* Compact tide summary */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  {tideData.tides.slice(0, 4).map((tide, index) => (
                    <div key={index} className="bg-white/10 rounded-lg p-2 border border-white/20">
                      <div className={`text-xs font-medium ${tide.type === 'High' ? 'text-blue-300' : 'text-amber-300'}`}>
                        {tide.type}
                      </div>
                      <div className="text-sm font-bold text-white mt-1">{tide.time}</div>
                      <div className="text-xs text-white/70">{tide.height}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Show watermark for mock data */}
        {isMockData && (
          <div className="absolute top-2 right-2 z-20 bg-red-500/90 text-white text-xs px-2 py-1 rounded font-bold">
            MOCK
          </div>
        )}
      </div>
    </div>
  );
}