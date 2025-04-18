'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from 'ai/react';
import { Send, RotateCcw, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocalData } from '../lib/hooks/useLocalData';

export default function HomeChatBot() {
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
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-center text-red-600 mb-2">
            <AlertCircle className="mr-2" />
            <h3 className="font-semibold">API Connection Error</h3>
          </div>
          <p className="text-gray-700">
            Unable to connect to the chat API. This feature requires an Anthropic API key to be configured.
          </p>
          <p className="text-gray-700">
            To enable this feature, you need to:
          </p>
          <ol className="list-decimal pl-5 text-gray-700">
            <li>Get an API key from Anthropic</li>
            <li>Add it to your .env.local file as ANTHROPIC_API_KEY</li>
            <li>Restart the server</li>
          </ol>
          <p className="text-gray-700 mt-2">
            For now, you can still explore the other features of the Hood Canal Information Hub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh]">
        {isLoadingData ? (
          <div className="text-center py-4 text-gray-500">Loading local data...</div>
        ) : (
          <>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-blue-100 text-gray-800 rounded-bl-none">
                <ReactMarkdown className="prose prose-sm">
                  {`Hi! I can help answer questions about Hood Canal - including weather, tides, events, and more. What would you like to know?`}
                </ReactMarkdown>
              </div>
            </div>
            
            {messages.filter(m => m.role !== 'system').map(message => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-black rounded-br-none' 
                      : 'bg-blue-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <ReactMarkdown className="prose prose-sm">
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t flex items-center bg-gray-50">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the tides, weather, or anything else..."
          className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim() || isLoadingData}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-lg disabled:bg-blue-300"
        >
          <Send size={20} />
        </button>
        <button 
          type="button" 
          onClick={handleReload}
          className="ml-2 p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          title="Reset conversation"
        >
          <RotateCcw size={20} />
        </button>
      </form>
    </div>
  );
} 