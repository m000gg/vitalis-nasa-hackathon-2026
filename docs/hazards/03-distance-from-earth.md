# Research Notes: Distance from Earth

## Sources

1. [NASA HRP — Hazard: Distance From Earth](https://www.nasa.gov/hrp/hazard-distance-from-earth/)
2. [NASA — Space Communications: 7 Things You Need to Know](https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/)
3. [NASA — The Human Body in Space](https://www.nasa.gov/humans-in-space/the-human-body-in-space/)
4. [NASA — Delay/Disruption Tolerant Networking (DTN)](https://www.nasa.gov/communicating-with-missions/delay-disruption-tolerant-networking/)
5. [NASA — Integrated Medical Model (IMM) Overview](https://www.nasa.gov/nasa-integrated-medical-model-imm-overview/)
6. [NASA JPL — Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
7. [NASA JPL — Deep Space Network Now](https://eyes.nasa.gov/apps/dsn-now/)
8. [NASA — NASA's Integrated Medical Model (2026)](https://www.nasa.gov/general/nasas-integrated-medical-model-imm/)

---

## 1. Overview

During deep-space missions, the crew becomes increasingly **independent of Earth**. Distance creates three connected risks [1][3]:

- **Communication delay:** Mission Control cannot provide immediate instructions or medical advice.
- **Medical autonomy:** rapid evacuation to Earth is not possible during a Mars mission.
- **Limited resupply:** medicines, equipment, and consumables must last for an extended mission.

NASA describes a Mars mission as potentially lasting **around three years** [1]. The main challenge is not distance directly harming the body, but distance making outside assistance much harder.

---

## 2. Communication Delay

- **One-way Earth–Mars radio delay:** approximately **4–24 minutes**, depending on planetary positions [2].
- **Earliest round-trip response:** approximately **8–48 minutes**, even before Mission Control processes a message [2].
- Conversations cannot work like a normal live video call. Multiple rounds of medical questions can take a long time [1][2].

**Example:** With a 20-minute one-way delay, a question reaches Earth after 20 minutes. Even an immediate reply takes another 20 minutes to return: **at least 40 minutes** overall.

**Problem:** A crew member may need assistance before advice from Earth can arrive.

---

## 3. Medical Emergencies and Autonomy

- On the ISS, emergency return to Earth can be possible within hours; this is not a realistic option on a Mars journey [3][8].
- The crew must rely on available onboard training, diagnostic tools, supplies, and approved procedures [1][3].
- NASA's **Integrated Medical Model (IMM)** uses evidence and probabilistic simulations to assess medical events and help plan medical capabilities and resources [5][8].

**Possible scenarios:**

- An astronaut reports dizziness or unusual fatigue while Earth is unreachable.
- The designated crew medical officer becomes ill or unavailable.
- A sensor produces suspicious data during an urgent assessment.

**Problem:** The crew needs accessible, trustworthy information and a clear escalation workflow without depending on immediate ground support.

---

## 4. Limited Medical Supplies

- Spacecraft have strict mass and storage constraints [5][8].
- Medical supplies must be planned for mission duration, crew size, and possible medical events [5][8].
- Rapid delivery of replacement items is not feasible for a Mars mission [1][3].

**Problem:** A medical incident may become more difficult if required supplies are missing, expired, or running low.

**Possible feature:** Track onboard inventory, expiry dates, and low-stock warnings. The system should support responsible crew members, not autonomously choose treatments.

---

## 5. Communication Disruptions and Store-and-Forward

NASA develops **Delay/Disruption Tolerant Networking (DTN)** for communication when connections are delayed or interrupted [4]. A core principle is **store-and-forward**: keep data until another transmission opportunity becomes available.

**Medical-report workflow:**

1. An astronaut records symptoms and measurements.
2. Vitalis+ stores the report on the spacecraft-side system.
3. If the Earth link is unavailable, the report stays in a **pending queue**.
4. When a link becomes available, the system transmits it.
5. The system tracks a **receipt acknowledgment** separately from the attempt to send.

**Problem:** Critical health records must remain available locally and must not be lost because a communication link fails.

**Implementation note:** For our hackathon, a PostgreSQL message queue demonstrates the *store-and-forward principle*; it is **not** a full implementation of NASA's DTN protocols.

---

## 6. NASA Data We Can Use

### NASA JPL Horizons API [6]

Horizons provides ephemeris information, including planetary geometry. We can obtain the approximate **Earth–Mars distance for a selected date** and calculate the one-way signal travel time:

**Delay (seconds) = Distance (km) / 299,792.458 km/s**

**How to use it:**

- Query Mars relative to Earth using the [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html).
- Extract the distance, or use the light-time field if supplied by the chosen ephemeris output.
- Calculate the approximate one-way delay and the earliest round-trip time.
- Feed this result into the Vitalis+ communication simulator.

**Limitation:** Earth–Mars distance is a simplified scenario. A spacecraft in transit has its own trajectory. Communication windows and outages also depend on operational conditions, not only distance.

### NASA Deep Space Network Now [7]

[DSN Now](https://eyes.nasa.gov/apps/dsn-now/) visualizes actual deep-space communication activity, such as ground antennas and spacecraft links.

**Use:** It can serve as a real-world reference for our explanation and presentation. For a reproducible calculation, **Horizons is the better primary data source**; DSN Now should not be treated as a guaranteed historical-data API.

### NASA Integrated Medical Model (IMM) [5][8]

NASA's IMM explains how mission duration, crew size, medical-event likelihood, and limited resources influence medical planning. We can use its **methodology as research support**, but should not claim access to NASA's internal medical model or its underlying patient records.

---

## 7. Feature Idea: "Deep Space Autonomy Mode"

**Concept:** Vitalis+ combines personal health monitoring, an offline-friendly medical information guide, and delay-aware communication so the crew can continue working when Earth cannot respond immediately.

### Proposed Features

1. **Personal Health Baselines** — compare an astronaut's current measurements with their own historical baseline and flag unusual trends for verification.
2. **Offline Medical Guide** — provide locally stored, *approved* checklists and source-linked explanations. Do not invent diagnoses or prescribe treatment.
3. **NASA-Based Communication Delay Simulator** — calculate realistic example delays from JPL Horizons distance data [6].
4. **Medical Report Queue** — store reports locally while offline, retry transmission later, and track acknowledgments.
5. **Medical Inventory Awareness** — display quantities, expiry dates, and low-stock warnings.

### Demo Scenario: "Medical Incident on Mission Day 126"

1. An astronaut reports dizziness and fatigue.
2. Vitalis+ displays recent measurements and changes from the astronaut's baseline.
3. The system notifies the designated crew medical officer and opens the relevant pre-approved checklist.
4. The Earth link is simulated as unavailable; Horizons-derived distance determines the nominal communication delay.
5. A structured medical report is saved in a local queue (`PENDING`).
6. When connectivity is restored in the simulation, the report is transmitted and an acknowledgment is recorded.

**Key innovation:** We connect **real NASA astronomical data** to a visible system behavior: Earth–Mars geometry changes the simulated delay, while health reports remain usable on board.

### Possible Backend Implementation

- `POST /api/emergency/events` — record a simulated incident.
- `GET /api/mission/communication-status` — expose the simulated link state and calculated delay.
- `POST /api/communications/queue` — persist a medical report for future delivery.
- `POST /api/communications/sync` — simulate a transmission/retry when the link is available.
- PostgreSQL table `outbound_messages`: `id`, `report_id`, `status`, `created_at`, `sent_at`, `acknowledged_at`, `retry_count`.

---

### Judging Criteria Coverage

- **Impact:** addresses the loss of immediate medical support during long-duration missions.
- **Relevance:** directly targets NASA's *Distance from Earth* hazard [1].
- **Validity:** uses NASA research on medical autonomy [5][8], delay-tolerant communication [4], and astronomical data [6].
- **Creativity:** combines personal health analysis, offline guidance, and realistically delayed medical messaging.
- **NASA Data Integration:** JPL Horizons results directly affect the communication-delay simulation, rather than being only background information.
- **Presentation:** a single Mars medical-incident scenario demonstrates the entire workflow.

**Safety and scope:** Vitalis+ is a hackathon proof of concept, **not** a clinically validated medical device. Synthetic demo health measurements must be identified as simulated. Only pre-approved medical procedures should be presented as actionable guidance.
