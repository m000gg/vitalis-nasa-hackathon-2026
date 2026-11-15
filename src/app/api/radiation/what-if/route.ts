import { NextRequest, NextResponse } from "next/server";
import { buildExposureForecast, normalizeDose, normalizeDoseRate } from "@/lib/hazards/01-radiation";

function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }); }
  const currentDose = normalizeDose(body.currentDoseValue, body.currentDoseUnit);
  const baselineRate = normalizeDoseRate(body.baselineRateValue, body.baselineRateUnit);
  const remainingHours = number(body.remainingHours);
  const choices = Array.isArray(body.choices) ? body.choices : [];
  if (!currentDose || !baselineRate || remainingHours === null || choices.length === 0) {
    return NextResponse.json({ error: "Compatible current dose/rate, remainingHours and at least one choice are required." }, { status: 422 });
  }
  const results = choices.slice(0, 8).map((choice, index) => {
    const item = choice && typeof choice === "object" ? choice as Record<string, unknown> : {};
    const multiplier = number(item.rateMultiplier);
    const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : `Choice ${index + 1}`;
    if (multiplier === null || multiplier < 0) return { label, status: "unsupported_model", explanation: "rateMultiplier must be finite and non-negative." };
    const forecast = buildExposureForecast({
      currentDose,
      baselineRate: { ...baselineRate, value: baselineRate.value * multiplier },
      remainingHours,
      uncertaintyPercent: number(body.uncertaintyPercent),
    });
    return { label, rateMultiplier: multiplier, provenanceKind: "modeled", forecast };
  });
  return NextResponse.json({
    results,
    limitation: "Rate multipliers are an explicit toy/mission-model input, not a validated universal shielding effect.",
  });
}
