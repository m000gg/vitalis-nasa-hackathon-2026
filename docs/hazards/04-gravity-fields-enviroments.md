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

## 9. Open decisions

1. Two separate outputs (EVA readiness + atrophy trend) or one combined index.
2. Include the return-to-gravity card (MR026L) in the MVP or only mention it in the pitch.
3. Team-set threshold defaults for grip/calf, flagged as ASSUMPTION.
4. Default PFE timing rule until MEDB 4.1 is available.
