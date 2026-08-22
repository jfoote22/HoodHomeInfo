import { NextResponse } from 'next/server';
import { saveHermesDocument, loadHermesDocument, blobConfigured } from '../../../../lib/hermesStore';

// Push endpoint for Hermes (the user's local agent on the MacBook Pro).
//
//   POST /api/hermes/events
//     Headers:  X-Hermes-Secret: <HERMES_PUSH_SECRET>   (or Authorization: Bearer <secret>)
//               Content-Type: application/json  -> body is {"events":[...]} (see docs/HERMES-HANDOFF.md)
//               Content-Type: text/html         -> body is the "Local WA Events" page HTML
//     Result:   {"ok":true,"kind":"json","events":32,"storage":"blob"}
//
//   GET /api/hermes/events
//     Status of the last push (no secret needed): {"hasDocument":true,"kind":"json","uploadedAt":...,"bytes":...}
//
// The events feed (/api/events/live) reads the stored document as its primary source.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is plenty for a couple hundred events

function authorized(req: Request): boolean {
  const secret = (process.env.HERMES_PUSH_SECRET || '').trim();
  if (!secret) return false;
  const header = (req.headers.get('x-hermes-secret') || '').trim();
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  return header === secret || bearer === secret;
}

export async function GET() {
  try {
    const doc = await loadHermesDocument();
    return NextResponse.json({
      hasDocument: Boolean(doc),
      kind: doc?.kind ?? null,
      uploadedAt: doc?.uploadedAt ?? null,
      bytes: doc?.bytes ?? null,
      storage: blobConfigured() ? 'blob' : 'file',
      secretConfigured: Boolean((process.env.HERMES_PUSH_SECRET || '').trim()),
    });
  } catch (err) {
    return NextResponse.json({ hasDocument: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(process.env.HERMES_PUSH_SECRET || '').trim()) {
    return NextResponse.json({ ok: false, error: 'HERMES_PUSH_SECRET is not configured on the server.' }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized: send the shared secret in X-Hermes-Secret (or Authorization: Bearer).' }, { status: 401 });
  }

  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not read request body.' }, { status: 400 });
  }
  if (!body.trim()) return NextResponse.json({ ok: false, error: 'Empty body.' }, { status: 400 });
  if (Buffer.byteLength(body) > MAX_BYTES) return NextResponse.json({ ok: false, error: `Body too large (max ${MAX_BYTES} bytes).` }, { status: 413 });

  // Decide JSON vs HTML by content-type, falling back to sniffing.
  let kind: 'json' | 'html';
  let eventCount: number | null = null;
  if (contentType.includes('json') || (!contentType.includes('html') && body.trim().startsWith('{'))) {
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      return NextResponse.json({ ok: false, error: `Body is not valid JSON: ${String(err)}` }, { status: 400 });
    }
    if (!parsed || !Array.isArray(parsed.events)) {
      return NextResponse.json({ ok: false, error: 'JSON must be an object with an "events" array.' }, { status: 400 });
    }
    const bad = parsed.events.findIndex((e: any) => !e || typeof e.title !== 'string' || !(e.start || e.date));
    if (bad >= 0) {
      return NextResponse.json({ ok: false, error: `events[${bad}] needs at least "title" and "start" (ISO 8601) or "date".` }, { status: 400 });
    }
    parsed.receivedAt = new Date().toISOString();
    body = JSON.stringify(parsed);
    kind = 'json';
    eventCount = parsed.events.length;
  } else if (contentType.includes('html') || /<html|<article|<body/i.test(body)) {
    kind = 'html';
    eventCount = (body.match(/<article class="event">/g) || []).length;
  } else {
    return NextResponse.json({ ok: false, error: 'Send application/json ({"events":[...]}) or text/html.' }, { status: 415 });
  }

  try {
    const saved = await saveHermesDocument(kind, body);
    return NextResponse.json({ ok: true, kind, events: eventCount, storage: saved.storage, receivedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Hermes push store failed:', err);
    return NextResponse.json({ ok: false, error: `Could not store document: ${String(err)}` }, { status: 500 });
  }
}
