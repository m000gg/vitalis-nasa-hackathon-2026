export type SimulationParameterValue = number | boolean | string;
export type SimulationSeverity = "NOMINAL" | "ELEVATED" | "CRITICAL";

export interface SimulationParameterDefinition {
  key: string;
  label: string;
  type: "number" | "boolean" | "select";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: SimulationParameterValue;
  options?: Array<{ label: string; value: string }>;
  help: string;
}

export interface RadiationSimulationDefinition {
  id: string;
  title: string;
  category: "acute" | "operations" | "quality" | "research";
  description: string;
  parameters: SimulationParameterDefinition[];
}

export interface RadiationSimulationMetric {
  label: string;
  value: number | string;
  unit?: string;
  tone: "neutral" | "good" | "warning" | "danger";
}

export interface RadiationSimulationResult {
  runId: string;
  scenarioId: string;
  title: string;
  severity: SimulationSeverity;
  provenanceKind: "simulated" | "modeled" | "experimental";
  summary: string;
  explanation: string;
  metrics: RadiationSimulationMetric[];
  actions: string[];
  protocol: Array<{ id: string; label: string; required: boolean }>;
  events: Array<{ offsetMinutes: number; label: string; kind: "info" | "warning" | "action" }>;
  chart: Array<{ label: string; value: number; unit: string }>;
  assignments?: Array<{ crewMember: string; shelter: string }>;
  parameters: Record<string, SimulationParameterValue>;
  limitations: string[];
  comparisonValue: number | null;
  comparisonUnit: string | null;
}

const n = (
  key: string,
  label: string,
  defaultValue: number,
  unit: string,
  min: number,
  max: number,
  step: number,
  help: string
): SimulationParameterDefinition => ({ key, label, type: "number", defaultValue, unit, min, max, step, help });

const b = (key: string, label: string, defaultValue: boolean, help: string): SimulationParameterDefinition => ({
  key,
  label,
  type: "boolean",
  defaultValue,
  help,
});

const s = (
  key: string,
  label: string,
  defaultValue: string,
  options: Array<{ label: string; value: string }>,
  help: string
): SimulationParameterDefinition => ({ key, label, type: "select", defaultValue, options, help });

const doseRate = n("doseRate", "Onboard dose rate", 0.62, "mSv/h", 0, 5, 0.01, "Simulated onboard equivalent dose-rate reading.");
const policyElevated = n("elevatedThreshold", "Demo-policy elevated threshold", 0.3, "mSv/h", 0.01, 5, 0.01, "Configurable simulation policy; not a universal NASA limit.");
const policyCritical = n("criticalThreshold", "Demo-policy critical threshold", 0.8, "mSv/h", 0.02, 10, 0.01, "Configurable simulation policy; not a universal NASA limit.");

