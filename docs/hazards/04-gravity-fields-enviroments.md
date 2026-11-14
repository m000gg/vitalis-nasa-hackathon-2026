# Gravity Fields Module: Source Evaluation and App Integration

Scope: evaluation of 12 NASA MRID/MEDB documents (JSC28913 set) uploaded by the team, and how to use them in the **Gravity Fields** module of the Crew & Commander Ready-to-Act Space Health System (see `OUTLINE.md`).
Working document for the hackathon. Not medical guidance.

---

## 1. Bottom line

1. The documents define **what NASA measures, when, under which conditions, and who receives the data**. They do **not** give numeric alarm thresholds for grip strength, calf volume or exercise adherence. Thresholds in our app are team parameters and must be labelled **ASSUMPTION** (section 5).
2. Most useful material: in-flight schedules (due dates), pre-test condition rules, and the **EVA readiness chain** (MR087L, MEDB 6.3, MR081L, MEDB 6.1/6.2).
3. Strongest pitch insight: on the ISS, EVA medical monitoring is done by the flight surgeon and ground control, with ECG, heart rate, metabolic rate, suit pressure and suit CO2 monitored in real time (MEDB 6.1/6.2). With a ~22 min one-way delay that loop cannot work. The app provides an **on-board readiness gate and monitoring support**.
4. The ISS model is not "no medical staff": it uses a crew medical officer (CMO) on board plus ground flight surgeons. Our claim should be "reduces dependence on real-time ground support", not "replaces the doctor".
5. Ground-only documents (MEDB 5.1, MR078L, MEDB 1.11, MR006L, MR026L) are background only. They have no in-flight activity.

---

## 2. Document inventory and relevance

| Doc | Topic | In-flight activity? | Relevance | Use in app |
|---|---|---|---|---|
| MR081L (rev. 2005) | Handgrip / pinch dynamometry | Yes | **High** | Recurring test, EVA gate input |
| MEDB 5.4 (2007) | Calf volume (EZOG device) | Yes | **High** | Muscle-atrophy trend input |
| MEDB 5.2 (2013) | On-orbit strength and conditioning monitoring | Yes (daily) | **High** | Exercise log, adherence, weekly sync model |
| MEDB 6.3 (2007) | Arm ergometry | Yes (pre-EVA) | **High** | EVA gate input |
| MR087L (2010) | EVA exercise prebreathe (DCS risk) | Yes (pre-EVA) | **High** | EVA gate: test freshness, practice, verification |
| MEDB 6.1/6.2 (2016) | EVA medical monitoring | Yes (pre/during/post EVA) | **High** | Pre/post-EVA health status timing, readiness note, live-monitoring channels |
| MR090L (2012) | In-suit light exercise (ISLE) prebreathe | Yes, but no data collected in flight | Low | Prerequisite flag only (ISLE training must be completed before launch) |
| MEDB 1.11 (2012) | Bone densitometry (DXA) | **No** (pre/post only) | Medium (context) | Explains why bone loss is only *estimated* in flight; recovery criterion ~2% of baseline |
| MR026L (2018) | Postflight reconditioning | No (R+0 to R+45) | Medium | Landing/return-to-gravity card: 120 min/day for first 45 days, extendable |
| MEDB 5.1 and MR078L | Functional fitness battery | No (pre/post only) | Low | Same content in both. Background for baseline concept |
| MR006L (2000) | Exercise treadmill test | No (preflight only) | Low | Background. Termination criteria are for a stress test, not resting alarms |

Note: all documents are ISS-era (2000-2018). Applicability to lunar/Mars suits and habitats is not established by these documents.

---

## 3. What can be measured on board (candidate inputs)

