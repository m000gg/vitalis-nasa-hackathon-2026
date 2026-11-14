
---

## 7. Feature Ideas

| # | Feature | Demo wow moment | NASA data | Effort |
|---|---------|-----------------|-----------|--------|
| 1 | **CO₂ headache forecast** | CO₂ slowly rises, and the system says "in 2 hours, 3 of 4 crew members have a high headache risk". | EDA ISS CO₂ [6][7] + NASA finding (+1 mmHg CO₂ = 2× headache odds) [2][3] | Easy |
| 2 | **"Module weather"** | Each spacecraft module is shown like a weather map: green/yellow/red by CO₂, temperature, noise. | EDA [6][7] + NASA limits [3][4][5] | Easy |
| 3 | **"Where to go" advice** | "CO₂ is high in module A, sleep in module B tonight." | EDA [6][7] | Medium |
| 4 | **Sleep and environment** | Morning message: "you slept badly because it was noisy and stuffy at night". | NASA noise and CO₂ limits [3][5] | Medium |
| 5 | **Radiation budget** | Like a health bar in a game: how much dose the crew member received this mission and how much is left. | EDA radiation (daily and accumulated dose) [6][7] | Easy |
| 6 | **Contagion in the crew** | One person gets sick, and the system shows who had the most contact with them in the closed habitat. | NASA HRP article on microbes [1] | Hard, little data |

### Recommendation

Combine **1 + 5**: *"The environment attacks the crew, and we warn early."*

- Both use **real NASA data**.
- Both are **easy to show in a demo**.
- Both **fit in one day**.
- Fits the team story: each hazard is one sensor or metric, and the system combines them into one picture of crew health. This file covers the "environment" part.
