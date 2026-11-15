import { NextRequest, NextResponse } from "next/server";
import { fetchDonkiEvents } from "@/lib/radiation/donki";

export async function GET(request: NextRequest) {
  try {
    const result = await fetchDonkiEvents({
      eventType: request.nextUrl.searchParams.get("eventType"),
      startDate: request.nextUrl.searchParams.get("startDate"),
      endDate: request.nextUrl.searchParams.get("endDate"),
    });
    return NextResponse.json({
      ...result,
      provenanceKind: "measured",
      limitation: "NASA DONKI events are space-weather context and must not be interpreted as spacecraft or individual crew dose.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "NASA DONKI request failed.";
    const status = /must|cannot exceed|earlier/.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
