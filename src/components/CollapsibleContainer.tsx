'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CollapsibleContainerProps {
  title: string;
  gradient?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleContainer({
  title,
  gradient = "bg-gradient-to-r from-blue-500 to-cyan-400",
  children,
  defaultOpen = true
}: CollapsibleContainerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div 
        className={`p-4 ${gradient} text-white cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{title}</h2>
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
} 