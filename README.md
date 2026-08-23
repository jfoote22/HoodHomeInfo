# Hood Canal Marine Dashboard

Always-on wall display for a waterfront home in **Union, WA** (Hood Canal / Puget Sound).
Designed for a 16:9 TV at 1920×1080 and scales to fit any screen.

| Panel | What it shows | Live source |
| --- | --- | --- |
| **AI Voice Agent** (left) | Live conditions briefing; type a question (⌘K / Ctrl+K) and Grok answers grounded in today's real weather, tide, and sighting data | xAI Grok (`GROK_API`) |
| **Marine Map** (center) | Real map of Hood Canal + Puget Sound with whale sighting pins from the last 7 days (recent ones pulse), clock, LIVE count, tide direction | [Acartia](https://acartia.io) open sightings feed (Orca Network / Whale Alert data), CARTO tiles |
| **Weather & Tides** (right‑top) | Current conditions, 4‑step forecast strip, interpolated tide curve with next high/low and "now" dot | OpenWeatherMap (`NEXT_PUBLIC_WEATHER_API_KEY`), NOAA CO‑OPS station **9445478 Union, Hood Canal** |
| **Our Events** (left‑top) | The household calendar (bravefoote@gmail): next entries; matching local events are marked GOING | Google Calendar (service account) · Hermes `ourEvents` · ICS feed |
| **Calendar view** (rotates with the live panels every 30 s; `?rotate=0` to disable, `?view=calendar` to start there) | 3‑week grid of our events + local events | same feeds |
| **Local Events** (left) | Next upcoming events around Union / Belfair / Hood Canal | **Hermes** (the local agent's "Local WA Events" page, `HERMES_EVENTS_URL`) as the primary source, merged with North Mason Chamber + Explore Hood Canal; optional `data/hermes-events.json` |

Two approved themes from the design handoff — **Command Center** (dark, default) and **Daylight Glass** (light). Toggle with the tiny button bottom‑right, or pin one in the URL: `/?theme=daylight-glass`.

---

## Run it locally

```bash
cd template-2
npm install
cp .env.local.example .env.local   # then fill in the keys below
npm run dev                         # http://localhost:3000
```

Production build (what the TV should run if you host it on a PC):

```bash
npm run build
npm start                           # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_WEATHER_API_KEY` | yes | OpenWeatherMap key (free tier is fine) |
| `GROK_API` | for the AI panel | xAI API key. Without it the panel still shows the live briefing; chat returns an error |
| `NEXT_PUBLIC_NOAA_STATION_ID` | no | defaults to `9445478` (Union, Hood Canal) |
| `DASHBOARD_LAT` / `DASHBOARD_LON` | no | weather point; defaults to Union, WA `47.3583, -123.0953` |
| `HERMES_EVENTS_URL` | recommended | Hermes "Local WA Events" page, e.g. `http://192.168.40.77:8788/` on the LAN. The Vercel deployment can't reach a LAN address — expose it with a tunnel (`cloudflared tunnel --url http://localhost:8788` on the Mac gives a public https URL) and set that in Vercel |
| `GOOGLE_SERVICE_ACCOUNT_JSON` + `OUR_CALENDAR_ID` | recommended | service‑account JSON (raw or base64) with the bravefoote@gmail calendar shared to it → live "Our Events" + the **+ Add to calendar** button writes directly. Without it the button opens Google Calendar pre‑filled |
| `OUR_CALENDAR_ICS_URL` | no | read‑only alternative: the calendar's secret iCal address |
| `HERMES_PUSH_SECRET` | recommended | shared secret for `POST /api/hermes/events` (Hermes pushes its events here; see `docs/HERMES-HANDOFF.md`). On Vercel also create a Blob store on the project (Storage → Create → Blob) so pushed documents persist |
| `HERMES_EVENTS_PATH` | no | path to a JSON file of extra events (see `data/hermes-events.example.json`) |

Whale sightings, tides, map tiles, and the chamber/Explore Hood Canal event feeds need **no keys**.

---

## Put it on the TV

The page is a normal website, so anything with a browser works. Pick one:

### Option A — PC/mini‑PC plugged into the TV (recommended: most reliable, cursor hides, never sleeps)

1. Build + start the server on that machine (`npm run build && npm start`), **or** just point at the hosted URL below.
2. Run `scripts\start-tv.ps1` (right‑click → Run with PowerShell) or double‑click `scripts\start-tv.bat`.
   It launches Microsoft Edge in kiosk mode, full‑screen, pointed at the dashboard.
   Pass a URL to use the hosted version instead of localhost:
   `powershell -File scripts\start-tv.ps1 -Url https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app`
3. To start automatically at login: press `Win+R`, type `shell:startup`, and drop a shortcut to `scripts\start-tv.bat` in that folder.
4. Windows power settings: set *Screen → Never* and *Sleep → Never* while plugged in. The page also requests a
   browser **wake lock** so the display won't blank while it's showing.

### Option B — Smart TV / streaming stick browser

Open the hosted URL in the TV's browser (Google TV/Android TV: install a browser such as *TV Bro* or use the built‑in one; Fire TV: *Silk*; LG/Samsung: the built‑in browser) and use its full‑screen mode. Disable the TV's screen‑saver / auto‑off. Some TV browsers are slow with map tiles — if it feels laggy, use Option A.

### Option C — Cast from a laptop/phone

Chrome → ⋮ → *Cast…* → *Cast tab* (or *Cast screen*) to a Chromecast/Google TV. Simple, but the source device must stay on.

### Hosted URL

The project auto‑deploys from GitHub `main` to Vercel:
**https://hoodhomeinfo-justinfoote-gmailcoms-projects.vercel.app**
Make sure the same env vars above are set in the Vercel project (Settings → Environment Variables).

---

## Always‑on behaviors built in

- Data refresh: weather 30 min × tides 15 min × sightings 10 min × events 30 min × clock every minute.
- Server‑side caching + stale‑if‑error so a flaky upstream never blanks a panel.
- Screen **wake lock**, mouse cursor auto‑hides after 4 s, full page reload nightly at 4 AM (and after the tab was hidden > 6 h) to keep memory fresh.
- Theme is remembered per device (localStorage) or forced via `?theme=`.
- Every timestamp is computed in `America/Los_Angeles` regardless of server timezone (Vercel runs UTC).

## Project layout

```
src/app/page.tsx                         → renders <MarineDashboard/>
src/components/dashboard/                → the wall display
  MarineDashboard.tsx                    grid shell, theme toggle, providers
  DashboardDataContext.tsx               one owner for all live feeds + clock + AI briefing text
  MarineMapPanel.tsx  WeatherTidesPanel.tsx  LocalEventsPanel.tsx  AIVoiceAgentPanel.tsx
  KioskBehaviors.tsx                     wake lock / cursor / nightly reload
  theme.ts  DashboardThemeContext.tsx    design tokens for both themes
src/lib/hooks/                           client hooks per feed
src/lib/time.ts                          Pacific‑time helpers shared by API routes
src/app/api/weather/reliable             OpenWeatherMap → current + forecast strip
src/app/api/tides/reliable               NOAA CO‑OPS hi/lo predictions
src/app/api/orca-sightings/live          Acartia sightings, bbox‑filtered to the map
src/app/api/events/live                  events aggregator (Hermes file + chamber + Explore Hood Canal)
src/app/api/grok/chat                    AI chat, grounded with the live briefing
src/components/*.tsx (top level)         older grid‑layout components, kept for reference only
```

Design reference: `../Dashboard for Washington locations/design_handoff_marine_dashboard/` (README + `.dc.html` comps).
