import { HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

/**
 * ============================================================================
 * HAZARD 3: DISTANCE FROM EARTH
 * Owner: Teammate 3 — Edit ONLY this file (src/lib/hazards/03-distance.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 3 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Distance from Earth only.
export const DISTANCE_PIPELINE_VALUES = {
  speedOfLightKmPerSecond: 299792.458,
  supportedStreams: ["Earth–Mars Ephemeris (JPL Horizons)", "Onboard Medical Inventory"],
};

function parseEarthDistanceKm(rawValue: unknown): number | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
  }

  const source = typeof rawValue === "string" ? rawValue : String(rawValue);
  const normalized = source.replace(/,/g, "").trim();

  if (!normalized) {
    return null;
  }

  const unitMatch = normalized.match(/(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:km|kilometers?|kilometres?)\b/i);
  const plainMatch = unitMatch ?? normalized.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/);
  const numericValue = plainMatch ? Number(plainMatch[1]) : Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
}

function formatDelayDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(3)} s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(2)} min`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(2)} h`;
}

function calculateEarthCommsDelay(distanceKm: number) {
  const oneWaySeconds = distanceKm / DISTANCE_PIPELINE_VALUES.speedOfLightKmPerSecond;
  const roundTripSeconds = oneWaySeconds * 2;

  return {
    oneWaySeconds,
    roundTripSeconds,
    oneWayLabel: formatDelayDuration(oneWaySeconds),
    roundTripLabel: formatDelayDuration(roundTripSeconds),
  };
}

// [SECTION 2: HAZARD 3 FORMULAS & EVALUATION PIPELINE]
export function evaluateDistanceHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords } = input;
  const dbRecord = hazardRecords.find((r) => r.streamName === "Earth–Mars Ephemeris (JPL Horizons)");
  const ephemerisInput =
    actorInputs["Earth–Mars Ephemeris (JPL Horizons)"] ||
    dbRecord?.rawValue ||
    dbRecord?.payload?.distanceKm ||
    dbRecord?.payload?.distance_km;
  const validatedDistanceKm = parseEarthDistanceKm(ephemerisInput);
  const delay = validatedDistanceKm !== null ? calculateEarthCommsDelay(validatedDistanceKm) : null;

  const status: HazardEvaluationResult["status"] =
    delay !== null && delay.oneWaySeconds >= 600 ? "ELEVATED" : "NOMINAL";

  const immediateHorizon =
    validatedDistanceKm !== null && delay !== null
      ? `${delay.oneWayLabel} one-way light delay and ${delay.roundTripLabel} Earth round-trip delay for ${validatedDistanceKm.toLocaleString()} km; autonomous onboard procedures cover the latency window.`
      : distanceHazard.outputSlots.immediateHorizon;

  const prolongedHorizon =
    validatedDistanceKm !== null && delay !== null
      ? `A ${delay.roundTripLabel} Earth round-trip delay requires autonomous medical inventory tracking and pre-approved crew checklists.`
      : distanceHazard.outputSlots.prolongedHorizon;

  const eta =
    validatedDistanceKm !== null && delay !== null
      ? `RTT ${delay.roundTripLabel} (${delay.oneWayLabel} one-way) for ${validatedDistanceKm.toLocaleString()} km`
      : actor.metrics.etaSlot;

  const solutions = [
    delay
      ? `One-way light-time is ${delay.oneWayLabel}; round-trip delay is ${delay.roundTripLabel} at ${DISTANCE_PIPELINE_VALUES.speedOfLightKmPerSecond} km/s.`
      : "Validate Earth–Mars ephemeris distance in km in DB telemetry before using the comms-delay model.",
    "Verify non-expired onboard medical kit supplies for autonomous crew response across the light-time window.",
  ];

  return {
    status,
    scenarioStatusSlot: mission.environment.commsDelaySlot,
    immediateHorizon,
    prolongedHorizon,
    eta,
    solutions,
  };
}

// [SECTION 3: HAZARD 3 UI METADATA, INPUT STREAMS & ALARMS]
export const distanceHazard: HazardSpec = {
  slug: "distance",
  number: 3,
  title: "Distance from Earth",
  shortTitle: "Distance",
  ownerSlot: "src/lib/hazards/03-distance.ts",
  sourceDoc: "docs/hazards/03-distance-from-earth.md",
  nasaReferences: [
    "NASA HRP Distance From Earth",
    "NASA JPL Horizons API",
    "NASA Integrated Medical Model (IMM)",
    "NASA Deep Space Network (DSN Now)",
  ],
  overviewSlot:
    "Deep Space Autonomy Mode — Earth–Mars light-time delay calculation using c = 299792.458 km/s, onboard medical checklists, and medical supply/expiry tracking.",
  inputSlots: [
    {
      streamName: "Earth–Mars Ephemeris (JPL Horizons)",
      inputPrompt: "Selected mission date & Earth–Mars distance in kilometers",
      sourceRef: "03-distance-from-earth.md §6",
      fieldType: "number",
      unit: "km",
      recordSample: true,
    },
    {
      streamName: "Onboard Medical Inventory",
      inputPrompt: "Supply item, remaining quantity, expiration date, low-stock threshold",
      sourceRef: "IMM / §4 Limited Medical Supplies",
    },
  ],
  outputSlots: {
    immediateHorizon: "Local autonomous checklists apply across the deep-space light-time window.",
    prolongedHorizon: "Supply expirations and light-time separation remain watch items throughout cruise and surface ops.",
    etaSlot: "One-way light-time = distance_km / 299792.458; round-trip delay = 2 × one-way delay.",
    solutionsSlot: "1–2 locally executable steps filtered by non-expired onboard supplies.",
  },
  leadView: {
    summary: "Light-time latency monitoring, onboard supply sufficiency, and autonomous crew coordination.",
    privacyRule: "Authorized operational inventory & telemetry alerts; raw personal notes remain protected.",
    modules: [
      {
        title: "Light-Time Delay & Ephemeris Model",
        detail: "Calculates one-way and round-trip light-time latency from JPL Horizons Earth–Mars distance.",
        actionSlot: "DB-driven ephemeris distance stream",
      },
      {
        title: "Medical Inventory & Expiry Oversight",
        detail: "Track onboard medical kit stock, expiring consumables, and mission-duration sufficiency.",
        actionSlot: "DB-driven medical inventory stream",
      },
    ],
  },
  memberView: {
    summary: "Light-time delay context, onboard medical inventory snapshot, and local autonomous guidance.",
    privacyRule: "Personal observations remain protected under crew confidentiality rules.",
    modules: [
      {
        title: "Autonomous Medical Kit Verification",
        detail: "Review locally available non-expired Med Kit supplies before crew response.",
        actionSlot: "DB-driven onboard medical inventory",
      },
      {
        title: "Earth Delay Context & Autonomy Guidance",
        detail: "Shows exact light-time latency window why local crew action precedes any Earth reply.",
        actionSlot: "JPL Horizons distance calculation",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=distance", purpose: "Fetch persisted ephemeris & inventory records for scenario + character" },
    { method: "GET", path: "/api/hazard-samples?hazardSlug=distance", purpose: "Fetch ephemeris time-series samples" },
  ],
  alarmPreset: {
    title: "DEEP SPACE LIGHT-TIME AUTONOMY ALERT",
    severity: "CRITICAL",
    etaLabel: "Earth round-trip reply delayed (> 20 min RTT)",
    descriptionSlot:
      "Elevated deep-space distance latency requires autonomous onboard response using verified Med Kit items.",
    leadActions: [
      "1. Assign Crew Medical Officer (CMO) to open pre-approved local stabilization checklist.",
      "2. Confirm non-expired medical consumables match crew needs.",
    ],
    memberActions: [
      "1. Follow approved local stabilization checklist using verified Med Kit items.",
      "2. Monitor symptom progression and maintain telemetry logging.",
    ],
  },
  evaluate: evaluateDistanceHazard,
};
