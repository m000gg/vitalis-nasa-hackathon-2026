import { NextResponse } from "next/server";

const emergencyEvents: { id: string; timestamp: string; type: string; actorRole: string; detail: string }[] = [];

export async function GET() {
  return NextResponse.json({ events: emergencyEvents });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const event = {
    id: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: body.type || "SIMULATED_EVENT",
    actorRole: body.actorRole || "lead",
    detail: body.detail || "Here is: Emergency / audit event logged.",
  };
  emergencyEvents.unshift(event);
  return NextResponse.json({ event }, { status: 201 });
}
