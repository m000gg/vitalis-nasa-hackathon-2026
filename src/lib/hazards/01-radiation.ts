import { HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

/**
 * ============================================================================
 * HAZARD 1: SPACE RADIATION
 * Owner: Teammate 1 — Edit ONLY this file (src/lib/hazards/01-radiation.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 1 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Space Radiation only.
export const RADIATION_PIPELINE_VALUES = {
  // Add your info: Mission-specific dose-rate & acknowledgement thresholds here
  supportedStreams: ["Personal Dosimeter", "Compartment Sensors", "Space Weather (DONKI)", "Shielding & BioShield Lab (Experimental)"],
};

// [SECTION 2: HAZARD 1 FORMULAS & EVALUATION PIPELINE]
// Write generalized radiation formulas here using (actor, actorInputs, hazardRecords).
export function evaluateRadiationHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, reentryMode } = input;
  const dbDosimeter = hazardRecords.find((r) => r.streamName === "Personal Dosimeter")?.rawValue;
  const dosimeterInput = actorInputs["Personal Dosimeter"] || dbDosimeter;
  const maxSolutions = reentryMode ? 1 : 2;

  const status =
    actor.readinessState === "HOLD"
      ? "CRITICAL"
      : actor.readinessState === "CONDITIONAL"
      ? "ELEVATED"
      : "NOMINAL";

  const solutions = [
    dosimeterInput
      ? `Here is: Evaluate recorded dosimeter input ("${dosimeterInput}") against mission radiation budget.`
      : "Here is: Move to designated storm shelter or lower-exposure compartment if SEP threshold triggers.",
    "Here is: Reassess scheduled EVA / rotate higher-exposure tasks per flight rules.",
  ].slice(0, maxSolutions);

  return {
    status,
    scenarioStatusSlot: mission.environment.radiationStatusSlot,
    immediateHorizon: radiationHazard.outputSlots.immediateHorizon,
    prolongedHorizon: radiationHazard.outputSlots.prolongedHorizon,
    eta: actor.metrics.etaSlot,
    solutions,
  };
}

// [SECTION 3: HAZARD 1 UI METADATA, INPUT STREAMS & ALARMS]
export const radiationHazard: HazardSpec = {
  slug: "radiation",
  number: 1,
  title: "Space Radiation",
  shortTitle: "Radiation",
  ownerSlot: "src/lib/hazards/01-radiation.ts",
  sourceDoc: "docs/hazards/01-space-radiation.md",
  nasaReferences: [
    "NASA HRP Space Radiation",
    "NASA DONKI (SEP / FLR / RBE)",
    "Mars RAD / PDS",
    "Artemis I Orion Measurements",
    "NASA OLTARIS & OSDR / BioSentinel",
  ],
  overviewSlot:
    "Here is: Individual and crew-wide radiation exposure tracking, space-weather event replay, storm-shelter routing, and experimental shielding research — clearly separating measured observations, modeled estimates, and experimental concepts.",
  inputSlots: [
    {
      streamName: "Personal Dosimeter",
      inputPrompt: "Add your info: crew_id, dose_rate (Gy/h or Sv/h), cumulative_dose, instrument & uncertainty here",
      sourceRef: "01-space-radiation.md §3C",
    },
    {
      streamName: "Compartment Sensors",
      inputPrompt: "Add your info: compartment_id, local dose_rate, detector_status, orientation/position here",
      sourceRef: "Artemis I / Orion spatial map",
    },
    {
      streamName: "Space Weather (DONKI)",
      inputPrompt: "Add your info: SEP / FLR / RBE event_id, start_time, confidence (event ≠ direct internal dose) here",
      sourceRef: "NASA DONKI API",
    },
    {
      streamName: "Shielding & BioShield Lab (Experimental)",
      inputPrompt: "Add your info: shield material/thickness or experimental fungal/control specimen data here",
      sourceRef: "OLTARIS / ISS Cladosporium study",
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Immediate SEP / belt entry alert, EVA abort/return guidance, and Captain approval countdown.",
    prolongedHorizon: "Here is: Mission-end exposure forecast with uncertainty interval and radiation-budget comparison.",
    etaSlot: "Here is: Estimated Time of Action before shelter threshold or EVA exposure limit.",
    solutionsSlot: "Here is: 1–2 feasible countermeasures (e.g., Move to designated storm shelter; Suspend/reassess EVA per flight rules).",
  },
  leadView: {
    summary: "Crew-wide dosimetry comparison, shelter arrival tracker, compartment heatmap, Captain Approval / Emergency Override, and lower-exposure task rotation.",
    privacyRule: "Privacy rule: Mission safety telemetry is visible to Lead; clinical blood/DNA-damage findings require authorization.",
    modules: [
      {
        title: "Crew Radiation Comparison & Budget",
        detail: "Here is: Comparative cumulative dose & task-rotation proposals across crew without exposing unauthorized clinical labs.",
        actionSlot: "Add your info: Mission-policy exposure limit & rotation plan here",
      },
      {
        title: "Captain Approval & Emergency Override",
        detail: "Here is: Request Captain acknowledgement on confirmed hazard; auto-escalates alarm & route lights if procedure timeout expires.",
        actionSlot: "Add your info: Procedure acknowledgement timeout window here",
      },
      {
        title: "Crew Evacuation & Shelter Occupancy Tracker",
        detail: "Here is: Track who reached designated storm shelter, shelter capacity constraints, and inside vs. outside sensor readings.",
        actionSlot: "Add your info: Shelter capacity & compartment assignment here",
      },
    ],
  },
  memberView: {
    summary: "Personal accumulated dose (keeping Gy and Sv distinct), mission exposure forecast, radiation-aware sleep area advice, and shortest safe shelter route.",
    privacyRule: "Privacy rule: Your personal medical/biomarker context stays restricted unless authorized.",
    modules: [
      {
        title: "Personal Radiation Profile & Budget",
        detail: "Here is: Personal cumulative dose, uncertainty interval, and scheduled EVA exposure check.",
        actionSlot: "Add your info: Personal dosimeter reading & activity log here",
      },
      {
        title: "Radiation Escape Route & Sleep Planner",
        detail: "Here is: Route minimizing expected added exposure to storm shelter + lower-exposure sleeping compartment suggestions.",
        actionSlot: "Add your info: Current compartment location here",
      },
      {
        title: "BioShield & What-If Simulator (Experimental)",
        detail: "Here is: Clearly labeled experimental/what-if comparison (remain vs. shelter vs. cargo rearrangement).",
        actionSlot: "Add your info: What-if scenario selection here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=radiation", purpose: "Fetch persisted radiation records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert radiation telemetry stream into Supabase" },
  ],
  alarmPreset: {
    title: "SOLAR ENERGETIC PARTICLE (SEP) EVENT — SHELTER PROTOCOL",
    severity: "CRITICAL",
    etaLabel: "Here is: Procedure-defined Estimated Time of Action (e.g., Shelter window countdown)",
    descriptionSlot:
      "Here is: Elevated onboard compartment dose-rate + simulated DONKI SEP warning. Auto-escalation active if Captain acknowledgement times out.",
    leadActions: [
      "1. Issue Captain Approval / Emergency Override to illuminate shelter routes.",
      "2. Verify all crew shelter arrival confirmations & suspend active EVA per flight rules.",
    ],
    memberActions: [
      "1. Proceed via lowest-exposure route to pre-designated storm shelter.",
      "2. Confirm arrival on crew tracker; initiate Buddy-Rescue if a crewmate is unresponsive.",
    ],
  },
  evaluate: evaluateRadiationHazard,
};
