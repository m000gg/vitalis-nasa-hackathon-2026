import { HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

/**
 * ============================================================================
 * HAZARD 2: ISOLATION & CONFINEMENT
 * Owner: Teammate 2 — Edit ONLY this file (src/lib/hazards/02-isolation.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 2 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Isolation & Confinement only.
export const ISOLATION_PIPELINE_VALUES = {
  // Add your info: Sleep-debt, Martian sol drift & NC-40 acoustic thresholds here
  supportedStreams: ["Wearable / Actigraphy", "Habitat Acoustics & Lighting", "60-Second Self-Check (Private)"],
};

// [SECTION 2: HAZARD 2 FORMULAS & EVALUATION PIPELINE]
// Write generalized isolation/sleep formulas here using (actor, actorInputs, hazardRecords).
export function evaluateIsolationHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, reentryMode } = input;
  const dbSleep = hazardRecords.find((r) => r.streamName === "Wearable / Actigraphy")?.rawValue;
  const sleepInput = actorInputs["Wearable / Actigraphy"] || dbSleep;
  const maxSolutions = reentryMode ? 1 : 2;

  const status =
    actor.readinessState === "HOLD"
      ? "CRITICAL"
      : actor.readinessState === "CONDITIONAL"
      ? "ELEVATED"
      : "NOMINAL";

  const solutions = [
    sleepInput
      ? `Here is: Evaluate actigraphy input ("${sleepInput}") against sleep & circadian rules.`
      : "Here is: Complete 60-second vigilance self-check or 10-min Veggie plant-module sensory care.",
    "Here is: Mitigate sleep-quarter noise (> NC-40) or adjust pre-sleep lighting schedule.",
  ].slice(0, maxSolutions);

  return {
    status,
    scenarioStatusSlot: mission.environment.isolationStatusSlot,
    immediateHorizon: isolationHazard.outputSlots.immediateHorizon,
    prolongedHorizon: isolationHazard.outputSlots.prolongedHorizon,
    eta: actor.metrics.etaSlot,
    solutions,
  };
}

// [SECTION 3: HAZARD 2 UI METADATA, INPUT STREAMS & ALARMS]
export const isolationHazard: HazardSpec = {
  slug: "isolation",
  number: 2,
  title: "Isolation & Confinement",
  shortTitle: "Isolation",
  ownerSlot: "src/lib/hazards/02-isolation.ts",
  sourceDoc: "docs/hazards/02-isolation-and-confinement.md",
  nasaReferences: [
    "NASA HRP Isolation & Confinement",
    "NASA-STD-3001 Vol. 2 (NC-40 / Lighting / Privacy)",
    "HERA, CHAPEA & Mars500",
    "Cognition (PVT-B) & CONNECT Framework",
    "ISS Veggie Space Gardening & Journaling",
  ],
  overviewSlot:
    "Here is: Sleep/circadian drift tracking, acoustic habitability correlation, 60-second neurobehavioral self-checks, privacy-protected journaling, and CONNECT/biophilia countermeasures.",
  inputSlots: [
    {
      streamName: "Wearable / Actigraphy",
      inputPrompt: "Add your info: sleep_duration_h, sleep_efficiency_pct, circadian_phase_shift_min, daytime_activity_counts here",
      sourceRef: "ARCHeR / Mars500 / Concordia",
    },
    {
      streamName: "Habitat Acoustics & Lighting",
      inputPrompt: "Add your info: sleep_quarter_noise (NC / dBA vs NC-40), ambient_lux_schedule_match, mission_day_pct here",
      sourceRef: "NASA-STD-3001 Vol. 2",
    },
    {
      streamName: "60-Second Self-Check (Private)",
      inputPrompt: "Add your info: pvt_median_rt_ms, pvt_lapses_count, subjective_fatigue_1_5, private mood/journal here",
      sourceRef: "Cognition PVT-B / Journaling",
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Pre-EVA / precision-task vigilance alert when sleep debt or PVT lapses spike.",
    prolongedHorizon: "Here is: Martian sol (24h 39m) circadian drift, NC-40 acoustic sleep debt, or Third-Quarter monotony window.",
    etaSlot: "Here is: Estimated Time of Action before critical vigilance threshold or circadian desynchronization.",
    solutionsSlot: "Here is: 1–2 CONNECT / Veggie / acoustic-mitigation actions constrained by onboard kit & schedule.",
  },
  leadView: {
    summary: "Anonymized Crew-Wide Sleep Readiness Index, shared NC-40 acoustic/lighting debuffs, Third-Quarter banner, and Re-Entry UI throttling.",
    privacyRule: "STRICT PRIVACY FIREWALL: Raw journal entries, personal mood/depression scores, and sleep-aid usage are NEVER shown to Lead.",
    modules: [
      {
        title: "Crew-Wide Readiness Matrix (Anonymized)",
        detail: "Here is: Aggregate % below sleep threshold & non-clinical Green/Amber/Red duty readiness without clinical text.",
        actionSlot: "Add your info: Crew schedule adjustment or protected sleep window here",
      },
      {
        title: "Shared Habitat Debuff Attribution",
        detail: "Here is: Distinguishes shared ECLSS fan noise (> NC-40) or comms-lag strain from individual insomnia.",
        actionSlot: "Add your info: Affected crew quarters / acoustic inspection note here",
      },
      {
        title: "Post-Isolation Re-Entry Mode Toggle",
        detail: "Here is: Reduces non-essential alerts & caps action cards to 1 step to prevent decision/sensory overload.",
        actionSlot: "Add your info: Mission phase toggle (Operational vs. Re-entry) here",
      },
    ],
  },
  memberView: {
    summary: "60-second PVT-B/fatigue self-check, strictly private reflection/journal log, Martian sol circadian guidance, and Veggie plant-care sensory reset.",
    privacyRule: "PRIVATE TO YOU: Your journal text, mood valence, and sleep-medication logs remain local to your profile.",
    modules: [
      {
        title: "60-Second Guided Self-Check & Private Journal",
        detail: "Here is: Quick fatigue/vigilance check + private encrypted reflection slot (only anonymized readiness contributes to team view).",
        actionSlot: "Add your info: Subjective fatigue (1–5), PVT-B check, or private journal note here",
      },
      {
        title: "CONNECT & Biophilia Countermeasures",
        detail: "Here is: 1–2 actions (e.g., 10-min Veggie plant-module care; scheduled aerobic/resistance session with crewmate).",
        actionSlot: "Add your info: Completed countermeasure log here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=isolation", purpose: "Fetch persisted isolation/sleep records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert actigraphy or self-check stream into Supabase" },
  ],
  alarmPreset: {
    title: "CIRCADIAN & VIGILANCE DEBUFF — PRE-TASK HOLD",
    severity: "WARNING",
    etaLabel: "Here is: Estimated Time of Action prior to scheduled precision task / EVA",
    descriptionSlot:
      "Here is: Shared sleep-quarter acoustic breach (> NC-40) + multi-night sleep debt pattern detected across >= 2 quarters.",
    leadActions: [
      "1. Order ECLSS fan muffler inspection & issue ANC/earplugs from Med Kit.",
      "2. Shift non-critical maintenance to restore protected 8h sleep window.",
    ],
    memberActions: [
      "1. Complete 3-min vigilance check before precision operations.",
      "2. Use temporary acoustic mitigation or relocate per habitat sleep advisory.",
    ],
  },
  evaluate: evaluateIsolationHazard,
};
