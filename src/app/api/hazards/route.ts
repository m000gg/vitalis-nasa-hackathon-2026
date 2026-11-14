import { NextResponse } from "next/server";
import { HAZARDS } from "@/lib/hazards";

export async function GET() {
  return NextResponse.json({
    hazards: HAZARDS,
    count: HAZARDS.length,
  });
}
