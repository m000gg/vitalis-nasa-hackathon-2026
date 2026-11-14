# AGENTS.md — Vitalis+ Engineering & Hazard Ownership Guide

This guide instructs both human teammates and AI coding agents on how to develop inside the **Vitalis+** Next.js App Router codebase safely without breaking other teammates' hazard logic, exposing Supabase secrets, or violating project rules.

---

## 1. Repository, Branch & Network Rules

- **Active Development Branch:** Work on `feat/next-js-fullstack` unless explicitly told otherwise. Do **not** commit directly to `main`.
- **Localhost Binding & Port:** Dev and production servers bind strictly to `127.0.0.1:1654` (`package.json` scripts `dev` and `start`). Do **not** bind to `0.0.0.0`.
- **Public Wi-Fi / Host-Header Guard:** `src/middleware.ts` enforces strict `Host` validation (`localhost:1654`, `127.0.0.1:1654`, `[::1]:1654`, or comma-separated `ALLOWED_HOSTS`) and `Origin`/`Sec-Fetch-Site` checks on mutating `/api/*` requests. Do not weaken or bypass `src/middleware.ts`.
- **Secrets Hygiene:**
  - Never commit `.env.local` or real credentials (`.env.example` lists required variables).
  - Never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. All database writes/reads must stay inside `src/lib/supabase/server.ts` and `src/app/api/*` route handlers.

---

## 2. Barebones & Info-Agnostic UI Rules

- **User Flow:**
  1. `/` — Greeting & Scenario Picker (create or select a scenario).
  2. `/character` — Character Picker (create or select a Leader or Member linked to that scenario).
  3. `/dashboard/**` — Info-agnostic Leader/Member Dashboard receiving scenario & character telemetry.
- **No Fake Placeholders:** Do not invent medical numbers, fake sensor values, or Lorem Ipsum outside real reference constants you intentionally add to your hazard's Section 1. Use explicit slot prompts:
  - Input prompts: `"Add your info: <field> here"`
  - Display outputs: `"Here is: <slot description>"`
- **No Synthetic Test UI:** Do not re-add "Test Toast" or "Test Alarm" buttons; popups (`useAlerts()`) and full-screen alarms must trigger from real actions and hazard thresholds.

---

## 3. Supabase Remote Database Setup & Schema (3 Areas)

Database schema lives in `supabase/schema.sql` and all Supabase client/query logic lives on the server in `src/lib/supabase/server.ts`.

### Environment Setup (`.env.local`, Gitignored)
Copy `.env.example` to `.env.local` (never commit `.env.local`).
`src/lib/supabase/server.ts` resolves credentials on the server in this exact order:
- **URL:** `NEXT_PUBLIC_SUPABASE_URL`
- **API Key:** `SUPABASE_SERVICE_ROLE_KEY` -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Optional direct Postgres metadata/migrations (server-only):** `SUPABASE_DB_NAME`, `SUPABASE_DB_PASSWORD`

Behavior & Strict Error Policy (No Silent DB Fallbacks):
- **No Database Fallbacks:** The app requires a live Supabase connection. There is **no** local fallback for database reads or writes. If env vars are missing, `supabase/schema.sql` has not been executed, RLS blocks access, or any Supabase query fails, `src/lib/supabase/server.ts` throws an explicit `Error`, `/api/*` routes return HTTP `500` with `{ error }`, and the UI surfaces a visible Supabase error banner/toast.
- **Database Initialization:** Run `supabase/schema.sql` once in the Supabase SQL Editor to create the tables, indexes, and starter seed rows. If `public.scenarios` has 0 rows, the UI shows an explicit empty-database prompt rather than faking data.
- **RLS vs Server Key:** If Row Level Security (RLS) is enabled on those tables in Supabase, either add explicit RLS policies for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or provide `SUPABASE_SERVICE_ROLE_KEY` on the server.

### 3-Area Table & API Split (+ Time-Series Samples)

