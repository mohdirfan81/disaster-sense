# 🚨 DisasterSense — Disaster Response Multi-Agent System

**Decision-support prototype for emergency control rooms, with a citizen safety companion.** DisasterSense collects citizen incident reports, analyzes them through a visible multi-agent AI pipeline, prioritizes emergencies, recommends resource allocation, and generates live situation reports — alongside live weather, river-discharge and earthquake monitoring, GPS incident auto-detection, trusted-contact sharing and shelter navigation. The demo ships four role views (Citizen, Government, Rescue team, Platform admin) on a clean, Material-inspired light dashboard.

> ⚠️ **Important:** DisasterSense is a prototype. It **does not dispatch real emergency services**, and critical dispatch decisions always require explicit human approval. Advisories shown in the app are heuristics, **not official warnings**. It is not a replacement for official emergency numbers (112) or agency procedures.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

That's it — the incident/pipeline demo runs with zero configuration using an in-memory store and mock agent logic. Environmental widgets call public APIs directly (no API keys). Copy `.env.example` to `.env.local` only if you want to override defaults.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest unit + integration tests |
| `npm run check` | Typecheck → lint → test → build (use in CI) |

**Requires Node.js ≥ 20.**

## Configuration

All variables are optional; defaults are safe for the demo.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute public URL used for metadata/canonical URLs |
| `PIPELINE_STEP_DELAY_MS` | `650` | Delay between agent steps so the UI shows progress (`0` = instant) |
| `SIMULATION_REPORT_GAP_MS` | `400` | Gap between generated reports during a simulation batch |

## Live environmental data

Three validated providers power the environment widgets. Responses are parsed with **zod** at the API boundary; missing measurements are never replaced with zero, provider failures return `502`, and bad coordinates return `400` (see `src/lib/environment-api.ts`).

