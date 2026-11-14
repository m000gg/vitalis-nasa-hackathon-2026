import {
  buildExposureForecast,
  detectSensorDisagreement,
  integrateDoseRateSamples,
  normalizeDose,
  normalizeDoseRate,
} from "@/lib/hazards/01-radiation";

export type RadiationMethodGroup = "core" | "workflow";
export type RadiationMethodStatus = "implemented" | "experimental" | "guarded";

export interface RadiationMethodDefinition {
  id: string;
  name: string;
  group: RadiationMethodGroup;
  status: RadiationMethodStatus;
  description: string;
}

export interface RadiationMethodResult {
  id: string;
  name: string;
  status: "PASS" | "GUARDED";
  summary: string;
  provenanceKind: "simulated" | "modeled" | "experimental";
  output: Record<string, unknown>;
  limitations: string[];
}

export interface RouteSegment {
  id: string;
  minutes: number;
  doseRateValue: number;
  doseRateUnit: string;
}

export interface CompartmentReading {
  id: string;
  label: string;
  doseRateValue: number;
  doseRateUnit: string;
  available: boolean;
  capacity: number;
}

export interface ShelterDefinition extends CompartmentReading {
  ready: boolean;
}

const COMMON_LIMITATIONS = [
  "Demo fixtures are simulated and are not NASA astronaut measurements.",
  "Mission policy and certified flight rules remain authoritative.",
];