| Area | Table (`supabase/schema.sql`) | Purpose | API Route |
| :--- | :--- | :--- | :--- |
| **1. Scenarios** | `public.scenarios` | Stores mission/analog scenarios (`id`, `name`, `phase`, `duration_context`, `comms_delay_label`, `scenario_description`, `environment` JSONB). | `GET`, `POST` `/api/scenarios` (`GET` `/api/missions` also reads scenarios) |
| **2. Characters** | `public.characters` | Stores crew members & leaders (default 1 Leader + 4 Members per scenario) linked via `scenario_id` FK (`id`, `scenario_id`, `callsign`, `assigned_role_title`, `is_lead_slot`, `readiness_state`, `eva_gate_state`, `metrics` JSONB). Editable by any teammate via `/character` UI or `PATCH /api/characters`. | `GET ?scenarioId=...`, `POST`, `PATCH` `/api/characters` |
| **3. Character/Scenario Hazard Data (Latest Snapshot)** | `public.character_hazard_data` | Stores latest per-`(scenario_id, character_id, hazard_slug, stream_name)` inputs, `raw_value`, and arbitrary structured JSON in `payload` JSONB (zero SQL migrations needed when adding/changing fields). | `GET ?scenarioId=...&characterId=...&hazardSlug=...`, `POST` `/api/hazard-data` |
| **3b. Time-Series Samples (Graphs)** | `public.character_hazard_samples` | Append-only history per `(scenario_id, character_id, hazard_slug, stream_name)` storing `numeric_value`, `sample_payload` JSONB, and `recorded_at` for telemetry charts without altering shared schemas. | `GET`, `POST` `/api/hazard-samples` (or `POST /api/hazard-data` with `recordSample: true`) |

*(Operational tables `public.dtn_messages` and `public.emergency_audit_logs` are also defined in `supabase/schema.sql`.)*

---

## 4. Isolated Hazard Ownership (1 File per Person)

Each of the **5 NASA HRP Hazards** owns **one isolated TypeScript module** under `src/lib/hazards/`.
If you (or an AI agent working for you) are updating logic, thresholds, or formulas for a specific hazard, **ONLY edit that hazard's dedicated file**. Do **not** modify `src/lib/evaluator.ts`, `src/context/MissionContext.tsx`, or UI pages unless you are intentionally changing shared platform behavior.

| Hazard # | `hazardSlug` | Isolated File (Edit ONLY This) | Pipeline Constants Symbol | NASA Source Spec |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `radiation` | `src/lib/hazards/01-radiation.ts` | `RADIATION_PIPELINE_VALUES` | `docs/hazards/01-space-radiation.md` |
| **2** | `isolation` | `src/lib/hazards/02-isolation.ts` | `ISOLATION_PIPELINE_VALUES` | `docs/hazards/02-isolation-and-confinement.md` |
| **3** | `distance` | `src/lib/hazards/03-distance.ts` | `DISTANCE_PIPELINE_VALUES` | `docs/hazards/03-distance-from-earth.md` |
| **4** | `gravity` | `src/lib/hazards/04-gravity.ts` | `GRAVITY_PIPELINE_VALUES` | `docs/hazards/04-gravity-fields-enviroments.md` |
| **5** | `environment` | `src/lib/hazards/05-environment.ts` | `ENVIRONMENT_PIPELINE_VALUES` | `docs/hazards/05-hostile-closed-environments.md` |

### Internal 3-Section Contract Inside Every `src/lib/hazards/0*-*.ts` File

Every hazard file is organized into three clearly labeled comment sections so AI agents and humans know **exact edit boundaries**:

1. **`// [SECTION 1: HAZARD N VALUES & THRESHOLD SLOTS]`**
   - Put all numeric thresholds, safe bounds, unit constants, and stream names inside `<HAZARD>_PIPELINE_VALUES`.
