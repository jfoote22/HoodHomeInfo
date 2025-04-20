'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Clock, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

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
        // In a production environment, you would use a real API like Eventbrite or Ticketmaster
        // For now, we'll simulate the data
        
        // Generate dates for the next 14 days
        const nextTwoWeeks = Array.from({ length: 14 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i);
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });
        
        // Simulated events data
        const eventCategories = ['Music', 'Arts', 'Sports', 'Food', 'Community'];
        const eventLocations = [
          'Hood Canal Community Center', 
          'Olympic National Park', 
          'Alderbrook Resort', 
          'Union City Market',
          'Twanoh State Park'
        ];
        
        // Generate 25 random events (increased from 15 to ensure events on most days)
        const simulatedEvents = Array.from({ length: 25 }, (_, i) => {
          const category = eventCategories[Math.floor(Math.random() * eventCategories.length)];
          
          return {
            id: `event-${i}`,
            title: [
              'Live Music on the Water',
              'Art Walk & Craft Fair',
              'Farmers Market',
              'Kayak Race',
              'Oyster Festival',
              'Community Beach Cleanup',
              'Sunset Wine Tasting',
              'Hiking Group',
              'Photography Workshop',
              'Local Cuisine Festival'
            ][Math.floor(Math.random() * 10)],
            date: nextTwoWeeks[Math.floor(Math.random() * nextTwoWeeks.length)],
            time: `${Math.floor(Math.random() * 12) + 1}:00 ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
            location: eventLocations[Math.floor(Math.random() * eventLocations.length)],
            category,
            image: getCategoryImageUrl(category),
            description: 'Join us for this exciting event in the Hood Canal area. Perfect for locals and visitors alike!'
          };
        });
        
        setEvents(simulatedEvents);
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
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2">
        <h2 className="text-white font-semibold text-xl">Local Events</h2>
      </div>
      
      <div className="p-2 flex-1 flex flex-col">
        {/* Category filter buttons */}
        <div className="flex flex-wrap gap-1 mb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`text-xs px-2 py-1 rounded-md transition-colors flex-1 ${
                selectedCategory === category 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Week navigation */}
        <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded p-1.5 mb-2">
          <button
            onClick={goToPreviousWeek}
            className="text-gray-700 hover:text-indigo-600 p-1"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="text-center">
            <span className="text-xs font-medium text-gray-900">
              {formatDayMonth(weekDays[0])} - {formatDayMonth(weekDays[6])}
            </span>
            <button 
              onClick={goToCurrentWeek}
              className="block mx-auto text-[10px] text-indigo-600 hover:underline mt-0.5"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={goToNextWeek}
            className="text-gray-700 hover:text-indigo-600 p-1"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        {/* Events display area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={index}
                  className={`text-center py-1 ${
                    isToday 
                      ? 'bg-indigo-50 text-indigo-800 font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  <div className="text-[10px] uppercase">{formatDayName(day)}</div>
                  <div className="text-xs">{day.getDate()}</div>
                </div>
              );
            })}
          </div>
          
          {/* Events grid */}
          <div className="grid grid-cols-7 gap-1 pt-1 flex-1 overflow-y-auto">
            {eventsByDay.map((day, dayIndex) => (
              <div key={dayIndex} className="space-y-1 min-h-0">
                {day.events.length > 0 ? (
                  day.events.map((event, eventIndex) => (
                    <div 
                      key={`${dayIndex}-${eventIndex}`}
                      className="text-xs bg-white border border-gray-200 rounded overflow-hidden hover:shadow-sm transition-shadow"
                      style={{ 
                        borderLeft: `3px solid ${getCategoryColor(event.category)}`,
                      }}
                    >
                      <div className="px-2 py-1">
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="flex items-center text-gray-500 mt-1">
                          <Clock size={10} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{event.time}</span>
                        </div>
                        <div className="flex items-center text-gray-500 mt-0.5">
                          <MapPin size={10} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="mt-1">
                          <span 
                            className="inline-block text-[9px] px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${getCategoryColor(event.category)}20`,
                              color: getCategoryColor(event.category)
                            }}
                          >
                            {event.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[10px] text-gray-400 pt-2">No events</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 