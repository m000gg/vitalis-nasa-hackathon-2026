"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wind,
  XCircle,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import {
  InfoCircle,
  ResearchModal,
  type ActiveResearchInfoState,
} from "@/components/ResearchInfoModal";
import {
  buildLedger,
  buildModuleSimulation,
  co2Trend,
  ENVIRONMENT_PIPELINE_VALUES,
  ENVIRONMENT_RESEARCH_METADATA,
  evaluateModuleAir,
  formatBanner,
  headacheOddsText,
  minutesToTarget,
  trendMessage,
  type AirStatus,
} from "@/lib/hazards/05-environment";
import type { HazardScreenProps } from "./types";

const V = ENVIRONMENT_PIPELINE_VALUES;

type StatusKey = "NOMINAL" | "ELEVATED" | "CRITICAL";

const STATUS_STYLE: Record<
  StatusKey,
  { badge: string; panel: string }
> = {
  NOMINAL: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-200/80 bg-emerald-50/40",
  },
  ELEVATED: {
    badge: "border-amber-300 bg-amber-50 text-amber-900",
    panel: "border-amber-300/80 bg-amber-50/40",
  },
  CRITICAL: {
    badge: "border-red-300 bg-red-50 text-red-900",
    panel: "border-red-300/80 bg-red-50/40",
  },
};

const AIR_STYLE: Record<AirStatus, { card: string; badge: string; label: string }> = {
  green: {
    card: "border-emerald-200 bg-white",
    badge: "bg-emerald-100 text-emerald-800",
    label: "GREEN",
  },
  yellow: {
    card: "border-amber-300 bg-amber-50/30",
    badge: "bg-amber-100 text-amber-900",
    label: "YELLOW",
  },
  red: {
    card: "border-red-300 bg-red-50/30",
    badge: "bg-red-100 text-red-900",
    label: "RED",
  },
};

function AirIcon({ status, className = "h-4 w-4" }: { status: AirStatus; className?: string }) {
  if (status === "red") return <XCircle className={`${className} text-red-600`} aria-hidden="true" />;
  if (status === "yellow") return <AlertTriangle className={`${className} text-amber-600`} aria-hidden="true" />;
  return <CheckCircle2 className={`${className} text-emerald-600`} aria-hidden="true" />;
}

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN (Read-Only, DB-Driven)
 * Renders the Habitat Module Weather Map, Air Risk Forecast, and CO2 Charts using 05-environment.ts exports.
 */
export function EnvironmentHazardScreen({
  snapshot,
  hazardRecords,
  scenarioHazardRecords,
}: HazardScreenProps) {
  const readStream = (streamName: string) =>
    hazardRecords.find((r) => r.streamName === streamName)?.rawValue ||
    scenarioHazardRecords.find((r) => r.hazardSlug === "environment" && r.streamName === streamName)
      ?.rawValue ||
    "";

  const rawScenario = readStream(V.streams.demoScenario).trim();
  const scenarioId = V.demoScenarios.ids.includes(rawScenario) ? rawScenario : "none";
  const rawElapsed = Number(readStream(V.streams.simulatedMinutes));
  const elapsedMin = Number.isFinite(rawElapsed) && rawElapsed >= 0 ? rawElapsed : 0;

  const moduleViews = V.modules.map((mod) => {
    const sim = buildModuleSimulation(mod, elapsedMin, scenarioId);
    const air = evaluateModuleAir(sim.reading);
    const trend = co2Trend(sim.history);
    const minsToTarget =
      trend.state === "ready" ? minutesToTarget(sim.reading.co2Mmhg, trend.slopeMmhgPerMin) : null;
    const ledger = buildLedger(sim.history);
    const oddsText = headacheOddsText(sim.reading.co2Mmhg);
    return { mod, sim, air, trend, minsToTarget, ledger, oddsText };
  });

  const bannerText = formatBanner(moduleViews.map((m) => m.air.status));
  const charts = snapshot.charts ?? [];
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);

  return (
    <div className="space-y-6">
      {/* 1. Ready-to-Act Primary Briefing */}
      <section className={`rounded-2xl border p-5 ${STATUS_STYLE[snapshot.status].panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[snapshot.status].badge}`}
            >
              <Wind className="h-3.5 w-3.5" aria-hidden="true" />
              {snapshot.status}
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Habitat Air &amp; Environmental Briefing
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.habitat_air_briefing}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            {snapshot.eta}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Immediate Horizon (Module Alarms &amp; Trend Warnings)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Prolonged Horizon (CO₂ Risk Forecast &amp; Exposure Ledger)
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-sky-900 uppercase">
              Prioritized Module Actions ({snapshot.solutions.length} Max)
            </p>
            {snapshot.solutions.length > 0 ? (
              <ol className="mt-2.5 space-y-2">
                {snapshot.solutions.map((sol, idx) => (
                  <li
                    key={sol}
                    className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm leading-snug text-sky-950"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span>{sol}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
                All modules are currently green with no active CO₂ trend warnings within 120 simulated minutes.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Habitat Module Weather Map (4 Modules) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Habitat Module Weather Map ({bannerText})
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.module_acoustics}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <span className="text-[11px] text-slate-500">
            NASA Limits: CO₂ ≤ {V.limits.co2TargetMmhg} mmHg · O₂ ≥ {V.limits.o2YellowBelowMmhg}/{V.limits.o2RedBelowMmhg} mmHg · {V.limits.pressureMinPsia}–{V.limits.pressureMaxPsia} psia · &lt;{V.limits.noiseHazardDba} dBA
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {moduleViews.map(({ mod, air, trend, minsToTarget, ledger, oddsText }) => {
            const st = AIR_STYLE[air.status];
            return (
              <div key={mod.id} className={`rounded-2xl border p-4 ${st.card}`}>
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AirIcon status={air.status} />
                    <h3 className="text-sm font-bold text-slate-900">{mod.name} Module</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${st.badge}`}>
                      {st.label} · {air.worstMetric.text}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {air.metrics.map((m) => (
                    <div key={m.metric} className="rounded-xl border border-slate-200/80 bg-slate-50 p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold uppercase text-slate-500">
                          {m.metric}
                        </span>
                        <AirIcon status={m.status} className="h-3.5 w-3.5" />
                      </div>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                        {Number(m.value.toFixed(2))} {m.unit}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-700">
                  <p>
                    <strong>Trend:</strong>{" "}
                    {trend.state === "collecting"
                      ? V.messages.collecting
                      : `${trend.label} (${trend.slopeMmhgPerMin > 0 ? "+" : ""}${trend.slopeMmhgPerMin.toFixed(3)} mmHg/min)`}
                    {minsToTarget !== null ? ` · ${trendMessage(minsToTarget)}` : ""}
                  </p>
                  {oddsText && (
                    <p className="font-medium text-red-800">
                      CO₂ Risk: {oddsText}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Exposure: {ledger.minutesAboveTarget} min above {V.limits.co2TargetMmhg} mmHg · Max CO₂ {Number(ledger.maxCo2Mmhg.toFixed(2))} mmHg
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CO2 Telemetry Charts (with 4 mmHg NASA target dashed line) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Per-Module CO₂ History &amp; NASA Target ({V.limits.co2TargetMmhg} mmHg)
          </h2>
          <InfoCircle
            entry={ENVIRONMENT_RESEARCH_METADATA.co2_headache_risk}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {charts.map((chart) => (
            <HazardTelemetryChart key={chart.id} chart={chart} />
          ))}
        </div>
      </section>

      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
