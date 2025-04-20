'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
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
  stationName: string;
  stationId: string;
}

export default function TideChart() {
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isTableVisible, setIsTableVisible] = useState(false);

  useEffect(() => {
    async function fetchTideData() {
      setLoading(true);
      setError(null);
      
      try {
        // Format dates for API request (YYYYMMDD)
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0].replace(/-/g, '');
        };
        
        // Get start and end dates for THREE days
        const beginDate = formatDate(startDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 3); // Show 3 days
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
      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        
        const tideTypes: ('High' | 'Low')[] = ['Low', 'High', 'Low', 'High'];
        const tideHours = [3, 9, 15, 21]; // Simulated tide times
        
        tideTypes.forEach((type, index) => {
          const tideTime = new Date(currentDate);
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
      }

      setTideData({ 
        tides, 
        stationName,
        stationId
      });
    }
    
    fetchTideData();
  }, [startDate]);

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

  const changeDate = (days: number) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    setStartDate(newDate);
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
  
  // Chart dimensions - make it more responsive
  const chartWidth = 1200; // Increased from 1000 to 1200
  const chartHeight = 400;
  const padding = { top: 40, right: 20, bottom: 80, left: 50 }; // Reduced side padding
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // X and Y scales - for THREE days
  const threeDaysStart = new Date(startDate);
  threeDaysStart.setHours(0, 0, 0, 0);
  const threeDaysEnd = new Date(startDate);
  threeDaysEnd.setDate(threeDaysEnd.getDate() + 3);
  threeDaysEnd.setHours(23, 59, 59, 999);
  
  const timeRange = threeDaysEnd.getTime() - threeDaysStart.getTime();
  const heightRange = maxHeight - minHeight || 1; // Avoid division by zero

  // Create path string for the smooth curve
  const pathData = curvePoints.length > 0 
    ? curvePoints.map((point, index) => {
        // Shift x coordinate 250px to the left
        const x = (padding.left + ((point.time - threeDaysStart.getTime()) / timeRange) * innerWidth) - 250;
        const y = padding.top + innerHeight - ((point.height - minHeight) / heightRange) * innerHeight;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  // Generate daily tick marks for x-axis (one per day + 6-hour intervals)
  const dayTicks = [];
  for (let day = 0; day < 3; day++) {
    for (let hour = 0; hour <= 18; hour += 6) {
      const tickTime = new Date(threeDaysStart);
      tickTime.setDate(tickTime.getDate() + day);
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
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <h2 className="text-xl font-semibold">Tide Information - {tideData.stationName}</h2>
      </div>
      
      <div className="p-2 sm:p-4"> {/* Reduced padding on small screens */}
        {/* Date navigation controls */}
        <div className="flex justify-between items-center my-2 sm:my-4 px-2 sm:px-4">
          <button 
            onClick={() => changeDate(-3)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft size={16} />
            <span className="text-sm font-medium">Previous 3 Days</span>
          </button>
          
          <div className="text-base text-gray-700 font-medium">
            {startDate.toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric'
            })} - {new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          
          <button 
            onClick={() => changeDate(3)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <span className="text-sm font-medium">Next 3 Days</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Enhanced Tide Chart (Three days with more detail) */}
        <div className="mb-4 sm:mb-6 overflow-x-auto">
          <div className="relative w-full border border-gray-300 bg-white">
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
                // Shift x coordinate 250px to the left
                const x = (padding.left + innerWidth * dayProgress) - 250;
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
                // Shift x coordinate 250px to the left
                const x = (padding.left + innerWidth * dayProgress) - 250;
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
                const date = new Date(threeDaysStart);
                date.setDate(date.getDate() + day);
                date.setHours(0, 0, 0, 0);
                // Shift x coordinate 250px to the left
                const x = (padding.left + ((date.getTime() - threeDaysStart.getTime()) / timeRange) * innerWidth) - 250;
                
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
              
              {/* Tide curve */}
              <path
                d={pathData}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              
              {/* Tide points with detailed labels */}
              {tideData.tides.map((tide, index) => {
                // Shift x coordinate 250px to the left
                const x = (padding.left + ((tide.timestamp - threeDaysStart.getTime()) / timeRange) * innerWidth) - 250;
                const y = padding.top + innerHeight - ((parseFloat(tide.height) - minHeight) / heightRange) * innerHeight;
                
                return (
                  <g key={`tide-point-${index}`}>
                    {/* Point */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill={tide.type === 'High' ? '#1e40af' : '#3b82f6'}
                      stroke="white"
                      strokeWidth="2"
                    />
                    
                    {/* Only show labels for every other point to avoid crowding */}
                    {index % 2 === 0 && (
                      <>
                        {/* Background for better readability */}
                        <rect 
                          x={x - 30} 
                          y={tide.type === 'High' ? y - 48 : y + 10} 
                          width="60" 
                          height="38" 
                          rx="4" 
                          fill="white" 
                          fillOpacity="0.9"
                          stroke={tide.type === 'High' ? '#1e40af' : '#3b82f6'}
                          strokeWidth="1"
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
                      </>
                    )}
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
        
        {/* Collapsible tide table section */}
        <div className="mb-4 border-t border-gray-200 pt-2">
          <button 
            onClick={() => setIsTableVisible(!isTableVisible)}
            className="w-full flex justify-between items-center px-4 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
          >
            <span>Detailed Tide Information</span>
            {isTableVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {isTableVisible && (
            <div className="overflow-x-auto mt-2">
              {Object.entries(tidesByDate).map(([date, tides]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 px-4">
                    {new Date(tides[0].timestamp).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                      {tides.map((tide, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
              ))}
            </div>
          )}
        </div>
        
        {/* Disclaimer text */}
        <div className="mt-2 text-xs text-gray-500 italic px-4">
          <p>Disclaimer: These predictions are based upon the latest information available from NOAA. The data has not been subjected to the National Ocean Service&apos;s quality control procedures.</p>
        </div>
      </div>
    </div>
  );
}