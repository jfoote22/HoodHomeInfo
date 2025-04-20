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
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <h2 className="text-xl font-semibold">Local Events</h2>
        <p className="text-sm text-white/80 mt-1">Discover what&apos;s happening around Hood Canal</p>
      </div>
      
      {/* Filter and week navigation */}
      <div className="border-b border-gray-200">
        <div className="p-3 flex justify-between items-center">
          {/* Category filter */}
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 py-1 px-3 rounded-full transition-colors text-gray-700"
          >
            <Filter size={14} />
            <span>{selectedCategory}</span>
            {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button 
              onClick={goToPreviousWeek} 
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            
            <span className="text-sm text-gray-700">
              {formatDayMonth(weekDays[0])} - {formatDayMonth(weekDays[6])}
            </span>
            
            <button 
              onClick={goToCurrentWeek}
              className="text-xs py-1 px-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
            >
              Today
            </button>
            
            <button 
              onClick={goToNextWeek} 
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Category filter dropdown */}
        {filterOpen && (
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setFilterOpen(false);
                  }}
                  className={`text-xs py-1 px-3 rounded-full transition-colors ${
                    selectedCategory === category 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Day columns and events */}
      <div className={`${fullWidth ? 'max-h-[60vh]' : 'max-h-[80vh]'} overflow-y-auto p-2`}>
        {/* Calendar days header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-1 mb-2">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={index}
                  className={`text-center p-1 ${
                    isToday 
                      ? 'bg-indigo-100 text-indigo-800 rounded-lg' 
                      : 'text-gray-600'
                  }`}
                >
                  <div className="text-xs font-medium">{formatDayName(day)}</div>
                  <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>{formatDayMonth(day)}</div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Events in vertical day columns */}
        {eventsByDay.some(day => day.events.length > 0) ? (
          <div className="grid grid-cols-7 gap-1">
            {eventsByDay.map((day, dayIndex) => (
              <div key={dayIndex} className="min-h-[100px]">
                {day.events.length > 0 ? (
                  <div className="space-y-2">
                    {day.events.map((event, eventIndex) => (
                      <div 
                        key={`${dayIndex}-${eventIndex}`}
                        className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="relative h-20 bg-gray-200">
                          <Image
                            src={event.image}
                            alt={event.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 14vw"
                            style={{ objectFit: 'cover' }}
                          />
                          <div 
                            className="absolute top-1 right-1 py-0.5 px-1 text-xs text-white rounded"
                            style={{ backgroundColor: getCategoryColor(event.category) }}
                          >
                            {event.category}
                          </div>
                        </div>
                        
                        <div className="p-2">
                          <h4 className="font-semibold text-gray-800 mb-1 text-xs line-clamp-1">{event.title}</h4>
                          
                          <div className="flex items-center text-gray-600 text-xs mb-1">
                            <Clock size={10} className="mr-1" />
                            <span>{event.time}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600 text-xs">
                            <MapPin size={10} className="mr-1" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-2 text-xs text-gray-400">No events</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-1">No events found</h3>
            <p className="text-gray-500 max-w-sm">
              {selectedCategory !== 'All' 
                ? `No "${selectedCategory}" events found this week. Try another category or week.`
                : 'No events found for this week. Try another week or check back later.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 