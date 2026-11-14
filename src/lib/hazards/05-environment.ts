import { HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

/**
 * ============================================================================
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS
 * Owner: Teammate 5 — Edit ONLY this file (src/lib/hazards/05-environment.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 5 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Hostile/Closed Environments only.
export const ENVIRONMENT_PIPELINE_VALUES = {
  // Add your info: NASA OCHMO CO2, O2, pressure & noise limit constants here
  supportedStreams: ["Cabin Atmosphere & Pressure", "Module Acoustics & Thermal", "OSDR EDA Telemetry Replay"],
};

// [SECTION 2: HAZARD 5 FORMULAS & EVALUATION PIPELINE]
// Write generalized cabin atmosphere / headache / relocation formulas here.
export function evaluateEnvironmentHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, reentryMode } = input;
  const dbAtmosphere = hazardRecords.find((r) => r.streamName === "Cabin Atmosphere & Pressure")?.rawValue;
  const atmosphereInput = actorInputs["Cabin Atmosphere & Pressure"] || dbAtmosphere;
  const maxSolutions = reentryMode ? 1 : 2;

  const status =
    actor.readinessState === "HOLD"
      ? "CRITICAL"
      : actor.readinessState === "CONDITIONAL"
      ? "ELEVATED"
      : "NOMINAL";

  const solutions = [
    atmosphereInput
      ? `Here is: Evaluate cabin atmosphere input ("${atmosphereInput}") against OCHMO limits (CO₂ <= 4 mmHg, O₂ >= 122 mmHg).`
      : "Here is: Check module weather map and relocate sleep bay if module CO₂ or noise turns amber.",
    "Here is: Inspect CO₂ scrubber / ECLSS ventilation loop and log morning sleep-environment report.",
  ].slice(0, maxSolutions);

  return {
    status,
    scenarioStatusSlot: mission.environment.atmosphereStatusSlot,
    immediateHorizon: environmentHazard.outputSlots.immediateHorizon,
    prolongedHorizon: environmentHazard.outputSlots.prolongedHorizon,
    eta: actor.metrics.etaSlot,
    solutions,
  };
}

// [SECTION 3: HAZARD 5 UI METADATA, INPUT STREAMS & ALARMS]
export const environmentHazard: HazardSpec = {
  slug: "environment",
  number: 5,
  title: "Hostile/Closed Environments",
  shortTitle: "Environment",
  ownerSlot: "src/lib/hazards/05-environment.ts",
  sourceDoc: "docs/hazards/05-hostile-closed-environments.md",
  nasaReferences: [
    "NASA HRP Hostile/Closed Environments",
    "NASA OCHMO CO₂ Technical Brief",
    "NASA OCHMO Habitable Atmosphere Technical Brief",
    "NASA OCHMO Acoustics Technical Brief",
    "NASA OSDR Environmental Data App (EDA)",
  ],
  overviewSlot:
    "Here is: Closed-ecosystem habitat telemetry linking cabin CO₂, O₂, pressure, humidity, acoustics, and microbial contact context to early crew symptom prevention.",
  inputSlots: [
    {
      streamName: "Cabin Atmosphere & Pressure",
      inputPrompt: "Add your info: Module CO₂ (mmHg vs 4 mmHg target), O₂ (mmHg vs 122 mmHg floor), total pressure (5.0–15.0 psia) here",
      sourceRef: "OCHMO CO₂ & Habitable Atmosphere",
    },
    {
      streamName: "Module Acoustics & Thermal",
      inputPrompt: "Add your info: Noise level (dBA vs 85 dBA hazardous / NC-40 sleep limit), temperature, relative humidity here",
      sourceRef: "OCHMO Acoustics / OSDR EDA",
    },
    {
      streamName: "OSDR EDA Telemetry Replay",
      inputPrompt: "Add your info: ISS EDA mission_id & replay speed for cabin environment stream here",
      sourceRef: "05-hostile-closed-environments.md §3 & §5",
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Acute hypoxia / rapid pressure-change / hazardous noise alarm & module evacuation advice.",
    prolongedHorizon: "Here is: CO₂ headache risk forecast, module weather map (green/yellow/red), and morning sleep-environment report.",
    etaSlot: "Here is: Projected time until module CO₂ or O₂ crosses NASA OCHMO operational limit.",
    solutionsSlot: "Here is: 1–2 actions (e.g., Sleep relocation to Module B tonight; Inspect CO₂ scrubber / ECLSS ducting).",
  },
  leadView: {
    summary: "Module Weather Map (green/yellow/red across all spacecraft modules), crew-wide CO₂ headache forecast, and sleep-relocation orders.",
    privacyRule: "Environmental module telemetry is crew-wide; contact tracing / contagion views are flagged as future work with limited public data.",
    modules: [
      {
        title: "Module Weather Map & Replay Control",
        detail: "Here is: Live or OSDR-EDA replayed green/yellow/red status per module for CO₂, O₂, pressure, temp, and noise.",
        actionSlot: "Add your info: Module telemetry override or EDA replay mission_id here",
      },
      {
        title: "Crew Headache Forecast & Relocation Orders",
        detail: "Here is: Cross-crew headache odds alert (e.g., CO₂ rising across shared sleeping bay) + relocation plan.",
        actionSlot: "Add your info: Crew module reassignment plan here",
      },
    ],
  },
  memberView: {
    summary: "Personal 'Where to go' relocation advice, morning Sleep & Environment report (linking sleep quality to night noise & CO₂), and personal local readings.",
    privacyRule: "Personal symptom logs remain private while shared module alerts warn the whole crew early.",
    modules: [
      {
        title: "Where-to-Go & Sleep Environment Report",
        detail: "Here is: Plain-language morning briefing & relocation advice (e.g., 'Module A CO₂ elevated — sleep in Module B tonight').",
        actionSlot: "Add your info: Morning symptom check (headache / dizziness / sleep) here",
      },
      {
        title: "Module Safety Limits Reference",
        detail: "Here is: Displays NASA OCHMO operational context (CO₂ <= 4 mmHg target, O₂ >= 122 mmHg floor, 5–15 psia, <85 dBA / NC-40).",
        actionSlot: "Add your info: Local handheld sensor check here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=environment", purpose: "Fetch persisted environment records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert cabin atmosphere or acoustics telemetry into Supabase" },
  ],
  alarmPreset: {
    title: "CLOSED HABITAT ATMOSPHERE BREACH — CO₂ / O₂ / PRESSURE ALERT",
    severity: "CRITICAL",
    etaLabel: "Here is: Estimated Time of Action before 1-hour TWA O₂ floor or CO₂ headache/hypercapnia threshold",
    descriptionSlot:
      "Here is: Module A atmospheric telemetry breached operational bounds. Multiple crew members at risk of shared environmental debuff.",
    leadActions: [
      "1. Evacuate/isolate affected module and redistribute crew to green-status compartments.",
      "2. Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop.",
    ],
    memberActions: [
      "1. Move immediately to designated green-status module per Where-to-Go guidance.",
      "2. Monitor for headache/dizziness/hypoxia symptoms and report via local check-in.",
    ],
  },
  evaluate: evaluateEnvironmentHazard,
};
