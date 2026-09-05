# Hood Home Info — Roadmap & Operational Notes

A running list of future ideas, pending cleanup, and how the dashboard is actually
deployed/run, so anyone (or any future agent) can pick this back up quickly.

Last updated: 2026-09-01.

---

## Operational notes (how it runs today)

- **The kiosk display** (wall TV + Raspberry Pi) loads the dashboard from the **MacBook Pro**
  on the LAN at **`http://192.168.40.77:3001`**. The TV/Pi are just browsers pointed at that URL —
  they do not run their own server.
- **The server host** is the MacBook Pro. The repo lives at
  `/Users/justinfoote/hood_home_info_local/HoodHomeInfo` — **the app is at the repo root there**
  (no `template-2/` subfolder). It's started with:
  ```bash
  npm run dev -- -p 3001
  ```
  ⚠️ `next dev` defaults to port **3000**; the kiosk expects **3001**, so the `-p 3001` matters.
  If a stale server is already on 3001, free it first: `lsof -ti :3001 | xargs kill`.
- **Hermes / "Howie"** (the local events + NWS weather + stock-watch feed) also runs on the
  MacBook Pro, at **`http://192.168.40.77:8788/`** (`HERMES_EVENTS_URL` in `.env.local`).
- **The Windows PC** has a second clone at `C:\Users\rawfo\Cursor\HoodHomeInfo\template-2`
  (here the app IS in a `template-2/` subfolder — that folder is the git root). It's used for
  editing; changes reach the Mac via **`git pull`**.
- **Branches:** `main` is production. `grokbot/weather-events-hourly` is an earlier agent's
  experiment kept on GitHub (never merged) — safe to ignore or delete once we're sure nothing
  from it is wanted.
- **"Our Events" calendar** reads the household Google Calendar (`bravefoote@gmail.com`)
  **server-side via a Google service account** — no viewer sign-in, calendar stays private.
  See `src/lib/googleCalendar.ts` and `.env.local.example` for setup. Env vars needed on the
  Mac: `GOOGLE_SERVICE_ACCOUNT_JSON` (base64 of the key file) + `OUR_CALENDAR_ID`.
  Service account in use: `hood-calendar@hoodcanalendar.iam.gserviceaccount.com`
  (project `hoodcanalendar` — note the **d**), shared on the calendar with **"Make changes to
  events"** so the delete/add buttons work.

---

## Pending cleanup / security

- [ ] **Rotate the exposed key.** A service-account private key was printed into a Claude Code
      session transcript during setup (the original Windows-downloaded key, private_key_id
      starting `d3e711…`). Delete that key in the Google Cloud console so the exposed copy is
      dead. The Mac is using a *different* key already, so deleting the old one is safe.
- [ ] **Delete the leftover project.** Two near-identical projects were created by mistake:
      `hoodcanalenar` (no **d**, abandoned) and `hoodcanalendar` (with **d**, the one in use).
      Delete the no-**d** project to avoid future confusion.
- [ ] **Remove stray key files** from `~/Downloads` on both the Mac and the Windows PC.
- [ ] **Make the 3001 server durable.** Right now it's a foreground `npm run dev`; it dies when
      the terminal closes and must be restarted by hand. Set it up to survive reboots (e.g. a
      `launchd` agent or `pm2`), ideally running a production build (`npm run build` + `npm start
      -p 3001`) instead of dev mode for a kiosk. Also confirm nothing auto-starts an old
      grokbot-branch server on 3001.

---

## Future features (ideas to develop)

### 1. Calendar event detail popup
When the calendar is faded in (hover over Our Events) and the mouse rolls over a specific
event, show a window with the full event details (title, date/time, location, description,
link). Today the calendar chips are read-only summaries.
- Data is already available: `OurEvent` (see `src/lib/hooks/useOurEvents.ts`) carries
  `title, start, end, allDay, location, url, description*`. (`description` is fetched by the
  API but not currently surfaced on `OurEvent` — may need to add it through.)
