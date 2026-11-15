import { NextRequest, NextResponse } from "next/server";
import { createScenarioInDb, fetchScenariosFromDb } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { scenarios } = await fetchScenariosFromDb();
    return NextResponse.json({
      source: "supabase",
      scenarios,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch scenarios from Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<{
    id: string;
    name: string;
    durationContext: string;
    scenarioDescriptionSlot: string;
    commsDelayLabel: string;
    leaderCallsign: string;
  }>;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for scenario creation" },
      { status: 400 }
    );
  }

  const name = body.name?.trim() ?? "";
  const durationContext = body.durationContext?.trim() || "Standard transit";
  const scenarioDescriptionSlot =
    body.scenarioDescriptionSlot?.trim() || "Custom mission scenario";
  const commsDelayLabel =
    body.commsDelayLabel?.trim() || "Nominal light-time delay";

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

  try {
    const { scenario } = await createScenarioInDb({
      id: slug,
      name,
      durationContext,
      scenarioDescriptionSlot,
      commsDelayLabel,
      leaderCallsign: body.leaderCallsign?.trim() || undefined,
    });

    return NextResponse.json(
      {
        source: "supabase",
        scenario,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create scenario in Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
