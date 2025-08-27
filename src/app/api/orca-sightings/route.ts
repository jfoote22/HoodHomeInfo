import { NextResponse } from 'next/server';

// Mock data for orca sightings
const orcaSightings = [
  {
    id: '1',
    lat: 47.6,
    lng: -122.3,
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    type: 'real-time',
    pod: 'J Pod'
  },
  {
    id: '2',
    lat: 47.7,
    lng: -122.4,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    type: 'sighting',
    pod: 'K Pod'
  },
  {
    id: '3',
    lat: 47.8,
    lng: -122.5,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    type: 'sighting',
    pod: 'L Pod'
  },
  {
    id: '4',
    lat: 47.9,
    lng: -122.6,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    type: 'historical',
    pod: 'J Pod'
  },
  {
    id: '5',
    lat: 48.0,
    lng: -122.7,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    type: 'real-time',
    pod: 'K Pod'
  }
];

export async function GET() {
  return NextResponse.json(orcaSightings);
} 