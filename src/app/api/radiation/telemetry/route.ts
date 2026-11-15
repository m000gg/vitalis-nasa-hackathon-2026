import { NextRequest, NextResponse } from "next/server";
import {
  RADIATION_PIPELINE_VALUES,
  validateRadiationTelemetryPayload,
} from "@/lib/hazards/01-radiation";
import { insertHazardSampleInDb, upsertHazardDataInDb } from "@/lib/supabase/server";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const scenarioId = text(body.scenarioId);
  const characterId = text(body.characterId);
  const streamName = text(body.streamName);
  const rawValue = text(body.rawValue);
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? (body.payload as Record<string, unknown>)
    : {};
  const numericValue = typeof body.numericValue === "number" && Number.isFinite(body.numericValue)
    ? body.numericValue
    : null;

  if (!scenarioId || !characterId || !streamName) {
    return NextResponse.json({ error: "scenarioId, characterId and streamName are required." }, { status: 400 });
  }

  const validation = validateRadiationTelemetryPayload({ streamName, payload, numericValue });
  if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 422 });

  try {
    const { record } = await upsertHazardDataInDb({
      scenarioId,
      characterId,
      hazardSlug: "radiation",
      streamName,
      rawValue: rawValue || streamName,
      payload,
    });
    const shouldSample = body.recordSample === true || streamName === RADIATION_PIPELINE_VALUES.streams.personalDosimeter || streamName === RADIATION_PIPELINE_VALUES.streams.compartmentSensors;
    const sample = shouldSample
      ? (await insertHazardSampleInDb({
          scenarioId,
          characterId,
          hazardSlug: "radiation",
          streamName,
          numericValue,
          samplePayload: payload,
        })).sample
      : null;
    return NextResponse.json({ source: "supabase", record, sample }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ingest radiation telemetry." },
      { status: 500 }
    );
  }
}