| Input | In-flight cadence | Conditions / notes | Source |
|---|---|---|---|
| Handgrip strength | FD14, then every 30 days, and 10-14 days before an EVA (+/-2 days) | 3 x 5 s maximal contractions per hand, 60 s rest. Static endurance (non-dominant hand to 50% of pre-EVA max) and dynamic endurance (dominant hand, 3 s contractions at 100%, until it cannot reach 75%). No test within 24 h of an EVA | MR081L |
| Calf volume | From L+14 days, then every 2 weeks | Morning after sleep, before breakfast, together with body-mass measurement (MEDB 1.13). Individually calibrated stocking-type device, so **manual entry** in the app | MEDB 5.4 |
| Exercise log | Daily, about 2.5 h (1 h aerobic, 1.5 h resistance). Data downlinked at least weekly, prescription uplinked at least weekly | Logged: sessions/week; treadmill speed, loading, HR, duration; cycle work rate, pedaling speed, HR, duration, arm-cycle session; resistance device exercises, prescribed vs dialled load, sets, reps. Start >= 90 min after a meal, finish >= 2 h before sleep | MEDB 5.2 |
| Periodic Fitness Evaluation (PFE) | Every 30 days in orbit (mentioned in training description) | Submaximal cycle test per MEDB 4.1 (**not provided to us**) | MEDB 5.2, MR087L |
| Arm ergometry | Before an EVA that happens after FD21. Not needed if the previous EVA was within 14 days | Protocol A: 1 min at 40 W then 3 min at 80 W (EMU). Protocol B: 1 min at 50 W then 3 min at 150 W (Orlan). HR monitored plus >= 3 min recovery. **Not a cardiovascular screening tool** | MEDB 6.3 |
| EVA prebreathe practice | About 1 week before EVA, at surgeon discretion | 1 min each at 37.5%, 50%, 62.5% then 7 min at 75% of VO2peak. 88% legs, ~12% arms. Verified when VO2 in the last 2 min of the 75% stage is within 10% of target | MR087L |
| Pre-EVA health status | Within 48 h before suit donning | Review of systems, brief skin and extremity exam, urinalysis if indicated | MEDB 6.1 |
| Post-EVA health status | Within 24 h after suit doffing | Same. May be waived for double/triple EVAs at surgeon discretion | MEDB 6.1 |
| During EVA (up to 8 h) | Every EVA | ECG, HR, metabolic rate (estimated), suit pressure, suit CO2 partial pressure, radiation exposure (not real-time), body temp (Orlan only) | MEDB 6.2 |

---

## 4. Rules extracted for the deterministic layer

### 4.1 Schedule rules (drive due dates and countdowns)
- Grip: due FD14, then every 30 days; additionally window **EVA minus 14 d to EVA minus 10 d** (+/-2 d flexibility); blocked within 24 h of EVA.
- Calf: due L+14, then every 14 days.
- Arm ergometry: required before an EVA after FD21 unless an EVA occurred within the previous 14 days.
- Pre-EVA health status: <= 48 h before suit donning. Post-EVA: <= 24 h after suit doffing.
- Exercise: daily 2.5 h prescription, weekly data sync.
- Return to gravity: reconditioning R+0 to R+45, 120 min/day, extension decided by crew surgeon + ASCR review.

### 4.2 Pre-test condition rules (differ per test, so store them as data per test)
- Arm ergometry: no strenuous exercise 24 h before, no meal 2 h before, no alcohol or vasoactive substances (e.g. cold medications) 24 h before, no caffeine or nicotine 8 h before. Test >= 48 h from a neutral-buoyancy session.
- Cycle tests (MR087L): no max exercise 24 h before, no regular exercise 8 h before, limited food 2 h, no alcohol/nicotine/vasoactive substances 8 h, caffeine limited 8 h.
- Functional fitness (ground): no maximal exercise 4 h, no food 90 min.
- Grip: no test within 24 h of an EVA.

The app records a **"conditions met" flag** per measurement so trends compare like with like.

### 4.3 EVA readiness chain (proposed gate, from the documents)
An EVA gate is GO only if all applicable items are satisfied:
1. Aerobic fitness test (PFE) current. **Exact timing rule is unclear, see 4.5.**
2. Grip test completed in the pre-EVA window.
3. Arm ergometry completed (if applicable).
4. Prebreathe practice done and verified (EMU EVA).
5. Pre-EVA health status completed within 48 h of suit donning.
6. Prerequisite: ISLE training completed before launch (flag, not a daily input).

The document-side analogue of our commander view: the crew surgeon delivers a **flight note on EVA readiness** to the flight director (MEDB 6.1/6.2). It is a readiness statement, not raw medical data.

### 4.4 Relative (personal-baseline) criteria already in the documents
- Grip endurance end-points are defined relative to the crew member's own **pre-EVA max** (50% static, 75% dynamic). Supports the personal-baseline concept.
- Bone recovery is defined as within about **2% of baseline** (MEDB 1.11).
- Prebreathe verification: measured VO2 within **10% of target** (MR087L).
- Preflight NBL metabolic-rate baselines and the L-3/1 month cycle test are explicitly kept "to compare with in-flight EVA results" (MEDB 6.1/6.2).

### 4.5 Ambiguities and inconsistencies to handle
- MR087L says for US crew a PFE "at least 14 days prior" to an EVA (EVA FD0-90) and "at least 30 days prior" (after FD90). It is unclear whether this is a deadline or a recency limit. For international-partner crew the same document says the PFE must be within 2 +/- 1 weeks before an EVA. **Make PFE timing a configurable parameter and confirm against MEDB 4.1 / the flight rule before claiming it.**
- Condition windows differ between documents (e.g. alcohol 24 h vs 8 h). Keep them per test.
- MEDB 5.1 and MR078L are near-identical (different revisions).

---

## 5. Not in the documents (label as ASSUMPTION in the app)

- Numeric alarm thresholds for grip decline, calf-volume decline, adherence shortfall.
- What counts as a "normal" in-flight value for any metric.
- Content of the review of systems (ROS) used in pre/post-EVA health status. Only its timing is given.
- Any bone measurement in flight. DXA is pre/post only, so in-flight bone risk can only be an **estimate from loading/adherence**.
- The aerobic capacity test itself (MEDB 4.1 / N3.07 are referenced but not provided).
- Anything specific to Moon/Mars suits, 3/8 g surface operations or 2-3 year missions.

