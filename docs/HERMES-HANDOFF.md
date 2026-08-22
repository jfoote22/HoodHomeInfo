# Hermes → Hood Canal Dashboard: event push hand‑off

You (Hermes) already produce a "Local WA Events" page every cron run. The wall dashboard at
**https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app** wants that data as its primary
Local Events source. Because the dashboard runs on Vercel (no access to the home LAN, read‑only
filesystem), you **push** the data to it over HTTPS after each run. Nothing else changes on your side.

## The contract

| | |
| --- | --- |
| Endpoint | `POST https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app/api/hermes/events` |
| Auth | header `X-Hermes-Secret: <secret>` (or `Authorization: Bearer <secret>`). The secret is the value of `HERMES_PUSH_SECRET` the owner set in Vercel — get it from them, keep it out of logs. |
| Body, option A (preferred) | `Content-Type: application/json` — the JSON document described below |
| Body, option B (zero effort) | `Content-Type: text/html; charset=utf-8` — the exact HTML of the page you already generate (the `<article class="event"><pre>…</pre></article>` cards). The dashboard parses it. |
| Size limit | 2 MB |
| Frequency | once per cron run (every 15 min is fine); the dashboard caches for ≤30 min |
| Success | `200 {"ok":true,"kind":"json","events":32,"storage":"blob"}` |
| Failure | `401` bad/missing secret · `400` malformed JSON / missing fields · `413` too big · `415` unknown content type · `503` dashboard not yet configured (tell the owner) |
| Verify | `GET https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app/api/hermes/events` → `{"hasDocument":true,"kind":"json","uploadedAt":"…","bytes":…}` (no secret needed) |

Each push **replaces** the previous document entirely — always send the full current list, not a delta.

## JSON document (option A)

```json
{
  "generatedAt": "2026-08-22T14:02:00-07:00",
  "window": "Sat Aug 22 – Sat Sep 5, 2026",
  "events": [
    {
      "title": "Belfair Saturday Market",
      "start": "2026-08-29T10:00:00-07:00",
      "end": "2026-08-29T15:00:00-07:00",
      "allDay": false,
      "venue": "Belfair Elementary",
      "address": "22900 Hwy 3, Belfair, WA",
      "city": "Belfair",
      "category": "Farmers Market",
      "url": "https://olympicpeninsula.org/event/belfair-saturday-market/2026-08-29/",
      "description": "Weekly Hood Canal market with produce, eggs, flowers, art, handmade goods, and local vendors.",
      "imageUrl": null,
      "id": "belfair-saturday-market-2026-08-29"
    }
  ]
}
```

Rules:
- `title` and `start` are required. `start`/`end` are ISO 8601 **with a UTC offset** (Pacific is `-07:00` in summer, `-08:00` in winter); `Z`/UTC is also fine.
- **Recurring events: emit one object per occurrence** (e.g. a Saturday market on Aug 22, Aug 29, Sep 5 = three objects). The dashboard shows the next ~20 individual occurrences.
- `allDay: true` when there is no meaningful time (then `start` can be `YYYY-MM-DDT00:00:00-07:00`).
- `city` should be the town (Union, Belfair, Shelton, Hoodsport, Bremerton, Gig Harbor, Tacoma, Seattle…) — it is shown on the card when there is no venue.
- `venue` is the place name (what people call it), `address` the street address. Keep `description` ≤ ~200 chars; it is not shown on the TV today but is kept for the AI assistant.
- `id` optional but helpful — a stable slug per occurrence so re-pushes dedupe cleanly.
- Only include events from today forward (past events are dropped anyway). Events up to ~120 days out are accepted.
- Order doesn't matter; the dashboard sorts by `start`.

If you cannot produce ISO timestamps, a legacy shape is accepted per event: `"date": "Sat Aug 29"` + `"time": "10:00 AM"` (year inferred) — but prefer `start`.

## Minimal push snippets

**Shell**
```bash
curl -sS -X POST "https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app/api/hermes/events" \
  -H "X-Hermes-Secret: $HERMES_PUSH_SECRET" \
  -H "Content-Type: application/json" \
  --data-binary @/path/to/local-wa-events.json
```

**Python (stdlib only)**
```python
import json, os, urllib.request

URL = "https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app/api/hermes/events"
SECRET = os.environ["HERMES_PUSH_SECRET"]

def push_events(doc: dict) -> dict:
    body = json.dumps(doc).encode("utf-8")
    req = urllib.request.Request(
        URL, data=body, method="POST",
        headers={"Content-Type": "application/json", "X-Hermes-Secret": SECRET},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

# result = push_events({"generatedAt": "...", "events": [...]})
# assert result["ok"], result
```

**Pushing the HTML you already make (option B)**
```bash
curl -sS -X POST "https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app/api/hermes/events" \
  -H "X-Hermes-Secret: $HERMES_PUSH_SECRET" \
  -H "Content-Type: text/html; charset=utf-8" \
  --data-binary @/path/to/index.html
```
Keep the current card format if you use this: a `• Title` line, then `Date & time:`, `Venue / location:`, `Category:`, `Link:` lines inside `<article class="event"><pre>`, grouped under `<section class="city"><h2>City</h2>` and `<h3>Category</h3>`. Multi-date lines like `Sat Aug 22, Sat Aug 29, Sat Sep 5, 10:00 AM–3:00 PM` are understood.

## Operational notes
- Retry once on network error or 5xx; don't retry on 4xx (fix the payload instead).
- If the owner has not finished setup you will get `503 HERMES_PUSH_SECRET is not configured` — just report it.
- Local testing: the same endpoint exists on the owner's dev machine at `http://<dev-pc-ip>:3000/api/hermes/events` with secret `hermes-local-dev-secret`; there it writes to `data/hermes-events.*` instead of cloud storage.
- The LAN page at `http://192.168.40.77:8788/` can keep running; the dashboard's local build still reads it directly as a fallback.
