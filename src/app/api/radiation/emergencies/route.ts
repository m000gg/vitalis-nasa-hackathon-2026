import { NextRequest, NextResponse } from "next/server";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";
import {
  auditPayload,
  createEmergencyPayload,
  findRadiationEmergency,
  parseRadiationEmergency,
  resolveEmergencyPayload,
} from "@/lib/radiation/emergency";
import {
  fetchHazardDataFromDb,
  fetchScenariosFromDb,
  insertHazardSampleInDb,
  upsertHazardDataInDb,
} from "@/lib/supabase/server";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function severity(value: unknown): "WARNING" | "CRITICAL" | null {
  return value === "WARNING" || value === "CRITICAL" ? value : null;
}

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("scenarioId")?.trim();
  if (!scenarioId) return NextResponse.json({ error: "scenarioId is required." }, { status: 400 });
  try {
    const { records } = await fetchHazardDataFromDb({ scenarioId, hazardSlug: "radiation" });
    const emergencies = records
      .map((record) => parseRadiationEmergency(record))
      .filter((state): state is NonNullable<typeof state> => state !== null);
    return NextResponse.json({ source: "supabase", scenarioId, emergencies });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read radiation emergencies." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const scenarioId = text(body.scenarioId);
  const commanderId = text(body.commanderId);
  const title = text(body.title);
  const reason = text(body.reason);
  const requestedSeverity = severity(body.severity);
  const idempotencyKey = text(body.idempotencyKey);
  if (!scenarioId || !commanderId || !title || !reason || !requestedSeverity || !idempotencyKey) {
    return NextResponse.json({ error: "scenarioId, commanderId, title, reason, severity and idempotencyKey are required." }, { status: 400 });
  }
  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((scenario) => scenario.id === scenarioId);
    const commander = mission?.crew.find((member) => member.id === commanderId && member.isLeadSlot);
    if (!commander) return NextResponse.json({ error: "commanderId must belong to a lead crew member in this scenario." }, { status: 403 });

    const { records } = await fetchHazardDataFromDb({ scenarioId, characterId: commanderId, hazardSlug: "radiation" });
    const existing = records.map((record) => parseRadiationEmergency(record)).find((state) => state?.idempotencyKey === idempotencyKey);
    if (existing) return NextResponse.json({ source: "supabase", emergency: existing, idempotent: true });

    const eventId = `radiation-${Date.now().toString(36)}`;
    const simulation = body.simulation === true;
    const payload = createEmergencyPayload({
      eventId,
      commanderId,
      title,
      severity: requestedSeverity,
      trigger: body.trigger === "onboard_telemetry" || body.trigger === "scenario_replay" ? body.trigger : "operator_declaration",
      reason,
      simulation,
      idempotencyKey,
    });
    await upsertHazardDataInDb({
      scenarioId,
      characterId: commanderId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState,
      rawValue: "ACTIVE",
      payload,
    });
    await insertHazardSampleInDb({
      scenarioId,
      characterId: commanderId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyAudit,
      samplePayload: auditPayload({ eventId, action: "CREATED", actorId: commanderId, detail: reason, simulation }),
    });
    return NextResponse.json({ source: "supabase", emergency: parseRadiationEmergency({
      id: eventId, scenarioId, characterId: commanderId, hazardSlug: "radiation", streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState, rawValue: "ACTIVE", payload, updatedAt: new Date().toISOString(),
    }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create radiation emergency." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const scenarioId = text(body.scenarioId);
  const actorId = text(body.actorId);
  const eventId = text(body.eventId);
  if (!scenarioId || !actorId || !eventId) {
    return NextResponse.json(
      { error: "scenarioId, actorId and eventId are required." },
      { status: 400 }
    );
  }
  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((scenario) => scenario.id === scenarioId);
    const commander = mission?.crew.find(
      (member) => member.id === actorId && member.isLeadSlot
    );
    if (!commander) {
      return NextResponse.json(
        { error: "Only the mission lead may resolve a radiation emergency." },
        { status: 403 }
      );
    }

    const { records } = await fetchHazardDataFromDb({ scenarioId, hazardSlug: "radiation" });
    const found = findRadiationEmergency(records, eventId);
    if (!found) {
      return NextResponse.json({ error: "Radiation emergency not found." }, { status: 404 });
    }
    if (found.state.state === "RESOLVED") {
      return NextResponse.json({ source: "supabase", emergency: found.state, idempotent: true });
    }

    const payload = resolveEmergencyPayload(found.state);
    const { record } = await upsertHazardDataInDb({
      scenarioId,
      characterId: found.record.characterId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState,
      rawValue: "RESOLVED",
      payload,
    });
    await insertHazardSampleInDb({
      scenarioId,
      characterId: actorId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyAudit,
      samplePayload: auditPayload({
        eventId,
        action: "RESOLVED",
        actorId,
        detail: `${commander.callsign} marked event resolved`,
        simulation: found.state.simulation,
      }),
    });
    return NextResponse.json({
      source: "supabase",
      emergency: findRadiationEmergency([record], eventId)?.state ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to resolve radiation emergency." },
      { status: 500 }
    );
  }
}
