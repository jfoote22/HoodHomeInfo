import React, { useEffect } from 'react';
import Image from 'next/image';

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

interface EventModalProps {
  event: Event;
  onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <div className="mb-4">
          <Image
            src={event.image}
            alt={event.title}
            width={400}
            height={200}
            className="rounded-lg object-cover w-full h-48"
          />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-indigo-800">{event.title}</h3>
        <div className="flex items-center text-gray-600 mb-2">
          <span className="mr-2"><b>Date:</b> {event.date}</span>
          <span className="mr-2"><b>Time:</b> {event.time}</span>
        </div>
        <div className="flex items-center text-gray-600 mb-2">
          <span className="mr-2"><b>Location:</b> {event.location}</span>
        </div>
        <div className="mb-2">
          <span className="inline-block text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 font-semibold">
            {event.category}
          </span>
        </div>
        <div className="text-gray-800 text-sm whitespace-pre-line">
          {event.description}
        </div>
        <div className="absolute bottom-3 left-3 text-xs text-gray-400">
          This window will close automatically in 10 seconds.
        </div>
      </div>
    </div>
  );
};

export default EventModal; 