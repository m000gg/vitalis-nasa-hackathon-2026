# Hazard 1: Space Radiation — Research Evaluation & Project Integration

> **Project Alignment:** Supports the **Vitalis+ Crew & Commander Ready-to-Act Space Health System** by converting radiation measurements, mission forecasts, and NASA research into **individual exposure tracking, commander alerts, shelter decisions, and actionable countermeasures** for long-duration missions (including Mars transit).
>
> **Scope:** Software only. We assume onboard dosimeters, protective compartments, crew-location systems, and any experimental hardware are available as **real, manual, or simulated interfaces**. No new flight hardware is required for the hackathon demo.

---

## 1. Curated Reference Links (Hazard 1: Space Radiation)

> **Evidence policy:** Distinguish **measured observations**, **model-based estimates**, **mock/demo data**, and **experimental concepts**. A solar-event record is **not** a crew dosimeter reading. No NASA dataset directly predicts an individual astronaut's future disease from a single radiation value.

### A. Primary NASA Sources, Datasets & Models

1. **[NASA HRP — Space Radiation Hazard](https://www.nasa.gov/hrp/hazard-space-radiation/)** — Overview of the radiation hazard and the corresponding human-health risks; grounds the Hazard 1 dashboard.
2. **[NASA Planetary Data System (PDS): Mars Science Laboratory Radiation Assessment Detector (RAD), calibrated RDR](https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MSL-M-RAD-3-RDR-V1.0)** — Archived calibrated Mars RAD measurements for historical time series and example radiation environments. **Verify a dataset's time interval, processing level, and measurement units before ingestion.**
3. **[NASA DONKI / API portal](https://api.nasa.gov/)** — Space-weather events and API documentation. Example endpoints: [Solar Energetic Particles (SEP)](https://api.nasa.gov/DONKI/SEP?startDate=2024-05-01&endDate=2024-05-31&api_key=DEMO_KEY), [Solar Flares (FLR)](https://api.nasa.gov/DONKI/FLR?startDate=2024-05-01&endDate=2024-05-31&api_key=DEMO_KEY), [Radiation Belt Enhancements (RBE)](https://api.nasa.gov/DONKI/RBE?startDate=2024-05-01&endDate=2024-05-31&api_key=DEMO_KEY). Suitable for **event timelines**, not direct dose estimates within a spacecraft.
4. **[NASA — Artemis I Radiation Measurements](https://www.nasa.gov/missions/artemis/artemis-1/artemis-i-radiation-measurements-validate-orion-safety-for-astronauts/)** and **[peer-reviewed Nature study (2024)](https://www.nature.com/articles/s41586-024-07927-7)** — Orion measurements vary by location and orientation: up to approximately **4×** spatial variation during a proton-belt passage, and an approximately **50%** measured dose-rate reduction under a tested orientation change. **Mission- and geometry-specific evidence**, not universal shielding factors.
5. **[NASA OLTARIS](https://oltaris.nasa.gov/)** — Space-radiation transport, shielding and dose assessment system. Use **precomputed or properly derived** simulation outputs; access may require registration/approval. **Not a plug-and-play public live sensor API.**
6. **[NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/)** and **[NASA OSDR Visualization / RadLab](https://visualization.osdr.nasa.gov/)** — Radiation-related biological experiments and associated metadata, useful for research and measured biological response; **not clinical diagnosis or personalized risk calculators**.
7. **[NASA Human Research Roadmap](https://humanresearchroadmap.nasa.gov/)** and **[NASA-STD-3001 / NASA Standards](https://standards.nasa.gov/)** — Human spaceflight risks and standards. Source **mission-specific** thresholds, monitoring requirements, operational procedures and dose constraints from approved documents; do not invent them.

### B. Relevant Experimental Research & Supporting Sources

8. **[ISS experiment: *Cladosporium sphaerospermum* (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9294542/)** — Melanized fungal growth and exploratory radiation observations on the ISS. Supports a **BioShield experiment**, **not** validated crew-scale radiation protection.
9. **[NASA NIAC](https://www.nasa.gov/niac/)** — Exploratory spacecraft technologies, including proposals for advanced magnetic shielding and fungal/mycelium-based structures. Proposals must not be presented as operational flight systems.
10. **[NASA BioSentinel](https://www.nasa.gov/mission/biosentinel/)** — Biological-response research involving yeast and deep-space radiation; supports a **biological sentinel concept**, not directly measured human harm.
11. **[NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/)** — Operational space-weather context and alerts; Earth-oriented warnings need location-aware interpretation for Mars missions.

---

## 2. Description & Evaluation of Sources for Our Project

| Source | What it actually provides | Concrete value for Vitalis+ / important limitation |
| :--- | :--- | :--- |
| **NASA HRP / Human Research Roadmap** | Categories of radiation-related health risks, uncertainties, research questions | Hazard education, medically responsible warnings, and **clearly labeled** health-risk views; cannot claim exact future organ damage from raw dose alone. |
| **Mars RAD / PDS** | Instrument measurements and calibrated historical records | Populate line charts, replay radiation changes and test ingestion. Mars-surface measurements are **not** interchangeable with doses inside a Mars-bound spacecraft. |
| **DONKI SEP / FLR / RBE** | Dated space-weather event records, locations/attributes when available | Forecast/event-replay interface and alert triggering; **event detection ≠ personal absorbed/effective dose**. |
| **Artemis I / Orion** | Measurements at different locations and configurations inside one spacecraft | Support **compartment heatmaps**, **smart shelter choice**, and **orientation what-if** scenarios; values depend on spacecraft design and radiation conditions. |
| **OLTARIS** | Particle transport, geometry/shielding and radiation dose modeling | Simulate water, polyethylene, regolith and structures using valid inputs; do **not** assume a universal percentage reduction from thickness alone. |
| **OSDR / BioSentinel** | Experimental molecular/cellular response, assay context and datasets | Inform future bio-response views and experimental alerts; changes in a cell culture are **not** a diagnosis for an astronaut. |
| **ISS melanized fungus study** | Preliminary growth and radiation attenuation observations | Prototype BioShield Lab with experimental/control panels; shielding performance at habitat scale remains unproven. |
| **NASA standards & operations** | Human-system requirements and operational constraints | Ground escalation and crew actions in **approved procedures**, not invented clinical thresholds or automatic medication advice. |

---

## 3. Radiation Physics, Health Risks & Measurable Fields

### A. Radiation Environments & Exposure Pathways

- **Galactic Cosmic Rays (GCR):** Persistent high-energy protons and heavy nuclei, difficult to shield; long-term exposure concern.
- **Solar Energetic Particles (SEP):** Potentially intense, time-limited particle events; key driver of **storm shelter** procedures and EVA warnings.
- **Trapped Particles / Radiation Belts:** Important during suitable orbital passages; route and spacecraft orientation can matter.
- **Secondary Radiation:** Neutrons and other particles generated by interactions with structure/shielding; a heavier shield is **not always proportionally better**.
- **Ionizing radiation** is the relevant umbrella category for these hazards, **not** an independent alternative to radiation.

### B. Health Consequences & Modeling Limits

- **Long-term risks:** Increased cancer risk; possible cardiovascular, central nervous system, ocular (e.g. cataract), reproductive, and other tissue effects. Magnitudes vary by dose, radiation quality and uncertainty.
- **Acute exposure:** At sufficiently high short-term doses, tissue and hematopoietic injury, nausea and radiation sickness are concerns; ordinary mission readings should **not** be described as acute radiation sickness.
- **Biological monitoring:** Optional blood panels, DNA-damage markers and experimental cellular measurements may supplement physical dosimetry, but **cannot be reduced to a reliable “% DNA damage” or “years of life lost” display** without validated research models.
- **Units:** Absorbed dose **Gy**, equivalent/effective dose **Sv**, dose-rate units with time, and particle flux/LET are distinct quantities. Store **units, instrument type, calibration, position and uncertainty** for every value.

### C. Normalized Inputs (Manual Entry / Simulated Sensor / Dataset Replay)

| Stream | Proposed fields | Input method | Output |
| :--- | :--- | :--- | :--- |
| **Personal dosimeter** | `crew_id`, `timestamp_utc`, `dose_rate_value`, `dose_rate_unit`, `cumulative_dose_value`, `dose_unit`, `uncertainty` | Manual / simulated / onboard | Personal profile, exposure history, crew comparison |
| **Compartment sensors** | `compartment_id`, `dose_rate`, `detector_status`, `position`, `timestamp_utc` | Simulated / onboard | Radiation heatmap, shelter in/out monitoring, sensor fault check |
| **Radiation characteristics** | `particle_type`, `energy_bin`, `let`, `quality_flag` when measured | Dataset / specialized sensor | Radiation-type analysis and transport-model input |
| **Space weather** | `event_id`, `event_type`, `start_time`, `source`, `confidence` | NASA DONKI / simulated | Event timeline and storm alerts |
| **Mission plan** | `mission_day`, `remaining_days`, `trajectory_segment`, `planned_eva`, `crew_location` | Manual / simulated | Mission forecast, EVA planner, zone warnings |
| **Shielding / habitat** | `material`, `thickness`, `areal_density`, `geometry`, `shelter_capacity`, `crew_count` | Manual / design model | Shielding simulations, shelter selection and routing |
| **Crew logs / medical** | `activity`, `duration_min`, `exposure_context`, approved clinical markers | Manual / authorized input | Exposure-by-activity and optional medical context |

### D. Deterministic Computation Layer (Auditable, Not Arbitrary Scores)

1. **Cumulative dose:** Integrate a **compatible** measured dose rate over time, with unit conversion and missing-data handling. Do not combine Gy and Sv as if interchangeable.
2. **Mission Exposure Forecast:** Estimate end-of-mission dose using measured baseline, mission duration and explicit scenarios; display an **uncertainty interval** and distinguish forecast from measurement.
3. **Crew Radiation Budget:** Compare each member's integrated exposure and task plans against **approved mission-specific limits**, not a universal invented threshold.
4. **Compartment / Route Estimate:** Compute expected added dose along a route from segment dose rates and transit times, subject to data quality and uncertainty.
5. **Shielding What-if:** Use validated transport outputs or a clearly marked *toy simulation*; radiation type, energy and secondary products matter.
6. **Health Risk:** Only display individualized clinical/organ risk if an appropriate **validated** model and required inputs exist; otherwise show dose projections and qualitative research context.
7. **Dual-Horizon Alerts:** **Immediate** (observed hazard, EVA, shelter) versus **Prolonged** (cumulative exposure trend, mission extension); alert levels and captain response intervals are mission-policy inputs.

---

## 4. Working With the Data: Vitalis Integration Design

### A. Core Product Features (All 20)

| Group | Features | Role in product |
| :--- | :--- | :--- |
| **Monitoring** | **1. Radiation Dashboard**; **2. Personal Radiation Profile**; **3. Crew Radiation Comparison**; **4. Radiation History**; **5. Radiation Type Analysis** | Current/accumulated dose, trends, personal records, particle characterization when sensors support it. |
| **Prediction** | **6. Mission Exposure Forecast**; **7. Health Risk Assessment**; **8. What-if Simulator**; **9. Organ Exposure Estimation** | Future exposure, uncertainty-aware *conditional* risk assessment, scenario comparisons and validated organ-dose estimates if available. |
| **Protection** | **10. Radiation Storm Alert**; **11. Storm Shelter Guidance**; **12. Shelter Monitoring**; **13. Radiation Heatmap**; **14. Emergency Protocols**; **15. EVA Safety Planner** | Event detection, safe shelter routing, exposure comparison, approved steps and EVA planning. |
| **Research / reporting** | **16. Shielding Simulator**; **17. BioShield Research**; **18. Medical Countermeasures**; **19. Radiation Research Database**; **20. Mission Radiation Report** | Evaluate materials, track fungal experiments, reference approved clinical protocols, access research and export incident reports. |

### B. Automated Safety Workflows (All 14)

| Workflow | Trigger / inputs | Action / outcome |
| :--- | :--- | :--- |
| **1. Captain Approval & Emergency Override** | Confirmed hazard; captain acknowledgement status | Request approval; if no response after a **procedure-defined** interval, automatically sound alarm, illuminate shelter routes and notify crew. **Mechanical shield movement only in simulation or with certified interlocks.** |
| **2. Predictive Radiation Zone Alert** | Trajectory + radiation-belt/route model | Predict entry into a high-exposure region; recommend precautions and shelter preparation. |
| **3. Smart Spacecraft Orientation** | Directional radiation model + craft constraints | Suggest a more shielded orientation for captain/flight-control assessment; **do not autonomously maneuver**. |
| **4. Adaptive Radiation Shield** | Exposure pattern + shield configuration | Simulate movable protective panels or cargo placement; experimental concept. |
| **5. Automatic Storm Shelter Preparation** | Space-weather warning + inventory/status | Check communications, power, capacity, water, supplies and access. |
| **6. Crew Evacuation Tracker** | Crew positions + acknowledgements | Identify who has reached shelter, who has not responded and who needs assistance. |
| **7. Radiation Escape Route** | Compartment map + local rates + transit times | Show a route minimizing **expected added exposure**, subject to accessibility. |
| **8. Smart Water Shield** | Water tank positions + geometry | Compare hypothetical tank arrangements for additional shielding. |
| **9. Personal Radiation Budget** | Personal accumulated exposure + scheduled tasks | Forecast individual exposure and flag potential mission-policy conflicts. |
| **10. EVA Abort Assistant** | EVA position + event detection + return time | Suggest termination/return according to flight rules, not an improvised risk threshold. |
| **11. Solar Storm Preparation Score** | Shelter checklist + crew readiness | Show actionable missing preparations, not an unsupported “% safety” score. |
| **12. Sensor Fault Detection** | Multiple sensors + telemetry health | Flag disagreements, suspect failures and confidence level; never silently dismiss a hazard. |
| **13. Radiation-Aware Sleep Planner** | Sleeping-area exposure map + availability | Recommend lower-exposure sleeping areas if operationally feasible. |
| **14. BioShield Growth Monitor** | Culture conditions + dosimeters + control specimen | Track fungal growth and experimental attenuation, clearly marked unvalidated. |

### C. Commander vs. Individual View

| Individual astronaut | Commander / crew operations |
| :--- | :--- |
| Personal accumulated dose, history, expected mission exposure, location-specific alerts, approved actions | Crew-wide dose comparison, event map, shelter occupancy, missing acknowledgements, work redistribution, radiation incident status |

**Privacy rule:** Personal medical information and laboratory findings require authorization; mission safety telemetry can be displayed under role-based access. A captain-facing dashboard should not automatically expose unrestricted sensitive health data.

### D. Alerts & 1–2 Actionable Countermeasures

Each event includes **what happened**, **data source + quality**, **estimated time to action**, **who must acknowledge**, and **one or two feasible responses** selected from preapproved procedures and current inventory.

**Example:** `Potential SEP event detected` → (1) prepare/check designated storm shelter, (2) suspend or reassess EVA under flight rules. If the captain does not answer, preapproved notifications and route lights activate; a device deployment requires separate engineering approval.

---

## 5. Scenario Library: Radiation Events for the Hackathon

| Scenario | Inputs | Vitalis+ output / decision |
| :--- | :--- | :--- |
| **A. Solar Storm During Sleep** | Onboard dose-rate spike, event feed, crew positions, captain no-response | Alarm, acknowledgement escalation, shelter guidance, evacuation report; timeouts defined by procedure. |
| **B. Radiation Threat During EVA** | EVA duration/location, onboard telemetry, SEP warning | Exposure projection and recommendation to follow approved return/abort procedure. |
| **C. Unequal Crew Exposure** | Dosimeters, activity log, compartment dose map | Explain the difference and propose feasible lower-exposure task rotation. |
| **D. Shield Integrity Failure** | Suspected micrometeoroid impact, hull telemetry, neighboring dosimeters | Verify whether exposure increased; flag suspect compartment and evaluate restrictions. |
| **E. Approaching Radiation Belt / Hazard Zone** | Trajectory, zone model, timing | Predict entry, alert captain, reschedule vulnerable tasks and prepare shielding. |
| **F. Sensor Disagreement / False Alarm** | Multiple sensor readings, device status | Distinguish uncertainty from confirmed hazard; request cross-check without ignoring real danger. |
| **G. Communication Blackout** | Loss of Earth link, local detector feed | Maintain offline monitoring, local procedures, event logs and crew alerts. |
| **H. Sleeping in Higher-Exposure Compartment** | Sleep location, dose-rate map, occupancy | Compare long-term added dose and suggest an alternate compartment. |
| **I. Protective Cargo Removed** | Shelter layout/inventory, before/after measurements | Identify changed shield configuration and reassess exposure. |
| **J. Mars Surface Spike / Remote Astronaut** | Habitat and rover dosimeters, crew position, travel times | Compare shelter-at-rover vs return-to-base routes by expected additional dose and feasibility. |
| **K. Medical Emergency During Storm** | Patient needs, room map, emergency equipment | Compare routes/rooms while prioritizing medical protocol and crew safety. |
| **L. Shelter Capacity Exceeded** | Crew count, capacities, compartments, life support status | Propose valid multi-shelter distribution; refuse configurations exceeding capacity. |
| **M. Nuclear Source / Reactor Compartment Anomaly** | Local dosimetry, reactor telemetry for missions that carry such hardware | Flag localized exposure and apply approved compartment restrictions. |
| **N. Mission Extension** | New return date, cumulative dose, future environment assumptions | Recalculate forecast and suggest schedule/exposure controls. |
| **O. Secondary Radiation Surprise** | Particle spectrum, proposed shielding, transport simulation | Warn that a material change may increase some secondary components; compare outputs. |
| **P. Forbush Decrease Misinterpretation** | Cosmic-ray rate changes + solar event data | Explain that decreased GCR does not automatically mean a solar particle event is harmless. |
| **Q. Missing Data Reconstruction** | Partial sensor outage + neighboring sensors | Show an **estimated interval** with gap indicators, never invented measurements. |
| **R. Combined Emergency** | Radiation warning + simultaneous life-support fault | Present trade-offs and defer to approved multi-hazard emergency priorities. |
| **S. BioShield Controlled Trial** | Fungus thickness/growth + paired control dosimeters | Plot experimental signal and uncertainty; do not claim verified protection of astronauts. |

---

## 6. Experimental / High-Potential Extensions

These are promising **research directions**, not operationally validated countermeasures. They are suitable for a futuristic *Research Lab* tab or carefully labeled what-if simulation.

1. **Artificial Magnetosphere / Superconducting Shield:** Model charged-particle deflection, coil power and cooling; include a superconducting quench failure scenario. A magnetic shield does **not** shield neutrons or all particle energies.
2. **Self-Growing Fungal / Melanin BioShield:** Simulate biomaterial growth, contamination controls, thickness, and comparison against a non-living control; connect to the ISS melanized-fungus paper and NASA mycotecture research.
3. **Organ-on-a-Chip / Personalized Biology:** Visualize research measurements from astronaut-derived tissue models, where available; do not equate model tissue behavior to clinical astronaut injury.
4. **Biological Radiation Sentinel:** Compare yeast/cell-culture response against physical detector readings, inspired by NASA BioSentinel.
5. **Nanomaterial Suit / Boron-Nitride Composite:** Compare speculative shield layers by modeled mass and material properties; no blanket protection percentage.
6. **Protective Vest Allocation:** Simulate how to distribute limited shielding garments during a mission-specific radiation event, grounded where possible in Artemis/MARE-AstroRad measurements and limitations.
7. **Radioprotective Drug Research:** Reference experimental countermeasures and approved medical protocols; **never autonomously recommend drugs**, especially potassium iodide as general protection from cosmic radiation.
8. **Torpor / Reduced-Metabolism Research:** Experimental human-spaceflight concept for long-duration missions; **not an established radiation shield**, and must not be represented as reducing dose unless supported by evidence.
9. **Radiation Digital Twin:** Fuse map, dosimeters, crew locations, precomputed physics and scenarios into a navigable spacecraft model; use model validation and uncertainty labels.

---

## 7. End-to-End Demo: Mars Transit Radiation Incident

1. An astronaut **manually enters a dosimeter reading** (or the app replays NASA RAD/DONKI history as appropriately labeled example inputs).
2. Vitalis+ updates **personal cumulative dose**, crew comparisons and the **mission-end exposure forecast**.
3. A simulated SEP warning arrives, followed by elevated onboard sensor readings. The system requests **captain acknowledgement**.
4. With no response, it triggers **pre-authorized local alerts** (siren, crew notifications, illuminated route) and prepares the shelter checklist; optional shield deployment is **simulation-only**.
5. The crew moves to a **pre-designated storm shelter**. Vitalis+ tracks arrival confirmations and compares **inside/outside sensor readings**.
6. A **What-if Decision Simulator** compares actions (remain, move to shelter, rearrange supplies, reschedule EVA) by **modeled added dose**, constraints and uncertainty.
7. The system generates an **incident report** listing source provenance: actual NASA observations, modeled calculations or demo-only assumptions.

**Result:** A defensible software demonstration of *detect → predict → alert → protect → verify → report*.

---

## 8. MVP Plan & Scientific / Safety Boundaries

**Hackathon MVP (build first):**
- Multi-crew dosimetry profiles and radiation timeline with **manual/mock input**.
- NASA DONKI **historical event replay**, labeled separately from dosimeter input.
- Cumulative dose calculation, forecast with uncertainty and **What-if** choices.
- Captain alert + acknowledgement flow; shelter readiness and crew arrival tracking.
- Compartment heatmap, modeled safe routes and exportable incident report.

**Stretch goals:** OLTARIS-derived shielding scenarios, radiation-oriented task planning, sensor quality checks, BioShield experiment tab, spacecraft digital twin.

**Non-negotiable boundaries:**
- Never pass off synthetic readings as real NASA astronaut measurements.
- No universal made-up dose thresholds, personal cancer percentages or arbitrary clinical “damage scores.”
- No autonomous medication orders, flight maneuvers or unsafe hardware deployment.
- Gy, Sv, particle flux and biological effect are not interchangeable quantities.
- Research technologies (fungi, magnetic shields, torpor, drugs) require explicit **experimental** labels.
- NASA materials are research evidence; **NASA does not endorse the project**.

**Mission statement:** Turn radiation monitoring from a passive dosimeter display into **NASA-grounded, auditable, offline-capable forecasting and proactive crew protection**.
