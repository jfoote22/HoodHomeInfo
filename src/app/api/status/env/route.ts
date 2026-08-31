import { NextResponse } from 'next/server';
import { googleConfigured } from '../../../../lib/googleCalendar';

// Safe deploy diagnostic: reports WHICH configuration keys are present in this
// deployment (true/false only - never values) so "is my env var actually set in
// production?" can be answered from a browser. Add ?refresh=1 to bypass caches.
const KEYS = [
  'GROK_API',
  'GROK_API_KEY',
  'XAI_API_KEY',
  'NEXT_PUBLIC_WEATHER_API_KEY',
  'NEXT_PUBLIC_NOAA_STATION_ID',
  'DASHBOARD_LAT',
  'DASHBOARD_LON',
  'HERMES_EVENTS_PATH',
  'ANTHROPIC_API_KEY',
  'DEEPGRAM_API_KEY',
  // "Our Events" sources - presence only, so an empty panel can be told apart from a
  // deployment that was never given a calendar.
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'OUR_CALENDAR_ID',
  // The id the hover embed renders; the list falls back to it so both show one calendar.
  'NEXT_PUBLIC_OUR_CALENDAR_ID',
  'OUR_CALENDAR_ICS_URL',
  'HERMES_EVENTS_URL',
];

export async function GET() {
  const present: Record<string, boolean> = {};
  for (const k of KEYS) {
    const v = process.env[k];
    present[k] = typeof v === 'string' && v.trim().length > 0 && !/^your_/i.test(v);
  }
  return NextResponse.json(
    {
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      deployment: process.env.VERCEL_URL || null,
      gitSha: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
      present,
      grokReady: present.GROK_API || present.GROK_API_KEY || present.XAI_API_KEY,
      // true only when GOOGLE_SERVICE_ACCOUNT_JSON actually parses into a usable key -
      // distinguishes "set but malformed" from "set and working". Boolean, never a value.
      googleCalendarReady: googleConfigured(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
