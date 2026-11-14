import { NextRequest, NextResponse } from "next/server";
import { defaultSimulationParameters, runRadiationSimulation } from "@/lib/radiation/simulation";
import { RADIATION_WORKBENCH_CATALOG } from "@/lib/radiation/simulation-ux";

export async function GET() {
  return NextResponse.json({
    mode: "demo",
    provenanceKind: "simulated",
    scenarios: RADIATION_WORKBENCH_CATALOG.map((scenario) => ({
      ...scenario,
      defaultParameters: defaultSimulationParameters(scenario),
    })),
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "JSON payload must be an object." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const scenarioId = typeof body.scenarioId === "string" ? body.scenarioId.trim().toUpperCase() : "";
  const hasParameters = Object.prototype.hasOwnProperty.call(body, "parameters");
  if (hasParameters && (body.parameters === null || typeof body.parameters !== "object" || Array.isArray(body.parameters))) {
    return NextResponse.json({ error: "parameters must be an object when supplied." }, { status: 400 });
  }
  const parameters = hasParameters ? body.parameters as Record<string, unknown> : undefined;
  if (!scenarioId) {
    return NextResponse.json({ error: "scenarioId is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      mode: "demo",
      result: runRadiationSimulation({ scenarioId, parameters }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Radiation simulation failed.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Unknown") ? 404 : 422 });
  }
}