---

## 6. How it fits the app (Gravity Fields module)

### 6.1 Two outputs (as discussed)
1. **EVA Readiness** (fast question): GO / CONDITIONAL / NO-GO, list of blockers, and **Time-to-Action** = the nearest deadline derived from the schedule rules.
2. **Atrophy and conditioning trend** (slow question): grip and calf trends against the personal baseline, exercise adherence, and a projected date at which a team-set threshold would be crossed (with an interval).

Optional third card: **return-to-gravity** (landing/return), based on MR026L reconditioning (45 days).

### 6.2 Data model sketch
- `TestType`: id, source document, cadence rule, pre-test condition set, fields.
- `Measurement`: crew_id, test_type, values, taken_at, conditions_met (bool).
- `ExerciseSession`: crew_id, modality, minutes, prescribed vs actual load, HR (optional).
- `EvaPlan`: crew_id, planned_date, suit type (EMU/other), flags (first EVA after FD21, previous EVA date).
- `GateResult`: crew_id, eva_plan_id, status, blockers[], next_deadline.

### 6.3 Engines (deterministic, no AI)
- **Due-date engine:** cadence rules to next due / overdue.
- **Gate evaluator:** section 4.3 to status, blockers, next deadline.
- **Trend engine:** personal baseline = first valid reading, simple linear fit with confidence interval. Only 3-8 points per mission for grip/calf, so say that plainly and do not present it as ML.
- **Adherence engine:** completed vs prescribed minutes (target 2.5 h/day: 1 h aerobic + 1.5 h resistance).

### 6.4 Alert examples (all deterministic and traceable to a document)
- "Grip test window for your EVA on FD100 opens on FD86 and closes on FD90 (+/-2 d)." (MR081L)
- "Pre-EVA health status must be completed within 48 h before suit donning: 31 h left." (MEDB 6.1)
- "Calf measurement overdue by 3 days. Take it tomorrow morning before breakfast with body mass." (MEDB 5.4)
- "Adherence over the last 7 days is below plan. At the current trend your grip reaches the team-set threshold in about N days (low confidence, 4 data points)." (MEDB 5.2, MR081L, threshold = ASSUMPTION)

### 6.5 Role visibility (RBAC)
- **Crew:** all own measurements, notes, trends, gate details.
- **Commander:** per-crew gate status (GO/CONDITIONAL/NO-GO) and blocker *categories* (e.g. "test overdue"), team-level adherence, count of overdue tests. **No** raw values and no private notes by default.
- **Emergency access:** the commander can unlock detail only through an explicit emergency action. It is audit-logged and the crew member is notified afterwards.

This is a design proposal inspired by the "flight note on readiness" in MEDB 6.1/6.2, not something the documents prescribe.

### 6.6 Where TypeSafe (Jev) fits
Jev returns typed decisions (probabilities, confidence, values) and does not write prose. Suggested split:
- **Jev:** classify free-text notes ("my shoulder hurts", "dizzy after exercise") into a fixed category set with confidence. Select a countermeasure card id from a fixed list given the current state.
- **Templates:** the advice text comes from pre-written cards that cite the source document.
- **Fallback:** if confidence is low or the API is unavailable, use keyword rules and show "uncertain, escalate to crew medical officer / ground when link is available".
- Verify API access before the hackathon build depends on it.

### 6.7 Team-wide buff for the Commander view
"Exercise discipline" buff: share of crew meeting the daily prescription this week. It contributes to the Readiness Matrix without exposing individual data.

---

## 7. Claims for the pitch

**Safe to say**
- Schedules, conditions and EVA readiness chain are taken from NASA Medical Requirements Integration Documents.
- EVA monitoring on ISS depends on real-time ground support, which does not hold under a ~22 min one-way delay.
- Personal baselines are consistent with NASA practice (preflight baselines, endurance end-points relative to personal max).
- Bone is estimated in flight because NASA measures it only before and after flight.

**Do not say**
- "Every threshold is grounded in NASA standards". For this module only the *what/when/how* is.
- "Replaces the doctor". Say "reduces dependence on real-time ground support, with escalation when a link exists".
- That the arm test or the grip test screens for cardiac problems.
- That the app prescribes prebreathe protocols. It tracks readiness only (prescription needs a peak cycle test with metabolic gas analysis).

---

## 8. Gaps and what to get next

- **MEDB 4.1 / N3.07** (cycle ergometer test, aerobic capacity): resolves the PFE timing ambiguity.
- **MEDB 1.13** (body mass): paired with the calf measurement.
- Documents for the other hazards (radiation, immunology, therapeutics) are still needed for teammates' modules.
- Any open-access bed-rest datasets (NASA Life Sciences Portal) for realistic simulator trends. Not verified for variables.

