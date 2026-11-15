# Vitalis+

Vitalis+ is a Next.js mission-health decision-support dashboard for long-duration crews. The current project includes five NASA HRP hazard modules, Supabase-backed mission/crew telemetry, role-aware dashboards, local alerts and a fully interactive Space Radiation Demo Mode.

## Quick start on Windows

Requirements: Node.js 22+, npm and a Supabase project.

```powershell
git clone https://github.com/m000gg/vitalis-nasa-hackathon-2026.git
cd vitalis-nasa-hackathon-2026
git switch feat/01-space-radiation
npm install
Copy-Item .env.example .env.local
```

Fill the Supabase values in `.env.local`, then run `supabase/schema.sql` once in the Supabase SQL Editor. `NASA_API_KEY` is optional for Demo Mode; it is used by the live DONKI context endpoint.

```powershell
npm run dev
```

Open [http://127.0.0.1:1654](http://127.0.0.1:1654). Create/select a scenario and a lead character, then open **Dashboard → Hazards → Radiation**.

For a zero-setup radiation demonstration without Supabase, open [http://127.0.0.1:1654/radiation-demo](http://127.0.0.1:1654/radiation-demo). The Scenario Workbench and Fixture Verification Lab work there without NASA API, sensors or database credentials.

## Radiation demo

The radiation page contains three complementary surfaces:

1. **Telemetry Center** — autonomous seeded DEMO stream or existing LIVE/Supabase data, synchronized crew exposure, compartment sensors, short/long horizons, DONKI context and telemetry-derived emergency history.
2. **Scenario Workbench** — all documented scenarios A–S with editable parameters, deterministic backend calculations, metrics, explanation, actions, protocol checklist, event log, local history, reset, comparison and JSON export.
3. **Fixture Verification Lab** — 34 deterministic engineering fixtures covering the contracts of 20 product functions and 14 automated workflows, including visible safety guards. It is not presented as 34 arbitrary-input end-user tools.

Simulation values are labelled `simulated`, `modeled` or `experimental`. DONKI events never become astronaut dose, Gy and Sv are never mixed, and unsupported clinical/organ-risk calculations are refused.

## Spacecraft Map Engine

The shared Spacecraft Map Engine provides eight deterministic seeded ship families, connected compartments, crew placement, provenance-aware radiation heatmaps, door-aware A* routing, shelter allocation, event playback, local snapshots and alternative mission branches. Radiation results A–S can be projected from the Workbench without rerunning or replacing the calculation engine; analytic scenarios stay explicitly non-spatial.

Start the application and open [http://127.0.0.1:1654/mission-studio/map](http://127.0.0.1:1654/mission-studio/map). The surface works in isolated Demo Mode; when the existing Supabase configuration is available it reads crew identities without writing simulated positions or exposure into shared astronaut records.

```ts
import { createInitialMapState, findRoute, generateSpacecraft } from "@/lib/spacecraft";

const blueprint = generateSpacecraft(
  { shapeFamily: "RING", shipSize: "STANDARD", includePowerSection: true },
  "MARS-126",
);
const state = createInitialMapState(blueprint, "mars-transit-126", crew);
const route = findRoute(blueprint, state, start, destination, { mode: "safe" });
```

Architecture, data contracts, hazard adapters, persistence proposal and integration examples are documented in [`docs/SPACECRAFT_MAP_ENGINE.md`](docs/SPACECRAFT_MAP_ENGINE.md).

## Verification

```powershell
npm run test:radiation
npm run test:spacecraft
npm run lint
npm run build
```

To run the HTTP integration suite, start the app in one terminal:

```powershell
npm run dev
```

Then in a second terminal:

```powershell
npm run test:radiation:api
```

## Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- one Supabase API key supported by `.env.example` (service role stays server-only)
- optional `NASA_API_KEY`
- optional `NASA_DONKI_BASE_URL`
- optional `ALLOWED_HOSTS` for deliberate non-local deployment

Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Troubleshooting

- **Supabase error banner:** verify `.env.local`, execute `supabase/schema.sql`, then restart `npm run dev`.
- **`lightningcss` or native binary error after copying `node_modules`:** delete `node_modules` and `.next`, then run `npm install`. Do not transfer `node_modules` between Windows and Linux.
- **Port 1654 already in use:** stop the other Node process; project security rules intentionally bind to `127.0.0.1:1654`.
- **DONKI error:** configure `NASA_API_KEY`; the Scenario Workbench remains available without DONKI.
- **No LIVE telemetry charts:** ingest through `/api/radiation/telemetry` or use **Telemetry → DEMO** for the autonomous synthetic stream. DEMO readings are never saved as measured data.

## Documentation

- [`docs/AGENTS.md`](docs/AGENTS.md) — repository architecture and safety rules
- [`docs/SPACECRAFT_MAP_ENGINE.md`](docs/SPACECRAFT_MAP_ENGINE.md) — complete map engine developer guide
- [`docs/RADIATION_MODULE.md`](docs/RADIATION_MODULE.md) — radiation API and integration guide
- [`docs/hazards/`](docs/hazards/) — source scientific and product specifications for all five hazards
