import { NextRequest, NextResponse } from "next/server";
import { CrewSlot } from "@/lib/domain";
import { createCharacterInDb, fetchScenariosFromDb } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("scenarioId")?.trim();
  const { source, scenarios } = await fetchScenariosFromDb();

  if (scenarioId) {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: `Scenario '${scenarioId}' not found`, source, characters: [] },
        { status: 404 }
      );
    }
    return NextResponse.json({
      source,
      scenarioId,
      characters: scenario.crew,
    });
  }

  const allCharacters = scenarios.flatMap((s) =>
    s.crew.map((c) => ({ scenarioId: s.id, ...c }))
  );
  return NextResponse.json({
    source,
    characters: allCharacters,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<{
      scenarioId: string;
      id: string;
      callsign: string;
      assignedRoleTitle: string;
      isLeadSlot: boolean;
      readinessState: CrewSlot["readinessState"];
      evaGateState: CrewSlot["evaGateState"];
    }>;

    const scenarioId = body.scenarioId?.trim() ?? "";
    const callsign = body.callsign?.trim() ?? "";
    const assignedRoleTitle =
      body.assignedRoleTitle?.trim() || "Add your info: Assigned role title here";

    if (!scenarioId || !callsign) {
      return NextResponse.json(
        { error: "Missing required fields: scenarioId and callsign" },
        { status: 400 }
      );
    }

    const validReadiness: CrewSlot["readinessState"][] = [
      "GO",
      "CONDITIONAL",
      "HOLD",
    ];
    const validEva: CrewSlot["evaGateState"][] = [
      "GO",
      "CONDITIONAL",
      "NO-GO",
    ];

    const readinessState: CrewSlot["readinessState"] = validReadiness.includes(
      body.readinessState as CrewSlot["readinessState"]
    )
      ? (body.readinessState as CrewSlot["readinessState"])
      : "GO";

    const evaGateState: CrewSlot["evaGateState"] = validEva.includes(
      body.evaGateState as CrewSlot["evaGateState"]
    )
      ? (body.evaGateState as CrewSlot["evaGateState"])
      : "GO";

    const charId =
      body.id?.trim() ||
      `${scenarioId}-${callsign
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

    const result = await createCharacterInDb({
      scenarioId,
      id: charId,
      callsign,
      assignedRoleTitle,
      isLeadSlot: Boolean(body.isLeadSlot),
      readinessState,
      evaGateState,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          source: result.source,
          character: result.character,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        source: result.source,
        scenarioId,
        character: result.character,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload for character creation" },
      { status: 400 }
    );
  }
}
