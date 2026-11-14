import { NextRequest, NextResponse } from "next/server";
import { HazardSlug } from "@/lib/hazards";
import {
  fetchHazardDataFromDb,
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

  const { source, records } = await fetchHazardDataFromDb({
    scenarioId,
    characterId,
    hazardSlug: hazardSlugParam as HazardSlug | undefined,
  });

  return NextResponse.json({
    source,
    scenarioId,
    characterId,
    hazardSlug: hazardSlugParam ?? null,
    records,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      scenarioId: string;
      characterId: string;
      hazardSlug: string;
      streamName: string;
      rawValue: string;
      payload: Record<string, unknown>;
    }>;

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

    const result = await upsertHazardDataInDb({
      scenarioId,
      characterId,
      hazardSlug,
      streamName,
      rawValue,
      payload: body.payload,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          source: result.source,
          record: result.record,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        source: result.source,
        record: result.record,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for hazard data" },
      { status: 400 }
    );
  }
}
