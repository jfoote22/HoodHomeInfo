'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Clock, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import EventModal from './EventModal';
import ReactDOM from 'react-dom';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  image: string;
  description: string;
}

interface EventListProps {
  fullWidth?: boolean;
}

export default function EventList({ fullWidth = false }: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  const categories = ['All', 'Music', 'Arts', 'Sports', 'Food', 'Community'];

  // Helper to get the start of the week (Sunday)
  function getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
  }

  // Function to format date as "Month Day" (e.g., "Aug 15")
  function formatDayMonth(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Function to get day name (e.g., "Sun")
  function formatDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Generate the 7 days of the current week
  function getCurrentWeekDays(): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      return day;
    });
  }

  // Function to navigate to previous week
  function goToPreviousWeek() {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStart(prevWeek);
  }

  // Function to navigate to next week
  function goToNextWeek() {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
  }

  // Function to go to current week
  function goToCurrentWeek() {
    setCurrentWeekStart(getWeekStart(new Date()));
  }

  // Function to get a formatted date string for comparison
  function getComparableDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Function to generate a placeholder image URL for a category
  const getCategoryImageUrl = (category: string) => {
    const colors: Record<string, { bg: string, text: string }> = {
      'Music': { bg: '4a1c82', text: 'ffffff' },
      'Arts': { bg: 'a83f2e', text: 'ffffff' },
      'Sports': { bg: '2e6ea8', text: 'ffffff' },
      'Food': { bg: '50a82e', text: 'ffffff' },
      'Community': { bg: 'e6a42e', text: 'ffffff' }
    };
    
    const { bg, text } = colors[category] || { bg: '6b7280', text: 'ffffff' };
    return `https://placehold.co/400x200/${bg}/${text}?text=${category}+Event`;
  };

  // Function to get a category color
  const getCategoryColor = (category: string): string => {
    switch(category) {
      case 'Music': return '#4a1c82';
      case 'Arts': return '#a83f2e';
      case 'Sports': return '#2e6ea8';
      case 'Food': return '#50a82e';
      case 'Community': return '#e6a42e';
      default: return '#6b7280';
    }
  };

  // Function to parse time into hours for sorting
  const parseTimeToHours = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours + (minutes || 0) / 60;
  };

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch('/api/events/live');
        const { events } = await res.json();
        setEvents(events);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
    // Refresh events data weekly
    const refreshInterval = setInterval(fetchEvents, 7 * 24 * 60 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  const filteredEvents = selectedCategory === 'All'
    ? events
    : events.filter(event => event.category === selectedCategory);

  const weekDays = getCurrentWeekDays();

  // Group events by day
  const eventsByDay = weekDays.map(day => {
    const dayStr = getComparableDate(day);
    const dayEvents = filteredEvents.filter(event => event.date === dayStr);
    
    // Sort by time
    return {
      date: day,
      events: dayEvents.sort((a, b) => parseTimeToHours(a.time) - parseTimeToHours(b.time))
    };
  });

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md animate-pulse h-full">
        <div className="h-8 bg-gray-200 rounded-t-xl w-full"></div>
        <div className="p-3">
          <div className="flex gap-1 mb-3">
            {categories.map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col text-white">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Local Events
          </h2>
          <div className="text-white/70 text-xs font-medium">
            {filteredEvents.length} events
          </div>
        </div>
      </div>
      
      <div className="p-3 flex-1 flex flex-col">
        {/* Compact Category filter buttons */}
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300 ${
                selectedCategory === category 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-white/20 border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Compact Week navigation */}
        <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-2 mb-3">
          <button
            onClick={goToPreviousWeek}
            className="text-white hover:text-emerald-400 p-1 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="text-center">
            <span className="text-sm font-semibold text-white">
              {formatDayMonth(weekDays[0])} - {formatDayMonth(weekDays[6])}
            </span>
            <button 
              onClick={goToCurrentWeek}
              className="block mx-auto text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline transition-colors"
            >
              This Week
            </button>
          </div>
          
          <button
            onClick={goToNextWeek}
            className="text-white hover:text-emerald-400 p-1 rounded-lg hover:bg-white/20 transition-all duration-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        {/* Events display area */}
        <div className="flex flex-col">
          {/* Compact Days header */}
          <div className="grid grid-cols-7 gap-1 border-b border-white/20 bg-white/5 backdrop-blur-sm sticky top-0 z-10 rounded-lg p-1 mb-2">
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={index}
                  className={`text-center py-1 rounded-md transition-all duration-300 ${
                    isToday 
                      ? 'bg-emerald-500/80 text-white font-bold' 
                      : 'text-white/80'
                  }`}
                >
                  <div className="text-xs uppercase font-medium">{formatDayName(day)}</div>
                  <div className="text-sm font-bold">{day.getDate()}</div>
                </div>
              );
            })}
          </div>
          {/* Compact Events grid */}
          <div className="grid grid-cols-7 gap-1" style={{ minHeight: '4rem' }}>
            {eventsByDay.map((day, dayIndex) => (
              <div key={dayIndex} className="space-y-1 min-h-0 max-h-40 overflow-y-auto">
                {day.events.length > 0 ? (
                  day.events.map((event, eventIndex) => (
                    <div 
                      key={`${dayIndex}-${eventIndex}`}
                      className="bg-white/90 backdrop-blur-sm border-l-2 rounded-md overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer hover:bg-white/95"
                      style={{ borderLeftColor: getCategoryColor(event.category) }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="p-1">
                        <div className="font-semibold text-slate-800 text-xs mb-1 truncate">{event.title}</div>
                        <div className="space-y-1">
                          <div className="flex items-center text-slate-600">
                            <Clock size={10} className="mr-1 flex-shrink-0 text-blue-500" />
                            <span className="text-xs">{event.time}</span>
                          </div>
                        </div>
                        <div className="mt-1">
                          <span 
                            className="inline-block text-xs px-1 py-0.5 rounded font-medium"
                            style={{ 
                              backgroundColor: `${getCategoryColor(event.category)}40`, 
                              color: getCategoryColor(event.category)
                            }}
                          >
                            {event.category.substring(0, 3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-white/60 pt-4 italic">No events</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selectedEvent && typeof window !== 'undefined' && ReactDOM.createPortal(
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />,
        document.body
      )}
    </div>
  );
} 