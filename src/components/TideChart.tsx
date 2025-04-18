'use client';

import { useState, useEffect } from 'react';
import { Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

interface TideInfo {
  type: 'High' | 'Low';
  time: string;
  date: string;
  height: string;
  timestamp: number;
}

interface TideData {
  tides: Array<TideInfo>;
  moon: {
    phase: string;
    illumination: number;
    age: number;
  };
  stationName: string;
  stationId: string;
}

export default function TideChart() {
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2); // Show only 3 days (today + 2 days)
    return date;
  });

  useEffect(() => {
    async function fetchTideData() {
      setLoading(true);
      setError(null);
      
      try {
        // Format dates for API request (YYYYMMDD)
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0].replace(/-/g, '');
        };
        
        const beginDate = formatDate(startDate);
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
            height: `${parseFloat(tide.v).toFixed(1)} ft`,
            timestamp: datetime.getTime()
          };
        });

        // Simulated moon data (as NOAA doesn't provide moon data)
        const moonPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 
                           'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
        const moonPhaseIndex = Math.floor(Math.random() * 8);
        
        const moon = {
          phase: moonPhases[moonPhaseIndex],
          illumination: moonPhaseIndex === 0 ? 0 : 
                        moonPhaseIndex === 4 ? 100 : 
                        Math.floor(Math.random() * 100),
          age: Math.floor(Math.random() * 29) + 1 // Moon age in days (1-29)
        };

        setTideData({ 
          tides: processedTides, 
          moon,
          stationName,
          stationId 
        });
      } catch (error) {
        console.error('Error fetching tide data:', error);
        setError('Failed to load tide data');
        
        // Fallback to simulated data
        fallbackToSimulatedData();
      } finally {
        setLoading(false);
      }
    }
    
    // Fallback function for simulated data
    function fallbackToSimulatedData() {
      const tides: TideInfo[] = [];
      const stationId = process.env.NEXT_PUBLIC_NOAA_STATION_ID || '9445478';
      const stationName = process.env.NEXT_PUBLIC_NOAA_STATION_NAME || 'Union, Hood Canal';
      
      // Generate simulated tides for each day in the range
      const currentDate = new Date(startDate);
      const endDateTime = new Date(endDate).getTime();
      
      while (currentDate.getTime() <= endDateTime) {
        const tideTypes: ('High' | 'Low')[] = ['High', 'Low', 'High', 'Low'];
        const tideHours = [3, 9, 15, 21]; // Simulated tide times at 3am, 9am, 3pm, 9pm
        
        tideTypes.forEach((type, index) => {
          const tideTime = new Date(currentDate);
          tideTime.setHours(tideHours[index], 0, 0, 0);
          
          tides.push({
            type,
            time: tideTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: tideTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
            height: type === 'High' ? 
              `${(Math.random() * 2 + 10).toFixed(1)} ft` : 
              `${(Math.random() * 2 + 1).toFixed(1)} ft`,
            timestamp: tideTime.getTime()
          });
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Simulated moon data
      const moonPhases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 
                        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
      const moonPhaseIndex = Math.floor(Math.random() * 8);
      
      const moon = {
        phase: moonPhases[moonPhaseIndex],
        illumination: moonPhaseIndex === 0 ? 0 : 
                      moonPhaseIndex === 4 ? 100 : 
                      Math.floor(Math.random() * 100),
        age: Math.floor(Math.random() * 29) + 1 // Moon age in days (1-29)
      };

      setTideData({ 
        tides, 
        moon,
        stationName,
        stationId
      });
    }
    
    fetchTideData();
  }, [startDate, endDate]);

  const getMoonIcon = (illumination: number) => {
    // This is a simplified representation using the illumination percentage
    const size = "w-10 h-10";
    
    if (illumination === 0) return <Moon className={`${size} text-gray-700`} />; // New moon
    if (illumination === 100) return <Moon className={`${size} text-yellow-200`} />; // Full moon
    
    // For other phases, we'll use a half-filled moon icon
    return <Moon className={`${size} text-yellow-100`} />;
  };

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
      
      // Add 20 interpolated points between each tide point
      const steps = 20;
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

  const shiftDates = (days: number) => {
    const newStartDate = new Date(startDate);
    newStartDate.setDate(newStartDate.getDate() + days);
    
    const newEndDate = new Date(endDate);
    newEndDate.setDate(newEndDate.getDate() + days);
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const getTodayTides = () => {
    if (!tideData) return [];
    
    const today = new Date().toLocaleDateString();
    return tideData.tides.filter(tide => {
      const tideDate = new Date(tide.timestamp).toLocaleDateString();
      return tideDate === today;
    });
  };
  
  // Get all tides for the chart display (all 3 days)
  const getAllTidesForChart = () => {
    if (!tideData) return [];
    return tideData.tides;
  };
  
  // Group tides by date
  const groupTidesByDate = () => {
    if (!tideData) return new Map();
    
    const groupedTides = new Map<string, TideInfo[]>();
    
    tideData.tides.forEach(tide => {
      const date = new Date(tide.timestamp).toLocaleDateString();
      if (!groupedTides.has(date)) {
        groupedTides.set(date, []);
      }
      groupedTides.get(date)?.push(tide);
    });
    
    return groupedTides;
  };
  
  // Format a date for display on the x-axis
  const formatDateForAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
        <div className="flex justify-between">
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error && !tideData) {
    return <div className="bg-white rounded-xl shadow-md p-4 text-red-500">{error}</div>;
  }

  if (!tideData) {
    return <div className="bg-white rounded-xl shadow-md p-4">Failed to load tide data</div>;
  }

  // Get min/max tide heights for the y-axis scaling
  const tideHeights = tideData.tides.map(tide => parseFloat(tide.height));
  const minHeight = Math.floor(Math.min(...tideHeights));
  const maxHeight = Math.ceil(Math.max(...tideHeights));
  
  // Get data for the smooth curve
  const allTides = getAllTidesForChart();
  const curvePoints = generateDetailedTideCurve(allTides);
  
  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 30, right: 30, bottom: 50, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // X and Y scales
  const timeRange = allTides.length > 1 
    ? allTides[allTides.length - 1].timestamp - allTides[0].timestamp
    : 24 * 60 * 60 * 1000; // Default to 1 day if we don't have enough data
  
  const heightRange = maxHeight - minHeight || 1; // Avoid division by zero

  // Create path string for the smooth curve
  const pathData = curvePoints.length > 0 
    ? curvePoints.map((point, index) => {
        const x = padding.left + ((point.time - curvePoints[0].time) / 
            (curvePoints[curvePoints.length - 1].time - curvePoints[0].time)) * innerWidth;
        const y = padding.top + innerHeight - ((point.height - minHeight) / heightRange) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  return (
    <CollapsibleContainer 
      title={`Tide Information - ${tideData.stationName}`}
      gradient="bg-gradient-to-r from-cyan-500 to-blue-500"
    >
      <div>
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Daily
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Date navigation controls */}
        <div className="flex justify-between items-center my-4">
          <button 
            onClick={() => shiftDates(-3)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft size={16} />
            <span className="text-sm font-medium">Previous</span>
          </button>
          
          <div className="text-sm text-gray-600 font-medium">
            From: {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
            To: {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          
          <button 
            onClick={() => shiftDates(3)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <span className="text-sm font-medium">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Enhanced Tide Chart (NOAA style) */}
        <div className="mb-6 overflow-x-auto">
          <h3 className="font-medium text-gray-700 mb-2 text-center">
            From {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </h3>
          <div className="relative w-full border border-gray-300 bg-white">
            <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
              {/* Grid background */}
              {Array.from({ length: 7 }).map((_, index) => {
                const y = padding.top + (innerHeight / 6) * index;
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
              
              {allTides.map((_, index) => {
                if (index === 0 || index % 2 === 0) {
                  const x = padding.left + (innerWidth / (allTides.length - 1)) * index;
                  return (
                    <line
                      key={`grid-v-${index}`}
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={chartHeight - padding.bottom}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  );
                }
                return null;
              })}
              
              {/* Y-axis labels (tide heights) */}
              {Array.from({ length: 6 }).map((_, index) => {
                const y = padding.top + (innerHeight / 5) * index;
                const height = maxHeight - (heightRange / 5) * index;
                return (
                  <text
                    key={`y-label-${index}`}
                    x={padding.left - 10}
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
              
              {/* X-axis labels (time/date) */}
              {allTides.map((tide, index) => {
                if (index === 0 || index % 2 === 0) {
                  const x = padding.left + (innerWidth / (allTides.length - 1)) * index;
                  const formatted = formatDateForAxis(tide.timestamp);
                  return (
                    <g key={`x-label-${index}`}>
                      <text
                        x={x}
                        y={chartHeight - padding.bottom + 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                      >
                        {formatted.time}
                      </text>
                      <text
                        x={x}
                        y={chartHeight - padding.bottom + 30}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                      >
                        {formatted.date}
                      </text>
                    </g>
                  );
                }
                return null;
              })}
              
              {/* Tide curve */}
              <path
                d={pathData}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              
              {/* Tide points with labels */}
              {allTides.map((tide, index) => {
                const x = padding.left + ((tide.timestamp - allTides[0].timestamp) / timeRange) * innerWidth;
                const y = padding.top + innerHeight - ((parseFloat(tide.height) - minHeight) / heightRange) * innerHeight;
                
                return (
                  <g key={`tide-point-${index}`}>
                    {/* Point */}
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={tide.type === 'High' ? '#1e40af' : '#3b82f6'}
                    />
                    
                    {/* Height label */}
                    <text
                      x={x}
                      y={tide.type === 'High' ? y - 15 : y + 15}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#1e3a8a"
                    >
                      {parseFloat(tide.height).toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* NOAA attribution */}
          <div className="text-right text-xs text-gray-500 mt-1">
            Data source: NOAA/NOS/CO-OPS
          </div>
        </div>
        
        {viewMode === 'daily' ? (
          // Daily view - list of all tides by day
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Height
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tideData.tides.map((tide, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {tide.date}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tide.type === 'High' ? 'bg-blue-100 text-blue-800' : 'bg-cyan-100 text-cyan-800'
                      }`}>
                        {tide.type} Tide
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-semibold">
                      {tide.time}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {tide.height}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Calendar view - tides grouped by date in a grid
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from(groupTidesByDate()).map(([date, tides]) => (
              <div key={date} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <h4 className="text-sm font-medium">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                </div>
                <div className="p-3">
                  <div className="space-y-2">
                    {tides.map((tide: TideInfo, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            tide.type === 'High' ? 'bg-blue-600' : 'bg-cyan-500'
                          }`}></span>
                          <span className="text-sm font-medium">{tide.type}</span>
                        </div>
                        <span className="text-sm text-gray-600">{tide.time}</span>
                        <span className="text-sm font-medium">{tide.height}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Moon information */}
        <div className="flex justify-between items-center mt-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            {getMoonIcon(tideData.moon.illumination)}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{tideData.moon.phase}</p>
              <p className="text-xs text-gray-500">{tideData.moon.illumination}% illuminated</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Moon Age: {tideData.moon.age} days</p>
          </div>
        </div>
        
        {/* Disclaimer text */}
        <div className="mt-4 text-xs text-gray-500 italic">
          <p>Disclaimer: These predictions are based upon the latest information available from NOAA. The data has not been subjected to the National Ocean Service&apos;s quality control procedures.</p>
        </div>
      </div>
    </CollapsibleContainer>
  );
}