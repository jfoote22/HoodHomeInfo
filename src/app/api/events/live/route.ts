import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_API_KEY;

// Hermes (a separate local agent) writes this file with the day's local events.
// Path is configurable so it can point at wherever Hermes drops its output.
const HERMES_EVENTS_PATH = process.env.HERMES_EVENTS_PATH || path.join(process.cwd(), 'data', 'hermes-events.json');

interface HermesEvent {
  id: string;
  title: string;
  date: string; // e.g. "Sat, Aug 15"
  time: string;
  location: string;
  category?: string;
  description?: string;
}

async function loadHermesEvents(): Promise<{ id: string; title: string; date: string; time: string; location: string; category: string }[] | null> {
  try {
    const raw = await readFile(HERMES_EVENTS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.events)) return null;
    return parsed.events.map((e: HermesEvent) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      category: e.category || 'Event',
    }));
  } catch {
    // File missing or unreadable - fall through to other sources.
    return null;
  }
}

async function loadEventbriteEvents() {
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.address=Belfair,WA&location.within=30mi&expand=venue&token=${EVENTBRITE_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!Array.isArray(data.events)) return [];
  return data.events.map((ev: any) => ({
    id: ev.id,
    title: ev.name.text,
    date: new Date(ev.start.local).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: new Date(ev.start.local).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    location: ev.venue?.address?.localized_address_display || 'Unknown',
    category: ev.category_id || 'Event',
  }));
}

export async function GET() {
  const hermesEvents = await loadHermesEvents();
  if (hermesEvents && hermesEvents.length > 0) {
    return NextResponse.json({ events: hermesEvents, source: 'hermes' });
  }

  try {
    const events = await loadEventbriteEvents();
    return NextResponse.json({ events, source: 'eventbrite' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch events', details: String(err) }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