---

# Hackathon features (For this Hazard):

--- 
 Feature 1: Autonomous Pre-EVA Readiness Gate & Condition Guard

> **Hazard Module:** Hazard 4 — Gravity Fields ([04-gravity-fields-enviroments.md](../04-gravity-fields-enviroments.md))  
> **System Alignment:** [OUTLINE.md](../../OUTLINE.md) — Short-Horizon Readiness Gate, Estimated Time of Action (ETA), 1–2 Actionable Solutions, and Privacy-Preserving Commander View.  
> **NASA Source Basis:** `MR081L` (Handgrip Dynamometry), `MEDB 6.3` (Arm Ergometry), `MR087L` (EVA Exercise Prebreathe), `MEDB 6.1/6.2` (EVA Medical Monitoring), `MEDB 5.2` (Periodic Fitness Evaluation / PFE), `MR090L` (ISLE Prebreathe Prerequisite).

https://nlsp.nasa.gov/resources/lsah
---

## 1. Space Health Problem & Purpose

On the ISS, EVA (extravehicular activity / spacewalk) medical clearance is verified in real time by Flight Surgeons and ground control (`MEDB 6.1/6.2`). On deep-space missions (up to ~22-minute one-way communication delay), the crew cannot rely on real-time ground clearance.

Entering a pressurized spacesuit without completing the pre-EVA readiness chain exposes astronauts to:
- **Forearm and hand exhaustion (`MR081L`):** Loss of grip strength inside stiff pressurized gloves during critical tether or tool operations.
- **Decompression Sickness / DCS (`MR087L`):** Unverified nitrogen washout / prebreathe protocol performance.
- **Invalidated physiological baselines (`MEDB 6.3`, `MR087L`):** Performing pre-EVA tests shortly after meals, caffeine intake, cold medications, or heavy workouts skews heart rate and $\text{VO}_2$ readings, causing false alarms or masking fatigue.

This feature implements a **100% deterministic, rule-based TypeScript engine** (zero ML/black-box models) that validates pre-test conditions, tracks test windows, computes the **Estimated Time of Action (ETA)**, and outputs role-specific guidance for the astronaut and Commander.

---

## 2. Input (What Goes In)

### A. Planned EVA Context (`EvaPlan`)
| Field | Type | Description | NASA Source |
| :--- | :--- | :--- | :--- |
| `crewId` | `string` | Identifier of the crew member scheduled for EVA | — |
| `currentFlightDay` | `number` | Current mission flight day (e.g., `FD88`) | — |
| `currentTimestamp` | `string` (ISO) | Current onboard UTC timestamp | — |
| `plannedEvaTimestamp` | `string` (ISO) | Scheduled suit-donning UTC timestamp (e.g., `FD100`) | `MEDB 6.1` |
| `previousEvaTimestamp` | `string \| null` | Timestamp of the crew member's most recent prior EVA (if any) | `MEDB 6.3` |
| `suitType` | `'EMU' \| 'ORLAN'` | Spacesuit type (determines arm ergometry protocol A vs. B and prebreathe rules) | `MEDB 6.3`, `MR087L` |
| `isleTrainedPreflight` | `boolean` | Prerequisite flag: whether In-Suit Light Exercise (ISLE) training was completed before launch | `MR090L` |

### B. Pre-EVA Test Records (`PreEvaMeasurements`) & Pre-Test Conditions (`PreTestConditions`)
1. **Handgrip & Pinch Dynamometry (`MR081L`):**
   - `takenAt` (timestamp / flight day)
   - `maxContractionKg` (3 $\times$ 5s maximal contractions per hand, 60s rest)
   - `staticEnduranceSec` (non-dominant hand time to drop below **50% of personal pre-EVA max**)
   - `dynamicEnduranceReps` (dominant hand 3s contractions at 100% until unable to reach **75% of personal pre-EVA max**)
2. **Arm Ergometry (`MEDB 6.3`):**
   - `takenAt` (timestamp)
   - `protocol` (`Protocol A`: 1 min @ 40 W $\rightarrow$ 3 min @ 80 W for EMU; `Protocol B`: 1 min @ 50 W $\rightarrow$ 3 min @ 150 W for Orlan)
   - `heartRateStagesBpm` and `recovery3MinCompleted` (`boolean`)
   - `conditions`:
     - `hoursSinceStrenuousExercise` (must be $\ge 24\text{ h}$)
     - `hoursSinceMeal` (must be $\ge 2\text{ h}$)
     - `hoursSinceAlcoholOrVasoactiveMeds` (e.g., cold medicine; must be $\ge 24\text{ h}$)
     - `hoursSinceCaffeineOrNicotine` (must be $\ge 8\text{ h}$)
