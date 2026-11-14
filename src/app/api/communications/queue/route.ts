import { NextResponse } from "next/server";
import { DtnMessage } from "@/lib/domain";

const inMemoryQueue: DtnMessage[] = [];

export async function GET() {
  return NextResponse.json({
    queue: inMemoryQueue,
    mode: "DTN Store-and-Forward skeleton (see docs/hazards/03-distance-from-earth.md)",
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const now = new Date().toLocaleTimeString();
  const linkOnline = Boolean(body.linkOnline);

  const message: DtnMessage = {
    id: `dtn-${Date.now()}`,
    reportTitle: body.reportTitle || "Add your info: Medical report title here",
    senderCallsign: body.senderCallsign || "Crew Member",
    hazardSlug: body.hazardSlug || "distance",
    status: linkOnline ? "ACKNOWLEDGED" : "PENDING",
    createdAt: now,
    sentAt: linkOnline ? now : undefined,
    acknowledgedAt: linkOnline ? now : undefined,
    retryCount: linkOnline ? 0 : 1,
    payloadSummary: body.payloadSummary || "Add your info: Structured report summary here",
  };

  inMemoryQueue.unshift(message);
  return NextResponse.json({ message }, { status: 201 });
}
