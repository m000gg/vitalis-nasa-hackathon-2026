# Vitalis Telemetry Simulator

Python CLI telemetry generator covering all **5 NASA Human Research Program (HRP) hazards** in `vitalis-nasa-hackathon-2026`:

1. `radiation` — Mission ALARA policy, Space Weather (DONKI), Experimental BioShield Lab, Personal Dosimeter history & live stream, Compartment Sensors
2. `isolation` — Wearable/Actigraphy sleep & circadian phase, Habitat Acoustics & Lighting (including `missionDayPct`), 60-Second Private Self-Check, CONNECT & Countermeasure Log
3. `distance` — Earth–Mars JPL Horizons light-time / distance / solar conjunction hysteresis & Onboard Medical Inventory
4. `gravity` — Pre-Test Conditions, Handgrip & Calf Volume (separated 14-day calf and 30-day grip cadences), Daily Exercise Log
5. `environment` — Demo Scenario & Simulated Minutes Elapsed plus 4 module ECLSS air streams (`Lab`, `Habitat`, `Galley`, `Airlock`) driven by real ISS telemetry (`docs/nasa-data/RR-1_EDA_Telemetry_table.csv`: `CO2_ppm_ISS * 0.00076 -> mmHg`, `Controller_Time_GMT`)

## Setup

Uses `.env.local` or `.env` from the repository root (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` or publishable key).

```bash
pip install -r simulator/requirements.txt
```

## Quick Commands

Check DB counts and NASA CSV status:

```bash
python3 simulator/sim.py status
```

Seed all scenarios & hazards in **demo** mode (mixed nominal/elevated/critical showcase):

```bash
python3 simulator/sim.py seed --mode demo
```

Seed strict **positive** (all green / nominal) telemetry:

```bash
python3 simulator/sim.py seed --mode positive
```

Seed **negative** (radiation SEP storm, sleep deprivation, solar conjunction & inventory risk, deconditioning, CO₂ scrubber failure):

```bash
python3 simulator/sim.py seed --mode negative
```

Seed **chaos** (erratic extreme spikes, violent oscillations, and simultaneous faults across every chart in all 5 hazards):

```bash
python3 simulator/sim.py seed --mode chaos
```

Clear telemetry tables (`character_hazard_data`, `character_hazard_samples`) while keeping `scenarios` and `characters` intact:

```bash
python3 simulator/sim.py clear
```

Scope `seed` or `clear` to a specific scenario or hazard:

```bash
python3 simulator/sim.py seed --mode negative --scenario mars-transit-126 --hazard gravity,environment
python3 simulator/sim.py clear --hazard radiation
```

Stream live incremental telemetry ticks every 3 seconds (direct DB or Next.js API):

```bash
python3 simulator/sim.py stream --mode positive --interval 3
python3 simulator/sim.py stream --mode negative --via api --api-url http://localhost:3000 --ticks 10
```