3. **EVA Exercise Prebreathe Practice (`MR087L`):**
   - `takenAt` (timestamp, target ~7 days pre-EVA)
   - `measuredVo2Last2MinAt75Pct` and `targetVo2At75Pct` (must fall within **$\pm 10\%$ of target**)
   - `conditions`:
     - `hoursSinceMaxExercise` ($\ge 24\text{ h}$), `hoursSinceRegularExercise` ($\ge 8\text{ h}$), `hoursSinceMeal` ($\ge 2\text{ h}$), `hoursSinceAlcoholNicotineVasoactive` ($\ge 8\text{ h}$), `caffeineLimitedLast8h` (`boolean`)
4. **Periodic Fitness Evaluation / PFE (`MEDB 5.2`, `MR087L`):**
   - `lastCompletedFlightDay` (checked against configurable recency window, e.g., within 30 days)
5. **Pre-EVA Health Status Check (`MEDB 6.1`):**
   - `takenAt` (must be within **$\le 48\text{ h}$ before suit donning**)
   - `systemsReviewPassed` (`boolean`), `skinAndExtremityExamPassed` (`boolean`)
   - `freeTextNote` (optional subjective note, e.g., *"right shoulder stiffness after workout"*)

---

## 3. Processing Logic (What Happens in Code)

The backend/frontend TypeScript engine executes **4 deterministic steps**:

### Step 1: Pre-Test Condition Validation (`ConditionValidator`)
Before accepting any test measurement as valid, the code checks the test-specific condition rules:
- **For Arm Ergometry (`MEDB 6.3`):**
  ```text
  conditionsMet = (hoursSinceStrenuousExercise >= 24)
               && (hoursSinceMeal >= 2)
               && (hoursSinceAlcoholOrVasoactiveMeds >= 24)
               && (hoursSinceCaffeineOrNicotine >= 8)
  ```
- **For Cycle / Prebreathe (`MR087L`):** Checks the 24h max exercise, 8h regular exercise/caffeine/medication, and 2h food rules.
- **For Handgrip (`MR081L`):** Checks that the test was **not** taken within `< 24 hours` of `plannedEvaTimestamp` (hard block to prevent pre-EVA forearm fatigue).
- **Result:** Sets `conditionsMet: boolean`. If `false`, the test is flagged as `INVALID_CONDITIONS` and requires a clean re-test before it can satisfy the readiness gate.

### Step 2: Schedule & Window Evaluation (`ScheduleEngine`)
Using date/flight-day arithmetic relative to `plannedEvaTimestamp`:
1. **Handgrip Window (`MR081L`):**
   - Nominal window: `EVA - 14 days` to `EVA - 10 days` (with $\pm 2\text{ days}$ operational flexibility $\rightarrow$ `EVA - 16d` to `EVA - 8d`).
   - Hard lockout: `< 24 hours` before EVA.
2. **Arm Ergometry Applicability (`MEDB 6.3`):**
   - Required if `currentFlightDay > 21` **AND** (`previousEvaTimestamp == null` OR `daysBetween(previousEvaTimestamp, plannedEvaTimestamp) > 14`).
   - Otherwise marked `NOT_REQUIRED`.
3. **Prebreathe Verification (`MR087L`):**
   - Required for EMU EVAs (~7 days before EVA). Verified if:
     $$\frac{|\text{measuredVo2} - \text{targetVo2}|}{\text{targetVo2}} \le 0.10$$
4. **Pre-EVA Health Check Window (`MEDB 6.1`):**
   - Opens at `EVA - 48 hours` and closes at `EVA - 0 hours` (suit donning).
5. **PFE Recency (`MEDB 5.2` / `MR087L`) & ISLE Prerequisite (`MR090L`):**
   - Checks `currentFlightDay - pfeLastCompletedFlightDay <= 30` (configurable parameter) and `isleTrainedPreflight === true`.

### Step 3: Gate Status & Estimated Time of Action (`GateEvaluator`)
- Aggregates all applicable checklist items into one `GateStatus`:
  - **`GO`**: All required items are `COMPLETED_VALID` (`conditionsMet === true` and within baseline/target thresholds).
  - **`CONDITIONAL`**: One or more required items are `PENDING` inside an open window, approaching a deadline, or flagged `INVALID_CONDITIONS` with enough time remaining to re-test.
  - **`NO-GO`**: A mandatory deadline has passed, the Handgrip test is missing with `< 24h` until EVA (`MR081L` lockout), Prebreathe $\text{VO}_2$ failed the $\pm 10\%$ check (`MR087L`), or `MEDB 6.1` flagged a disqualifying medical issue.
- **Computes `ETA` (Estimated Time of Action):**
  - Calculates the time remaining until the **nearest closing window or upcoming deadline**:
    $$\text{ETA} = \min_{i \in \text{PendingItems}} (\text{itemDeadline}_i - \text{currentTimestamp})$$

