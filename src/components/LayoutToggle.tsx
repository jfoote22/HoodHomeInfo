'use client';

import { useState, useEffect } from 'react';
import { Layout, LayoutGrid } from 'lucide-react';

interface LayoutToggleProps {
  onToggle: (isFullWidth: boolean) => void;
}

export default function LayoutToggle({ onToggle }: LayoutToggleProps) {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Initialize from localStorage if available
  useEffect(() => {
    const savedLayout = localStorage.getItem('preferredLayout');
    if (savedLayout) {
      // No need to use JSON.parse, just compare the string directly
      setIsFullWidth(savedLayout === 'fullWidth');
      onToggle(savedLayout === 'fullWidth');
    }
  }, [onToggle]);

  const toggleLayout = () => {
    const newValue = !isFullWidth;
    setIsFullWidth(newValue);
    // Save preference to localStorage as a simple string
    localStorage.setItem('preferredLayout', newValue ? 'fullWidth' : 'sideBySide');
    onToggle(newValue);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {isHovered && (
        <div className="bg-indigo-600 text-white text-sm py-1 px-3 rounded-lg shadow-lg transition-all duration-300 animate-fadeIn">
          Switch to {isFullWidth ? "side-by-side" : "full-width"} layout
        </div>
      )}
      
      <button
        onClick={toggleLayout}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300"
        title={isFullWidth ? "Switch to side-by-side layout" : "Switch to full-width layout"}
      >
        {isFullWidth ? (
          <LayoutGrid size={24} />
        ) : (
          <Layout size={24} />
        )}
      </button>
    </div>
  );
} 