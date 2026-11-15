import { NextRequest, NextResponse } from "next/server";
import { buildExposureForecast, normalizeDose, normalizeDoseRate } from "@/lib/hazards/01-radiation";

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
  const currentDose = normalizeDose(body.currentDoseValue, body.currentDoseUnit);
  const baselineRate = normalizeDoseRate(body.baselineRateValue, body.baselineRateUnit);
  const remainingHours = number(body.remainingHours);
  if (!currentDose || !baselineRate || remainingHours === null) {
    return NextResponse.json({ error: "currentDoseValue/unit, baselineRateValue/unit and finite remainingHours are required." }, { status: 422 });
  }
  const forecast = buildExposureForecast({ currentDose, baselineRate, remainingHours, uncertaintyPercent: number(body.uncertaintyPercent) });
  if (!forecast.supported) return NextResponse.json({ error: "unsupported_model", forecast }, { status: 422 });
  return NextResponse.json({
    provenanceKind: "modeled",
    forecast,
    limitation: "Constant-rate projection only. This endpoint does not calculate clinical risk or convert Gy to Sv.",
  });
}
