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
  const characterId = request.nextUrl.searchParams.get("characterId")?.trim();
  const hazardSlugParam =
    request.nextUrl.searchParams.get("hazardSlug")?.trim() || undefined;
  const streamName =
    request.nextUrl.searchParams.get("streamName")?.trim() || undefined;

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

  const { source, samples } = await fetchHazardSamplesFromDb({
    scenarioId,
    characterId,
    hazardSlug: hazardSlugParam as HazardSlug | undefined,
    streamName,
  });

  return NextResponse.json({
    source,
    scenarioId,
    characterId,
    hazardSlug: hazardSlugParam ?? null,
    samples,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      scenarioId: string;
      characterId: string;
      hazardSlug: string;
      streamName: string;
      numericValue: number | null;
      samplePayload: Record<string, unknown>;
    }>;

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

    const result = await insertHazardSampleInDb({
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

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          source: result.source,
          sample: result.sample,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        source: result.source,
        sample: result.sample,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for hazard sample" },
      { status: 400 }
    );
  }
}
