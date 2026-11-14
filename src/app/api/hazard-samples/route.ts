import { NextRequest, NextResponse } from "next/server";
import { HazardSlug } from "@/lib/hazards";
import {
  fetchHazardSamplesFromDb,
  insertHazardSampleInDb,
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
  const characterId = request.nextUrl.searchParams.get("characterId")?.trim() || undefined;
  const hazardSlugParam =
    request.nextUrl.searchParams.get("hazardSlug")?.trim() || undefined;
  const streamName =
    request.nextUrl.searchParams.get("streamName")?.trim() || undefined;

  if (!scenarioId) {
    return NextResponse.json(
      { error: "Missing required query param: scenarioId" },
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
    const { samples } = await fetchHazardSamplesFromDb({
      scenarioId,
      characterId,
      hazardSlug: hazardSlugParam as HazardSlug | undefined,
      streamName,
    });

    return NextResponse.json({
      source: "supabase",
      scenarioId,
      characterId: characterId ?? null,
      hazardSlug: hazardSlugParam ?? null,
      samples,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch hazard samples from Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<{
    scenarioId: string;
    characterId: string;
    hazardSlug: string;
    streamName: string;
    numericValue: number | null;
    samplePayload: Record<string, unknown>;
  }>;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for hazard sample" },
      { status: 400 }
    );
  }

  const scenarioId = body.scenarioId?.trim() ?? "";
  const characterId = body.characterId?.trim() ?? "";
  const hazardSlug = body.hazardSlug?.trim() ?? "";
  const streamName = body.streamName?.trim() ?? "";

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
    const { sample } = await insertHazardSampleInDb({
      scenarioId,
      characterId,
      hazardSlug,
      streamName,
      numericValue:
        typeof body.numericValue === "number" && Number.isFinite(body.numericValue)
          ? body.numericValue
          : null,
      samplePayload: body.samplePayload,
    });

    return NextResponse.json(
      {
        source: "supabase",
        sample,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to insert hazard sample in Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
