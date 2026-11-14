import { HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

/**
 * ============================================================================
 * HAZARD 4: GRAVITY FIELDS
 * Owner: Teammate 4 — Edit ONLY this file (src/lib/hazards/04-gravity.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 4 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Gravity Fields only.
export const GRAVITY_PIPELINE_VALUES = {
  // Add your info: EVA gate schedule rules & ASSUMPTION conditioning thresholds here
  supportedStreams: ["Handgrip & Calf Volume", "Daily Exercise Log", "EVA Readiness Chain"],
};

// [SECTION 2: HAZARD 4 FORMULAS & EVALUATION PIPELINE]
// Write generalized EVA-gate & atrophy/adherence formulas here.
export function evaluateGravityHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, reentryMode } = input;
  const dbExercise = hazardRecords.find((r) => r.streamName === "Daily Exercise Log")?.rawValue;
  const exerciseInput = actorInputs["Daily Exercise Log"] || dbExercise;
  const maxSolutions = reentryMode ? 1 : 2;

  const status =
    actor.evaGateState === "NO-GO"
      ? "CRITICAL"
      : actor.evaGateState === "CONDITIONAL"
      ? "ELEVATED"
      : "NOMINAL";

  const solutions = [
    actor.evaGateState === "GO"
      ? "Here is: EVA gate GO — maintain pre-EVA test freshness and avoid handgrip test <24h before EVA."
      : "Here is: Complete missing pre-EVA verification (48h health status / prebreathe / ergometry) under valid pre-test conditions.",
    exerciseInput
      ? `Here is: Logged exercise input ("${exerciseInput}") checked against 2.5h daily target.`
      : "Here is: Log daily 1h aerobic + 1.5h resistance session and scheduled calf measurement.",
  ].slice(0, maxSolutions);

  return {
    status,
    scenarioStatusSlot: mission.environment.gravityStatusSlot,
    immediateHorizon: gravityHazard.outputSlots.immediateHorizon,
    prolongedHorizon: gravityHazard.outputSlots.prolongedHorizon,
    eta: actor.metrics.etaSlot,
    solutions,
  };
}

// [SECTION 3: HAZARD 4 UI METADATA, INPUT STREAMS & ALARMS]
export const gravityHazard: HazardSpec = {
  slug: "gravity",
  number: 4,
  title: "Gravity Fields",
  shortTitle: "Gravity",
  ownerSlot: "src/lib/hazards/04-gravity.ts",
  sourceDoc: "docs/hazards/04-gravity-fields-enviroments.md",
  nasaReferences: [
    "MR081L (Handgrip / Pinch Dynamometry)",
    "MEDB 5.4 (Calf Volume EZOG)",
    "MEDB 5.2 (Daily Exercise 2.5h)",
    "MEDB 6.1 / 6.2 / 6.3 & MR087L (EVA Readiness Chain)",
    "MR026L (Postflight R+0 to R+45 Reconditioning)",
  ],
  overviewSlot:
    "Here is: On-board EVA Readiness Gate (compensating for ~22 min delay where ground real-time EVA monitoring cannot run), muscle/bone atrophy trend slots, and pre-test condition tracking.",
  inputSlots: [
    {
      streamName: "Handgrip & Calf Volume",
      inputPrompt: "Add your info: grip_strength, calf_volume (manual calibrated entry), taken_at, conditions_met (bool) here",
      sourceRef: "MR081L / MEDB 5.4",
    },
    {
      streamName: "Daily Exercise Log",
      inputPrompt: "Add your info: aerobic_min (1h target), resistance_min (1.5h target), prescribed vs. dialled load here",
      sourceRef: "MEDB 5.2",
    },
    {
      streamName: "EVA Readiness Chain",
      inputPrompt: "Add your info: PFE status, pre-EVA grip window (10–14d), arm ergometry, prebreathe practice, 48h health status here",
      sourceRef: "MR087L / MEDB 6.1–6.3",
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: EVA Gate output — GO / CONDITIONAL / NO-GO, active blockers, and nearest schedule deadline.",
    prolongedHorizon: "Here is: Personal-baseline atrophy/adherence trend (clearly labeled low-N & team ASSUMPTION thresholds).",
    etaSlot: "Here is: Nearest EVA schedule deadline (e.g., 48h pre-EVA health status window or 24h grip blockout).",
    solutionsSlot: "Here is: 1–2 schedule/pre-test actions (e.g., Complete morning calf check before breakfast; Defer grip test >24h before EVA).",
  },
  leadView: {
    summary: "Per-crew EVA Gate status (GO / CONDITIONAL / NO-GO), blocker categories, team exercise discipline buff, and audit-logged Emergency Medical Detail Unlock.",
    privacyRule: "RBAC: Lead sees gate status & blocker categories only (e.g., 'test overdue') — no raw values or private notes unless Emergency Unlock is triggered & logged.",
    modules: [
      {
        title: "Crew EVA Readiness Gate (Flight Note View)",
        detail: "Here is: Summary gate status (GO/CONDITIONAL/NO-GO) & blocker categories per astronaut.",
        actionSlot: "Add your info: Planned EVA date & suit type (EMU/other) here",
      },
      {
        title: "Emergency Detail Unlock (Audit-Logged)",
        detail: "Here is: Explicit emergency unlock revealing details only with logged justification + automatic crew member notification.",
        actionSlot: "Add your info: Emergency unlock reason & authorization here",
      },
    ],
  },
  memberView: {
    summary: "Personal EVA gate checklist, pre-test condition rules (no caffeine/meal/strenuous exercise windows), personal baseline trend, and R+0..R+45 reconditioning card.",
    privacyRule: "All own measurements, notes, and trends stay private unless an audit-logged emergency unlock occurs.",
    modules: [
      {
        title: "Personal EVA Readiness Chain & Pre-Test Conditions",
        detail: "Here is: Checklist covering PFE, Grip window, Arm Ergometry, Prebreathe verification, ISLE training, and 48h Pre-EVA Health Status.",
        actionSlot: "Add your info: Test completion & conditions_met verification here",
      },
      {
        title: "Atrophy, Exercise & Return-to-Gravity Card",
        detail: "Here is: Daily 2.5h exercise adherence slot + postflight 120 min/day reconditioning card (note: in-flight bone loss is estimated, DXA is pre/post only).",
        actionSlot: "Add your info: Daily aerobic/resistance session log here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=gravity", purpose: "Fetch persisted gravity/EVA records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert exercise, grip, calf, or EVA gate records into Supabase" },
  ],
  alarmPreset: {
    title: "EVA READINESS GATE HOLD — SCHEDULE / PRE-TEST BLOCKER",
    severity: "WARNING",
    etaLabel: "Here is: Nearest EVA gate deadline (e.g., <= 48h Pre-EVA health status window)",
    descriptionSlot:
      "Here is: EVA gate evaluated NO-GO/CONDITIONAL due to missing pre-EVA verification or pre-test condition violation.",
    leadActions: [
      "1. Hold EVA suit donning for affected crew slot or rotate EVA assignment.",
      "2. Use Audit-Logged Emergency Unlock only if mission-critical medical review is needed.",
    ],
    memberActions: [
      "1. Complete missing pre-EVA health status / verification under valid pre-test conditions.",
      "2. Do not perform handgrip test within 24h prior to EVA.",
    ],
  },
  evaluate: evaluateGravityHazard,
};
