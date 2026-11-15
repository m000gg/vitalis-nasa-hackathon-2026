import { NextResponse } from "next/server";
import { HAZARDS } from "@/lib/hazards";

export async function GET() {
  const serializable = HAZARDS.map(({ evaluate: _ev, ...spec }) => {
    void _ev;
    return spec;
  });

  return NextResponse.json({
    hazards: serializable,
    count: serializable.length,
  });
}
