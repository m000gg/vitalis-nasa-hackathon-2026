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
  // Add your info: Speed-of-light delay & inventory expiry window constants here
  supportedStreams: ["Earth–Mars Ephemeris (JPL Horizons)", "DTN Outbound Medical Queue", "Onboard Medical Inventory"],
};

// [SECTION 2: HAZARD 3 FORMULAS & EVALUATION PIPELINE]
// Write generalized comms-delay / DTN / inventory formulas here.
export function evaluateDistanceHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { mission, actor, actorInputs, hazardRecords, linkOnline, reentryMode } = input;
  const dbEphemeris = hazardRecords.find((r) => r.streamName === "Earth–Mars Ephemeris (JPL Horizons)")?.rawValue;
  const ephemerisInput = actorInputs["Earth–Mars Ephemeris (JPL Horizons)"] || dbEphemeris;
  const maxSolutions = reentryMode ? 1 : 2;

  const status = !linkOnline ? "ELEVATED" : actor.readinessState === "HOLD" ? "CRITICAL" : "NOMINAL";

  const solutions = [
    linkOnline
      ? "Here is: Earth link online — sync pending Store-and-Forward DTN medical reports."
      : "Here is: Earth link offline — follow pre-approved local checklists & queue DTN reports locally.",
    ephemerisInput
      ? `Here is: Ephemeris slot ("${ephemerisInput}") applied to comms delay simulator.`
      : "Here is: Verify non-expired onboard Med Kit coverage for autonomous operations.",
  ].slice(0, maxSolutions);

  return {
    status,
    scenarioStatusSlot: mission.environment.commsDelaySlot,
    immediateHorizon: distanceHazard.outputSlots.immediateHorizon,
    prolongedHorizon: distanceHazard.outputSlots.prolongedHorizon,
    eta: actor.metrics.etaSlot,
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
    "Here is: Deep Space Autonomy Mode — Earth–Mars light-time delay calculation, offline-first medical checklists, onboard supply/expiry tracking, and Store-and-Forward report queuing.",
  inputSlots: [
    {
      streamName: "Earth–Mars Ephemeris (JPL Horizons)",
      inputPrompt: "Add your info: Selected mission date, Earth–Mars distance (km), calculated one-way & RTT delay here",
      sourceRef: "03-distance-from-earth.md §6",
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
    immediateHorizon: "Here is: Offline-first approved checklist & Buddy-Rescue flow while Earth is unreachable.",
    prolongedHorizon: "Here is: Pending DTN medical reports awaiting transmission & upcoming supply expirations.",
    etaSlot: "Here is: Current Earth–Mars round-trip communication delay vs. local action window.",
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
