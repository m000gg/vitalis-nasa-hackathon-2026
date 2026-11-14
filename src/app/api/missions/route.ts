import { NextResponse } from "next/server";
import { fetchScenariosFromDb } from "@/lib/supabase/server";

export async function GET() {
  const { source, scenarios } = await fetchScenariosFromDb();
  return NextResponse.json({
    source,
    missions: scenarios,
    note: "Missions and crew compositions loaded from Supabase (or local fallback when env vars are unset)",
  });
}