| Domain | Source | Endpoint | Notes |
| --- | --- | --- | --- |
| Current weather + 24 h hourly forecast | [Open-Meteo Forecast](https://open-meteo.com/) | `GET /api/weather?lat=&lng=` | temperature, feels-like, humidity, wind speed/direction, precipitation, WMO weather code, `timezone=GMT` |
| River discharge, 7-day daily forecast | [Open-Meteo Flood (GloFAS)](https://open-meteo.com/en/docs/flood-api) | `GET /api/water-levels?lat=&lng=` | **Modeled** discharge (~5 km resolution) — not gauge readings, not a flood warning |
| Earthquakes, past 24 h, M≥2.5 | [USGS FDSN Event API](https://earthquake.usgs.gov/fdsnws/event/1/) | `GET /api/earthquakes?lat=&lng=&radius=` | Reviewed/automatic events — not predictions |
| Reverse geocoding (place name) | [OpenStreetMap Nominatim](https://nominatim.org/) → [BigDataCloud](https://www.bigdatacloud.com/) fallback | `GET /api/place?lat=&lng=` | Exact place name for a GPS fix; coordinates rounded to ~11 m before lookup |

Environment fetches are cached for 5 minutes (`next: { revalidate: 300 }`), retry transient
failures up to 3 times with a 15 s timeout per attempt, and return 400/502 with a JSON error
message. Place lookups are cached for 24 h.

## Features

### Four-role demo workspace (`/`)

A sticky switcher selects one of four clearly-labelled **"demo view · no login"** roles:

- **Citizen** — Safety Center + live environment widgets (below).
- **Government** — KPIs, incident charts, situation report generator, resource readiness, system health, simulations, shared Operations Board.
- **Rescue team** — same operational toolkit focused on the incident list/map/activity feed.
- **Platform admin** — system health, simulations, operations overview.

### Safety Center (Citizen view)
- **Opt-in GPS tracking** — `use-geolocation` hook; the last fix and trusted contacts are persisted locally in the browser. When location is enabled, the app sends coordinates to its API for nearby weather, river, earthquake and place-name lookups; the server forwards lookup coordinates to the relevant external providers. Submitting a report also sends its coordinates with that report. The current fix is reverse-geocoded to a place name, shown with the coordinates, accuracy and timestamp.
- **Auto-detection** — polls the live incident feed every 15 s; reports incidents within 5 km of your fix in a banner, and (with permission) auto-arms continuous tracking once when danger appears.
- **Live advisories** — weather / river / seismic heuristics (`src/lib/advisories.ts`) with a highest-severity summary. Clearly labelled as guidance, not official warnings.
- **Shelters** — nearest-first list with distance, capacity and **Directions** links that open Google Maps (keyless deep links; routes are not guaranteed passable).
- **Trusted contacts** — up to 6 contacts stored locally; compose an SMS preview and Open SMS (`sms:`/`tel:` links). **Nothing is ever sent without an explicit final tap.**
- **One-tap 112** (`tel:112`) and a shortcut to the report form.

### Live environment widgets
- **WeatherWidget** — current conditions + 24 h hourly precipitation/temperature/wind.
- **WaterLevelMonitor** — 7-day river-discharge sparkline with an explicit "modeled, not a gauge reading" disclaimer.
- **EarthquakeMonitor** — recent events within a configurable radius, with magnitude, depth, time and USGS links.

### Operations Board
Shared map + filterable incident list + live activity feed with KPI header — used by the Government, Rescue and Admin views.

### Citizen emergency reporting (`/report`)
- Disaster type (flood, fire, earthquake, cyclone, industrial, medical, other)
- Location: manual address, typed coordinates, or browser GPS
- Severity (low → critical), people affected/trapped, description, contact number
- **SOS quick-report** — enforced on the server: any report flagged SOS is stored and processed as `critical` regardless of the severity chosen in the form
- Confirmation screen with a unique incident ID (`INC-XXXXXX`)

### Manual missing-person report (`/missing-person`)
- Records the reporter, missing person's name and description, last-seen time and location.
- The reporter can enter coordinates or explicitly opt to use the current device location.
- Marks the resulting incident as "Missing person · unverified" on the demo operations board. This is not a staffed review or verification service; it does not locate another phone, contact a rescue team, or dispatch services.
- The GPS button reads the submitting device's location only. Use it only when that device is at the person's last-known location; otherwise enter the last-known location manually.
- Reports are stored in the prototype's in-memory demo store and may be lost when the server restarts. Do not submit real sensitive personal information to a public demo deployment.

### Simulation console (`/simulations`)
Runs 1, 3 or 5 clearly-flagged fictional scenarios through the full pipeline to populate KPIs, charts and the feed. Simulated incidents are marked as such and reset when the server restarts.

### Multi-agent AI pipeline
Seven agents run in sequence for every report, each with a single responsibility:

| # | Agent | Role |
| --- | --- | --- |
| 1 | **Intake** | Cleans/validates the report; extracts type, severity, people, urgency keywords, hazards |
| 2 | **Classification** | Category + urgency (1-5); duplicate detection; clusters similar reports into one incident |
| 3 | **Geospatial** | Maps the incident to an operational zone; affected radius; nearest shelters/hospitals/fire & police stations |
| 4 | **Risk Analysis** | Weather + density + severity → 0-100 risk score, escalation risks, predicted spread |
| 5 | **Resource Allocation** | Recommends ambulances, fire brigades, boats, medical teams, police, volunteers, supplies, helicopters, shelters |
| 6 | **Communication** | Generates SMS-style, social-media and control-room alerts in **English, Hindi and Telugu** |
| 7 | **Report Generation** | Updates clusters and the live situation report |

Every agent step is logged to the activity feed with status: **Pending · Running · Completed · Needs Human Review**. Approval-gated incidents carry an explicit `awaiting_approval` status — they are never shown as `dispatched` until someone uses the demo approval control. The role views have no authentication or authorization, so this is not a secure operator approval process. Approval simulates a resource assignment inside the demo inventory (no real teams are dispatched and no messages are sent); rejection is recorded in the agent log and leaves the incident active for reassessment.

### Data model
`User`, `IncidentReport`, `Incident` (deduplicated active incident with agent outputs), `AgentLog`, `Resource`, `Cluster`, `SituationReport` — see `src/types/domain.ts` and the reference SQL in `sql/schema.sql`.

### Key design rules
- **Mock agents, real seams.** Each agent is a pure/async function with typed input/output. Replace the body with an LLM or API call without touching the orchestrator.
- **Live providers, validated at the edge.** Every environmental response is zod-parsed; incomplete payloads fail loudly instead of rendering zeros.
- **Swappable persistence.** Repository pattern over a typed in-memory store; a PostgreSQL driver can drop in behind it.
- **Honest labeling.** Provider down → explicit `502` (no fabricated data). No SMS gateway → drafts only. GloFAS → "modeled". Advisories → "heuristic".
- **Privacy disclosures.** The last GPS fix and trusted-contact list are persisted locally in the browser. Location-based lookups transmit coordinates to app APIs and external providers, and report submissions send their coordinates to the app. Sharing a trusted-contact message requires explicit user confirmation.

## Project structure

```
src/
├── app/                     # App Router: /, /report, /missing-person, /simulations, /incidents/[id], API routes
├── components/              # SafetyCenter, OperationsBoard, widgets (weather/river/quakes), dashboard UI
├── lib/
│   ├── agents/              # The seven agents + pipeline orchestrator
│   ├── db/                  # In-memory store + repository (swappable)
│   ├── advisories.ts        # Weather/river/seismic advisory heuristics
│   ├── contacts.ts          # Device-local trusted contacts + SMS builders
│   ├── google-maps.ts       # Keyless Google Maps directions/search/pin URLs
│   ├── openmeteo.ts         # Live Open-Meteo/USGS fetchers (zod-validated)
│   ├── environment-api.ts   # Shared query schema + 400/502 responses
│   ├── use-geolocation.ts   # Opt-in GPS hook (device-local persistence)
│   └── api-client.ts        # Typed browser client
└── types/domain.ts          # All shared entities
sql/schema.sql               # Reference PostgreSQL schema
tests/                       # Vitest unit + integration tests
```

## Routes

| Route | Description |
| --- | --- |
| `/` | Four-role demo workspace |
| `/report` | Citizen incident report wizard (incl. SOS) |
| `/missing-person` | Manual, unverified missing-person report |
| `/simulations` | Simulation console |
| `/incidents/[id]` | Incident detail + agent pipeline trace |
| `/api/weather`, `/api/water-levels`, `/api/earthquakes`, `/api/place` | Live environment data |
| `/api/incidents`, `/api/reports`, `/api/kpis`, `/api/activity`, `/api/resources`, `/api/clusters`, `/api/sitrep`, `/api/simulation`, `/api/health` | Demo backend (in-memory) |

## Production notes

This build is hardened for deployment as a Node.js app:

- `next.config.mjs` sets conservative security headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS) and disables the `X-Powered-By` header.
- Route-level error boundaries (`error.tsx`, `global-error.tsx`), a `not-found.tsx` and a `loading.tsx` keep a single failing view from blanking the control room.
- `npm run check` runs typecheck, lint, tests and a production build — wire it into CI.
- `GET /api/health` is a dependency-free liveness probe.

```bash
npm run check
npm start          # serves the production build
```

Still required before real-world use: a persistent database, authentication/authorization (the four roles are **visual demos**, not an auth system), rate limiting on public write endpoints, and official/advisory data feeds.

## Deploy

Configured for **Render** (a single persistent Node process — the full demo
works) and **Vercel** (UI preview; the in-memory store is not shared across
serverless requests). See **[DEPLOY.md](DEPLOY.md)** for step-by-step
instructions, environment variables, and the persistence option.

```bash
# Render-style
npm ci --include=dev && npm run build && npm start

# Vercel
vercel deploy --prod --yes
```

## Swapping in real services (future improvements)

| Seam | Today | Production target |
| --- | --- | --- |
| Intake/Classification/Communication | Keyword rules + templates | LLM (structured output, few-shot) via provider of choice |
| Geospatial | Haversine + static facilities | Google/Mapbox geocoding + live facility registry |
| Weather / river / seismic | Open-Meteo + USGS (live, keyless) | Official feeds (IMD/CWC/INCOIS) alongside the same schemas |
| Shelter routing | Google Maps deep links (keyless) | Places/Directions API with passability checks |
| SMS/social alerts | Drafts + device `sms:` links | Twilio / Gov SMS gateway + social scheduler |
| Database | In-memory singleton | PostgreSQL (`sql/schema.sql` reference schema) |
| Live updates | Polling (2.5 s–30 s) | WebSocket / SSE channel |
| Media upload | URL field | S3-compatible object storage + virus scan |
| Auth | None (demo views) | Control-room SSO; citizen OTP |

Other ideas: multi-city tenancy, replay tool for after-action review, offline-first field app, integration with official Common Alerting Protocol (CAP) feeds.

---

## Testing

```bash
npm test
```

**71 tests across 9 files.** Covers intake extraction (type/severity/people/keywords), classification (duplicate merge radius, cluster keys), risk scoring, resource scaling, geo math, advisory thresholds, contact/SMS builders and phone normalization, environment query validation + error shapes (400/502), reverse-geocode formatting, the approval workflow (`awaiting_approval` → approved/rejected transitions, dispatch guard), server-side SOS → `critical` enforcement, and full pipeline + simulation integration (all seven agents run, human-approval gating, duplicate merging, situation report generation).

---

## Disclaimer

DisasterSense is an educational/prototype system. **Incident data is fictional; environmental data (weather, river discharge, earthquakes) is real and fetched live from public APIs at request time.** Advisories are heuristics, GloFAS discharge is modeled rather than observed, and Google Maps routes are not guaranteed passable. Nothing in this app dispatches emergency services, and it must not be used to coordinate real emergency response. Always follow official agency channels and call **112** for emergencies in India.