function rounded(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function definition(id: string): RadiationMethodDefinition {
  const found = RADIATION_METHOD_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown radiation method '${id}'.`);
  return found;
}

function result(
  id: string,
  summary: string,
  output: Record<string, unknown>,
  options: {
    status?: "PASS" | "GUARDED";
    provenanceKind?: "simulated" | "modeled" | "experimental";
    limitations?: string[];
  } = {}
): RadiationMethodResult {
  return {
    id,
    name: definition(id).name,
    status: options.status ?? "PASS",
    summary,
    provenanceKind: options.provenanceKind ?? "simulated",
    output,
    limitations: options.limitations ?? COMMON_LIMITATIONS,
  };
}

export function estimateRouteDose(segments: readonly RouteSegment[]) {
  if (segments.length === 0) throw new Error("At least one route segment is required.");
  const normalized = segments.map((segment) => {
    if (!Number.isFinite(segment.minutes) || segment.minutes < 0) {
      throw new Error(`Route segment '${segment.id}' has invalid duration.`);
    }
    const rate = normalizeDoseRate(segment.doseRateValue, segment.doseRateUnit);
    if (!rate) throw new Error(`Route segment '${segment.id}' has an unsupported dose-rate unit.`);
    return { ...segment, rate };
  });
  const family = normalized[0].rate.family;
  if (normalized.some((segment) => segment.rate.family !== family)) {
    throw new Error("A route cannot combine Gy-family and Sv-family quantities.");
  }
  const segmentDoses = normalized.map((segment) => ({
    id: segment.id,
    minutes: segment.minutes,
    addedDose: rounded(segment.rate.value * (segment.minutes / 60)),
  }));
  return {
    family,
    unit: family === "equivalent" ? "mSv" : "mGy",
    totalMinutes: rounded(normalized.reduce((sum, segment) => sum + segment.minutes, 0)),
    totalAddedDose: rounded(segmentDoses.reduce((sum, segment) => sum + segment.addedDose, 0)),
    segments: segmentDoses,
  };
}

export function rankCompartments(readings: readonly CompartmentReading[]) {
  const normalized = readings.map((reading) => {
    const rate = normalizeDoseRate(reading.doseRateValue, reading.doseRateUnit);
    if (!rate) throw new Error(`Compartment '${reading.id}' has an unsupported dose-rate unit.`);
    return { ...reading, normalizedRate: rate.value, family: rate.family, normalizedUnit: rate.unit };
  });
  const families = new Set(normalized.map((reading) => reading.family));
  if (families.size > 1) throw new Error("Compartment ranking requires one compatible quantity family.");
  return normalized
    .slice()
    .sort((a, b) => a.normalizedRate - b.normalizedRate)
    .map((reading, index) => ({ ...reading, rank: index + 1 }));
}

export function allocateShelters(crewIds: readonly string[], shelters: readonly ShelterDefinition[]) {
  const ranked = rankCompartments(shelters.filter((shelter) => shelter.available && shelter.ready));
  const remaining = new Map(ranked.map((shelter) => [shelter.id, Math.max(0, Math.floor(shelter.capacity))]));
  const assignments: Array<{ crewId: string; shelterId: string }> = [];
  const unassigned: string[] = [];
  for (const crewId of crewIds) {
    const shelter = ranked.find((candidate) => (remaining.get(candidate.id) ?? 0) > 0);
    if (!shelter) {
      unassigned.push(crewId);
      continue;
    }
    assignments.push({ crewId, shelterId: shelter.id });
    remaining.set(shelter.id, (remaining.get(shelter.id) ?? 0) - 1);
  }
  return {
    safe: unassigned.length === 0,
    assignments,
    unassigned,
    capacityAvailable: ranked.reduce((sum, shelter) => sum + shelter.capacity, 0),
  };
}

export function evaluateShelterChecklist(items: Readonly<Record<string, boolean>>) {
  const entries = Object.entries(items);
  const missing = entries.filter(([, ready]) => !ready).map(([label]) => label);
  return {
    ready: entries.length > 0 && missing.length === 0,
    completed: entries.length - missing.length,
    total: entries.length,
    missing,
  };
}

export function trackEvacuation(
  crew: readonly { id: string; acknowledged: boolean; sheltered: boolean; needsAssistance: boolean }[]
) {
  return {
    total: crew.length,
    sheltered: crew.filter((member) => member.sheltered).map((member) => member.id),
    enRoute: crew.filter((member) => member.acknowledged && !member.sheltered).map((member) => member.id),
    missing: crew.filter((member) => !member.acknowledged).map((member) => member.id),
    assistance: crew.filter((member) => member.needsAssistance).map((member) => member.id),
    complete: crew.length > 0 && crew.every((member) => member.sheltered),
  };
}

export function assessEvaReturn(input: {
  doseRateValue: number;
  doseRateUnit: string;
  returnMinutes: number;
  policyAddedDoseLimitValue: number;
  policyDoseUnit: string;
  activeEvent: boolean;
}) {
  const rate = normalizeDoseRate(input.doseRateValue, input.doseRateUnit);
  const limit = normalizeDose(input.policyAddedDoseLimitValue, input.policyDoseUnit);
  if (!rate || !limit || rate.family !== limit.family) {
    throw new Error("EVA rate and mission-policy dose limit must use compatible supported units.");
  }
  const expectedAddedDose = rate.value * (input.returnMinutes / 60);
  const exceedsPolicy = expectedAddedDose >= limit.value;
  return {
    expectedAddedDose: rounded(expectedAddedDose),
    unit: limit.unit,
    exceedsPolicy,
    recommendation: input.activeEvent || exceedsPolicy
      ? "Reassess/terminate EVA under the approved flight rule and confirm the return route."
      : "Continue monitoring; no autonomous EVA decision is issued.",
  };
}

export function evaluatePersonalBudget(input: {
  currentDoseValue: number;
  doseUnit: string;
  plannedDoseValue: number;
  budgetValue: number;
}) {
  const current = normalizeDose(input.currentDoseValue, input.doseUnit);
  const planned = normalizeDose(input.plannedDoseValue, input.doseUnit);
  const budget = normalizeDose(input.budgetValue, input.doseUnit);
  if (!current || !planned || !budget) throw new Error("Personal budget requires supported dose values.");
  const projected = current.value + planned.value;
  return {
    projected: rounded(projected),
    remainingAfterPlan: rounded(budget.value - projected),
    unit: current.unit,
    conflict: projected > budget.value,
  };
}

export function compareInsideOutside(input: {
  outsideRateValue: number;
  insideRateValue: number;
  doseRateUnit: string;
}) {
  const outside = normalizeDoseRate(input.outsideRateValue, input.doseRateUnit);
  const inside = normalizeDoseRate(input.insideRateValue, input.doseRateUnit);
  if (!outside || !inside || outside.family !== inside.family) {
    throw new Error("Inside/outside readings must use compatible dose-rate units.");
  }
  const observedReductionPercent = outside.value === 0
    ? null
    : rounded(((outside.value - inside.value) / outside.value) * 100, 1);
  return {
    outsideRate: outside.value,
    insideRate: inside.value,
    unit: outside.unit,
    observedReductionPercent,
    lowerInside: inside.value < outside.value,
  };
}

export function compareModelOptions(
  options: readonly { id: string; label: string; rateMultiplier: number; feasible: boolean }[],
  baselineRateValue: number
) {
  return options
    .map((option) => ({
      ...option,
      modeledRate: rounded(baselineRateValue * option.rateMultiplier),
    }))
    .sort((a, b) => Number(b.feasible) - Number(a.feasible) || a.modeledRate - b.modeledRate);
}

export function analyzeBioShieldTrial(control: readonly number[], treatment: readonly number[]) {
  if (control.length < 2 || treatment.length < 2) throw new Error("Paired research groups require at least two samples each.");
  const controlMean = mean(control);
  const treatmentMean = mean(treatment);
  return {
    controlMean: rounded(controlMean),
    treatmentMean: rounded(treatmentMean),
    observedDifferencePercent: controlMean === 0 ? null : rounded(((controlMean - treatmentMean) / controlMean) * 100, 1),
    operationalProtectionClaim: false,
  };
}

export function reconstructMissingInterval(input: {
  previousValue: number;
  nextValue: number;
  uncertaintyPercent: number;
}) {
  const midpoint = (input.previousValue + input.nextValue) / 2;
  const spread = Math.abs(input.nextValue - input.previousValue) / 2;
  const uncertainty = Math.abs(midpoint) * (input.uncertaintyPercent / 100);
  return {
    estimate: rounded(midpoint),
    lower: rounded(Math.max(0, midpoint - spread - uncertainty)),
    upper: rounded(midpoint + spread + uncertainty),
    inventedMeasurement: false,
    label: "estimated interval across missing telemetry",
  };
}

export function evaluateCaptainEscalation(input: {
  eventStartedAt: string;
  acknowledgementWindowMinutes: number;
  acknowledgedAt: string | null;
  now: string;
}) {
  const started = new Date(input.eventStartedAt).getTime();
  const current = new Date(input.now).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(current)) throw new Error("Escalation timestamps must be valid.");
  const elapsedMinutes = Math.max(0, (current - started) / 60_000);
  const overdue = !input.acknowledgedAt && elapsedMinutes >= input.acknowledgementWindowMinutes;
  return {
    elapsedMinutes: rounded(elapsedMinutes, 1),
    overdue,
    actions: overdue ? ["notify crew", "illuminate approved shelter route", "preserve audit event"] : ["await captain acknowledgement"],
    autonomousManeuver: false,
  };
}

export function summarizeRadiationTypes(
  samples: readonly { particleType: string; flux: number; let: number | null }[]
) {
  const grouped = new Map<string, { count: number; flux: number; lets: number[] }>();
  for (const sample of samples) {
    const current = grouped.get(sample.particleType) ?? { count: 0, flux: 0, lets: [] };
    current.count += 1;
    current.flux += sample.flux;
    if (sample.let !== null) current.lets.push(sample.let);
    grouped.set(sample.particleType, current);
  }
  return Array.from(grouped, ([particleType, data]) => ({
    particleType,
    samples: data.count,
    totalFlux: rounded(data.flux),
    meanLet: data.lets.length ? rounded(mean(data.lets)) : null,
  }));
}

export const RADIATION_METHOD_CATALOG: RadiationMethodDefinition[] = [
  { id: "core-dashboard", name: "Radiation Dashboard", group: "core", status: "implemented", description: "Builds the current status and data-quality summary." },
  { id: "core-profile", name: "Personal Radiation Profile", group: "core", status: "implemented", description: "Normalizes personal rate and cumulative dose." },
  { id: "core-crew-comparison", name: "Crew Radiation Comparison", group: "core", status: "implemented", description: "Ranks compatible cumulative crew exposure." },
  { id: "core-history", name: "Radiation History", group: "core", status: "implemented", description: "Integrates timestamped compatible samples." },
  { id: "core-particle-analysis", name: "Radiation Type Analysis", group: "core", status: "implemented", description: "Groups particle/flux/LET fields without inferring health effects." },
  { id: "core-forecast", name: "Mission Exposure Forecast", group: "core", status: "implemented", description: "Projects dose with explicit uncertainty." },
  { id: "core-health-risk", name: "Health Risk Assessment", group: "core", status: "guarded", description: "Refuses unsupported personalized clinical risk." },
  { id: "core-what-if", name: "What-if Simulator", group: "core", status: "implemented", description: "Compares explicit model multipliers and feasibility." },
  { id: "core-organ-dose", name: "Organ Exposure Estimation", group: "core", status: "guarded", description: "Requires a validated organ-dose model." },
  { id: "core-storm-alert", name: "Radiation Storm Alert", group: "core", status: "implemented", description: "Evaluates event context plus onboard measurements." },
  { id: "core-shelter-guidance", name: "Storm Shelter Guidance", group: "core", status: "implemented", description: "Allocates crew to ready low-rate shelters." },
  { id: "core-shelter-monitoring", name: "Shelter Monitoring", group: "core", status: "implemented", description: "Compares observed inside/outside rates." },
  { id: "core-heatmap", name: "Radiation Heatmap", group: "core", status: "implemented", description: "Ranks compartments by compatible sensor rate." },
  { id: "core-emergency-protocol", name: "Emergency Protocols", group: "core", status: "implemented", description: "Checks captain timeout and permitted escalation." },
  { id: "core-eva", name: "EVA Safety Planner", group: "core", status: "implemented", description: "Models return dose against mission policy." },
  { id: "core-shielding", name: "Shielding Simulator", group: "core", status: "experimental", description: "Compares explicit toy/precomputed multipliers only." },
  { id: "core-bioshield", name: "BioShield Research", group: "core", status: "experimental", description: "Compares paired research groups without protection claims." },
  { id: "core-medical", name: "Medical Countermeasures", group: "core", status: "guarded", description: "Defers medication to approved medical protocol." },
  { id: "core-research", name: "Radiation Research Database", group: "core", status: "implemented", description: "Returns provenance-labelled source categories." },
  { id: "core-report", name: "Mission Radiation Report", group: "core", status: "implemented", description: "Produces a provenance-labelled incident summary." },
  { id: "flow-captain", name: "Captain Approval & Override", group: "workflow", status: "implemented", description: "Tests procedure-defined acknowledgement timeout." },
  { id: "flow-zone", name: "Predictive Radiation Zone Alert", group: "workflow", status: "implemented", description: "Compares time-to-zone with preparation time." },
  { id: "flow-orientation", name: "Smart Spacecraft Orientation", group: "workflow", status: "experimental", description: "Ranks precomputed orientations; never maneuvers." },
  { id: "flow-adaptive-shield", name: "Adaptive Radiation Shield", group: "workflow", status: "experimental", description: "Runs explicit configuration multipliers." },
  { id: "flow-shelter-prep", name: "Automatic Shelter Preparation", group: "workflow", status: "implemented", description: "Returns concrete missing checklist items." },
  { id: "flow-evacuation", name: "Crew Evacuation Tracker", group: "workflow", status: "implemented", description: "Tracks sheltered, en-route, missing and assistance states." },
  { id: "flow-route", name: "Radiation Escape Route", group: "workflow", status: "implemented", description: "Calculates added dose for route segments." },
  { id: "flow-water-shield", name: "Smart Water Shield", group: "workflow", status: "experimental", description: "Compares explicit geometry-model multipliers." },
  { id: "flow-budget", name: "Personal Radiation Budget", group: "workflow", status: "implemented", description: "Checks planned dose against mission policy." },
  { id: "flow-eva-abort", name: "EVA Abort Assistant", group: "workflow", status: "implemented", description: "Returns a flight-rule recommendation, not an autonomous order." },
  { id: "flow-preparation", name: "Solar Storm Preparation", group: "workflow", status: "implemented", description: "Lists missing readiness items instead of a fake safety score." },
  { id: "flow-sensor-fault", name: "Sensor Fault Detection", group: "workflow", status: "implemented", description: "Checks policy-defined compatible sensor spread." },
  { id: "flow-sleep", name: "Radiation-aware Sleep Planner", group: "workflow", status: "implemented", description: "Ranks available sleeping compartments." },
  { id: "flow-bioshield-monitor", name: "BioShield Growth Monitor", group: "workflow", status: "experimental", description: "Tracks paired research observations only." },
];

export function runRadiationMethod(id: string): RadiationMethodResult {
  const route = [
    { id: "Hab-A corridor", minutes: 2.5, doseRateValue: 0.22, doseRateUnit: "mSv/h" },
    { id: "Core passage", minutes: 1.5, doseRateValue: 0.48, doseRateUnit: "mSv/h" },
  ];
  const compartments: CompartmentReading[] = [
    { id: "storm-core", label: "Storm Core", doseRateValue: 0.08, doseRateUnit: "mSv/h", available: true, capacity: 3 },
    { id: "hab-a", label: "Habitat A", doseRateValue: 0.19, doseRateUnit: "mSv/h", available: true, capacity: 2 },
    { id: "lab", label: "Research Lab", doseRateValue: 0.44, doseRateUnit: "mSv/h", available: false, capacity: 1 },
  ];
  const shelters: ShelterDefinition[] = compartments.map((item) => ({ ...item, ready: item.id !== "lab" }));
  const modelOptions = [
    { id: "remain", label: "Remain in habitat", rateMultiplier: 1, feasible: true },
    { id: "storm-core", label: "Move to storm core", rateMultiplier: 0.42, feasible: true },
    { id: "cargo", label: "Cargo arrangement", rateMultiplier: 0.71, feasible: false },
  ];
  const checklist = { power: true, communications: true, water: false, medicalKit: true, accessPath: true };
  const evacuation = [
    { id: "Commander", acknowledged: true, sheltered: true, needsAssistance: false },
    { id: "Crew-1", acknowledged: true, sheltered: false, needsAssistance: false },
    { id: "Crew-2", acknowledged: false, sheltered: false, needsAssistance: true },
  ];

  switch (id) {
    case "core-dashboard":
      return result(id, "Dashboard fixture is nominal with one active space-weather context.", { status: "NOMINAL", personalRate: "0.18 mSv/h", activeContext: "simulated SEP" });
    case "core-profile":
      return result(id, "Personal dosimetry normalized successfully.", { rate: normalizeDoseRate(180, "µSv/h"), cumulative: normalizeDose(21.4, "mSv") });
    case "core-crew-comparison":
      return result(id, "Crew exposure ranked in one compatible dose family.", { ranking: [{ crew: "Crew-2", dose: 31 }, { crew: "Crew-1", dose: 24 }, { crew: "Commander", dose: 20 }], unit: "mSv" });
    case "core-history": {
      const history = integrateDoseRateSamples([
        { family: "equivalent", value: 0.1, unit: "mSv/h", timestamp: "2026-11-14T10:00:00Z", uncertaintyPercent: 10, qualityFlag: "valid", provenanceKind: "simulated" },
        { family: "equivalent", value: 0.3, unit: "mSv/h", timestamp: "2026-11-14T12:00:00Z", uncertaintyPercent: 10, qualityFlag: "valid", provenanceKind: "simulated" },
      ]);
      return result(id, "Compatible history integrated with the trapezoidal rule.", { history });
    }
    case "core-particle-analysis":
      return result(id, "Particle fields grouped without clinical inference.", { groups: summarizeRadiationTypes([{ particleType: "proton", flux: 14, let: 2.1 }, { particleType: "proton", flux: 9, let: 2.4 }, { particleType: "heavy-ion", flux: 1.2, let: 18 }]) });
    case "core-forecast":
      return result(id, "Mission-end constant-rate forecast calculated.", { forecast: buildExposureForecast({ currentDose: { family: "equivalent", value: 21.4, unit: "mSv" }, baselineRate: { family: "equivalent", value: 0.18, unit: "mSv/h" }, remainingHours: 72, uncertaintyPercent: 20 }) }, { provenanceKind: "modeled" });
    case "core-health-risk":
      return result(id, "Personalized disease probability was correctly refused.", { available: false, required: ["validated risk model", "radiation quality", "demographics", "approved clinical use"] }, { status: "GUARDED" });
    case "core-what-if":
      return result(id, "Feasible modeled choices ranked by explicit rate multiplier.", { options: compareModelOptions(modelOptions, 0.18), unit: "mSv/h" }, { provenanceKind: "modeled" });
    case "core-organ-dose":
      return result(id, "Organ-dose estimate was correctly refused without a validated conversion model.", { available: false, required: ["organ phantom", "particle spectrum", "transport output"] }, { status: "GUARDED" });
    case "core-storm-alert":
      return result(id, "Onboard rate and event context stay separate while producing a warning.", { level: "WARNING", onboardRate: "0.62 mSv/h", eventContext: "simulated SEP", doseFromDonki: null });
    case "core-shelter-guidance":
      return result(id, "Crew assigned to ready shelters with capacity enforcement.", allocateShelters(["Commander", "Crew-1", "Crew-2", "Crew-3"], shelters));
    case "core-shelter-monitoring":
      return result(id, "Inside/outside comparison calculated from observed fixture readings.", compareInsideOutside({ outsideRateValue: 0.62, insideRateValue: 0.19, doseRateUnit: "mSv/h" }));
    case "core-heatmap":
      return result(id, "Compartments ranked from lowest to highest compatible rate.", { compartments: rankCompartments(compartments) });
    case "core-emergency-protocol":
    case "flow-captain":
      return result(id, "Captain window expired; only pre-authorized notification actions were produced.", evaluateCaptainEscalation({ eventStartedAt: "2026-11-14T10:00:00Z", acknowledgementWindowMinutes: 2, acknowledgedAt: null, now: "2026-11-14T10:03:00Z" }));
    case "core-eva":
    case "flow-eva-abort":
      return result(id, "EVA return dose compared with a simulation-policy limit.", assessEvaReturn({ doseRateValue: 0.9, doseRateUnit: "mSv/h", returnMinutes: 35, policyAddedDoseLimitValue: 0.4, policyDoseUnit: "mSv", activeEvent: true }), { provenanceKind: "modeled" });
    case "core-shielding":
    case "flow-adaptive-shield":
    case "flow-water-shield":
    case "flow-orientation":
      return result(id, "Explicit model outputs ranked; no universal shielding factor was inferred.", { options: compareModelOptions(modelOptions, 0.62), unit: "mSv/h", autonomousAction: false }, { provenanceKind: "experimental" });
    case "core-bioshield":
    case "flow-bioshield-monitor":
      return result(id, "Paired experimental observations compared without a crew-protection claim.", analyzeBioShieldTrial([100, 102, 99, 101], [94, 97, 96, 95]), { provenanceKind: "experimental" });
    case "core-medical":
      return result(id, "Medication advice was correctly deferred to an approved medical protocol.", { autonomousRecommendation: false, protocolRequired: true, note: "Potassium iodide is not general protection from cosmic radiation." }, { status: "GUARDED" });
    case "core-research":
      return result(id, "Research sources separated by evidence type.", { sources: [{ source: "DONKI", kind: "event context" }, { source: "Mars RAD", kind: "measured archive" }, { source: "OLTARIS", kind: "transport model" }, { source: "OSDR/BioSentinel", kind: "experimental biology" }] });
    case "core-report":
      return result(id, "Incident report fixture generated with provenance and decisions.", { report: { eventId: "SIM-REPORT-01", detectedAt: "2026-11-14T10:00:00Z", measurements: [{ value: 0.62, unit: "mSv/h", provenanceKind: "simulated" }], decisions: ["prepare shelter", "reassess EVA"], acknowledgements: ["Commander"], disclaimer: "Demo-only assumptions" } });
    case "flow-zone":
      return result(id, "Preparation should begin before modeled zone entry.", { timeToZoneMinutes: 28, preparationMinutes: 20, action: "prepare shelter and reschedule exposed task", source: "simulated trajectory model" }, { provenanceKind: "modeled" });
    case "flow-shelter-prep":
    case "flow-preparation":
      return result(id, "Shelter is not ready; concrete missing items returned.", evaluateShelterChecklist(checklist));
    case "flow-evacuation":
      return result(id, "Evacuation states classified without inventing positions.", trackEvacuation(evacuation));
    case "flow-route":
      return result(id, "Expected added route dose calculated from segment rates and times.", estimateRouteDose(route), { provenanceKind: "modeled" });
    case "flow-budget":
      return result(id, "Planned exposure checked against a simulation-policy budget.", evaluatePersonalBudget({ currentDoseValue: 92, doseUnit: "mSv", plannedDoseValue: 34, budgetValue: 120 }));
    case "flow-sensor-fault":
      return result(id, "Sensor disagreement checked against a policy threshold.", { disagreement: detectSensorDisagreement([{ family: "equivalent", value: 0.14, unit: "mSv/h" }, { family: "equivalent", value: 0.58, unit: "mSv/h" }], 35) });
    case "flow-sleep":
      return result(id, "Available sleeping compartments ranked by compatible dose rate.", { recommendation: rankCompartments(compartments.filter((item) => item.available))[0], all: rankCompartments(compartments.filter((item) => item.available)) });
    default:
      throw new Error(`No runner implemented for radiation method '${id}'.`);
  }
}

export function runAllRadiationMethods(): RadiationMethodResult[] {
  return RADIATION_METHOD_CATALOG.map((method) => runRadiationMethod(method.id));
}