- Likely a hover/click popover in `src/components/dashboard/CalendarView.tsx`.

### 2. Talk to the voice agent (mic or button)
Add a way to actually speak to the AI voice agent — a physical/on-screen **button** (push to
talk) and/or **mic** capture. Today the AI panel shows an idle "say the wake word" prompt but
there's no working input path on the kiosk.
- Relevant: `src/components/dashboard/AIVoiceAgentPanel.tsx`, the Grok chat route
  (`src/app/api/grok/chat/route.ts`), and there are existing Deepgram/OpenAI transcribe routes
  (`/api/deepgram`, `/api/openai/transcribe`) that could power speech-to-text.
- Consider a remote-friendly trigger since it's a wall display (the kiosk may not have a mic).

### 3. Local Events UI — images instead of the date box
Replace each Local Events row's day-of-month box (the one with the diagonal lines) with an
**image representing the event**. Ideas to explore:
- **Curated logos for known event types:** Mariners game → Mariners/Seattle logo, Seahawks game
  → Seahawks logo, farmers market → a market icon, etc. A keyword→image map is the simplest
  first step.
- **AI-generated images** for events without a known logo (there's already a Replicate route:
  `/api/replicate/generate-image`). Cache generated images so we don't regenerate each load.
- **Delineate between towns** — a visual cue (color, badge, or section) per town
  (Belfair / Union / Shelton / Bremerton / etc.) so it's clear where each event is.
- Relevant: `src/components/dashboard/LocalEventsPanel.tsx`, the events feed via Hermes/Howie.
- Open question: licensing/appropriateness of real team logos on a personal display — decide
  before shipping logos.

### 4. Integrate AIOS (second brain) into the AI's context
Give the AI access to context from the user's **AIOS** second-brain app so it can answer with
that knowledge.
- ⚠️ **Privacy is the key constraint.** This is a semi-public wall display; not all AIOS content
  should be exposed to anyone standing in front of it. Needs a deliberate access model — e.g.
  a curated/whitelisted subset, a "private vs. shareable" tag, or gating detailed answers behind
  an authenticated interaction rather than the ambient display.
- Discuss scope and the trust boundary before building. Cross this bridge together.

---

## Recently done (2026-09-04)

- **Marine map was showing one pod instead of a week of the Sound.** Orca Network relays a
  *moving* pod as a stream of separate reports, so J pod tracked up Saratoga Passage produced
  63 of the feed's records in two days. The route kept every one as its own pin, then capped
  the result at 40 — so the cap was spent entirely on that one pod, the cut landed 26 hours
  back, and every gray whale, minke, humpback and porpoise from the rest of the week was
  dropped. The map read as a smear of identical dots and "Latest sightings" listed the same
  pod three times. Reports about one group are now collapsed into a single sighting at its
  most recent position (matched on species, headcount, and whether a whale could actually
  have swum the distance in the elapsed time), and the cap is applied after grouping.
- Species labels now read Acartia's `type` field instead of only the freeform comment, so
  identical reports of one pod stop labelling themselves "J-Pod Orca" and "Orca" at random.
- Map reserves a small strip at the top so the numbered pins clear the title band.

## Recently done (this session, 2026-09-01)

- Removed the Google Calendar **iframe embed** that forced per-tab sign-in and rendered an
  illegible UI on the kiosk; replaced it with a native, legible calendar.
- Wired the household calendar via a **service account** (server-side read, private calendar,
  no viewer login) — Our Events populates from the real Google Calendar; delete/add work.
- Rebuilt the hover-reveal calendar natively with a **Month/Week toggle** (defaults to Month).
- UI polish: map default zoom +1, weather hourly strip drops the redundant "NOW" and shows five
  upcoming 3-hour points, Tide Direction lifted off the bottom edge, and smoother auto-scroll /
  ticker animations (removed a per-frame layout reflow; ticker on its own compositor layer).