export const RADIATION_SIMULATION_CATALOG: RadiationSimulationDefinition[] = [
  { id: "A", title: "Solar Storm During Sleep", category: "acute", description: "Dose-rate spike while the crew sleeps; tests acknowledgement escalation and shelter movement.", parameters: [doseRate, policyElevated, policyCritical, n("routeMinutes", "Time to shelter", 6, "min", 1, 60, 1, "Estimated accessible route duration."), n("ackWindow", "Captain acknowledgement window", 2, "min", 1, 30, 1, "Procedure-defined demo timeout."), n("shelterRateMultiplier", "Illustrative shelter rate multiplier", 0.42, "×", 0, 1, 0.01, "User-supplied toy-model assumption; not a validated universal shielding factor."), b("captainAcknowledged", "Captain acknowledged", false, "Toggle acknowledgement before escalation.")] },
  { id: "B", title: "Radiation Threat During EVA", category: "acute", description: "Models added exposure on an EVA return route and checks a configurable flight-rule budget.", parameters: [doseRate, n("returnMinutes", "EVA return time", 35, "min", 1, 180, 1, "Estimated return duration."), n("addedDoseLimit", "Demo-policy added-dose limit", 0.4, "mSv", 0.01, 10, 0.01, "Mission-specific simulation input."), b("sepContext", "SEP context active", true, "Event context is separate from onboard dose.")] },
  { id: "C", title: "Unequal Crew Exposure", category: "operations", description: "Compares two cumulative records and tests a task-rotation decision.", parameters: [n("higherDose", "Crew A dose", 42, "mSv", 0, 500, 1, "First simulated cumulative equivalent dose."), n("peerDose", "Crew B dose", 24, "mSv", 0, 500, 1, "Second simulated cumulative equivalent dose."), n("differenceThreshold", "Demo-policy difference threshold", 12, "mSv", 0, 200, 1, "Configurable task-review threshold.")] },
  { id: "D", title: "Shield Integrity Failure", category: "quality", description: "Checks neighboring detectors before treating a suspected hull event as confirmed radiation leakage.", parameters: [n("sensorA", "Compartment sensor A", 0.14, "mSv/h", 0, 5, 0.01, "First simulated detector."), n("sensorB", "Compartment sensor B", 0.58, "mSv/h", 0, 5, 0.01, "Second simulated detector."), n("spreadThreshold", "Allowed relative spread", 35, "%", 1, 300, 1, "Mission-policy data-quality threshold.")] },
  { id: "E", title: "Approaching Radiation Belt", category: "operations", description: "Compares predicted zone entry with required shelter-preparation time.", parameters: [n("timeToZone", "Time to zone entry", 28, "min", 0, 240, 1, "Trajectory-model estimate."), n("preparationMinutes", "Preparation time", 20, "min", 1, 120, 1, "Time needed by the configured checklist."), b("vulnerableTaskActive", "Vulnerable task active", true, "Marks a task requiring rescheduling review.")] },
  { id: "F", title: "Sensor Disagreement / False Alarm", category: "quality", description: "Separates sensor uncertainty from a confirmed hazard and requests cross-checks.", parameters: [n("sensorA", "Sensor A", 0.18, "mSv/h", 0, 5, 0.01, "First detector."), n("sensorB", "Sensor B", 0.21, "mSv/h", 0, 5, 0.01, "Second detector."), n("spreadThreshold", "Allowed relative spread", 25, "%", 1, 300, 1, "Policy-defined disagreement threshold."), b("sensorBHealthy", "Sensor B telemetry healthy", true, "Device health flag.")] },
  { id: "G", title: "Communication Blackout", category: "operations", description: "Demonstrates local monitoring, queued reporting and onboard-only procedures.", parameters: [b("earthLinkOnline", "Earth link online", false, "Controls live versus offline response."), n("queuedMessages", "Already queued reports", 3, "messages", 0, 50, 1, "Current DTN queue size."), doseRate, policyElevated] },
  { id: "H", title: "Higher-Exposure Sleeping Compartment", category: "operations", description: "Compares sleeping locations using observed compartment readings.", parameters: [n("currentRate", "Current sleeping area", 0.22, "mSv/h", 0, 5, 0.01, "Observed dose rate."), n("alternateRate", "Alternative area", 0.09, "mSv/h", 0, 5, 0.01, "Observed alternative rate."), n("sleepHours", "Sleep duration", 8, "h", 1, 16, 0.5, "Planned sleep duration."), b("alternateAvailable", "Alternative available", true, "Operational availability flag.")] },
  { id: "I", title: "Protective Cargo Removed", category: "operations", description: "Compares before/after measurements without inventing a universal shielding factor.", parameters: [n("beforeRate", "Before cargo removal", 0.12, "mSv/h", 0, 5, 0.01, "Observed baseline rate."), n("afterRate", "After cargo removal", 0.2, "mSv/h", 0, 5, 0.01, "Observed rate after layout change."), n("measurementUncertainty", "Measurement uncertainty", 10, "%", 0, 100, 1, "Combined observation uncertainty.")] },
  { id: "J", title: "Mars Surface Spike / Remote Astronaut", category: "acute", description: "Compares shelter-at-rover and return-to-base added dose using travel time.", parameters: [doseRate, n("roverShelterRate", "Rover shelter rate", 0.24, "mSv/h", 0, 5, 0.01, "Simulated rover reading."), n("baseShelterRate", "Base shelter rate", 0.08, "mSv/h", 0, 5, 0.01, "Simulated base reading."), n("returnMinutes", "Return-to-base travel", 45, "min", 1, 240, 1, "Estimated route time."), n("eventHours", "Expected event duration", 3, "h", 0.5, 24, 0.5, "Scenario duration assumption."), b("routeAccessible", "Return route verified accessible", true, "Operational route-feasibility input; false prevents a return recommendation.")] },
  { id: "K", title: "Medical Emergency During Storm", category: "acute", description: "Displays the radiation/medical trade-off without replacing medical triage.", parameters: [doseRate, n("medicalDelayLimit", "Medical protocol delay limit", 8, "min", 1, 60, 1, "Approved-protocol simulation input."), n("saferRoomTravel", "Travel to lower-rate room", 12, "min", 1, 120, 1, "Accessible travel time."), s("patientStability", "Patient stability", "unstable", [{ label: "Stable", value: "stable" }, { label: "Unstable", value: "unstable" }], "Medical state label supplied by an authorized workflow.")] },
  { id: "L", title: "Shelter Capacity Exceeded", category: "operations", description: "Checks total ready capacity and refuses an over-capacity arrangement.", parameters: [n("crewCount", "Crew requiring shelter", 6, "people", 1, 20, 1, "Crew count."), n("primaryCapacity", "Primary shelter capacity", 4, "people", 0, 20, 1, "Ready capacity."), n("secondaryCapacity", "Secondary shelter capacity", 1, "people", 0, 20, 1, "Ready secondary capacity."), b("secondaryReady", "Secondary shelter ready", true, "Checklist readiness flag.")] },
  { id: "M", title: "Nuclear Source / Reactor Anomaly", category: "acute", description: "Flags a localized source pattern only when a mission-specific source procedure exists.", parameters: [n("localRate", "Local compartment rate", 1.1, "mSv/h", 0, 20, 0.01, "Local simulated detector."), n("neighborRate", "Neighbor compartment rate", 0.16, "mSv/h", 0, 20, 0.01, "Neighbor detector."), b("sourceProcedureLoaded", "Mission source procedure loaded", true, "Required before operational guidance.")] },
  { id: "N", title: "Mission Extension", category: "operations", description: "Recalculates a constant-rate end-of-mission forecast after a new return date.", parameters: [n("currentDose", "Current cumulative dose", 52, "mSv", 0, 1000, 1, "Current compatible cumulative dose."), doseRate, n("originalHours", "Original remaining time", 240, "h", 0, 10000, 1, "Original mission plan."), n("extendedHours", "Extended remaining time", 720, "h", 0, 20000, 1, "Revised mission plan."), n("uncertainty", "Forecast uncertainty", 20, "%", 0, 100, 1, "Modeled added-dose uncertainty.")] },
  { id: "O", title: "Secondary Radiation Surprise", category: "research", description: "Demonstrates why lower primary flux can coexist with increased modeled secondary radiation.", parameters: [n("primaryBefore", "Primary component before", 100, "relative", 0, 1000, 1, "Transport-model component."), n("primaryAfter", "Primary component after", 70, "relative", 0, 1000, 1, "Post-change primary component."), n("secondaryBefore", "Secondary component before", 20, "relative", 0, 1000, 1, "Transport-model component."), n("secondaryAfter", "Secondary component after", 58, "relative", 0, 1000, 1, "Post-change secondary component.")] },
  { id: "P", title: "Forbush Decrease Misinterpretation", category: "quality", description: "Prevents a GCR decrease from being treated as proof that an SEP context is harmless.", parameters: [n("gcrChange", "Observed GCR change", -18, "%", -100, 100, 1, "Contextual change in GCR measurement."), b("sepContext", "SEP context active", true, "Independent space-weather context."), doseRate, policyElevated] },
  { id: "Q", title: "Missing Data Reconstruction", category: "quality", description: "Produces an estimated interval and visible gap marker without inventing a measured sample.", parameters: [n("previousValue", "Previous valid sample", 0.14, "mSv/h", 0, 5, 0.01, "Last valid measurement."), n("nextValue", "Next valid sample", 0.32, "mSv/h", 0, 5, 0.01, "Next valid measurement."), n("gapMinutes", "Telemetry gap", 45, "min", 1, 1440, 1, "Missing interval duration."), n("uncertainty", "Additional uncertainty", 20, "%", 0, 200, 1, "Displayed estimate uncertainty.")] },
  { id: "R", title: "Combined Emergency", category: "acute", description: "Presents radiation and life-support trade-offs using an explicit priority input.", parameters: [doseRate, policyCritical, s("lifeSupportState", "Life-support state", "critical", [{ label: "Nominal", value: "nominal" }, { label: "Degraded", value: "degraded" }, { label: "Critical", value: "critical" }], "Status from another hazard workflow."), n("shelterOxygenMinutes", "Shelter oxygen reserve", 35, "min", 0, 240, 1, "Available reserve estimate.")] },
  { id: "S", title: "BioShield Controlled Trial", category: "research", description: "Compares treatment/control observations while explicitly refusing a crew-protection claim.", parameters: [n("controlMean", "Control mean reading", 100, "relative", 0.01, 10000, 1, "Paired control observation."), n("treatmentMean", "Treatment mean reading", 95, "relative", 0, 10000, 1, "Experimental treatment observation."), n("uncertainty", "Experimental uncertainty", 8, "%", 0, 100, 1, "Study uncertainty."), n("growthPercent", "Culture growth change", 12, "%", -100, 500, 1, "Experimental growth observation.")] },
];

