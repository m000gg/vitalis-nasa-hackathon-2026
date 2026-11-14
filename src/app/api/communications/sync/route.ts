import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({
    synced: true,
    syncedAt: new Date().toISOString(),
    syncedCount: body.count ?? 0,
    note: "Simulated DTN Store-and-Forward sync complete.",
  });
}
