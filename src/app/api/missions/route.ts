import { NextResponse } from "next/server";
import { fetchScenariosFromDb } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { scenarios } = await fetchScenariosFromDb();
    return NextResponse.json({
      source: "supabase",
      missions: scenarios,
      note: "Missions and crew compositions loaded strictly from Supabase",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load missions from Supabase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
