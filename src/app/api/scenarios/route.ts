import { NextRequest, NextResponse } from "next/server";
import { createScenarioInDb, fetchScenariosFromDb } from "@/lib/supabase/server";

export async function GET() {
  const { source, scenarios } = await fetchScenariosFromDb();
  return NextResponse.json({
    source,
    scenarios,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      id: string;
      name: string;
      phase: string;
      scenarioDescriptionSlot: string;
      commsDelayLabel: string;
      leaderCallsign: string;
    }>;

    const name = body.name?.trim() ?? "";
    const phase = body.phase?.trim() ?? "Add your info: Mission phase here";
    const scenarioDescriptionSlot =
      body.scenarioDescriptionSlot?.trim() ??
      "Add your info: Scenario description here";
    const commsDelayLabel =
      body.commsDelayLabel?.trim() ?? "Add your info: Comms delay here";

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const slug =
      body.id?.trim() ||
      `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

    const result = await createScenarioInDb({
      id: slug,
      name,
      phase,
      scenarioDescriptionSlot,
      commsDelayLabel,
      leaderCallsign: body.leaderCallsign?.trim() || undefined,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          source: result.source,
          scenario: result.scenario,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        source: result.source,
        scenario: result.scenario,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for scenario creation" },
      { status: 400 }
    );
  }
}
