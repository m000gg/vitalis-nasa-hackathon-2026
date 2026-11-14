# Project Outline: Crew & Commander Ready-to-Act Space Health System

## 1. High-Level Concept

A unified, mission-ready health monitoring and decision-support web dashboard built for long-duration spaceflight, where Earth communication delays can reach up to 44 minutes round-trip and no dedicated physician is on board.

Rather than burying fatigued astronauts in raw vital-sign charts, the system combines **NASA and partner space-health research** with **abstracted telemetry and self-assessment inputs** to deliver a **ready-to-act dashboard** for both:
- **Individual Crew Members:** Personal health status, guided self-checks, local push alerts for immediate and prolonged risks, an **Estimated Time of Action**, and **1–2 concrete, actionable solutions**.
- **The Crew Captain / Commander:** A combined, crew-wide operational readiness view highlighting **team-wide buffs and debuffs**, shared environmental or schedule stressors, and emergency intervention triggers—without exposing private personal mental-health notes.

---

## 2. Core System Capabilities

### Device & Health Parameter Abstraction
- Accepts heterogeneous inputs—wearable sensors, habitat life-support readings, and guided 60-second manual self-checks—through one normalized ingestion model.
- Abstracts raw measurements into standardized health and readiness parameters calibrated to **mission phase** (transit microgravity, EVA prep, surface operations, re-entry) and personal baselines rather than static Earth averages.

### Two-Layer Abstracted Intelligence Model
1. **Deterministic Numerical & Simulation Layer:** Computes compact, interpretable single-digit health scores, statistical baselines, hazard correlations, and **Estimated Time of Action** countdowns directly from NASA standards and physiological research (including simulated mission scenarios).
2. **Lightweight Report & Guidance Layer:** Translates those verified numerical outputs, crew states, and onboard constraints into plain-language **individual and team-wide briefings**, plus **1–2 ranked next steps** tailored to available time and onboard medical-kit inventory.

### Team-Wide Buffs & Debuffs
- **Debuffs (Shared Stressors):** Correlates crew symptoms with habitat telemetry and space weather to catch shared threats early—such as rising cabin $\text{CO}_2$, solar particle radiation events, continuous acoustic noise, water/dust contamination, or Martian sol ($24\text{h }39\text{m}$) circadian drift—instead of misdiagnosing them as isolated individual illnesses.
- **Buffs (Protective Readiness Factors):** Tracks positive crew-wide countermeasures—such as synchronized exercise compliance, optimal hydration/sleep recovery windows, radiation-shelter readiness, and full-crew rest buffers—that raise overall mission resilience.

### Dual-Horizon Alerts & Constrained Solutions
- **Immediate Alerts (Minutes–Hours):** Pushed locally (working offline without Earth connectivity) with an explicit countdown to critical limits and an automatic **Buddy-Rescue** step-by-step stabilization mode for non-physician crewmates if an astronaut becomes unresponsive.
- **Prolonged Alerts (Days–Weeks):** Tracks slow-burn spaceflight risks (bone mineral loss, renal stone risk, neuro-ocular vision shifts, muscle atrophy, cognitive fatigue) and prompts timely preventative adjustments before they become mission-critical.
- **1–2 Actionable Solutions:** Every alert surfaces at most one or two prioritized actions filtered by **remaining time window**, **severity**, and **available/non-expired onboard supplies**.

---

## 3. Research & Dataset Foundation

- **NASA Human Research Program (HRP) — 5 Hazards & Risks:** Forms the taxonomy for all team-wide debuffs and evidence-based countermeasure cards (Space Radiation, Isolation & Confinement, Distance from Earth, Gravity Fields, Hostile Closed Environments).
- **NASA-STD-3001 (Vol. 1 & Vol. 2):** Supplies concrete operational limits (e.g., $\text{ppCO}_2$, $\text{ppO}_2$, radiation exposure caps) used to compute honest, auditable Time-to-Action windows.
- **NASA DONKI Space Weather Data:** Drives realistic acute solar energetic particle and storm scenarios for radiation debuffs and shelter countdowns.
- **CSA Radiation & Bio-Monitor Concepts + NASA OSDR Human Baselines:** Grounds wearable multi-parameter abstraction, cumulative dosimetry, and multi-day microgravity physiological drift.

---

## 4. Alignment with NASA Space Apps Judging Criteria

### Impact
- **Space Exploration Value:** Protects not just a single astronaut, but **entire crew survivability and mission readiness** under deep-space communication blackouts by catching shared habitat hazards and preventing cascading medical emergencies.
- **Broader Earth Impact:** The exact same *individual + shared-environment debuff + time-to-action + buddy-rescue* framework transfers directly to isolated Earth teams without on-site doctors (Antarctic stations, submarines, offshore rigs, remote field expeditions, disaster response).

### Creativity
- Moves beyond the standard "single-user vital-sign chart + generic chatbot" pattern by introducing:
  - **Team-wide buffs and debuffs** with cross-crew symptom attribution.
  - **Time-to-Action countdowns paired with 1–2 resource-constrained solutions**.
  - **Privacy-preserving Commander visibility** paired with an **incapacitated Buddy-Rescue mode** for non-medical crewmates.

### Validity
- Every score, debuff, and Estimated Time of Action is grounded in **documented NASA standards and physiological research** rather than arbitrary numbers.
- Separates **numerical risk calculation/simulation** from **lightweight narrative report generation**, ensuring summaries never contradict the underlying math.
- Designed for **offline-first onboard operation**, mission-phase baseline shifts, and non-expert self-assessment guidance.

### Relevance
- Directly fulfills the *Create Health Monitoring Software for Astronauts on Space Missions* objectives: multi-modal health data capture, clear visual interpretation, non-expert measurement guidance, hazard education, and actionable treatment recommendations.
- Uses **NASA HRP hazards/risks, NASA-STD-3001, DONKI space weather, OSDR baselines, and CSA radiation/wearable concepts** as load-bearing inputs inside the system rather than decorative references.

### Presentation
- Framed around **one cohesive mission story** rather than a dry feature tour:
  1. **The Problem:** Why isolated vital charts fail tired crews during deep-space comms delays.
  2. **Personal Ready-to-Act View:** Guided check-in, prolonged risk trend, Estimated Time of Action, and 1–2 inventory-aware solutions.
  3. **Team-Wide Debuff & Captain View:** A live scenario (e.g., rising cabin $\text{CO}_2$ + solar event) triggers local alerts, updates the Captain's Readiness Matrix while protecting private logs, and demonstrates Buddy-Rescue escalation.
  4. **Transparent Science & Broad Impact:** Visible NASA/CSA data citations inside the interface and clear Earth-analog applications.
