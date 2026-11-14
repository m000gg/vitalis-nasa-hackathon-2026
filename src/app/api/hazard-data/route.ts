import { NextRequest, NextResponse } from "next/server";
import { HazardSlug } from "@/lib/hazards";
import {
  fetchHazardDataFromDb,
  insertHazardSampleInDb,
  upsertHazardDataInDb,
} from "@/lib/supabase/server";

const VALID_HAZARD_SLUGS: HazardSlug[] = [
  "radiation",
  "isolation",
  "distance",
  "gravity",
  "environment",
];

function isValidHazardSlug(value: string): value is HazardSlug {
  return VALID_HAZARD_SLUGS.includes(value as HazardSlug);
}

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("scenarioId")?.trim();
  const characterId = request.nextUrl.searchParams.get("characterId")?.trim();
  const hazardSlugParam =
    request.nextUrl.searchParams.get("hazardSlug")?.trim() || undefined;

  if (!scenarioId || !characterId) {
    return NextResponse.json(
      { error: "Missing required query params: scenarioId and characterId" },
      { status: 400 }
    );
  }

  if (hazardSlugParam && !isValidHazardSlug(hazardSlugParam)) {
    return NextResponse.json(
      { error: `Invalid hazardSlug '${hazardSlugParam}'` },
      { status: 400 }
    );
  }

  try {
    const { records } = await fetchHazardDataFromDb({
      scenarioId,
      characterId,
      hazardSlug: hazardSlugParam as HazardSlug | undefined,
    });

    return NextResponse.json({
      source: "supabase",
      scenarioId,
      characterId,
      hazardSlug: hazardSlugParam ?? null,
      records,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch hazard data from Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<{
    scenarioId: string;
    characterId: string;
    hazardSlug: string;
    streamName: string;
    rawValue: string;
    payload: Record<string, unknown>;
    recordSample: boolean;
    numericValue: number | null;
  }>;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for hazard data" },
      { status: 400 }
    );
  }

  const scenarioId = body.scenarioId?.trim() ?? "";
  const characterId = body.characterId?.trim() ?? "";
  const hazardSlug = body.hazardSlug?.trim() ?? "";
  const streamName = body.streamName?.trim() ?? "";
  const rawValue = typeof body.rawValue === "string" ? body.rawValue.trim() : "";

  if (!scenarioId || !characterId || !hazardSlug || !streamName) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: scenarioId, characterId, hazardSlug, streamName",
      },
      { status: 400 }
    );
  }

  if (!isValidHazardSlug(hazardSlug)) {
    return NextResponse.json(
      { error: `Invalid hazardSlug '${hazardSlug}'` },
      { status: 400 }
    );
  }

  try {
    const { record } = await upsertHazardDataInDb({
      scenarioId,
      characterId,
      hazardSlug,
      streamName,
      rawValue,
      payload: body.payload,
    });

    let sample = undefined;
    if (body.recordSample) {
      const parsedNum =
        typeof body.numericValue === "number" && Number.isFinite(body.numericValue)
          ? body.numericValue
          : Number.isFinite(Number(rawValue)) && rawValue !== ""
          ? Number(rawValue)
          : null;

      const sampleRes = await insertHazardSampleInDb({
        scenarioId,
        characterId,
        hazardSlug,
        streamName,
        numericValue: parsedNum,
        samplePayload: body.payload ?? { rawValue },
      });
      sample = sampleRes.sample;
    }

    return NextResponse.json(
      {
        source: "supabase",
        record,
        sample,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save hazard data to Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
