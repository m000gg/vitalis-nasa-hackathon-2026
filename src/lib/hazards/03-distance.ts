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
  supportedStreams: ["Earth–Mars Ephemeris (JPL Horizons)", "DTN Outbound Medical Queue", "Onboard Medical Inventory"],
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
// Write generalized comms-delay / DTN / inventory formulas here.
export function evaluateDistanceHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, linkOnline, reentryMode } = input;
  const dbRecord = hazardRecords.find((r) => r.streamName === "Earth–Mars Ephemeris (JPL Horizons)");
  const ephemerisInput =
    actorInputs["Earth–Mars Ephemeris (JPL Horizons)"] ||
    dbRecord?.rawValue ||
    dbRecord?.payload?.distanceKm ||
    dbRecord?.payload?.distance_km;
  const validatedDistanceKm = parseEarthDistanceKm(ephemerisInput);
  const delay = validatedDistanceKm !== null ? calculateEarthCommsDelay(validatedDistanceKm) : null;
  const maxSolutions = reentryMode ? 1 : 2;

  const status = !linkOnline ? "ELEVATED" : actor.readinessState === "HOLD" ? "CRITICAL" : "NOMINAL";

  const immediateHorizon =
    validatedDistanceKm !== null && delay !== null
      ? `Here is: ${delay.oneWayLabel} one-way light delay and ${delay.roundTripLabel} Earth round-trip delay for ${validatedDistanceKm.toLocaleString()} km; local action windows must plan around the blackout and DTN queue.`
      : distanceHazard.outputSlots.immediateHorizon;

  const prolongedHorizon =
    validatedDistanceKm !== null && delay !== null
      ? `Here is: A ${delay.roundTripLabel} Earth round-trip delay means queued DTN reports await acknowledgment while local autonomy remains the primary response path.`
      : distanceHazard.outputSlots.prolongedHorizon;

  const eta =
    validatedDistanceKm !== null && delay !== null
      ? `Here is: Earth round-trip delay = ${delay.roundTripLabel} for ${validatedDistanceKm.toLocaleString()} km at ${DISTANCE_PIPELINE_VALUES.speedOfLightKmPerSecond} km/s.`
      : actor.metrics.etaSlot;

  const solutions = [
    delay
      ? `Here is: One-way light-time is ${delay.oneWayLabel}; round-trip delay is ${delay.roundTripLabel} at ${DISTANCE_PIPELINE_VALUES.speedOfLightKmPerSecond} km/s.`
      : "Here is: Validate Earth–Mars distance in km before using the comms-delay model.",
    linkOnline
      ? "Here is: Earth link online — sync pending Store-and-Forward DTN medical reports."
      : "Here is: Earth link offline — follow pre-approved local checklists & queue DTN reports locally.",
  ].slice(0, maxSolutions);

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
    "NASA Delay/Disruption Tolerant Networking (DTN)",
    "NASA JPL Horizons API",
    "NASA Integrated Medical Model (IMM)",
    "NASA Deep Space Network (DSN Now)",
  ],
  overviewSlot:
    "Here is: Deep Space Autonomy Mode — Earth–Mars light-time delay calculation using c = 299792.458 km/s, offline-first medical checklists, onboard supply/expiry tracking, and Store-and-Forward report queuing.",
  inputSlots: [
    {
      streamName: "Earth–Mars Ephemeris (JPL Horizons)",
      inputPrompt: "Add your info: Selected mission date, Earth–Mars distance in kilometers here",
      sourceRef: "03-distance-from-earth.md §6",
      fieldType: "number",
      unit: "km",
      recordSample: true,
    },
    {
      streamName: "DTN Outbound Medical Queue",
      inputPrompt: "Add your info: Symptom/incident report title, severity, sender callsign, link state (ONLINE/BLACKOUT) here",
      sourceRef: "DTN Store-and-Forward §5",
    },
    {
      streamName: "Onboard Medical Inventory",
      inputPrompt: "Add your info: Supply item, remaining quantity, expiration date, low-stock threshold here",
      sourceRef: "IMM / §4 Limited Medical Supplies",
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Offline-first approved checklist & Buddy-Rescue flow while Earth is unreachable; use the validated light-delay model before action decisions.",
    prolongedHorizon: "Here is: Pending DTN medical reports await transmission, and supply expirations remain watch items while Earth round-trip delay persists.",
    etaSlot: "Here is: One-way light-time = distance_km / 299792.458; round-trip delay = 2 × one-way delay.",
    solutionsSlot: "Here is: 1–2 locally executable steps filtered by non-expired onboard supplies (never autonomous prescribing).",
  },
  leadView: {
    summary: "Store-and-Forward DTN queue oversight, link blackout simulation, onboard supply readiness, and CMO escalation coordination.",
    privacyRule: "Authorized operational medical queue status & inventory alerts; raw personal notes remain protected.",
    modules: [
      {
        title: "DTN Store-and-Forward Queue & Link Control",
        detail: "Here is: View PENDING / SENT / ACKNOWLEDGED reports and simulate link outage vs. sync.",
        actionSlot: "Add your info: Earth link state & retry policy here",
      },
      {
        title: "Medical Inventory & Expiry Oversight",
        detail: "Here is: Track onboard medical kit stock, expiring consumables, and mission-duration sufficiency.",
        actionSlot: "Add your info: Inventory audit / restock note here",
      },
    ],
  },
  memberView: {
    summary: "Personal baseline comparison, offline approved medical guide, quick symptom report submission to local DTN queue, and Buddy-Rescue mode.",
    privacyRule: "Reports queued to Flight Surgeon/CMO respect medical confidentiality rules.",
    modules: [
      {
        title: "Offline Medical Guide & Self-Report Queue",
        detail: "Here is: Submit a structured symptom/incident report locally when Earth link is down (stays in PENDING queue).",
        actionSlot: "Add your info: Observed symptoms & baseline deviation notes here",
      },
      {
        title: "Earth Delay Context & Autonomy Guidance",
        detail: "Here is: Shows why local crew action is required before a 40+ min Earth round-trip reply can arrive.",
        actionSlot: "Add your info: Current mission link latency check here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=distance", purpose: "Fetch persisted distance/DTN records for scenario + character" },
    { method: "POST", path: "/api/communications/queue", purpose: "Queue a medical report locally while Earth link is unavailable" },
    { method: "POST", path: "/api/communications/sync", purpose: "Transmit pending reports and record receipts when link restores" },
  ],
  alarmPreset: {
    title: "EARTH LINK BLACKOUT + MEDICAL INCIDENT — DEEP SPACE AUTONOMY",
    severity: "CRITICAL",
    etaLabel: "Here is: Earliest Earth round-trip reply unavailable (> 40 min delay / LOS)",
    descriptionSlot:
      "Here is: Crew member reported acute dizziness/fatigue while Earth link is unavailable. Local onboard protocol & DTN queue activated.",
    leadActions: [
      "1. Assign Crew Medical Officer (CMO) to open pre-approved local stabilization checklist.",
      "2. Verify medical report is persisted in local DTN queue (PENDING) for next DSN window.",
    ],
    memberActions: [
      "1. Follow offline pre-approved checklist using verified in-stock Med Kit items.",
      "2. Launch Buddy-Rescue mode immediately if crewmate becomes unresponsive.",
    ],
  },
  evaluate: evaluateDistanceHazard,
};
