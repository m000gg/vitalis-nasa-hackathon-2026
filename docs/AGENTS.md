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

## 3. Supabase Remote Database Structure (3 Areas)

Database schema lives in `supabase/schema.sql` and server helpers live in `src/lib/supabase/server.ts`.
When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are not set in `.env.local`, the app automatically falls back to local `MISSIONS` data (`"local"` source) and never crashes.

| Area | Table (`supabase/schema.sql`) | Purpose | API Route |
| :--- | :--- | :--- | :--- |
| **1. Scenarios** | `public.scenarios` | Stores mission/analog scenarios (`id`, `name`, `phase`, `duration_context`, `comms_delay_label`, `scenario_description`, `environment` JSONB). | `GET`, `POST` `/api/scenarios` (`GET` `/api/missions` also reads scenarios) |
| **2. Characters** | `public.characters` | Stores crew members & leaders linked to a scenario via `scenario_id` FK (`id`, `scenario_id`, `callsign`, `assigned_role_title`, `is_lead_slot`, `readiness_state`, `eva_gate_state`, `metrics` JSONB). | `GET ?scenarioId=...`, `POST` `/api/characters` |
| **3. Character/Scenario Hazard Data** | `public.character_hazard_data` | Stores per-`(scenario_id, character_id, hazard_slug, stream_name)` inputs, raw values, and structured `payload` JSONB for each hazard pipeline. | `GET ?scenarioId=...&characterId=...&hazardSlug=...`, `POST` `/api/hazard-data` |

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
     - `input.hazardRecords` (persisted `HazardDataRecord[]` from `character_hazard_data`, already filtered to your `hazardSlug` by `evaluateHazardForActor`)
     - `input.linkOnline`, `input.reentryMode`
   - Return `status` (`"NOMINAL" | "ELEVATED" | "CRITICAL"`), `scenarioStatusSlot`, `immediateHorizon`, `prolongedHorizon`, `eta`, and `solutions` (respect `reentryMode` 1-action cap when enabled).
3. **`// [SECTION 3: HAZARD N UI METADATA, INPUT STREAMS & ALARMS]`**
   - Update `inputSlots` (each entry maps to a `stream_name` saved in Supabase `character_hazard_data`), `leadView` / `memberView` modules & privacy rules, `proposedEndpoints`, and `alarmPreset`.
   - Always keep `evaluate: evaluate<Hazard>Hazard` wired to Section 2.

---

## 5. Shared Files (Do Not Modify for Single-Hazard Work)

- `src/lib/hazards/types.ts` & `src/lib/hazards/index.ts` — Shared TypeScript interfaces (`HazardSpec`, `HazardEvaluationInput`, `HazardEvaluationResult`, `HazardDataRecord`) and registry array `HAZARDS`.
- `src/lib/evaluator.ts` — Info-agnostic overview evaluators (`evaluateCharacterDashboard`, `evaluateLeaderDashboard`, `evaluateHazardForActor`).
- `src/lib/domain.ts` — Core types (`MissionProfile`, `CrewSlot`, `DtnMessage`, `AuditLogEntry`) and fallback `MISSIONS`.
- `src/context/MissionContext.tsx` & `src/context/AlertContext.tsx` — App state, Supabase `/api/*` synchronization, toasts, and alarms.

---

## 6. Required Verification Before Completing Changes

Run lint and production build locally inside the repo before committing:

```bash
npm run lint && npm run build
```

Verify zero TypeScript, ESLint, or Next.js App Router build errors across all pages and `/api/*` routes.
