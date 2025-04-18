'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Clock, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import CollapsibleContainer from './CollapsibleContainer';

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
        
        // Generate 15 random events
        const simulatedEvents = Array.from({ length: 15 }, (_, i) => {
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <CollapsibleContainer 
      title="Local Events"
      gradient="bg-gradient-to-r from-orange-500 to-rose-500"
    >
      <div className="mb-4">
        <button 
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Category: <span className="text-orange-600">{selectedCategory}</span></span>
          </div>
          {filterOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        
        {filterOpen && (
          <div className="mt-2 p-2 bg-white border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setFilterOpen(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-md ${
                    selectedCategory === category
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={goToPreviousWeek}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="text-center">
          <div className="text-sm font-medium text-gray-700">
            {formatDayMonth(weekDays[0])} - {formatDayMonth(weekDays[6])}
          </div>
          <button 
            onClick={goToCurrentWeek}
            className="text-xs text-blue-600 hover:underline"
          >
            Today
          </button>
        </div>
        
        <button 
          onClick={goToNextWeek}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={`p-2 text-sm font-medium rounded-t-lg ${
              day.toDateString() === new Date().toDateString() 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            <div>{formatDayName(day)}</div>
            <div className="text-xs">{day.getDate()}</div>
          </div>
        ))}
      </div>
      
      {/* Calendar Events */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
        <div className="grid grid-cols-7 gap-1 min-h-[300px]">
          {weekDays.map((day, dayIndex) => {
            // Get events for this day
            const dayEvents = filteredEvents.filter(
              event => event.date === getComparableDate(day)
            );
            
            return (
              <div 
                key={dayIndex} 
                className={`p-1 border-r last:border-r-0 border-gray-100 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'bg-orange-50' 
                    : ''
                }`}
              >
                {dayEvents.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                    No events
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div 
                        key={event.id} 
                        className={`p-1.5 rounded text-xs cursor-pointer hover:opacity-90
                          ${event.category === 'Music' ? 'bg-purple-100 text-purple-800' : ''}
                          ${event.category === 'Arts' ? 'bg-red-100 text-red-800' : ''}
                          ${event.category === 'Sports' ? 'bg-blue-100 text-blue-800' : ''}
                          ${event.category === 'Food' ? 'bg-green-100 text-green-800' : ''}
                          ${event.category === 'Community' ? 'bg-yellow-100 text-yellow-800' : ''}
                        `}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-2xs flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                          {event.time}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events List */}
      <h3 className="text-lg font-medium mb-3">Upcoming Events</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEvents.slice(0, 6).map(event => (
          <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-32 w-full">
              <Image 
                src={event.image}
                alt={event.title}
                fill
                style={{ objectFit: 'cover' }}
              />
              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                {event.category}
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="font-medium text-sm text-gray-800 mb-2 truncate">{event.title}</h3>
              
              <div className="flex items-center text-xs text-gray-600 mb-1">
                <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                <span>{event.date}</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-600 mb-1">
                <Clock className="w-3 h-3 mr-1 text-gray-400" />
                <span>{event.time}</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-600">
                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollapsibleContainer>
  );
} 