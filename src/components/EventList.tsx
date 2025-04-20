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

export default function EventList() {
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
      <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-3/4 mb-4"></div>
        <div className="h-10 bg-white/20 rounded mb-4"></div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-white/20 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-64 bg-white/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-2">Local Events</h2>
        
        {/* Compact category filter */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 text-sm overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-white text-orange-600 font-medium'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Compact week navigation */}
        <div className="flex items-center justify-between mb-2 text-sm">
          <button onClick={goToPreviousWeek} className="p-1 hover:bg-white/20 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button onClick={goToCurrentWeek} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-md text-xs">
            This Week
          </button>
          
          <div className="font-medium">
            {formatDayMonth(weekDays[0])} - {formatDayMonth(weekDays[6])}
          </div>
          
          <button onClick={goToNextWeek} className="p-1 hover:bg-white/20 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Events organized in vertical columns by day */}
      <div className="bg-white/10 backdrop-blur-sm p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-center font-medium sticky top-0 bg-white/10 backdrop-blur-sm z-10 py-1">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div 
                key={index} 
                className={`py-1 rounded ${isToday ? 'bg-white/30' : ''}`}
              >
                {formatDayName(day)}
                <div className="font-bold">{day.getDate()}</div>
              </div>
            );
          })}
        </div>
        
        {/* Event columns */}
        <div className="grid grid-cols-7 gap-1 max-h-[calc(100vh-22rem)] overflow-y-auto">
          {eventsByDay.map((dayData, dayIndex) => (
            <div key={dayIndex} className="flex flex-col gap-2 min-h-[12rem]">
              {dayData.events.length > 0 ? (
                dayData.events.map(event => (
                  <div 
                    key={event.id} 
                    className="bg-white text-gray-800 rounded p-2 text-xs shadow relative"
                    style={{ borderLeft: `3px solid ${getCategoryColor(event.category)}` }}
                  >
                    <div className="font-semibold truncate">{event.title}</div>
                    <div className="flex items-center mt-1">
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0 text-gray-500" />
                      <span className="text-gray-700">{event.time}</span>
                    </div>
                    <div className="flex items-center mt-1 truncate">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0 text-gray-500" />
                      <span className="text-gray-700 truncate">{event.location}</span>
                    </div>
                    <div 
                      className="absolute top-2 right-2 w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white"
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                    >
                      {event.category.charAt(0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/50 text-center text-xs italic pt-2">
                  No events
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* No events message (only show if no events for the entire week) */}
        {eventsByDay.every(day => day.events.length === 0) && (
          <div className="bg-white/20 rounded-lg p-4 text-center mt-4">
            <p>No events found for the selected category this week.</p>
            <button 
              onClick={() => setSelectedCategory('All')}
              className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-sm"
            >
              Show all categories
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 