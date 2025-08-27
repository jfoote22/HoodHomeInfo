import { NextResponse } from 'next/server';

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_API_KEY;

export async function GET() {
  const url = `https://www.eventbriteapi.com/v3/events/search/?location.address=Belfair,WA&location.within=30mi&expand=venue&token=${EVENTBRITE_TOKEN}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Eventbrite API raw response:', JSON.stringify(data, null, 2));
    // Map Eventbrite data to your Event type
    const events = (data.events || []).map((ev: any) => ({
      id: ev.id,
      title: ev.name.text,
      date: new Date(ev.start.local).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: new Date(ev.start.local).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: ev.venue?.address?.localized_address_display || 'Unknown',
      category: ev.category_id || 'Event',
      image: ev.logo?.url || '/default-event.jpg',
      description: ev.description?.text || '',
    }));
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch events', details: String(err) }, { status: 500 });
  }
} 