### Step 4: Note Classification & Action Card Selection (`GuidanceEngine`)
- If `freeTextNote` is present (e.g., *"dizzy after cycle"* or *"shoulder hurts"*), classifies it into a fixed category (via TypeSafe/Jev or deterministic keyword fallback) and attaches the corresponding pre-written reference card.
- Selects **1–2 prioritized next steps** sorted by tightest `ETA` deadline.

---

## 4. Output (What Comes Out)

### A. Individual Crew View (Full Detail + Actionable Next Steps)
- **Readiness Gate Badge:** `GO` | `CONDITIONAL` | `NO-GO`
- **Countdown / Estimated Time of Action (ETA):**
  - Example: *"Handgrip test window (`MR081L`) closes in **18h 30m** (FD90)."*
  - Example: *"Pre-EVA Health Status (`MEDB 6.1`) window opens in **12h** (must be completed within 48h of suit donning)."*
- **Checklist Breakdown:** Status of each of the 6 pre-EVA items, including whether `conditionsMet` passed or failed.
- **1–2 Concrete Actionable Solutions:**
  1. **Action 1 (Immediate):** *"Complete Handgrip Dynamometry (`MR081L`: 3 $\times$ 5s max contractions + endurance) before FD90 18:00 UTC. Do not perform within 24h of suit donning."*
  2. **Action 2 (Condition Fix):** *"Repeat Arm Ergometry (`MEDB 6.3`) tomorrow morning: today's reading was flagged `conditionsMet = false` due to caffeine intake within 8h of testing."*

### B. Commander View (Privacy-Preserving Flight Note — `MEDB 6.1/6.2` Analogue)
In accordance with `MEDB 6.1/6.2` (where the Flight Surgeon provides a *Flight Note on EVA Readiness* rather than raw clinical records) and [OUTLINE.md](../../OUTLINE.md):
- **Per-Crew EVA Gate Status:** `GO` | `CONDITIONAL` | `NO-GO`
- **Blocker Category Only (No Raw Medical Values or Private Notes):**
  - Shows high-level operational labels such as `"1 Pre-EVA Test Window Closing (18h left)"`, `"Test Retake Required (Pre-Test Conditions)"`, or `"Ready for Suit Donning"`.
  - Raw heart rates, grip kg values, and personal symptom notes remain strictly private in the Individual View unless an audit-logged Emergency Override is triggered.

---


# Feature 2: Microgravity Atrophy, Proxy Bone-Shield & Exercise Adherence Engine

> **Hazard Module:** Hazard 4 — Gravity Fields ([04-gravity-fields-enviroments.md](../04-gravity-fields-enviroments.md))  
> **System Alignment:** [OUTLINE.md](../../OUTLINE.md) — Prolonged Risk Alerts (Days–Weeks), Personal Baseline Drift, Estimated Time of Action (ETA), 1–2 Actionable Solutions, and Team-Wide Buffs & Debuffs.  
> **NASA Source Basis:** `MEDB 5.2` (On-Orbit Strength & Conditioning Monitoring), `MEDB 5.4` (Calf Volume via EZOG Device), `MEDB 1.13` (Body Mass), `MR081L` (Handgrip Dynamometry), `MEDB 1.11` (Bone Densitometry Context), `MR026L` (Postflight Reconditioning Context).

https://nlsp.nasa.gov/resources/lsah
---

## 1. Space Health Problem & Purpose

In microgravity, unloaded postural muscles atrophy and weight-bearing bones lose mineral density (~1–1.5% per month), increasing fracture and renal stone risks as well as injury risk upon landing on Mars, the Moon, or Earth.

Key operational constraints from NASA documentation:
1. **No In-Flight DXA Bone Scans (`MEDB 1.11`):** NASA measures bone mineral density via DXA *only* pre-flight and post-flight. Therefore, in-flight bone risk must be tracked via a **proxy indicator**: daily resistance loading adherence (`MEDB 5.2`).
2. **Sparse Anthropometric Data (`MEDB 5.4`, `MR081L`):** Calf volume is measured every 14 days (`L+14`, `L+28`, ...) and handgrip every 30 days (`FD14`, `FD44`, ...). Over a mission segment, this yields **3–8 data points per crew member**—making black-box ML inappropriate and requiring a **transparent, deterministic linear trend against the astronaut's personal baseline**.
3. **Strict Timing & Pre-Test Conditions (`MEDB 5.4`, `MEDB 5.2`):**
   - Calf volume must be measured **in the morning after sleep, before breakfast**, paired with body mass (`MEDB 1.13`), or daytime fluid shifts and meals will distort the reading.
   - Daily exercise (~2.5 hours/day: 1h aerobic + 1.5h resistance) must **start $\ge 90\text{ min}$ after a meal** and **finish $\ge 2\text{ hours}$ before sleep** (`MEDB 5.2`) to prevent gastrointestinal distress and sleep fragmentation.

---

## 2. Input (What Goes In)