2. **`// [SECTION 2: HAZARD N FORMULAS & EVALUATION PIPELINE]`**
   - Put pure, side-effect-free evaluation formulas inside `evaluate<Hazard>Hazard(input: HazardEvaluationInput): HazardEvaluationResult`.
   - Read generalized inputs from:
     - `input.mission` (scenario environment slots)
     - `input.actor` (character metrics & states)
     - `input.actorInputs` (`Record<streamName, rawValue>` from live form edits)
     - `input.hazardRecords` (latest `HazardDataRecord[]` + flexible `payload` JSONB from `character_hazard_data`, filtered to your `hazardSlug`)
     - `input.hazardSamples` (historical `HazardSampleRecord[]` from `character_hazard_samples`, filtered to your `hazardSlug`)
     - `input.allHazardRecords` & `input.allHazardSamples` (**read-only** across all 5 hazards for this scenario/character—use e.g. `input.allHazardRecords.find(r => r.hazardSlug === "isolation" && ...)` to combine Hazard 02 sleep with Hazard 01 without touching `02-isolation.ts`)
     - `input.linkOnline`, `input.reentryMode`
   - Return `status` (`"NOMINAL" | "ELEVATED" | "CRITICAL"`), `scenarioStatusSlot`, `immediateHorizon`, `prolongedHorizon`, `eta`, `solutions` (respect `reentryMode` 1-action cap when enabled), and optional `charts?: HazardChartSpec[]` (automatically rendered by `<HazardTelemetryChart />`).
3. **`// [SECTION 3: HAZARD N UI METADATA, INPUT STREAMS & ALARMS]`**
   - Update `inputSlots` (supports `fieldType: "text" | "number"`, `unit`, `recordSample: true` for automatic graph logging, and `subfields` for structured multi-field inputs like `{ systolic, diastolic }` saved to `payload` JSONB with zero SQL changes), `leadView` / `memberView` modules & privacy rules, `proposedEndpoints`, and `alarmPreset`.
   - Always keep `evaluate: evaluate<Hazard>Hazard` wired to Section 2.

### Adding New Inputs, Custom Fields, or Graphs Without Touching Shared SQL

- **Add/reshape fields:** Add a new entry or `subfields` array to `inputSlots` in your `0*-*.ts` file. `character_hazard_data.payload` (JSONB) stores any shape automatically.
- **Add a graph:** Set `recordSample: true` and `fieldType: "number"` on an input slot (auto-renders a graph from `character_hazard_samples`), or return custom `charts` from Section 2 `evaluate()`.
- **Do not create per-hazard SQL tables** unless the whole team agrees; `character_hazard_data` + `character_hazard_samples` already isolate every hazard via `hazard_slug`.

---

## 5. Shared Files (Do Not Modify for Single-Hazard Work)

- `src/lib/hazards/types.ts` & `src/lib/hazards/index.ts` — Shared TypeScript interfaces (`HazardSpec`, `HazardEvaluationInput`, `HazardEvaluationResult`, `HazardDataRecord`) and registry array `HAZARDS`.
- `src/lib/evaluator.ts` — Info-agnostic overview evaluators (`evaluateCharacterDashboard`, `evaluateLeaderDashboard`, `evaluateHazardForActor`).
- `src/lib/domain.ts` — Core types (`MissionProfile`, `CrewSlot`, `DtnMessage`, `AuditLogEntry`) and static domain reference lists (`MEDICAL_INVENTORY_SLOTS`, `BUDDY_RESCUE_STEPS`, `TEAM_BUFFS_SLOTS`, `TEAM_DEBUFFS_SLOTS`).
- `src/context/MissionContext.tsx` & `src/context/AlertContext.tsx` — App state, Supabase `/api/*` synchronization, toasts, and alarms.

---

## 6. Required Verification Before Completing Changes

Run lint and production build locally inside the repo before committing:

```bash
npm run lint && npm run build
```

Verify zero TypeScript, ESLint, or Next.js App Router build errors across all pages and `/api/*` routes.
