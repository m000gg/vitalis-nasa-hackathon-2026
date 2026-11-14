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

## 4. Feature Ideas

| # | Feature | What the crew sees | NASA data |
| :--- | :--- | :--- | :--- |
| 1 | **CO₂ headache forecast** | CO₂ slowly rises, and the system says "in 2 hours, 3 of 4 crew members have a high headache risk". | EDA ISS CO₂ [6][7] + NASA finding (+1 mmHg CO₂ = 2× headache odds) [2][3] |
| 2 | **"Module weather"** | Each spacecraft module is shown like a weather map: green/yellow/red by CO₂, temperature, noise. | EDA [6][7] + NASA limits [3][4][5] |
| 3 | **"Where to go" advice** | "CO₂ is high in module A, sleep in module B tonight." | EDA [6][7] |
| 4 | **Sleep and environment** | Morning message: "you slept badly because it was noisy and stuffy at night". | NASA noise and CO₂ limits [3][5] |
| 5 | **Radiation budget** | Like a health bar in a game: how much dose the crew member received this mission and how much is left. | EDA radiation (daily and accumulated dose) [6][7] |
| 6 | **Contagion in the crew** | One person gets sick, and the system shows who had the most contact with them in the closed habitat. | NASA HRP article on microbes [1]. Limited public data available; future work. |

### Recommendation

Combine **1 + 5**: *"The environment attacks the crew, and we warn early."*

- Both are built on **real NASA data** from the ISS cabin [6][7].
- Both rest on **published NASA research**, such as the finding that each +1 mmHg of CO₂ doubles the odds of a headache [2][3].
- Both link the **environment to crew health**, warning the crew before symptoms start.
- Each hazard is tracked as one sensor or metric, and the system combines them into one picture of crew health.
