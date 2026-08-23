import { NextResponse } from 'next/server';
import { insertEvent, googleConfigured, templateLink, calendarId } from '../../../../lib/googleCalendar';

// "Add to calendar" from the Local Events list.
//   POST { title, start (ISO), end?, allDay?, location?, description?, url? }
//   -> { ok:true, added:true, event }                       when the service account is configured
//   -> { ok:true, added:false, fallbackUrl }                 otherwise (open Google Calendar pre-filled)

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
  const ev = {
    title,
    start,
    end: body.end || null,
    allDay: Boolean(body.allDay),
    location: body.location || null,
    description: body.description || null,
    url: body.url || null,
  };

  if (!googleConfigured()) {
    return NextResponse.json({ ok: true, added: false, calendar: calendarId(), fallbackUrl: templateLink(ev), reason: 'Google service account not configured' });
  }
  try {
    const created = await insertEvent(ev);
    return NextResponse.json({ ok: true, added: true, calendar: calendarId(), event: created });
  } catch (err) {
    console.error('calendar add failed:', err);
    return NextResponse.json({ ok: false, error: String(err), fallbackUrl: templateLink(ev) }, { status: 502 });
  }
}