export function getRadiationSimulationDefinition(id: string) {
  return RADIATION_SIMULATION_CATALOG.find((scenario) => scenario.id === id.toUpperCase());
}

export function defaultSimulationParameters(definition: RadiationSimulationDefinition) {
  return Object.fromEntries(definition.parameters.map((parameter) => [parameter.key, parameter.defaultValue]));
}

function normalizeParameters(
  definition: RadiationSimulationDefinition,
  input: Record<string, unknown> | undefined
): Record<string, SimulationParameterValue> {
  const output: Record<string, SimulationParameterValue> = {};
  for (const parameter of definition.parameters) {
    const supplied = input !== undefined && Object.prototype.hasOwnProperty.call(input, parameter.key);
    const raw = supplied ? input[parameter.key] : parameter.defaultValue;
    if (parameter.type === "number") {
      const value = typeof raw === "number" ? raw : Number.NaN;
      if (!Number.isFinite(value)) throw new Error(`${parameter.label} must be a finite number.`);
      if (parameter.min !== undefined && value < parameter.min) throw new Error(`${parameter.label} must be at least ${parameter.min}.`);
      if (parameter.max !== undefined && value > parameter.max) throw new Error(`${parameter.label} must not exceed ${parameter.max}.`);
      output[parameter.key] = value;
    } else if (parameter.type === "boolean") {
      if (typeof raw !== "boolean") throw new Error(`${parameter.label} must be true or false.`);
      output[parameter.key] = raw;
    } else {
      if (typeof raw !== "string" || !parameter.options?.some((option) => option.value === raw)) {
        throw new Error(`${parameter.label} has an unsupported option.`);
      }
      output[parameter.key] = raw;
    }
  }
  return output;
}

const numberValue = (values: Record<string, SimulationParameterValue>, key: string) => values[key] as number;
const booleanValue = (values: Record<string, SimulationParameterValue>, key: string) => values[key] as boolean;
const stringValue = (values: Record<string, SimulationParameterValue>, key: string) => values[key] as string;
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const metric = (label: string, value: number | string, unit: string | undefined, tone: RadiationSimulationMetric["tone"]): RadiationSimulationMetric => ({ label, value, unit, tone });

function severityFromRate(rate: number, elevated: number, critical: number): SimulationSeverity {
  if (rate >= critical) return "CRITICAL";
  if (rate >= elevated) return "ELEVATED";
  return "NOMINAL";
}

function resultBase(definition: RadiationSimulationDefinition, values: Record<string, SimulationParameterValue>) {
  return {
    runId: `SIM-${definition.id}-${Object.values(values).map((value) => String(value).replace(/\W/g, "")).join("-").slice(0, 48)}`,
    scenarioId: definition.id,
    title: definition.title,
    provenanceKind: definition.category === "research" ? "experimental" as const : "simulated" as const,
    parameters: values,
    limitations: [
      "Demo Mode uses deterministic scenario inputs and is not live astronaut telemetry.",
      "All policy thresholds are configurable mission inputs, not universal NASA medical limits.",
    ],
  };
}