### A. Daily Exercise Logs (`ExerciseSession[]` — `MEDB 5.2`)
| Field | Type | Description | NASA Source |
| :--- | :--- | :--- | :--- |
| `crewId` | `string` | Crew member identifier | `MEDB 5.2` |
| `flightDay` | `number` | Mission flight day of the session | `MEDB 5.2` |
| `modality` | `'TREADMILL' \| 'CYCLE' \| 'ARM_ERGOMETER' \| 'RESISTANCE'` | Exercise device/modality | `MEDB 5.2` |
| `durationMinutes` | `number` | Completed duration (daily prescription target: **60 min aerobic + 90 min resistance = 150 min/day**) | `MEDB 5.2` |
| `prescribedLoadKgOrWatts` | `number` | Target load or work rate prescribed for the session | `MEDB 5.2` |
| `actualDialledLoadKgOrWatts` | `number` | Actual load dialled/completed (plus sets & reps for resistance) | `MEDB 5.2` |
| `sessionStartTime` | `string` (ISO) | Session start timestamp | `MEDB 5.2` |
| `sessionEndTime` | `string` (ISO) | Session completion timestamp | `MEDB 5.2` |
| `lastMealTimestamp` | `string` (ISO) | Timestamp of last meal prior to exercise | `MEDB 5.2` |
| `scheduledSleepTimestamp` | `string` (ISO) | Crew member's scheduled sleep start timestamp | `MEDB 5.2` |

### B. Periodic Anthropometric & Strength Measurements (`Measurement[]`)
1. **Calf Volume (`MEDB 5.4` + `MEDB 1.13`):**
   - `flightDay` (schedule: starts at `L+14`, then every **14 days**)
   - `calfVolumeCm3OrPct` (manual entry from individually calibrated stocking-type EZOG device)
   - `bodyMassKg` (paired measurement per `MEDB 1.13`)
   - `conditions`:
     - `takenMorningAfterSleep` (`boolean`)
     - `takenBeforeBreakfast` (`boolean`)
     - `pairedWithBodyMass` (`boolean`)
2. **Monthly Handgrip Strength (`MR081L`):**
   - `flightDay` (schedule: starts at `FD14`, then every **30 days**)
   - `maxGripForceKg`, `staticEnduranceSec`, `dynamicEnduranceReps`
   - `conditionsMet` (`boolean`)
3. **Configurable Team Threshold Parameters (Explicitly Labelled `ASSUMPTION`):**
   - `calfAtrophyAlertThresholdPct` (e.g., `-10%` relative to personal `L+14` baseline — flagged as `ASSUMPTION` per Section 5 of `04-gravity-fields-enviroments.md`)
   - `gripDeclineAlertThresholdPct` (e.g., `-15%` relative to personal `FD14` baseline — flagged as `ASSUMPTION`)
   - `weeklyAdherenceTargetPct` (e.g., `80%` of prescribed 150 min/day and resistance load)

---

## 3. Processing Logic (What Happens in Code)

The TypeScript engine runs **4 deterministic modules** with zero ML dependencies:

### Step 1: Due-Date & Condition Filter (`DueDateAndConditionEngine`)
1. **Cadence Check:**
   - Computes `nextCalfDueDay = lastValidCalfDay + 14` (or `14` if none taken) and `daysOverdue = currentFlightDay - nextCalfDueDay`.
   - Computes `nextGripDueDay = lastValidGripDay + 30` (or `14` if none taken).
2. **Condition Filtering (`conditionsMet`):**
   - For Calf Volume (`MEDB 5.4`):
     ```text
     conditionsMet = takenMorningAfterSleep && takenBeforeBreakfast && pairedWithBodyMass
     ```
   - Measurements with `conditionsMet === false` are stored in the log with a warning badge, but **excluded from baseline/trend regression** so post-breakfast fluid shifts do not corrupt the atrophy slope.

### Step 2: Exercise Adherence, Proxy Bone Risk & Schedule Hygiene (`AdherenceEngine` — `MEDB 5.2`)
Over a rolling 7-day window:
1. **Aerobic & Resistance Volume Adherence:**
   $$\text{AerobicAdherencePct} = \frac{\sum \text{durationMinutes}_{\text{aerobic}}}{7 \times 60} \times 100, \quad \text{ResistanceAdherencePct} = \frac{\sum \text{durationMinutes}_{\text{resistance}}}{7 \times 90} \times 100$$
2. **Load Intensity Ratio & Proxy Bone-Unloading Risk (`MEDB 1.11` + `MEDB 5.2`):**
   - Computes `loadRatio = actualDialledLoad / prescribedLoad`.
   - Because DXA is unavailable in flight (`MEDB 1.11`), sustained resistance adherence or load ratio `< weeklyAdherenceTargetPct` over $\ge 14\text{ days}$ triggers an **Estimated Bone & Muscle Unloading Warning**.
3. **Meal & Sleep Timing Guard (`MEDB 5.2`):**
   - Flags `mealTimingViolation = (sessionStartTime - lastMealTimestamp) < 90 min`.
   - Flags `sleepTimingViolation = (scheduledSleepTimestamp - sessionEndTime) < 120 min` (finishing exercise $< 2\text{ hours}$ before sleep).

