import { NextResponse } from 'next/server';
import { deleteEvent, googleConfigured, calendarId } from '../../../../lib/googleCalendar';

// "Delete" from the Our Events panel.
//   POST { id?, source?, title, start (ISO) }
//   -> { ok:true, deleted:true, id }            removed from the Google Calendar
//   -> { ok:true, deleted:false }               no matching event found (already gone?)
//   -> { ok:false, configured:false }           no service account - nothing can be deleted

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const title = String(body?.title || '').trim();
  const start = String(body?.start || '').trim();
  if (!title || !start || Number.isNaN(new Date(start).getTime())) {
    return NextResponse.json({ ok: false, error: 'title and a valid ISO start are required' }, { status: 400 });
  }
  if (!googleConfigured()) {
    return NextResponse.json({ ok: false, configured: false, calendar: calendarId(), error: 'Google service account not configured' }, { status: 501 });
  }
  try {
    const result = await deleteEvent({ id: body.id ? String(body.id) : null, source: body.source ? String(body.source) : null, title, start });
    return NextResponse.json({ ok: true, calendar: calendarId(), ...result });
  } catch (err) {
    console.error('calendar delete failed:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
