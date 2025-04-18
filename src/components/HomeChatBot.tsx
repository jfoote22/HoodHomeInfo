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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    checked: boolean;
    present: boolean;
    valid: boolean;
    message: string;
  }>({
    checked: false,
    present: false,
    valid: false,
    message: '',
  });
  
  // Check API key status on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const response = await fetch('/api/anthropic/check');
        const data = await response.json();
        
        setApiKeyStatus({
          checked: true,
          present: data.apiKeyPresent || false,
          valid: data.apiKeyValid || false,
          message: data.message || 'Unknown API status',
        });
        
        if (data.status === 'error') {
          setApiError(true);
          setErrorMessage(data.message);
        }
      } catch (error) {
        console.error('Error checking API key:', error);
        setApiError(true);
        setErrorMessage('Failed to check API key status');
        setApiKeyStatus({
          checked: true,
          present: false,
          valid: false,
          message: error instanceof Error ? error.message : 'Failed to check API status',
        });
      }
    };
    
    checkApiKey();
  }, []);
  
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
    onError: (error: unknown) => {
      console.error("Chat API error:", error);
      setApiError(true);
      try {
        // Try to parse the error message
        if (typeof error === 'string') {
          // Check if it's a JSON string
          if (error.startsWith('{') && error.endsWith('}')) {
            try {
              const errorObj = JSON.parse(error);
              setErrorMessage(errorObj.error || "Unknown API error");
            } catch {
              setErrorMessage(error);
            }
          } else {
            setErrorMessage(error);
          }
        } else if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An unknown error occurred connecting to the chat API");
        }
      } catch (e) {
        setErrorMessage("Failed to parse error message");
      }
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
    setErrorMessage('');
  };

  // Test API connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    
    try {
      // First check API key status
      const statusResponse = await fetch('/api/anthropic/check');
      const statusData = await statusResponse.json();
      
      setApiKeyStatus({
        checked: true,
        present: statusData.apiKeyPresent || false,
        valid: statusData.apiKeyValid || false,
        message: statusData.message || 'Unknown API status',
      });
      
      if (statusData.status !== 'success') {
        setApiError(true);
        setErrorMessage(statusData.message || 'API key check failed');
        setIsTestingConnection(false);
        return;
      }
      
      // If API key looks good, test a real request
      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Test connection' }]
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setApiError(true);
        setErrorMessage(data.error || "Unknown API error");
      } else {
        setApiError(false);
        setErrorMessage('');
        // If test was successful, trigger a reload to reset the UI
        reload();
      }
    } catch (error) {
      setApiError(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect to API");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // If there's an API error or API key issues, show a helpful message
  if (apiError || error || (apiKeyStatus.checked && (!apiKeyStatus.present || !apiKeyStatus.valid))) {
    return (
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-center text-red-600 mb-2">
            <AlertCircle className="mr-2" />
            <h3 className="font-semibold">API Connection Error</h3>
          </div>
          
          <p className="text-gray-700">
            {apiKeyStatus.message || errorMessage || "Unable to connect to the chat API. This feature requires an Anthropic API key to be configured."}
          </p>
          
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-2">API Key Status:</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${apiKeyStatus.present ? 'bg-green-500' : 'bg-red-500'}`}></span>
                API Key Present: {apiKeyStatus.present ? 'Yes' : 'No'}
              </li>
              {apiKeyStatus.present && (
                <li className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${apiKeyStatus.valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  API Key Format Valid: {apiKeyStatus.valid ? 'Yes' : 'No'}
                </li>
              )}
            </ul>
          </div>
          
          <p className="text-gray-700">
            To enable this feature, you need to:
          </p>
          <ol className="list-decimal pl-5 text-gray-700">
            <li>Get an API key from Anthropic</li>
            <li>Add it to your .env.local file as ANTHROPIC_API_KEY</li>
            <li>Make sure the API key starts with &quot;sk-ant-api&quot;</li>
            <li>Restart the server</li>
          </ol>
          
          <div className="flex space-x-2 mt-4">
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isTestingConnection}
            >
              Retry Connection
            </button>
            
            <button
              onClick={testConnection}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
              disabled={isTestingConnection}
            >
              {isTestingConnection ? 'Testing...' : 'Test API Connection'}
            </button>
          </div>
          
          <p className="text-gray-700 mt-2">
            For now, you can still explore the other features of the Hood Canal Information Hub.
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while checking API key
  if (!apiKeyStatus.checked) {
    return (
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="p-4 text-center">
          <div className="animate-pulse flex flex-col items-center justify-center">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <p className="text-gray-500 mt-4">Checking API connection...</p>
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