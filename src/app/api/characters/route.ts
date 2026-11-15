import { NextRequest, NextResponse } from "next/server";
import { CrewSlot } from "@/lib/domain";
import {
  createCharacterInDb,
  fetchScenariosFromDb,
  updateCharacterInDb,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("scenarioId")?.trim();
  try {
    const { scenarios } = await fetchScenariosFromDb();

    if (scenarioId) {
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (!scenario) {
        return NextResponse.json(
          { error: `Scenario '${scenarioId}' not found in Supabase`, characters: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({
        source: "supabase",
        scenarioId,
        characters: scenario.crew,
      });
    }

    const allCharacters = scenarios.flatMap((s) =>
      s.crew.map((c) => ({ scenarioId: s.id, ...c }))
    );
    return NextResponse.json({
      source: "supabase",
      characters: allCharacters,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch characters from Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Partial<{
    scenarioId: string;
    id: string;
    callsign: string;
    assignedRoleTitle: string;
    isLeadSlot: boolean;
  }>;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for character creation" },
      { status: 400 }
    );
  }

  const scenarioId = body.scenarioId?.trim() ?? "";
  const callsign = body.callsign?.trim() ?? "";
  const assignedRoleTitle =
    body.assignedRoleTitle?.trim() || "Crew Specialist";

  if (!scenarioId || !callsign) {
    return NextResponse.json(
      { error: "Missing required fields: scenarioId and callsign" },
      { status: 400 }
    );
  }

  const charId =
    body.id?.trim() ||
    `${scenarioId}-${callsign
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

  try {
    const { character } = await createCharacterInDb({
      scenarioId,
      id: charId,
      callsign,
      assignedRoleTitle,
      isLeadSlot: Boolean(body.isLeadSlot),
    });

    return NextResponse.json(
      {
        source: "supabase",
        scenarioId,
        character,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create character in Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: Partial<{
    id: string;
    callsign: string;
    assignedRoleTitle: string;
    isLeadSlot: boolean;
    publicStatusSummary: string;
    privateMemberNotesSlot: string;
    metrics: CrewSlot["metrics"];
  }>;

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for character update" },
      { status: 400 }
    );
  }

  const id = body.id?.trim() ?? "";
  if (!id) {
    return NextResponse.json(
      { error: "Missing required field: id" },
      { status: 400 }
    );
  }

  try {
    const { character } = await updateCharacterInDb({
      id,
      callsign: body.callsign?.trim(),
      assignedRoleTitle: body.assignedRoleTitle?.trim(),
      isLeadSlot: body.isLeadSlot,
      publicStatusSummary: body.publicStatusSummary?.trim(),
      privateMemberNotesSlot: body.privateMemberNotesSlot?.trim(),
      metrics: body.metrics,
    });

    return NextResponse.json({
      source: "supabase",
      character,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update character in Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
