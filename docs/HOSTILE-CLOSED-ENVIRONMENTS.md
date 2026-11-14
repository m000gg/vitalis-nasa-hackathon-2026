# Research Notes: Hostile / Closed Environments

## Sources

1. [NASA HRP — Hazard: Hostile/Closed Environments](https://www.nasa.gov/hrp/hazard-hostile-closed-environments/)
2. [News-Medical — Headaches an occupational hazard for astronauts](https://www.news-medical.net/news/20140501/Headaches-an-occupational-hazard-astronauts.aspx)
3. [NASA OCHMO — CO2 Technical Brief (PDF)](https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf)
4. [NASA OCHMO — Habitable Atmosphere Technical Brief, OCHMO-TB-003 (PDF)](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf)
5. [NASA OCHMO — Acoustics Technical Brief (PDF)](https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf)
6. [NASA OSDR — Environmental Data App (EDA)](https://visualization.osdr.nasa.gov/eda)
7. [OSDR Tutorials — Environmental Data Application guide](https://dev2-osdr-tutorials.readthedocs.io/en/latest/pages/guides/environmental_data_application.html)

---

## 1. Overview

A spacecraft is a **closed ecosystem**. Key habitability factors: **air (CO₂, O₂), temperature, humidity, pressure, noise, lighting, crowding, and microbes** [1].

In closed habitats [1]:
- Microbes spread more easily between people.
- Stress hormones rise.
- The immune system changes, which may increase allergies and illness.

---

## 2. Carbon Dioxide (CO₂)

- **NASA target:** at or below **4 mmHg** (Earth is about 0.3 mmHg) [2][3].
- **Each +1 mmHg of CO₂ doubles the odds of a crew headache** [2][3].
- Keeping CO₂ at or below 4 mmHg lowers **weekly headache risk from about 3.3% to 1.6%** [2][3].
- Getting below 1% risk would need under 2 mmHg, which is **not practical with current systems** [2][3].

---

## 3. Oxygen (O₂) and Pressure

- **Normal inspired O₂ partial pressure:** about 149 mmHg at sea level. **Absolute lower limit:** 122 mmHg (1-hour time-weighted average) [4].
- **Hypoxia effects:** worse vision, fatigue, nausea, headache, dizziness, mood changes, poor sleep, hyperventilation [4].
- **Total pressure range for indefinite exposure:** 5.0 to 15.0 psia [4].
- Rapid pressure changes cause **decompression sickness and barotrauma** [4].

---

## 4. Noise

- **Hazardous noise limit:** below **85 dBA** regardless of duration [5].
- **Sleep areas on missions over 30 days:** continuous noise limited by the **NC-40** curve [5].
- **Effects:** hearing loss, headaches, worse sleep, worse task performance [5].

---

## 5. NASA Dataset We Can Use

**OSDR Environmental Data App (EDA)** provides real ISS cabin telemetry [6][7]:
- Temperature, relative humidity, and CO₂ from the ISS cabin.
- Radiation: daily GCR dose, daily South Atlantic Anomaly dose, total daily dose, accumulated mission dose.

**How to get the data** [7]:
- Open the left panel **"Data Tables"**, choose a mission, and use the buttons at the top of the table to download CSV or Excel.
- **"Mission Comparison"** compares missions.

**Note:** data is grouped by Rodent Research missions, but it is the same ISS cabin [7].

---

## 6. Feature Idea: "Environment Affects Health, and We Predict It"

- Replay real ISS CO₂ data from EDA as a **live sensor stream** [6][7].
- Apply the NASA finding (**+1 mmHg CO₂ = 2× headache odds**) to show **crew headache risk in real time** [2][3].
- **Warn the crew before symptoms start.**

### Judging Criteria Coverage
- **Relevance:** real NASA data at the core.
- **Validity:** based on published NASA research.
- **Creativity:** links environment to health.
