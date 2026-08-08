'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ScrollableWindowProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  scrollbarColor?: 'blue' | 'emerald' | 'cyan' | 'amber' | 'purple';
  enableHorizontalScroll?: boolean;
}

export default function ScrollableWindow({ 
  children, 
  className = '', 
  maxHeight = '100%',
  scrollbarColor = 'blue',
  enableHorizontalScroll = false 
}: ScrollableWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates (useful for chat-like interfaces)
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  // Smooth scroll to specific element within the container
  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const scrollbarColorClasses = {
    blue: 'scrollbar-blue',
    emerald: 'scrollbar-emerald', 
    cyan: 'scrollbar-cyan',
    amber: 'scrollbar-amber',
    purple: 'scrollbar-purple'
  };

  const scrollClasses = [
    'overflow-y-auto',
    enableHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden',
    'scroll-smooth',
    scrollbarColorClasses[scrollbarColor],
    className
  ].join(' ');

  return (
    <div 
      ref={scrollContainerRef}
      className={scrollClasses}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
}

// Hook to access scroll utilities
export const useScrollableWindow = (scrollContainerRef: React.RefObject<HTMLDivElement>) => {
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return {
    scrollToBottom,
    scrollToTop,
    scrollToElement
  };
};