'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { Send, RotateCcw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocalData } from '../lib/hooks/useLocalData';

interface HomeChatBotProps {
  fullWidth?: boolean;
}

export default function HomeChatBot({ fullWidth = false }: HomeChatBotProps) {
  const { localData, isLoading: isLoadingData } = useLocalData();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [apiError, setApiError] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, error } = useChat({
    api: '/api/anthropic/chat',
    initialMessages: [
      {
        id: 'system-1',
        role: 'system',
        content: `You are HoodHomeInfo, a helpful AI assistant that provides information about the home and surrounding area.
          Current data about the home location:
          - Current time: ${localData.time}
          ${localData.weather ? `- Weather: ${localData.weather.temp}°F, ${localData.weather.condition}` : ''}
          ${localData.weather?.humidity ? `- Humidity: ${localData.weather.humidity}%` : ''}
          ${localData.weather?.windSpeed ? `- Wind: ${localData.weather.windSpeed} mph ${localData.weather.windDirection}` : ''}
          ${localData.sunrise ? `- Sunrise: ${localData.sunrise}` : ''}
          ${localData.sunset ? `- Sunset: ${localData.sunset}` : ''}
          ${localData.tides?.current ? `- Current tide: ${localData.tides.current.type} at ${localData.tides.current.time}` : ''}
          ${localData.tides?.next ? `- Next tide: ${localData.tides.next.type} at ${localData.tides.next.time}` : ''}
          ${localData.tides?.today ? `- Today's tides: ${localData.tides.today.map(t => `${t.type} at ${t.time}`).join(', ')}` : ''}`,
      },
    ],
    onError: () => {
      setApiError(true);
    }
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler for reload button
  const handleReload = () => {
    reload();
    setApiError(false);
  };

  // If there's an API error, show a helpful message
  if (apiError || error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 space-y-3 flex-1">
          <div className="flex items-center text-red-400 mb-2">
            <AlertCircle className="mr-2 w-4 h-4" />
            <h3 className="font-semibold text-sm text-white">API Not Available</h3>
          </div>
          <p className="text-white/80 text-xs leading-relaxed">
            The AI chatbot requires an Anthropic API key to function. Please configure your API key to enable this feature.
          </p>
          <p className="text-white/60 text-xs">
            You can still explore all other Hood Canal features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {isLoadingData ? (
          <div className="text-center py-2 text-white/70 text-sm">Loading local data...</div>
        ) : (
          <>
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-lg px-3 py-2 bg-blue-500/80 text-white rounded-bl-none text-sm backdrop-blur-sm">
                <ReactMarkdown className="prose prose-xs prose-invert">
                  {`Hi! I can help answer questions about Hood Canal - weather, tides, events, and more. What would you like to know?`}
                </ReactMarkdown>
              </div>
            </div>
            
            {messages.filter(m => m.role !== 'system').map(message => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[90%] rounded-lg px-3 py-2 ${
                    message.role === 'user' 
                      ? 'bg-green-500/80 text-white rounded-br-none backdrop-blur-sm' 
                      : 'bg-blue-500/80 text-white rounded-bl-none backdrop-blur-sm'
                  } text-sm`}
                >
                  <ReactMarkdown className="prose prose-xs prose-invert">
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/20 flex items-center">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about Hood Canal..."
          className="flex-1 p-2 text-sm bg-white/20 border border-white/30 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-white/70 backdrop-blur-sm"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim() || isLoadingData}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-lg disabled:bg-blue-400 transition-colors backdrop-blur-sm"
        >
          <Send size={16} />
        </button>
        <button 
          type="button" 
          onClick={handleReload}
          className="ml-2 p-2 text-white/70 hover:text-white rounded-lg transition-colors"
          title="Reset conversation"
        >
          <RotateCcw size={16} />
        </button>
      </form>
    </div>
  );
} 