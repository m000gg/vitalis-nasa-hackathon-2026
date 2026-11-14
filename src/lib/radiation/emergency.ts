import type { HazardDataRecord, HazardSampleRecord } from "@/lib/hazards";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";

export type RadiationEmergencyStateName = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface RadiationEmergencyState {
  eventId: string;
  state: RadiationEmergencyStateName;
  title: string;
  severity: "WARNING" | "CRITICAL";
  trigger: "onboard_telemetry" | "scenario_replay" | "operator_declaration";
  reason: string;
  simulation: boolean;
  createdAt: string;
  updatedAt: string;
  commanderId: string;
  acknowledgements: Record<string, string>;
  idempotencyKey: string;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseRadiationEmergency(record: HazardDataRecord): RadiationEmergencyState | null {
  if (
    record.hazardSlug !== "radiation" ||
    record.streamName !== RADIATION_PIPELINE_VALUES.streams.emergencyState
  ) {
    return null;
  }
  const payload = asObject(record.payload);
  const eventId = asText(payload.eventId);
  const state = asText(payload.state);
  const severity = asText(payload.severity);
  const commanderId = asText(payload.commanderId) || record.characterId;
  if (
    !eventId ||
    !["ACTIVE", "ACKNOWLEDGED", "RESOLVED"].includes(state) ||
    !["WARNING", "CRITICAL"].includes(severity)
  ) {
    return null;
  }
  const rawAcks = asObject(payload.acknowledgements);
  const acknowledgements = Object.fromEntries(
    Object.entries(rawAcks).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  return {
    eventId,
    state: state as RadiationEmergencyStateName,
    title: asText(payload.title) || "RADIATION EVENT",
    severity: severity as "WARNING" | "CRITICAL",
    trigger: ["onboard_telemetry", "scenario_replay", "operator_declaration"].includes(asText(payload.trigger))
      ? (asText(payload.trigger) as RadiationEmergencyState["trigger"])
      : "operator_declaration",
    reason: asText(payload.reason),
    simulation: payload.simulation === true,
    createdAt: asText(payload.createdAt) || record.updatedAt,
    updatedAt: asText(payload.updatedAt) || record.updatedAt,
    commanderId,
    acknowledgements,
    idempotencyKey: asText(payload.idempotencyKey),
  };
}

export function findRadiationEmergency(
  records: readonly HazardDataRecord[],
  eventId: string
): { record: HazardDataRecord; state: RadiationEmergencyState } | null {
  for (const record of records) {
    const state = parseRadiationEmergency(record);
    if (state?.eventId === eventId) return { record, state };
  }
  return null;
}

export function createEmergencyPayload(input: {
  eventId: string;
  commanderId: string;
  title: string;
  severity: "WARNING" | "CRITICAL";
  trigger: RadiationEmergencyState["trigger"];
  reason: string;
  simulation: boolean;
  idempotencyKey: string;
  now?: string;
}): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  return {
    schemaVersion: "radiation-emergency.v1",
    eventId: input.eventId,
    state: "ACTIVE",
    commanderId: input.commanderId,
    title: input.title,
    severity: input.severity,
    trigger: input.trigger,
    reason: input.reason,
    simulation: input.simulation,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    acknowledgements: {},
  };
}

export function acknowledgementPayload(
  previous: RadiationEmergencyState,
  actorId: string,
  now = new Date().toISOString()
): Record<string, unknown> {
  const acknowledgements = { ...previous.acknowledgements, [actorId]: now };
  return {
    schemaVersion: "radiation-emergency.v1",
    eventId: previous.eventId,
    state: previous.state === "RESOLVED" ? "RESOLVED" : "ACKNOWLEDGED",
    commanderId: previous.commanderId,
    title: previous.title,
    severity: previous.severity,
    trigger: previous.trigger,
    reason: previous.reason,
    simulation: previous.simulation,
    idempotencyKey: previous.idempotencyKey,
    createdAt: previous.createdAt,
    updatedAt: now,
    acknowledgements,
  };
}

export function auditPayload(input: {
  eventId: string;
  action: string;
  actorId: string;
  detail: string;
  simulation: boolean;
}): Record<string, unknown> {
  return {
    schemaVersion: "radiation-emergency-audit.v1",
    eventId: input.eventId,
    action: input.action,
    actorId: input.actorId,
    detail: input.detail,
    simulation: input.simulation,
  };
}

export function buildRadiationIncidentReport(input: {
  state: RadiationEmergencyState;
  auditSamples: readonly HazardSampleRecord[];
  generatedAt?: string;
}): Record<string, unknown> {
  const transitions = input.auditSamples
    .filter(
      (sample) =>
        sample.hazardSlug === "radiation" &&
        sample.streamName === RADIATION_PIPELINE_VALUES.streams.emergencyAudit &&
        asText(sample.samplePayload?.eventId) === input.state.eventId
    )
    .map((sample) => ({
      at: sample.recordedAt,
      action: asText(sample.samplePayload?.action),
      actorId: asText(sample.samplePayload?.actorId),
      detail: asText(sample.samplePayload?.detail),
    }));

  return {
    reportVersion: "radiation-incident.v1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    event: input.state,
    transitions,
    provenance: {
      state: input.state.simulation ? "simulated" : "operational record",
      note: "DONKI events are space-weather context and are not individual absorbed/effective dose measurements.",
    },
    limitations: [
      "This report is a hackathon decision-support record, not a medical diagnosis.",
      "No universal NASA radiation limit is inferred by the software.",
      "Server-side identity guarantees require Supabase Auth/RLS hardening beyond the current development schema.",
    ],
  };
}
