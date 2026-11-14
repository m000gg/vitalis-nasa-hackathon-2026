# Radiation module — integration and demo guide

## What is included

The module implements the first Vitalis+ hazard, **Space Radiation**:

- DB-backed personal dosimeter and compartment-sensor telemetry;
- strict separation of absorbed-dose (Gy) and equivalent-dose (Sv) families;
- timestamp-aware trapezoidal dose integration, gap handling, forecast and sensor-disagreement detection;
- NASA DONKI SEP/FLR/RBE event retrieval as *space-weather context only*;
- durable radiation emergencies, acknowledgements, shelter check-ins and incident-report JSON;
- reproducible Supabase-backed demo scenarios **A–D**; scenarios **E–S** remain visibly catalogued as experimental, contract-only, or unsupported instead of being faked;
- a role-aware arcade-style radiation dashboard. It accepts no manual astronaut telemetry input.

## Setup

1. Copy `.env.example` to `.env.local` and configure the existing Supabase variables.
2. For reliable DONKI calls, set a personal `NASA_API_KEY`. `DEMO_KEY` remains a development fallback.
3. Start the app: `npm run dev`.
4. Sign in through the existing demo flow, choose the lead role, open **Hazards → Radiation**, and run Scenario A, B, C or D.

The scenario runner writes clearly marked `simulated` records to the existing `character_hazard_data` and `character_hazard_samples` tables. No migration is required.

## API surface

| Endpoint | Purpose |
| --- | --- |
| `POST /api/radiation/telemetry` | Validates and persists radiation telemetry snapshots and optional samples. |
| `GET /api/radiation/donki?eventType=SEP&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Retrieves DONKI context; never turns it into crew dose. |
| `POST /api/radiation/forecast` | Unit-safe constant-rate mission forecast. |
| `POST /api/radiation/what-if` | Explicit rate-multiplier comparison; a model input, not a shielding claim. |
| `GET/POST /api/radiation/emergencies` | Reads or creates durable radiation-event state. |
| `POST /api/radiation/emergencies/{eventId}/acknowledge` | Records an idempotent crew acknowledgement. |
| `POST /api/radiation/emergencies/{eventId}/shelter-check-in` | Persists a crew shelter confirmation and audit sample. |
| `GET /api/radiation/emergencies/{eventId}/report?scenarioId=...` | Generates incident-report JSON. |
| `GET/POST /api/radiation/scenarios` | Lists the scenario catalog or runs a lead-gated A–D replay. |

## Intentional safety boundaries

- The app has no medical diagnosis, cancer-risk estimate, universal NASA radiation limit, or autonomous maneuver/medication advice.
- Sv and Gy values are never converted or combined.
- DONKI indicates heliophysics events, not spacecraft shielding performance or astronaut dose.
- "BioShield" and rate-multiplier results are labelled experimental/modeled; they are not operational protection claims.
- The current project’s identity model is demo-level. Before deployment, replace client-supplied `actorId` checks with authenticated Supabase identities and RLS policies.

## Verification

```bash
node --experimental-strip-types --test tests/radiation.test.mjs
npm run lint
npm run build
```
