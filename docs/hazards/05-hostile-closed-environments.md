# Hazard 5: Hostile/Closed Environments — Research Evaluation & Project Integration

> **Project Alignment:** Supports the **Crew & Commander Ready-to-Act Space Health System** outlined in [OUTLINE.md](../OUTLINE.md) by tying cabin air, pressure, noise and microbial conditions to crew health, using NASA Human Research Program (HRP) evidence, NASA OCHMO technical briefs and real ISS cabin telemetry from NASA OSDR.

---

## Sources

1. **NASA HRP: Hostile/Closed Environments:** [https://www.nasa.gov/hrp/hazard-hostile-closed-environments/](https://www.nasa.gov/hrp/hazard-hostile-closed-environments/)
2. **NASA study on CO₂ and headaches:** [https://www.news-medical.net/news/20140501/Headaches-an-occupational-hazard-astronauts.aspx](https://www.news-medical.net/news/20140501/Headaches-an-occupational-hazard-astronauts.aspx)
3. **NASA OCHMO CO₂ technical brief:** [https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf](https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf)
4. **NASA OCHMO Habitable Atmosphere technical brief:** [https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf)
5. **NASA OCHMO Acoustics technical brief:** [https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf](https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf)
6. **OSDR Environmental Data App (EDA):** [https://visualization.osdr.nasa.gov/eda](https://visualization.osdr.nasa.gov/eda)
7. **EDA download guide:** [https://dev2-osdr-tutorials.readthedocs.io/en/latest/pages/guides/environmental_data_application.html](https://dev2-osdr-tutorials.readthedocs.io/en/latest/pages/guides/environmental_data_application.html)

---

## 1. Overview

A spacecraft is a **closed ecosystem**. Key factors: **air (CO₂, O₂), temperature, humidity, pressure, noise, lighting, crowding, microbes**.

In closed habitats [1]:
- Microbes spread more easily between people.
- Stress hormones rise.
- The immune system changes, which may increase allergies and illness.

---

## 2. Key Numbers

| Parameter | Limit | Health effect | Source |
| :--- | :--- | :--- | :--- |
| **CO₂** | NASA target at or below **4 mmHg** (Earth is about 0.3 mmHg). | Each **+1 mmHg doubles the odds of a headache**. At or below 4 mmHg, weekly headache risk drops from about **3.3% to 1.6%**. Below 1% risk would need under 2 mmHg, which is not practical with current systems. | [2][3] |
| **O₂ partial pressure** | Normal about **149 mmHg** (sea level). Absolute lower limit **122 mmHg** (1-hour time-weighted average). | Hypoxia: worse vision, fatigue, nausea, headache, dizziness, mood changes, poor sleep, hyperventilation. | [4] |
| **Total pressure** | **5.0 to 15.0 psia** for indefinite exposure. | Rapid pressure changes cause decompression sickness and barotrauma. | [4] |
| **Noise (hazardous limit)** | Below **85 dBA** regardless of duration. | Hearing loss, headaches, worse sleep, worse task performance. | [5] |
| **Noise (sleep areas)** | On missions over 30 days, continuous noise limited by the **NC-40** curve. | Hearing loss, headaches, worse sleep, worse task performance. | [5] |

---

## 3. NASA Dataset We Can Use

**OSDR Environmental Data App (EDA)** provides real ISS cabin telemetry [6][7]:
- Temperature, relative humidity, and CO₂ from the ISS cabin.
- Radiation: daily GCR dose, daily South Atlantic Anomaly dose, total daily dose, accumulated mission dose.

**How to get the data** [7]:
- Open the left panel **"Data Tables"**, choose a mission, and use the buttons at the top of the table to download CSV or Excel.
- **"Mission Comparison"** compares missions.

**Note:** data is grouped by Rodent Research missions, but it is the same ISS cabin [7].

---

## 4. Feature Specs

App: Next.js + TypeScript, frontend only. No backend. Both features live on one page `/environment` and share one simulation. Everything is per **module** (Lab, Habitat, Galley, Airlock).

**Data:** only the cabin CO2 comes from real NASA data (OSDR Environmental Data App, CSV in `public/data/iss-cabin.csv`). Everything else is **simulated** and must carry a "SIM" tag in the UI. If the CSV is missing, generate fake CO2 and show a red badge "SIMULATED DATA - NOT NASA".

### Shared simulation

- Replays the CSV rows as a live stream (loops at the end). Controls: play/pause, speed 1x / 60x / 600x, reset.
- Internal CO2 unit is **mmHg**. If the CSV is in ppm: `mmHg = ppm * 0.00076`. If in percent: `mmHg = percent * 7.6`.
- Values per module:
  - **CO2:** cabin CO2 + module offset (lab 0, habitat +0.4, galley +0.2, airlock -0.4). Real cabin value, simulated offset.
  - **O2:** about 149 mmHg, small noise. Simulated.
  - **Pressure:** about 14.7 psia, small noise. Simulated.
  - **Noise:** lab 62, habitat 45, galley 58, airlock 52 dBA, small noise. Simulated.
  - **Temperature, humidity:** from the CSV if present, shown for information only.
- Demo buttons: **CO2 scrubber failure** (CO2 in all modules rises +0.04 mmHg per simulated minute, up to +3), **O2 leak in Lab** (Lab O2 falls to 118 mmHg in 20 min), **Noisy equipment in Galley** (Galley noise rises to 90 dBA in 10 min), **Clear**.

### Feature 1: Habitat Map

**What it is:** a schematic map of the spacecraft with 4 modules. Each module is green, yellow or red. Click a module to see its values. This is the air layer of the team-wide map, so keep module ids in one shared config.

**Input:** current values per module (CO2, O2, pressure, noise, temperature, humidity) and the CO2 forecast from Feature 2.

**How it works:** each metric gets a status, the module takes the worst one.

| Metric | Green | Yellow | Red | Source |
| :--- | :--- | :--- | :--- | :--- |
| CO2 | otherwise | forecast reaches 4 mmHg within 2 h | above 4 mmHg | NASA target [2] |
| O2 | 130 mmHg or more | 122 to 130 | below 122 | NASA [4] |
| Pressure | 5.0 to 15.0 psia | none | outside that range | NASA [4] |
| Noise | below 85 dBA | none | 85 dBA or more | NASA [5] |

Temperature and humidity have no status (no NASA health limit found).

**Output:** per module: status (green/yellow/red), the worst metric with its value (for example "O2 118 mmHg"), a table of all metrics with REAL/SIM tags. A banner: "Modules: N green, N yellow, N red". Use icons (check, warning, cross), not only colors. Export `getAirLayer()` that returns `{ moduleId, status, worstMetric }` for each module, so other layers can plug into the same map.

### Feature 2: Air Risk Forecast

**What it is:** shows how CO2 raises headache risk in each module, forecasts when a module will reach the NASA limit, shows an alert with 1-2 actions, and counts how long each module has been over the limit.

**Basis:** NASA target is CO2 at or below 4 mmHg. Each +1 mmHg of CO2 doubles the odds of a headache [2].

**Input:** CO2 history per module (last 2 simulated hours) from the shared simulation.

**How it works:**
1. **Risk multiplier** vs the target: `multiplier = 2 ^ (co2 - 4)`. At 4 mmHg it is 1.0, at 5 it is 2.0.
2. **Illustrative weekly risk:** `odds = 0.0163 * 2 ^ (co2 - 4)`, `risk = odds / (1 + odds)`. Anchored at 1.6% for 4 mmHg. Always label it "illustrative".
3. **Forecast:** fit a straight line to the last 30 simulated minutes, get the slope in mmHg per minute. `minutesToLimit = (4 - co2) / slope` if slope is above 0.001 and co2 is below 4. Otherwise none. Projected CO2 after 120 min = `co2 + slope * 120`.
4. **Level:** `high` if CO2 is above 4. `elevated` if `minutesToLimit` is 120 or less. Otherwise `low`.
5. **Alert:** created when the level goes from low to elevated (warning) or to high (critical). Not duplicated while it lasts. Resolves when the level is low again. Has an Acknowledge button. Actions are demo placeholders, not NASA procedures:
   - warning: "Check the CO2 scrubber for {Module}" and "Limit time in {Module} until CO2 stabilizes"
   - critical: "Check the CO2 scrubber for {Module} now" and "Move non-essential work out of {Module}. Lowest CO2 now: {Module}"
6. **Ledger:** per module, add the simulated minutes spent above 4 mmHg; also track the max CO2.

**Output:**
- Per module: level, multiplier ("x2.0 vs target"), illustrative weekly %, trend, minutes to limit, a message.
- CO2 chart per module: last 2 hours, a dashed projection for the next 2 hours, a reference line at 4 mmHg labeled "NASA limit".
- Alert cards with title, ETA in minutes, 1-2 actions and an Acknowledge button.
- Ledger table: module, minutes above the limit, max CO2.
- Messages: low "CO2 is within the NASA target."; elevated "At this rate CO2 reaches the 4 mmHg limit in about {n} min."; high "CO2 is above the NASA limit of 4 mmHg. Each extra 1 mmHg doubles headache odds."; not enough data "Collecting data..."

### Limits to show in an info tooltip
- Only the cabin CO2 is real data. Per-module differences, O2, pressure and noise are simulated around NASA limits.
- The doubling rule is an estimate from ISS crew data, not an exact law. The weekly percent is illustrative.
- Alert actions are demo placeholders.