### Step 3: Personal Baseline & Linear Trend Projection (`SmallSampleTrendEngine`)
1. **Personal Baseline Assignment:**
   - Sets `baselineValue` to the crew member's **first valid in-flight reading** (`L+14` for calf volume, `FD14` for handgrip).
   - Converts each subsequent valid reading ($i = 1 \dots N$, where typically $N \in [3, 8]$) into a percentage change from personal baseline:
     $$y_i = \frac{\text{value}_i - \text{baselineValue}}{\text{baselineValue}} \times 100$$
2. **Ordinary Least Squares (OLS) Linear Fit (Pure TypeScript):**
   - Fits a straight line $y(t) = k \cdot t + b$ across the valid points $(t_i, y_i)$ where $t_i$ is `flightDay`, and calculates the standard error / confidence interval of the slope $k$.
3. **Prolonged Estimated Time of Action (`ETA` to Threshold):**
   - If the slope is negative ($k < 0$, indicating progressive atrophy/weakening), calculates the projected flight day when the trend line crosses the team-set threshold $T_{\text{threshold}}$ (e.g., `-10%`):
     $$t_{\text{cross}} = \frac{T_{\text{threshold}} - b}{k}, \quad \text{ETA (days)} = t_{\text{cross}} - \text{currentFlightDay}$$
   - Also computes the confidence interval `[etaMinDays, etaMaxDays]` and explicitly attaches `sampleSize: N` and `thresholdSource: 'TEAM_ASSUMPTION'`.

### Step 4: Team-Wide Buff / Debuff Aggregation (`CommanderMatrixEngine`)
- Calculates the percentage of the crew meeting their weekly `MEDB 5.2` prescription and having up-to-date `MEDB 5.4` / `MR081L` measurements.
- If $\ge 75\text{–}100\%$ of crew meet the weekly target $\rightarrow$ activates the **Team-Wide "Exercise Discipline Buff"** on the Commander's Readiness Matrix.
- If $\ge 2$ crew members fall below resistance targets or have overdue measurements $\rightarrow$ triggers a **Team-Wide "Conditioning & Bone-Shield Drift Debuff"**.

---

## 4. Output (What Comes Out)

### A. Individual Crew View (Personal Trend, Prolonged ETA & 1–2 Solutions)
- **Personal Baseline & Trend Card:**
  - Displays current Calf Volume (`MEDB 5.4`) and Handgrip (`MR081L`) `%` change relative to the astronaut's own `L+14` / `FD14` baseline.
  - Displays transparent statistical metadata: *"Linear trend based on $N = 4$ valid measurements (`conditionsMet = true`). Alert threshold (`-10%`) is a Team-Set Parameter [`ASSUMPTION`]."*
- **Weekly Conditioning & Proxy Bone-Shield Status:**
  - Shows 7-day Aerobic (`h / 7h`) and Resistance (`h / 10.5h`) completion bars + schedule hygiene status ($\ge 90\text{ min}$ post-meal, $\ge 2\text{h}$ pre-sleep).
- **Prolonged Estimated Time of Action (ETA):**
  - Example (Overdue Test): *"Calf volume measurement (`MEDB 5.4`) overdue by **3 days** (next valid window: tomorrow morning before breakfast, in **9h**)."*
  - Example (Trend Projection): *"Resistance adherence is at **64%** over the last 7 days. At the current slope (`-1.4% / week`), calf volume reaches the `-10%` team threshold in **~16 days (CI: 12–22 days)**."*
- **1–2 Concrete Actionable Solutions:**
  1. **Action 1 (Measurement Hygiene):** *"Take EZOG Calf Volume (`MEDB 5.4`) and Body Mass (`MEDB 1.13`) tomorrow morning immediately after waking and **before breakfast**."*
  2. **Action 2 (Workout & Sleep Optimization):** *"Complete full 90-min resistance session today to protect bone loading (`MEDB 5.2` / `MEDB 1.11`), and shift workout completion to before 19:30 UTC (**$\ge 2\text{h}$ before scheduled sleep**)."*

### B. Commander View (Privacy-Preserving Team Buffs & Debuffs)
- **Team-Wide Buff / Debuff Banner:**
  - **Buff Active:** *"Exercise Discipline Buff: 4/4 crew met weekly 2.5h/day aerobic & resistance targets (`MEDB 5.2`) — crew muscle & bone readiness nominal."*
  - **Debuff Active:** *"Crew Conditioning Drift: 2/4 crew below weekly resistance loading target; 1 overdue anthropometric check (`MEDB 5.4`). Recommend protecting 2.5h daily exercise blocks in mission schedule."*
- **Privacy Firewall:** The Commander sees aggregate team adherence `%` and counts of overdue checks, **never** individual calf volume numbers, body mass, or personal medical notes.
