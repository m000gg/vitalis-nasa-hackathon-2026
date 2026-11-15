<div align="center">

<h1>VITALIS — Deep-Space Crew Health &amp; Hazard Decision Support</h1>
<p><em>A full-stack, NASA-grounded mission telemetry dashboard and simulation suite for autonomous long-duration spaceflight</em></p>

<p>
  <a href="https://github.com/m000gg/vitalis-nasa-hackathon-2026/issues"><img src="https://img.shields.io/github/issues/m000gg/vitalis-nasa-hackathon-2026.svg" alt="Issues"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Next.js-15.3-black?logo=next.js" alt="Next.js 15">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript" alt="TypeScript 5.8">
  <img src="https://img.shields.io/badge/Supabase-Postgres-3ecf8e?logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/Python-Simulator-3776ab?logo=python" alt="Python Simulator">
</p>

</div>

---

## Contents
* *[About this project](#about-this-project)*
* *[Use Cases](#use-cases)*
* *[Target Users](#target-users)*
* *[Problem Statement](#problem-statement)*
* *[Features](#features)*
* *[The 5 NASA HRP Hazard Modules](#the-5-nasa-hrp-hazard-modules)*
* *[Project Structure](#project-structure)*
* *[Architecture Overview](#architecture-overview)*
* *[Technology Stack](#technology-stack)*
* *[Development Principles](#development-principles)*
* *[Getting Started](#getting-started)*
* *[Telemetry Simulator](#-telemetry-simulator)*
* *[API Endpoints](#api-endpoints)*
* *[Configuration](#configuration)*
* *[Verification & Tests](#verification--tests)*
* *[Authors](#authors)*
* *[License](#license)*

---

## About this project
**VITALIS** is a full-stack space-medicine decision-support platform built around NASA Human Research Program's (HRP) five primary deep-space human health hazards: **Space Radiation**, **Isolation & Confinement**, **Distance from Earth**, **Altered Gravity Fields**, and **Hostile/Closed Environments**.

On a Mars transit or lunar surface mission, Earth communication delays reach up to 44 minutes round-trip and no dedicated flight surgeon is on board. Instead of overwhelming fatigued astronauts with raw spreadsheets of vital signs, VITALIS combines **live NASA APIs (DONKI & JPL Horizons)**, **ISS environmental CSV datasets (NASA OSDR)**, and **deterministic physiological evaluators** to surface an immediate operational status (`NOMINAL`, `ELEVATED`, `CRITICAL`), **Estimated Time of Action (ETA)**, and **1–2 prioritized countermeasures**, backed by Supabase persistence and a Python telemetry simulator.

---

## Use Cases

VITALIS serves both individual crew autonomy and mission-wide command readiness under strict medical privacy boundaries.

| Crew Member (Individual Autonomy) | Mission Lead / Commander (Fleet Readiness) | Hackathon & Simulation Testing |
|:---|:---|:---|
| Monitor personal radiation exposure, sleep phase drift, exercise cadence, and shared habitat air warnings in one unified Space HUD, complete with private behavioral self-checks that never leak to leadership. | Inspect crew-wide readiness across all 5 hazards, correlate team-wide environmental debuffs (such as module CO₂ rise or solar particle events), and manage evacuations or medical inventory without accessing restricted private notes. | Seed or stream realistic mission timelines (`demo`, `positive`, `negative`, and `chaos` stress modes) directly into Supabase or Next.js API routes using real ISS cabin telemetry from NASA OSDR. |

---

## Target Users
VITALIS is built for **deep-space crew members**, **mission commanders / flight surgeons**, and **space-health researchers & hackathon teams** looking for an integrated, role-aware operational prototype grounded in published NASA OCHMO and HRP standards rather than synthetic placeholder text.

---

## Problem Statement
Deep-space habitats generate fragmented signals across wearables, dosimeters, ECLSS cabin sensors, exercise logs, and manual behavioral questionnaires. Under high workload and multi-minute Earth light-time delays:
- Raw telemetry charts alone fail to answer **"How long until a threshold is breached, and what 1–2 actions should we take right now?"**
- Crew-wide shared stressors (e.g., scrubber CO₂ buildup, solar storms, module acoustics) are easily confused with isolated crew fatigue unless evaluated together.
- Leadership needs aggregate readiness visibility **without** exposing private psychological self-checks or sleep-medication logs.

VITALIS solves this with isolated per-hazard evaluation engines, an RBAC privacy sanitizer, live NASA ephemeris and space-weather integrations, and a single dark HUD interface.

---

## Features
* **All 5 NASA HRP Hazards Implemented End-to-End**: Dedicated backend evaluators (`src/lib/hazards/01..05-*.ts`) paired with custom interactive HUD screens (`src/components/hazards/01..05-*.tsx`).
* **Live NASA API Integrations**:
  * **NASA DONKI** (`/api/radiation/donki`) for real-time solar energetic particle / radiation belt alerts and event links.
  * **NASA JPL Horizons** (`/api/horizons/earth-mars`) for date-selectable Earth–Mars ephemeris vectors, one-way/round-trip signal delay calculation, and Supabase persistence.
  * **NASA OSDR ISS Cabin Telemetry** (`docs/nasa-data/RR-1_EDA_Telemetry_table.csv`) converting `CO2_ppm_ISS` to `mmHg` for habitat air replay and module simulation.
* **Strict Role-Based Access Control (RBAC)** (`src/lib/rbac.ts`):
  * **Member view**: Strictly scoped to the active astronaut's own records plus `SHARED_OPERATIONAL_STREAMS` (e.g., DONKI weather, JPL distance, module air).
  * **Lead view**: Full crew operational overview across all crew slots while automatically stripping private subfields (`mood_valence_private`, `private_journal_note`, `sleep_med_used_private`) from records and time-series payloads.
* **Research Citation Modals `(i)`** (`src/components/ResearchInfoModal.tsx`): Every chart, metric, and briefing includes clickable `(i)` badges explaining the NASA OCHMO / HRP operational benchmark and linking directly to primary documentation.
* **Dual-Horizon Threat & Trend Forecasting**:
  * Trapezoidal cumulative radiation dose integration with strict unit-family checks (`mSv` vs `mGy`) and sensor-disagreement detection.
  * Linear regression CO₂ trend projections (`-2 h` history + `+2 h` dashed slope), yellow early-warning caution thresholds (`3.80 mmHg` / 60-min crossing horizon), headache odds multipliers, and browser-persisted alert acknowledgements.
* **Python Multi-Mode Telemetry Simulator** (`simulator/sim.py`): Generates deterministic or chaotic mission states (`demo`, `positive`, `negative`, `chaos`) in bulk or live 3-second ticks via direct Supabase writes or HTTP API ingestion.
* **Host-Header & CSRF Protection** (`src/middleware.ts`): Guards local dev (`localhost:1654`) against DNS rebinding and blocks cross-origin API mutations while seamlessly supporting Vercel production and preview deployments.

---

## The 5 NASA HRP Hazard Modules

| # | Hazard | Key Telemetry & Logic | NASA / Research Basis |
|---|---|---|---|
| **01** | **Space Radiation** | Mission ALARA limits, DONKI live space-weather storms, Experimental BioShield Lab, Personal Dosimeter cumulative trapezoidal integration, Compartment Sensor disagreement checks, emergency shelter & what-if simulations | NASA DONKI API, OCHMO Radiation Limits, unit-compatible dosimetry (`mSv` / `mGy`) |
| **02** | **Isolation & Confinement** | Actigraphy sleep duration, circadian phase drift, habitat acoustics & lighting vs `missionDayPct`, private 60-second behavioral self-check, CONNECT & countermeasure log | NASA HRP Isolation & Confinement, sleep/circadian countermeasure protocols |
| **03** | **Distance from Earth** | Date-queried **NASA JPL Horizons** Earth–Mars ephemeris (`km`), light-time comms latency (`one-way` / `round-trip`), solar conjunction hysteresis, autonomous onboard medical inventory readiness | NASA JPL Horizons Vector Ephemeris API |
| **04** | **Altered Gravity Fields** | Pre-test condition screening, decoupled measurement cadences (**14-day calf circumference**, **30-day handgrip strength**), daily resistive/aerobic exercise adherence tracking | NASA HRP Altered Gravity / SANS / musculoskeletal deconditioning |
| **05** | **Hostile & Closed Environments** | 4-module Habitat Air Map (`Lab`, `Habitat`, `Galley`, `Airlock`), CO₂ (`<= 4 mmHg`, yellow early warning `>= 3.8 mmHg`), O₂ (`>= 130 / 122 mmHg`), total pressure (`5.0–15.0 psia`), acoustics (`< 85 dBA`, `NC-40`), `+2 h` slope forecast, headache odds, CO₂ exposure ledger | NASA OCHMO CO₂, Habitable Atmosphere & Acoustics Technical Briefs; NASA OSDR EDA CSV (`RR-1_EDA_Telemetry_table.csv`) |

---

## Project Structure

```text
vitalis-nasa-hackathon-2026/
├─ src/
│  ├─ app/
│  │  ├─ api/                               ← Next.js Route Handlers (missions, scenarios, characters,
│  │  │                                        hazard-data, hazard-samples, horizons, radiation/*)
│  │  ├─ character/                         ← Crew role & active profile selector
│  │  ├─ dashboard/
│  │  │  ├─ page.tsx                        ← Unified Space HUD overview
│  │  │  ├─ members/                        ← Lead crew roster & member readiness matrix
│  │  │  └─ hazards/[slug]/                 ← Dynamic routes for hazards 01..05
│  │  ├─ globals.css                        ← Dark Space HUD theme tokens & layout utilities
│  │  └─ layout.tsx                         ← Typography (Roboto, Audiowide, Anonymous Pro) & shell
│  ├─ components/
│  │  ├─ hazards/01..05-*.tsx               ← Bespoke HUD screens per NASA hazard
│  │  ├─ DashboardShell.tsx                 ← Sidebar, role/scenario switchers, alert layer
│  │  ├─ HazardTelemetryChart.tsx           ← Shared telemetry & projection charts
│  │  └─ ResearchInfoModal.tsx              ← (i) citation popovers & NASA reference links
│  ├─ context/MissionContext.tsx            ← Global state, Supabase sync, saveActorInput(), role/scenario context
│  ├─ lib/
│  │  ├─ hazards/01..05-*.ts                ← Isolated hazard evaluation pipelines & thresholds
│  │  ├─ radiation/                         ← DONKI fetcher, emergency & what-if models
│  │  ├─ supabase/server.ts                 ← Typed Supabase REST/Postgres server client
│  │  ├─ domain.ts & evaluator.ts           ← Core mission/crew types and cross-hazard evaluation
│  │  └─ rbac.ts                            ← Role scoping & private subfield sanitization
│  └─ middleware.ts                         ← DNS-rebinding Host validation & CSRF Origin protection
├─ simulator/
│  ├─ generators/                           ← Domain generators for hazards 01..05
│  ├─ nasa_csv.py                           ← Parser for real ISS OSDR telemetry CSV
│  └─ sim.py                                ← CLI: status / seed / stream / clear (demo|positive|negative|chaos)
├─ supabase/schema.sql                      ← Postgres schema (scenarios, characters, data, samples)
├─ docs/
│  ├─ hazards/                              ← Detailed technical specs for Hazards 01–05
│  ├─ nasa-data/RR-1_EDA_Telemetry_table.csv
│  └─ simulation/                           ← Simulator command guide & workflow skill
├─ tests/
│  ├─ radiation.test.mjs                    ← Radiation unit-compatibility, integration & DONKI tests
│  └─ rbac.test.mjs                         ← Member/Lead isolation & private subfield stripping tests
└─ package.json
```

---

## Architecture Overview
VITALIS separates **telemetry ingestion**, **deterministic evaluation**, **privacy enforcement**, and **HUD visualization**:

1. **Persistence (`supabase/schema.sql`)**: Four core tables (`scenarios`, `characters`, `character_hazard_data`, `character_hazard_samples`) store both latest stream snapshots and chronological sample series keyed by mission scenario and crew member.
2. **RBAC Boundary (`src/lib/rbac.ts` & `src/lib/evaluator.ts`)**: All evaluations run through `evaluateHazardForActor`, ensuring `member` requests only see their own data and shared habitat streams while `lead` requests receive full-crew matrices with sensitive behavioral fields redacted before reaching client components.
3. **Pure Hazard Engines (`src/lib/hazards/01..05-*.ts`)**: Each hazard exports a `HazardSpec` with normalized input stream definitions, threshold constants, research metadata, and a pure `evaluate()` function producing status, ETA, prioritized solutions, and chart specifications.
4. **Adaptive Dark Space HUD (`src/components/hazards/01..05-*.tsx`)**: Consumes the evaluated snapshot and raw database samples to render role-tailored views, interactive habitat maps, custom SVG trend charts, and NASA API triggers.

---

## Technology Stack

| Category | Technologies |
|---|---|
| **Framework** | Next.js 15 (`^15.3.2`, App Router), React 19 |
| **Language** | TypeScript 5.8, Python 3 |
| **Styling** | Tailwind CSS v4, Lucide React, Google Fonts (`Roboto`, `Audiowide`, `Anonymous Pro`) |
| **Database** | Supabase Postgres (`@supabase/supabase-js`) |
| **External NASA Data** | NASA DONKI API, NASA JPL Horizons API, NASA OSDR EDA ISS CSV |
| **Simulator** | Python `supabase`, `python-dotenv`, `requests` |
| **Testing & Linting** | Node built-in test runner (`node:test`), TypeScript `tsc`, ESLint |

---

## Development Principles

| Practice | Implementation |
|---|---|
| **Zero Silent Unit Mixing** | Radiation pipelines enforce dimensional boundaries (`mSv` equivalent dose vs `mGy` absorbed dose) and refuse invalid integrations explicitly. |
| **Privacy by Architecture** | Behavioral mental-health and sleep-medication keys are stripped on the server/evaluator layer rather than hidden only in CSS. |
| **DB-Driven Truth** | Hazard screens read directly from Supabase records and real NASA endpoints without hardcoded fake component state. |
| **Action-First UX** | Alerts pair severity badges with explicit time-to-threshold ETAs and 1–2 concrete remediation actions instead of burying crew in raw logs. |

---

## ⚡ Getting Started

### 1) Clone the repository

```bash
git clone https://github.com/m000gg/vitalis-nasa-hackathon-2026.git
cd vitalis-nasa-hackathon-2026
```

### 2) Initialize Supabase Schema
Run [supabase/schema.sql](supabase/schema.sql) in your Supabase project's **SQL Editor** to create `scenarios`, `characters`, `character_hazard_data`, and `character_hazard_samples`.

### 3) Configure environment variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 4) Install dependencies & start the web app

```bash
npm install
npm run dev
```

The app runs on **`http://127.0.0.1:1654`** (matching the local `Host` allowlist in `src/middleware.ts`).

---

## 🧪 Telemetry Simulator

See [simulator/README.md](simulator/README.md) for full details. Quick setup and usage:

```bash
pip install -r simulator/requirements.txt

# Inspect DB row counts and NASA CSV availability
python3 simulator/sim.py status

# Seed a mixed showcase, nominal, critical, or chaos stress-test state
python3 simulator/sim.py seed --mode demo
python3 simulator/sim.py seed --mode positive
python3 simulator/sim.py seed --mode negative
python3 simulator/sim.py seed --mode chaos

# Stream live telemetry ticks every 3 seconds
python3 simulator/sim.py stream --mode positive --interval 3
```

---

## API Endpoints

| Route | Purpose |
|---|---|
| `GET /api/missions`, `GET /api/scenarios`, `GET /api/characters` | Load active mission scenarios and crew slots |
| `GET / POST /api/hazard-data` | Read or upsert latest stream values (`character_hazard_data`) |
| `GET / POST /api/hazard-samples` | Read or append time-series telemetry points (`character_hazard_samples`) |
| `GET /api/horizons/earth-mars?date=YYYY-MM-DD` | Query NASA JPL Horizons Earth–Mars vector distance (`km`) |
| `GET /api/radiation/donki` | Fetch NASA DONKI space-weather events (`SEP`, `RBE`, `FLR`, `CME`) |
| `GET / POST /api/radiation/{telemetry,forecast,emergencies,scenarios,what-if}` | Space radiation dose modeling, shelter alerts, and scenario analysis |

---

## Configuration

Variables accepted by the Next.js app and Python simulator (defined in `.env.example`):

| Variable | Required | Scope / Vercel Type | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Config | Supabase project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Sensitive (Server) | Server-side Supabase service role key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alt* | Config | Publishable key (fallback if service role key is omitted) |
| `NASA_API_KEY` | No | Sensitive (Server) | NASA API key for DONKI (`DEMO_KEY` fallback if unset) |
| `ALLOWED_HOSTS` | No | Config | Comma-separated host allowlist override beyond `localhost:1654` & Vercel |

> **Deploying to Vercel:** When adding `NEXT_PUBLIC_*` keys in **Vercel → Settings → Environments → Production**, set their type to **Config** (not *Sensitive*), keep `SUPABASE_SERVICE_ROLE_KEY` / `NASA_API_KEY` as **Sensitive**, and run a **Redeploy** without build cache.

---

## Verification & Tests

Run typechecking, linting, and unit tests locally:

```bash
npx tsc --noEmit
npm run lint
node --test tests/radiation.test.mjs tests/rbac.test.mjs
```

---

## 👥 Authors

* **m000gg** — [GitHub](https://github.com/m000gg/vitalis-nasa-hackathon-2026)
* **Sabir2005** — [GitHub](https://github.com/m000gg/vitalis-nasa-hackathon-2026)
* **qqvoid** — [GitHub](https://github.com/m000gg/vitalis-nasa-hackathon-2026)
* **S1nflex** — [GitHub](https://github.com/m000gg/vitalis-nasa-hackathon-2026)
* **idkhtoc** — [GitHub](https://github.com/m000gg/vitalis-nasa-hackathon-2026)

---

## License

This project is licensed under the [MIT License](LICENSE).
