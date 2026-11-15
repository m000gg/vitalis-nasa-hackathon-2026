import { NextRequest, NextResponse } from "next/server";
import { buildRadiationIncidentReport, findRadiationEmergency } from "@/lib/radiation/emergency";
import { fetchHazardDataFromDb, fetchHazardSamplesFromDb } from "@/lib/supabase/server";

export async function GET(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const scenarioId = request.nextUrl.searchParams.get("scenarioId")?.trim();
  const { eventId } = await context.params;
  if (!scenarioId) return NextResponse.json({ error: "scenarioId is required." }, { status: 400 });
  try {
    const [{ records }, { samples }] = await Promise.all([
      fetchHazardDataFromDb({ scenarioId, hazardSlug: "radiation" }),
      fetchHazardSamplesFromDb({ scenarioId, hazardSlug: "radiation" }),
    ]);
    const found = findRadiationEmergency(records, eventId);
    if (!found) return NextResponse.json({ error: "Radiation emergency not found." }, { status: 404 });
    return NextResponse.json({ source: "supabase", report: buildRadiationIncidentReport({ state: found.state, auditSamples: samples }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate incident report." }, { status: 500 });
  }
}
