import { NextRequest, NextResponse } from "next/server";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";
import { acknowledgementPayload, auditPayload, findRadiationEmergency } from "@/lib/radiation/emergency";
import {
  fetchHazardDataFromDb,
  fetchScenariosFromDb,
  insertHazardSampleInDb,
  upsertHazardDataInDb,
} from "@/lib/supabase/server";

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
  const scenarioId = text(body.scenarioId);
  const actorId = text(body.actorId);
  const { eventId } = await context.params;
  if (!scenarioId || !actorId || !eventId) return NextResponse.json({ error: "scenarioId, actorId and eventId are required." }, { status: 400 });
  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((scenario) => scenario.id === scenarioId);
    const actor = mission?.crew.find((member) => member.id === actorId);
    if (!actor) return NextResponse.json({ error: "actorId does not belong to this scenario." }, { status: 403 });
    const { records } = await fetchHazardDataFromDb({ scenarioId, hazardSlug: "radiation" });
    const found = findRadiationEmergency(records, eventId);
    if (!found) return NextResponse.json({ error: "Radiation emergency not found." }, { status: 404 });
    if (found.state.acknowledgements[actorId]) return NextResponse.json({ source: "supabase", emergency: found.state, idempotent: true });
    const payload = acknowledgementPayload(found.state, actorId);
    const { record } = await upsertHazardDataInDb({
      scenarioId,
      characterId: found.record.characterId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState,
      rawValue: "ACKNOWLEDGED",
      payload,
    });
    await insertHazardSampleInDb({
      scenarioId,
      characterId: actorId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyAudit,
      samplePayload: auditPayload({ eventId, action: "ACKNOWLEDGED", actorId, detail: actor.isLeadSlot ? "Commander acknowledgement" : "Crew safety acknowledgement", simulation: found.state.simulation }),
    });
    return NextResponse.json({ source: "supabase", emergency: findRadiationEmergency([record], eventId)?.state ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to acknowledge radiation emergency." }, { status: 500 });
  }
}
