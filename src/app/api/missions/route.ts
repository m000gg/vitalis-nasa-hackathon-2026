import { NextResponse } from "next/server";
import { MISSIONS } from "@/lib/domain";

export async function GET() {
  return NextResponse.json({
    missions: MISSIONS,
    note: "Missions and crew compositions grounded in docs/OUTLINE.md and docs/hazards/*.md",
  });
}
