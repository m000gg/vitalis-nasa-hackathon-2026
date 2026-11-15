import { NextRequest, NextResponse } from "next/server";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";
import {
  auditPayload,
  findRadiationEmergency,
  shelterCheckInPayload,
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const scenarioId = text(body.scenarioId);
  const characterId = text(body.characterId);
  const { eventId } = await context.params;

  if (!scenarioId || !characterId || !eventId) {
    return NextResponse.json(
      { error: "scenarioId, characterId and eventId are required." },
      { status: 400 }
    );
  }

  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((scenario) => scenario.id === scenarioId);
    const member = mission?.crew.find((crew) => crew.id === characterId);
    if (!member) {
      return NextResponse.json(
        { error: "characterId does not belong to this scenario." },
        { status: 403 }
      );
    }

    const { records } = await fetchHazardDataFromDb({ scenarioId, hazardSlug: "radiation" });
    const found = findRadiationEmergency(records, eventId);
    if (!found) {
      return NextResponse.json({ error: "Radiation emergency not found." }, { status: 404 });
    }

    if (found.state.shelterCheckIns[characterId]) {
      return NextResponse.json({
        source: "supabase",
        emergency: found.state,
        eventId,
        idempotent: true,
      });
    }

    const payload = shelterCheckInPayload(found.state, characterId);
    const { record } = await upsertHazardDataInDb({
      scenarioId,
      characterId: found.record.characterId,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState,
      rawValue: found.record.rawValue || found.state.state,
      payload,
    });

    await insertHazardSampleInDb({
      scenarioId,
      characterId,
      hazardSlug: "radiation",
      streamName: "Radiation Shelter Check-In",
      samplePayload: auditPayload({
        eventId,
        action: "SHELTER_CHECK_IN",
        actorId: characterId,
        detail: `${member.callsign} marked sheltered`,
        simulation: found.state.simulation,
      }),
    });

    return NextResponse.json({
      source: "supabase",
      emergency: findRadiationEmergency([record], eventId)?.state ?? null,
      eventId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save shelter check-in." },
      { status: 500 }
    );
  }
}