export function runRadiationSimulation(input: {
  scenarioId: string;
  parameters?: Record<string, unknown>;
}): RadiationSimulationResult {
  const definition = getRadiationSimulationDefinition(input.scenarioId);
  if (!definition) throw new Error(`Unknown radiation scenario '${input.scenarioId}'.`);
  const p = normalizeParameters(definition, input.parameters);
  const base = resultBase(definition, p);
  const rate = typeof p.doseRate === "number" ? numberValue(p, "doseRate") : 0;
  const elevated = typeof p.elevatedThreshold === "number" ? numberValue(p, "elevatedThreshold") : 0.3;
  const critical = typeof p.criticalThreshold === "number" ? numberValue(p, "criticalThreshold") : 0.8;

  if (typeof p.elevatedThreshold === "number" && typeof p.criticalThreshold === "number" && critical <= elevated) {
    throw new Error("Demo-policy critical threshold must be greater than the elevated threshold.");
  }
  if (definition.id === "N" && numberValue(p, "extendedHours") < numberValue(p, "originalHours")) {
    throw new Error("Extended remaining time must be greater than or equal to original remaining time.");
  }

  switch (definition.id) {
    case "A": {
      const routeMinutes = numberValue(p, "routeMinutes");
      const addedDose = rate * routeMinutes / 60;
      const acknowledged = booleanValue(p, "captainAcknowledged");
      const severity = severityFromRate(rate, elevated, critical);
      const hazardActive = severity !== "NOMINAL";
      const events: RadiationSimulationResult["events"] = [
        { offsetMinutes: 0, label: hazardActive ? "Elevated onboard rate detected" : "Onboard rate evaluated below alert threshold", kind: hazardActive ? "warning" : "info" },
      ];
      if (hazardActive) {
        events.push(
          { offsetMinutes: numberValue(p, "ackWindow"), label: acknowledged ? "Captain acknowledgement recorded" : "Local escalation window expired", kind: "action" },
          { offsetMinutes: routeMinutes, label: "Expected shelter arrival", kind: "info" }
        );
      }
      events.sort((left, right) => left.offsetMinutes - right.offsetMinutes);
      const shelterMultiplier = numberValue(p, "shelterRateMultiplier");
      const summary = !hazardActive
        ? "Onboard rate remains below the configured elevated threshold; acknowledgement escalation is not active."
        : acknowledged
          ? "Captain acknowledged the simulated elevated-rate event."
          : "Captain timeout triggers pre-authorized local escalation.";
      return {
        ...base,
        severity,
        summary,
        explanation: `The onboard rate is ${rate} mSv/h. DONKI/event context is not converted into crew dose. The estimated route adds ${round(addedDose)} mSv.`,
        metrics: [
          metric("Dose rate", rate, "mSv/h", severity === "CRITICAL" ? "danger" : severity === "ELEVATED" ? "warning" : "good"),
          metric("Route added dose", round(addedDose), "mSv", hazardActive ? "warning" : "neutral"),
          metric("Acknowledgement", !hazardActive ? "not required" : acknowledged ? "received" : "overdue", undefined, !hazardActive || acknowledged ? "good" : "danger"),
        ],
        actions: hazardActive
          ? ["Move through the approved route to the designated storm shelter.", acknowledged ? "Continue crew accountability." : "Activate crew notification and route lights."]
          : ["Continue onboard monitoring."],
        protocol: [
          { id: "ack", label: "Record captain/crew acknowledgement", required: hazardActive },
          { id: "wake", label: "Wake and account for all crew", required: hazardActive },
          { id: "route", label: "Follow the approved shelter route", required: hazardActive },
          { id: "verify", label: "Compare inside/outside dosimeters", required: hazardActive },
        ],
        events: events.sort((a, b) => a.offsetMinutes - b.offsetMinutes),
        chart: [
          { label: "Elevated threshold", value: elevated, unit: "mSv/h" },
          { label: "Detected", value: rate, unit: "mSv/h" },
          { label: "Illustrative shelter model", value: rate * shelterMultiplier, unit: "mSv/h" },
        ],
        comparisonValue: addedDose,
        comparisonUnit: "mSv",
      };
    }
    case "B": {
      const minutes = numberValue(p, "returnMinutes");
      const added = rate * minutes / 60;
      const limit = numberValue(p, "addedDoseLimit");
      const elevatedRisk = booleanValue(p, "sepContext") || added >= limit;
      return { ...base, severity: added >= limit ? "CRITICAL" : elevatedRisk ? "ELEVATED" : "NOMINAL", summary: elevatedRisk ? "EVA return/abort flight rule requires reassessment." : "Continue monitoring under the active flight rule.", explanation: `At the supplied rate and return duration, modeled added dose is ${round(added)} mSv versus the configurable ${limit} mSv policy input.`, metrics: [metric("Return time", minutes, "min", "neutral"), metric("Added dose", round(added), "mSv", added >= limit ? "danger" : "warning"), metric("Policy input", limit, "mSv", "neutral")], actions: ["Apply the approved EVA return/abort flight rule.", "Keep local dosimetry active and confirm airlock arrival."], protocol: [{ id: "notify", label: "Notify EVA crew and mission lead", required: true }, { id: "route", label: "Confirm accessible return route", required: true }, { id: "airlock", label: "Record airlock arrival and dosimeter value", required: true }], events: [{ offsetMinutes: 0, label: "SEP context and onboard rate reviewed", kind: "warning" }, { offsetMinutes: minutes, label: "Modeled airlock arrival", kind: "action" }], chart: [{ label: "Current", value: 0, unit: "mSv" }, { label: "Return", value: round(added), unit: "mSv" }, { label: "Policy", value: limit, unit: "mSv" }], comparisonValue: added, comparisonUnit: "mSv" };
    }
    case "C": {
      const crewA = numberValue(p, "higherDose"); const crewB = numberValue(p, "peerDose"); const difference = Math.abs(crewA - crewB); const threshold = numberValue(p, "differenceThreshold"); const flagged = difference >= threshold; const higherCrew = crewA === crewB ? "Neither crew record" : crewA > crewB ? "Crew A" : "Crew B";
      return { ...base, severity: flagged ? "ELEVATED" : "NOMINAL", summary: flagged ? `${higherCrew} has the higher record; task-rotation review is recommended.` : "Crew difference remains below the configured review threshold.", explanation: `Compatible cumulative records differ by ${round(difference)} mSv. This explains exposure distribution; it does not calculate disease risk.`, metrics: [metric("Crew A exposure", crewA, "mSv", flagged && crewA > crewB ? "warning" : "neutral"), metric("Crew B exposure", crewB, "mSv", flagged && crewB > crewA ? "warning" : "neutral"), metric("Absolute difference", round(difference), "mSv", flagged ? "warning" : "good")], actions: flagged ? ["Review the higher-exposure crew member's task assignments.", "Model a lower-exposure rotation against mission constraints."] : ["Continue compatible personal-dose monitoring."], protocol: [{ id: "verify", label: "Verify dosimeter provenance and units", required: true }, { id: "tasks", label: "Review activity/location history", required: true }, { id: "decision", label: "Record task-rotation decision", required: flagged }], events: [{ offsetMinutes: 0, label: "Crew comparison recalculated", kind: "info" }, { offsetMinutes: 1, label: flagged ? "Difference threshold reached" : "No policy conflict", kind: flagged ? "warning" : "info" }], chart: [{ label: "Crew A", value: crewA, unit: "mSv" }, { label: "Crew B", value: crewB, unit: "mSv" }, { label: "Review delta", value: threshold, unit: "mSv" }], comparisonValue: difference, comparisonUnit: "mSv" };
    }
    case "D":
    case "F": {
      const a = numberValue(p, "sensorA"); const bv = numberValue(p, "sensorB"); const median = (a + bv) / 2; const spread = median === 0 ? 0 : Math.abs(a - bv) / median * 100; const threshold = numberValue(p, "spreadThreshold"); const healthy = definition.id === "F" ? booleanValue(p, "sensorBHealthy") : true; const fault = spread > threshold || !healthy;
      return { ...base, severity: fault ? "ELEVATED" : "NOMINAL", summary: fault ? "Detector cross-check required; hazard is not silently dismissed." : "Sensors agree within the configured quality threshold.", explanation: `Relative detector spread is ${round(spread, 1)}% versus ${threshold}%. Disagreement alone is not proof of shield failure.`, metrics: [metric("Sensor A", a, "mSv/h", "neutral"), metric("Sensor B", bv, "mSv/h", healthy ? "neutral" : "danger"), metric("Relative spread", round(spread, 1), "%", fault ? "warning" : "good")], actions: fault ? ["Cross-check a neighboring independent detector.", "Restrict the suspect compartment only under approved procedure."] : ["Continue multi-sensor monitoring."], protocol: [{ id: "health", label: "Verify detector health/calibration flag", required: true }, { id: "crosscheck", label: "Cross-check an independent compartment sensor", required: fault }, { id: "record", label: "Record confidence and decision", required: true }], events: [{ offsetMinutes: 0, label: "Sensor pair compared", kind: "info" }, { offsetMinutes: 1, label: fault ? "Quality threshold exceeded" : "Readings consistent", kind: fault ? "warning" : "info" }], chart: [{ label: "Sensor A", value: a, unit: "mSv/h" }, { label: "Sensor B", value: bv, unit: "mSv/h" }, { label: "Pair mean", value: median, unit: "mSv/h" }], comparisonValue: spread, comparisonUnit: "%" };
    }
    case "E": {
      const time = numberValue(p, "timeToZone"); const prep = numberValue(p, "preparationMinutes"); const margin = time - prep; const urgent = margin <= 5; const task = booleanValue(p, "vulnerableTaskActive");
      return { ...base, severity: urgent ? "CRITICAL" : task ? "ELEVATED" : "NOMINAL", summary: urgent ? "Preparation margin is insufficient." : "Preparation can begin before modeled zone entry.", explanation: `Modeled entry is ${time} minutes away and preparation requires ${prep} minutes, leaving ${margin} minutes of margin.`, metrics: [metric("Time to zone", time, "min", urgent ? "danger" : "warning"), metric("Preparation", prep, "min", "neutral"), metric("Margin", margin, "min", urgent ? "danger" : "good")], actions: ["Begin the approved preparation checklist.", task ? "Review/reschedule the exposed task." : "Maintain the planned task schedule."], protocol: [{ id: "trajectory", label: "Verify trajectory-model provenance", required: true }, { id: "prepare", label: "Start shelter preparation", required: true }, { id: "tasks", label: "Review vulnerable tasks", required: task }], events: [{ offsetMinutes: 0, label: "Zone-entry prediction updated", kind: "info" }, { offsetMinutes: Math.max(0, margin), label: "Latest preparation start", kind: "action" }, { offsetMinutes: time, label: "Modeled zone entry", kind: "warning" }], chart: [{ label: "Now", value: 0, unit: "min" }, { label: "Latest prep", value: Math.max(0, margin), unit: "min" }, { label: "Zone entry", value: time, unit: "min" }], comparisonValue: margin, comparisonUnit: "min" };
    }
    case "G": {
      const online = booleanValue(p, "earthLinkOnline"); const queued = numberValue(p, "queuedMessages"); const severity = severityFromRate(rate, elevated, critical);
      return { ...base, severity, summary: online ? "Earth link available; local monitoring remains primary." : "Offline mode: local procedures active and reports queued for DTN sync.", explanation: `Radiation evaluation remains onboard. Link state changes reporting, not the measured dose or mission policy.`, metrics: [metric("Earth link", online ? "online" : "offline", undefined, online ? "good" : "warning"), metric("Queued reports", queued + (online ? 0 : 1), "messages", "neutral"), metric("Dose rate", rate, "mSv/h", severity === "NOMINAL" ? "good" : "warning")], actions: online ? ["Transmit the signed event report."] : ["Follow local flight rules.", "Queue the event report for later DTN sync."], protocol: [{ id: "local", label: "Confirm local monitoring active", required: true }, { id: "queue", label: "Queue event/audit report", required: !online }, { id: "sync", label: "Sync when link returns", required: !online }], events: [{ offsetMinutes: 0, label: online ? "Link verified" : "Link loss detected", kind: online ? "info" : "warning" }, { offsetMinutes: 1, label: online ? "Report sent" : "Report queued locally", kind: "action" }], chart: [{ label: "Existing queue", value: queued, unit: "messages" }, { label: "After event", value: queued + (online ? 0 : 1), unit: "messages" }], comparisonValue: queued + (online ? 0 : 1), comparisonUnit: "messages" };
    }
    case "H": {
      const current = numberValue(p, "currentRate"); const alternate = numberValue(p, "alternateRate"); const hours = numberValue(p, "sleepHours"); const available = booleanValue(p, "alternateAvailable"); const saving = (current - alternate) * hours; const useful = available && saving > 0;
      return { ...base, severity: current > alternate ? "ELEVATED" : "NOMINAL", summary: useful ? "A lower-exposure available sleeping area was identified." : "No feasible lower-exposure relocation is available.", explanation: `Over ${hours} hours, the modeled difference is ${round(saving)} mSv using observed compartment rates.`, metrics: [metric("Current area", current, "mSv/h", useful ? "warning" : "neutral"), metric("Alternative", alternate, "mSv/h", useful ? "good" : "neutral"), metric("Modeled difference", round(saving), "mSv", useful ? "good" : "neutral")], actions: useful ? ["Review relocation to the available lower-rate sleeping area.", "Confirm occupancy and operational constraints."] : ["Continue monitoring and review compartment availability."], protocol: [{ id: "verify", label: "Verify both sensor readings", required: true }, { id: "availability", label: "Confirm bed/operational availability", required: useful }, { id: "record", label: "Record sleeping-location decision", required: true }], events: [{ offsetMinutes: 0, label: "Sleeping-area comparison run", kind: "info" }, { offsetMinutes: 1, label: useful ? "Alternative recommended for review" : "No feasible change", kind: "action" }], chart: [{ label: "Current", value: current * hours, unit: "mSv" }, { label: "Alternative", value: alternate * hours, unit: "mSv" }], comparisonValue: saving, comparisonUnit: "mSv" };
    }
    case "I": {
      const before = numberValue(p, "beforeRate"); const after = numberValue(p, "afterRate"); const uncertainty = numberValue(p, "measurementUncertainty"); const absoluteChange = after - before; const percentChange = before === 0 ? null : absoluteChange / before * 100; const meaningful = before === 0 ? after > 0 : percentChange !== null && percentChange > uncertainty;
      return { ...base, severity: meaningful ? "ELEVATED" : "NOMINAL", summary: meaningful ? "Observed increase requires layout review and an independent detector cross-check." : "Observed change is not larger than the supplied uncertainty input.", explanation: percentChange === null ? `A percentage change is undefined for a zero baseline. The absolute increase is ${round(absoluteChange)} mSv/h.` : `The observed rate changed by ${round(percentChange, 1)}%. This is evidence for reassessment, not a universal shielding coefficient.`, metrics: [metric("Before", before, "mSv/h", "neutral"), metric("After", after, "mSv/h", meaningful ? "warning" : "neutral"), metric("Observed change", percentChange === null ? `+${round(absoluteChange)} mSv/h (zero baseline)` : round(percentChange, 1), percentChange === null ? undefined : "%", meaningful ? "warning" : "good")], actions: meaningful ? ["Restore/review the approved cargo configuration.", "Repeat measurements with an independent detector."] : ["Continue paired measurements before changing operations."], protocol: [{ id: "layout", label: "Verify cargo/layout change", required: true }, { id: "crosscheck", label: "Repeat paired measurement", required: true }, { id: "decision", label: "Record configuration decision", required: meaningful }], events: [{ offsetMinutes: 0, label: "Before/after series compared", kind: "info" }, { offsetMinutes: 1, label: meaningful ? "Increase requires cross-check" : "Change remains uncertain", kind: meaningful ? "warning" : "info" }], chart: [{ label: "Before", value: before, unit: "mSv/h" }, { label: "After", value: after, unit: "mSv/h" }], comparisonValue: percentChange === null ? absoluteChange : percentChange, comparisonUnit: percentChange === null ? "mSv/h" : "%" };
    }
    case "J": {
      const rover = numberValue(p, "roverShelterRate"); const baseRate = numberValue(p, "baseShelterRate"); const travel = numberValue(p, "returnMinutes"); const duration = numberValue(p, "eventHours"); const routeAccessible = booleanValue(p, "routeAccessible"); const routeFitsEvent = travel / 60 < duration; const returnFeasible = routeAccessible && routeFitsEvent; const remainDose = rover * duration; const returnDose = returnFeasible ? rate * travel / 60 + baseRate * (duration - travel / 60) : null; const returnPreferred = returnDose !== null && returnDose < remainDose;
      const events: RadiationSimulationResult["events"] = [
        { offsetMinutes: 0, label: "Surface spike detected", kind: "warning" },
        { offsetMinutes: 1, label: "Shelter feasibility and dose compared", kind: "info" },
        { offsetMinutes: returnPreferred ? travel : 2, label: returnPreferred ? "Modeled base arrival" : "Rover shelter confirmed", kind: "action" },
      ];
      const chart: RadiationSimulationResult["chart"] = [
        { label: "Rover shelter", value: remainDose, unit: "mSv" },
      ];
      if (returnDose !== null) chart.push({ label: "Return/base", value: returnDose, unit: "mSv" });
      return { ...base, severity: severityFromRate(rate, 0.3, 0.8), summary: returnPreferred ? "Return-to-base has lower modeled added dose and the route is marked feasible." : !returnFeasible ? "Return-to-base is not a feasible modeled option; use the rover shelter procedure." : "Shelter-at-rover has lower modeled added dose.", explanation: returnDose === null ? `Rover shelter model: ${round(remainDose)} mSv. The return option is excluded because the route is unavailable or travel exceeds the event-duration assumption.` : `Rover shelter model: ${round(remainDose)} mSv; return/base model: ${round(returnDose)} mSv.`, metrics: [metric("Rover option", round(remainDose), "mSv", returnPreferred ? "warning" : "good"), metric("Return/base option", returnDose === null ? "not feasible" : round(returnDose), returnDose === null ? undefined : "mSv", returnPreferred ? "good" : "warning"), metric("Route feasible", returnFeasible ? "yes" : "no", undefined, returnFeasible ? "good" : "danger")], actions: [returnPreferred ? "Use the verified return-to-base route." : "Use the rover shelter procedure.", "Maintain position and dosimeter accountability."], protocol: [{ id: "comms", label: "Confirm local crew contact", required: true }, { id: "route", label: "Verify route/accessibility", required: true }, { id: "decision", label: "Record selected shelter decision", required: true }], events: events.sort((a, b) => a.offsetMinutes - b.offsetMinutes), chart, comparisonValue: returnPreferred && returnDose !== null ? returnDose : remainDose, comparisonUnit: "mSv" };
    }
    case "K": {
      const stability = stringValue(p, "patientStability"); const delay = numberValue(p, "medicalDelayLimit"); const travel = numberValue(p, "saferRoomTravel"); const medicalFirst = stability === "unstable" && travel > delay;
      return { ...base, severity: "CRITICAL", summary: medicalFirst ? "Medical protocol has priority; do not delay stabilization for relocation." : "A lower-rate room can be considered within the supplied medical delay constraint.", explanation: "The system exposes the trade-off but does not perform clinical triage or prescribe treatment.", metrics: [metric("Patient", stability, undefined, stability === "unstable" ? "danger" : "warning"), metric("Allowed delay", delay, "min", "neutral"), metric("Safer-room travel", travel, "min", travel > delay ? "danger" : "good")], actions: medicalFirst ? ["Follow the approved emergency medical protocol in place.", "Reduce radiation exposure only where it does not delay stabilization."] : ["Follow the medical protocol while reviewing the lower-rate room.", "Confirm equipment and route accessibility."], protocol: [{ id: "medical", label: "Activate approved medical protocol", required: true }, { id: "radiation", label: "Record local radiation context", required: true }, { id: "move", label: "Move only after medical/route approval", required: !medicalFirst }], events: [{ offsetMinutes: 0, label: "Combined medical/radiation event", kind: "warning" }, { offsetMinutes: 1, label: medicalFirst ? "Medical stabilization prioritized" : "Relocation reviewed", kind: "action" }], chart: [{ label: "Medical delay", value: delay, unit: "min" }, { label: "Room travel", value: travel, unit: "min" }], comparisonValue: travel - delay, comparisonUnit: "min" };
    }
    case "L": {
      const crew = numberValue(p, "crewCount"); const primary = numberValue(p, "primaryCapacity"); const secondary = booleanValue(p, "secondaryReady") ? numberValue(p, "secondaryCapacity") : 0;
      if (![crew, primary, secondary].every(Number.isInteger)) throw new Error("Crew and shelter capacities must be whole numbers.");
      const capacity = primary + secondary; const missing = Math.max(0, crew - capacity); const assignments = Array.from({ length: crew }, (_, index) => ({ crewMember: `Crew ${index + 1}`, shelter: index < primary ? "Primary shelter" : index < capacity ? "Secondary shelter" : "UNASSIGNED" })); const primaryAssigned = assignments.filter((item) => item.shelter === "Primary shelter").length; const secondaryAssigned = assignments.filter((item) => item.shelter === "Secondary shelter").length;
      return { ...base, severity: missing > 0 ? "CRITICAL" : "NOMINAL", summary: missing > 0 ? `No valid allocation: ${missing} crew member(s) exceed ready capacity.` : `${primaryAssigned} crew assigned to the primary shelter and ${secondaryAssigned} to the secondary shelter.`, explanation: "The deterministic allocator fills the ready primary shelter first, then the ready secondary shelter, and visibly leaves overflow unassigned.", metrics: [metric("Crew", crew, "people", "neutral"), metric("Primary assigned", primaryAssigned, "people", "good"), metric("Secondary assigned", secondaryAssigned, "people", "good"), metric("Unassigned", missing, "people", missing ? "danger" : "good")], actions: missing > 0 ? ["Prepare an additional approved shelter compartment.", "Recalculate allocation before movement."] : ["Confirm the generated crew-to-shelter assignment."], protocol: [{ id: "capacity", label: "Verify ready capacities", required: true }, { id: "allocate", label: "Confirm every crew assignment", required: true }, { id: "refuse", label: "Refuse over-capacity configuration", required: missing > 0 }], events: [{ offsetMinutes: 0, label: "Capacity model evaluated", kind: "info" }, { offsetMinutes: 1, label: missing > 0 ? "Invalid allocation rejected" : "Crew allocation generated", kind: missing > 0 ? "warning" : "action" }], chart: [{ label: "Crew", value: crew, unit: "people" }, { label: "Primary", value: primaryAssigned, unit: "people" }, { label: "Secondary", value: secondaryAssigned, unit: "people" }], assignments, comparisonValue: capacity - crew, comparisonUnit: "people" };
    }
    case "M": {
      const local = numberValue(p, "localRate"); const neighbor = numberValue(p, "neighborRate"); const procedure = booleanValue(p, "sourceProcedureLoaded"); const hasSignal = local > 0 || neighbor > 0; const localized = local > 0 && (neighbor === 0 || local / neighbor >= 3); const procedureBlocked = localized && !procedure; const severity: SimulationSeverity = localized ? "CRITICAL" : procedureBlocked ? "ELEVATED" : "NOMINAL";
      return { ...base, severity, summary: !hasSignal ? "No localized detector signal is present." : procedureBlocked ? "Operational guidance blocked: mission-specific source procedure is missing." : localized ? "Localized source pattern requires the approved compartment restriction procedure." : "Detector pair does not show a localized source pattern.", explanation: !hasSignal ? "Both supplied readings are zero; no rate anomaly is inferred." : `Local/neighbor ratio is ${neighbor === 0 ? "unbounded" : round(local / neighbor, 1)}. The model does not infer source physics.`, metrics: [metric("Local", local, "mSv/h", localized ? "danger" : "neutral"), metric("Neighbor", neighbor, "mSv/h", "neutral"), metric("Procedure", procedure ? "loaded" : "missing", undefined, procedure ? "good" : localized ? "danger" : "neutral")], actions: localized ? procedure ? ["Apply the mission-specific localized-source procedure.", "Restrict access and verify independent detectors."] : ["Load/consult the approved source procedure.", "Do not improvise source-handling actions."] : ["Continue paired detector monitoring."], protocol: [{ id: "procedure", label: "Verify approved source procedure", required: localized }, { id: "restrict", label: "Apply approved compartment restriction", required: localized && procedure }, { id: "audit", label: "Record detector/source evidence", required: hasSignal }], events: [{ offsetMinutes: 0, label: localized ? "Localized rate anomaly detected" : "Detector pair evaluated", kind: localized ? "warning" : "info" }, { offsetMinutes: 1, label: localized ? procedure ? "Approved procedure available" : "Procedure guard activated" : "No localized anomaly", kind: localized ? "action" : "info" }], chart: [{ label: "Local", value: local, unit: "mSv/h" }, { label: "Neighbor", value: neighbor, unit: "mSv/h" }], comparisonValue: local - neighbor, comparisonUnit: "mSv/h" };
    }
    case "N": {
      const current = numberValue(p, "currentDose"); const originalHours = numberValue(p, "originalHours"); const extendedHours = numberValue(p, "extendedHours"); const uncertainty = numberValue(p, "uncertainty") / 100; const original = current + rate * originalHours; const extended = current + rate * extendedHours; const added = extended - original;
      return { ...base, severity: added > 0 ? "ELEVATED" : "NOMINAL", summary: added > 0 ? `Mission extension adds a modeled ${round(added)} mSv at a constant supplied rate.` : "The revised duration matches the original plan; no extension dose was added.", explanation: "The forecast holds the latest compatible rate constant and shows an uncertainty interval; it is not a clinical-risk prediction.", metrics: [metric("Original forecast", round(original), "mSv", "neutral"), metric("Extended forecast", round(extended), "mSv", added > 0 ? "warning" : "neutral"), metric("Extended interval", `${round(current + rate * extendedHours * (1 - uncertainty))}–${round(current + rate * extendedHours * (1 + uncertainty))}`, "mSv", "neutral")], actions: ["Review personal budgets and high-exposure tasks.", "Update the mission policy with the approved return date."], protocol: [{ id: "date", label: "Verify approved return-date change", required: true }, { id: "forecast", label: "Recalculate every crew forecast", required: true }, { id: "tasks", label: "Review exposure controls", required: true }], events: [{ offsetMinutes: 0, label: "Mission duration updated", kind: "info" }, { offsetMinutes: 1, label: "Crew forecasts recalculated", kind: "action" }], chart: [{ label: "Current", value: current, unit: "mSv" }, { label: "Original end", value: original, unit: "mSv" }, { label: "Extended end", value: extended, unit: "mSv" }], comparisonValue: added, comparisonUnit: "mSv added" };
    }
    case "O": {
      const pb = numberValue(p, "primaryBefore"); const pa = numberValue(p, "primaryAfter"); const sb = numberValue(p, "secondaryBefore"); const sa = numberValue(p, "secondaryAfter"); const totalBefore = pb + sb; const totalAfter = pa + sa; const worse = totalAfter > totalBefore;
      return { ...base, severity: worse ? "ELEVATED" : "NOMINAL", summary: worse ? "Total modeled component increased despite lower primary radiation." : "Total modeled component did not increase.", explanation: "Transport-model components must be reviewed together; heavier shielding is not automatically proportionally safer.", metrics: [metric("Total before", totalBefore, "relative", "neutral"), metric("Total after", totalAfter, "relative", worse ? "warning" : "good"), metric("Secondary change", sa - sb, "relative", sa > sb ? "warning" : "good")], actions: ["Review validated transport outputs by particle component.", "Do not approve the material change from primary flux alone."], protocol: [{ id: "model", label: "Verify transport-model provenance", required: true }, { id: "components", label: "Compare primary and secondary components", required: true }, { id: "decision", label: "Record material/configuration decision", required: true }], events: [{ offsetMinutes: 0, label: "Transport outputs loaded", kind: "info" }, { offsetMinutes: 1, label: worse ? "Secondary-radiation warning" : "No total increase", kind: worse ? "warning" : "info" }], chart: [{ label: "Before total", value: totalBefore, unit: "relative" }, { label: "After total", value: totalAfter, unit: "relative" }], comparisonValue: totalAfter - totalBefore, comparisonUnit: "relative" };
    }
    case "P": {
      const gcr = numberValue(p, "gcrChange"); const sep = booleanValue(p, "sepContext"); const severity = severityFromRate(rate, elevated, critical); const misleading = gcr < 0 && sep;
      return { ...base, severity: severity === "NOMINAL" && misleading ? "ELEVATED" : severity, summary: misleading ? "GCR decrease does not clear the independent SEP context." : "Context and onboard dosimetry remain evaluated separately.", explanation: "A Forbush decrease cannot be used as an automatic all-clear for solar particle exposure.", metrics: [metric("GCR change", gcr, "%", gcr < 0 ? "neutral" : "warning"), metric("SEP context", sep ? "active" : "inactive", undefined, sep ? "warning" : "good"), metric("Onboard rate", rate, "mSv/h", severity === "NOMINAL" ? "good" : "warning")], actions: sep ? ["Keep the SEP procedure active until approved all-clear criteria are met.", "Use onboard detectors for crew decisions."] : ["Continue onboard monitoring."], protocol: [{ id: "separate", label: "Keep GCR and SEP interpretations separate", required: true }, { id: "onboard", label: "Verify onboard rate/quality", required: true }, { id: "clear", label: "Apply approved all-clear rule", required: sep }], events: [{ offsetMinutes: 0, label: "GCR decrease observed", kind: "info" }, { offsetMinutes: 1, label: sep ? "Misinterpretation guard activated" : "No active SEP context", kind: sep ? "warning" : "info" }], chart: [{ label: "GCR change", value: gcr, unit: "%" }, { label: "Onboard rate ×100", value: rate * 100, unit: "scaled" }], comparisonValue: rate, comparisonUnit: "mSv/h" };
    }
    case "Q": {
      const previous = numberValue(p, "previousValue"); const next = numberValue(p, "nextValue"); const gap = numberValue(p, "gapMinutes"); const uncertainty = numberValue(p, "uncertainty") / 100; const estimate = (previous + next) / 2; const spread = Math.abs(next - previous) / 2 + estimate * uncertainty; const lower = Math.max(0, estimate - spread); const upper = estimate + spread;
      return { ...base, severity: gap >= 60 ? "ELEVATED" : "NOMINAL", summary: `Gap represented as an estimated ${round(lower)}–${round(upper)} mSv/h interval.`, explanation: "No synthetic point is inserted into measured history; the interval stays visibly modeled.", metrics: [metric("Gap", gap, "min", gap >= 60 ? "warning" : "neutral"), metric("Estimate", round(estimate), "mSv/h", "neutral"), metric("Interval", `${round(lower)}–${round(upper)}`, "mSv/h", "warning")], actions: ["Restore/cross-check telemetry.", "Keep the gap visible in forecasts and reports."], protocol: [{ id: "mark", label: "Mark the missing interval", required: true }, { id: "estimate", label: "Label the estimate as modeled", required: true }, { id: "restore", label: "Attempt independent sensor recovery", required: true }], events: [{ offsetMinutes: 0, label: "Last valid sample", kind: "info" }, { offsetMinutes: gap / 2, label: "Modeled gap interval", kind: "warning" }, { offsetMinutes: gap, label: "Next valid sample", kind: "info" }], chart: [{ label: "Previous", value: previous, unit: "mSv/h" }, { label: "Estimated", value: estimate, unit: "mSv/h" }, { label: "Next", value: next, unit: "mSv/h" }], comparisonValue: upper - lower, comparisonUnit: "mSv/h interval" };
    }
    case "R": {
      const life = stringValue(p, "lifeSupportState"); const oxygen = numberValue(p, "shelterOxygenMinutes"); const radiationCritical = rate >= critical; const lifeCritical = life === "critical"; const severity: SimulationSeverity = radiationCritical || lifeCritical ? "CRITICAL" : life === "degraded" || rate >= 0.3 ? "ELEVATED" : "NOMINAL"; const shelterBlocked = lifeCritical && oxygen < 30;
      return { ...base, severity, summary: shelterBlocked ? "Standard shelter action conflicts with critical life-support constraints." : "Combined priorities can use the configured shelter procedure.", explanation: "The system exposes the conflict and defers final priority to the approved multi-hazard emergency procedure.", metrics: [metric("Radiation rate", rate, "mSv/h", radiationCritical ? "danger" : "warning"), metric("Life support", life, undefined, lifeCritical ? "danger" : life === "degraded" ? "warning" : "good"), metric("Shelter oxygen", oxygen, "min", oxygen < 30 ? "danger" : "good")], actions: shelterBlocked ? ["Apply the approved multi-hazard priority procedure.", "Select a viable compartment with sufficient life support before movement."] : ["Use the radiation shelter procedure while monitoring life support.", "Record the cross-hazard decision."], protocol: [{ id: "priority", label: "Open approved multi-hazard priority procedure", required: true }, { id: "viability", label: "Verify destination life-support viability", required: true }, { id: "decision", label: "Record commander decision and rationale", required: true }], events: [{ offsetMinutes: 0, label: "Combined emergency detected", kind: "warning" }, { offsetMinutes: 1, label: shelterBlocked ? "Action conflict highlighted" : "Shelter action remains viable", kind: "action" }], chart: [{ label: "Radiation ×100", value: rate * 100, unit: "scaled" }, { label: "Shelter oxygen", value: oxygen, unit: "min" }], comparisonValue: oxygen, comparisonUnit: "min" };
    }
    case "S": {
      const control = numberValue(p, "controlMean"); const treatment = numberValue(p, "treatmentMean"); const uncertainty = numberValue(p, "uncertainty"); const growth = numberValue(p, "growthPercent"); const difference = control === 0 ? 0 : (control - treatment) / control * 100; const exceeds = Math.abs(difference) > uncertainty;
      return { ...base, severity: "NOMINAL", summary: exceeds ? "Experimental signal exceeds the supplied uncertainty input." : "Observed difference does not exceed the supplied uncertainty.", explanation: "This controlled-trial display never claims proven habitat-scale astronaut protection.", metrics: [metric("Observed difference", round(difference, 1), "%", exceeds ? "warning" : "neutral"), metric("Uncertainty", uncertainty, "%", "neutral"), metric("Growth change", growth, "%", "neutral")], actions: ["Continue paired control/treatment collection.", "Do not convert the observation into an operational shielding factor."], protocol: [{ id: "pair", label: "Verify paired control/treatment metadata", required: true }, { id: "uncertainty", label: "Record uncertainty and instrument position", required: true }, { id: "claim", label: "Keep operational protection claim disabled", required: true }], events: [{ offsetMinutes: 0, label: "Paired experimental data loaded", kind: "info" }, { offsetMinutes: 1, label: exceeds ? "Research signal flagged" : "Signal remains uncertain", kind: "info" }], chart: [{ label: "Control", value: control, unit: "relative" }, { label: "Treatment", value: treatment, unit: "relative" }], comparisonValue: difference, comparisonUnit: "%" };
    }
    default:
      throw new Error(`Scenario '${definition.id}' has no implementation.`);
  }
}

