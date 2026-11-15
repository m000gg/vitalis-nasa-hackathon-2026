"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  TrendingDown,
  TrendingUp,
  Users,
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
  buildEnvironmentModel,
  ENVIRONMENT_PIPELINE_VALUES,
  ENVIRONMENT_RESEARCH_METADATA,
  type AirStatus,
  type Co2Level,
  type ModuleAlert,
  type ModuleModel,
} from "@/lib/hazards/05-environment";
import type { HazardScreenProps } from "./types";

const V = ENVIRONMENT_PIPELINE_VALUES;
const ACK_STORAGE_KEY = "vitalis.hazard5.acknowledgedAlerts";
const ACK_STORAGE_MAX = 200;

type StatusKey = "NOMINAL" | "ELEVATED" | "CRITICAL";

const STATUS_STYLE: Record<StatusKey, { badge: string; panel: string }> = {
  NOMINAL: {
    badge: "border-[#16A34A]/40 bg-[#16A34A]/15 text-emerald-300",
    panel: "border-[#16A34A]/40 bg-[#16A34A]/10",
  },
  ELEVATED: {
    badge: "border-[#D97706]/45 bg-[#D97706]/15 text-amber-200",
    panel: "border-[#D97706]/45 bg-[#D97706]/12",
  },
  CRITICAL: {
    badge: "border-[#DC2626]/50 bg-[#DC2626]/15 text-red-200",
    panel: "border-[#DC2626]/50 bg-[#DC2626]/12",
  },
};

const AIR_STYLE: Record<AirStatus, { card: string; badge: string; ring: string; label: string }> = {
  green: {
    card: "border-[#16A34A]/40 bg-[#0B111F]",
    badge: "bg-[#16A34A]/20 text-emerald-300",
    ring: "ring-emerald-500",
    label: "GREEN",
  },
  yellow: {
    card: "border-[#D97706]/45 bg-[#D97706]/10",
    badge: "bg-[#D97706]/20 text-amber-200",
    ring: "ring-amber-500",
    label: "YELLOW",
  },
  red: {
    card: "border-[#DC2626]/50 bg-[#DC2626]/10",
    badge: "bg-[#DC2626]/20 text-red-200",
    ring: "ring-red-500",
    label: "RED",
  },
};

const LEVEL_BADGE: Record<Co2Level, string> = {
  low: "bg-[#16A34A]/20 text-emerald-300",
  elevated: "bg-[#D97706]/20 text-amber-200",
  high: "bg-[#DC2626]/20 text-red-200",
};

function fmtNum(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

function AirIcon({ status, className = "h-4 w-4" }: { status: AirStatus; className?: string }) {
  if (status === "red") return <XCircle className={`${className} text-red-400`} aria-hidden="true" />;
  if (status === "yellow") return <AlertTriangle className={`${className} text-amber-400`} aria-hidden="true" />;
  return <CheckCircle2 className={`${className} text-emerald-400`} aria-hidden="true" />;
}

function TrendBadge({ mod }: { mod: ModuleModel }) {
  if (mod.forecast.state !== "ready") {
    return <span className="text-slate-400">{V.messages.collecting}</span>;
  }
  const f = mod.forecast;
  const Icon = f.trend === "rising" ? TrendingUp : f.trend === "falling" ? TrendingDown : null;
  const tone =
    f.trend === "rising" ? "text-red-300" : f.trend === "falling" ? "text-emerald-300" : "text-slate-300";
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${tone}`}>
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {f.trend} ({f.slopeMmhgPerMin > 0 ? "+" : ""}
      {fmtNum(f.slopeMmhgPerMin, 3)} mmHg/min)
    </span>
  );
}

function useAcknowledgedAlerts() {
  const [acked, setAcked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setAcked(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
      // Storage unavailable: keep acknowledgements in memory.
    }
  }, []);

  const acknowledge = (ackKey: string) => {
    setAcked((prev) => {
      if (prev.includes(ackKey)) return prev;
      const next = [...prev, ackKey].slice(-ACK_STORAGE_MAX);
      try {
        window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage write failure.
      }
      return next;
    });
  };

  return { acked, acknowledge };
}

function AlertBannerCard({
  alert,
  acked,
  onAck,
}: {
  alert: ModuleAlert;
  acked: boolean;
  onAck: () => void;
}) {
  const critical = alert.severity === "critical";
  return (
    <article
      className={`rounded-xl border p-3.5 text-xs ${
        acked
          ? "border-slate-800 bg-[#060A14] opacity-75"
          : critical
          ? "border-[#DC2626]/50 bg-[#DC2626]/15"
          : "border-[#D97706]/45 bg-[#D97706]/15"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {critical ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold text-slate-100">
              <span className={critical ? "text-red-300" : "text-amber-300"}>
                {critical ? "CRITICAL" : "WARNING"}
              </span>{" "}
              · {alert.title}
            </p>
            <p className="mt-0.5 text-slate-400">
              {critical ? "Above 4 mmHg limit now" : `ETA ~${alert.etaMin} min`} · started min {alert.startedAtMin}
            </p>
          </div>
        </div>
        {acked ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Acknowledged
          </span>
        ) : (
          <button
            type="button"
            onClick={onAck}
            className="rounded-md border border-slate-700 bg-[#0B111F] px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800/80"
          >
            Acknowledge
          </button>
        )}
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 pl-8 text-slate-200">
        {alert.actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ol>
    </article>
  );
}

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN
 * Combines 05-closed-env real NASA OSDR EDA replay, 30-min linear regression CO2 forecast,
 * alert acknowledgements, and interactive habitat map with feat/combine's clean layout.
 */
export function EnvironmentHazardScreen({
  hazard,
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  scenarioHazardRecords,
  scenarioHazardSamples,
}: HazardScreenProps) {
  const model = useMemo(
    () =>
      buildEnvironmentModel({
        actorInputs: snapshot.actorInputOverrides,
        hazardRecords,
        hazardSamples,
        scenarioHazardRecords,
        scenarioHazardSamples,
      }),
    [
      snapshot.actorInputOverrides,
      hazardRecords,
      hazardSamples,
      scenarioHazardRecords,
      scenarioHazardSamples,
    ]
  );

  const [selectedId, setSelectedId] = useState<string>(V.modules[0].id);
  const { acked, acknowledge } = useAcknowledgedAlerts();
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);

  const charts = snapshot.charts ?? [];
  const openAlerts = model.alerts.filter((a) => !acked.includes(a.ackKey)).length;
  const safestGreenModule =
    model.modules.find((m) => m.moduleId === model.lowestCo2ModuleId && m.air.status === "green") ??
    model.modules.find((m) => m.air.status === "green") ??
    null;

  return (
    <div className="space-y-6">
      {/* 1. Ready-to-Act Primary Briefing */}
      <section className={`hud-panel rounded-lg border p-5 ${STATUS_STYLE[snapshot.status].panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[snapshot.status].badge}`}
            >
              <Wind className="h-3.5 w-3.5" aria-hidden="true" />
              {snapshot.status}
            </span>
            <h2 className="font-display text-base font-bold text-slate-100">
              Habitat Air &amp; Environmental Briefing
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.habitat_air_briefing}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
            <span className="inline-flex items-center gap-1 rounded-md bg-[#3B82F6]/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
              {role === "lead" ? (
                <>
                  <Users className="h-3 w-3" /> Commander View (All Crew)
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Personal View ({activeCharacter.callsign})
                </>
              )}
            </span>
            <span className="rounded-md bg-[#0B111F]/90 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-800">
              {model.dataTag === "REAL" ? "Cabin CO₂: NASA OSDR EDA" : "Cabin CO₂: Simulated Replay"}
            </span>
            <span className="rounded-md bg-[#0B111F]/90 px-2 py-0.5 font-mono text-[11px] text-slate-400 border border-slate-800">
              min {model.nowMin} · {model.scenarioLabel}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B111F] px-2.5 py-1 text-xs font-medium text-slate-300">
            <Clock className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
            {snapshot.eta}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-800 bg-[#0B111F] p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                Immediate Horizon (Module Alarms &amp; Trend Warnings)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B111F] p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                Prolonged Horizon (CO₂ Risk Forecast &amp; Exposure Ledger)
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#3B82F6]/35 bg-[#0B111F] p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-blue-200 uppercase">
              Prioritized Module Actions ({snapshot.solutions.length} Max)
            </p>
            {snapshot.solutions.length > 0 ? (
              <ol className="mt-2.5 space-y-2">
                {snapshot.solutions.map((sol, idx) => (
                  <li
                    key={sol}
                    className="flex items-start gap-2.5 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/15 p-3 text-sm leading-snug text-blue-100"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span>{sol}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2.5 rounded-xl border border-[#16A34A]/40 bg-[#16A34A]/12 p-3 text-xs text-emerald-200">
                All modules nominal · 0 CO₂ alerts in 120 min window.
              </p>
            )}
          </div>
        </div>

        {/* Active CO2 Alert Episodes with browser acknowledgement */}
        {model.alerts.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-wide text-slate-300 uppercase">
                Active CO₂ Alerts
              </span>
              <span className="text-[11px] text-slate-400">
                {model.alerts.length} active · {openAlerts} unacknowledged
              </span>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {model.alerts.map((alert) => (
                <AlertBannerCard
                  key={alert.ackKey}
                  alert={alert}
                  acked={acked.includes(alert.ackKey)}
                  onAck={() => acknowledge(alert.ackKey)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. Interactive Habitat Module Weather Map (4 Modules) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">
              Habitat Module Weather Map ({model.banner})
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.module_acoustics}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <span className="text-[11px] text-slate-400">
            Limits: CO₂ ≤ {V.limits.co2TargetMmhg} mmHg · O₂ ≥ {V.limits.o2YellowBelowMmhg}/{V.limits.o2RedBelowMmhg} mmHg · {V.limits.pressureMinPsia}–{V.limits.pressureMaxPsia} psia · &lt;{V.limits.noiseHazardDba} dBA
          </span>
        </div>

        {/* Compact Schematic Hatch Strip */}
        <div className="flex flex-col items-stretch gap-2 hud-panel rounded-lg border border-dashed border-slate-700 bg-[#060A14] p-3 sm:flex-row sm:items-center">
          {model.modules.map((mod, idx) => {
            const st = AIR_STYLE[mod.air.status];
            const isSelected = mod.moduleId === selectedId;
            return (
              <React.Fragment key={mod.moduleId}>
                {idx > 0 && (
                  <span aria-hidden="true" className="mx-auto h-3 w-2 rounded-sm bg-slate-700 sm:mx-0 sm:h-2 sm:w-4" />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedId(mod.moduleId)}
                  aria-pressed={isSelected}
                  className={`flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${st.card} ${
                    isSelected ? `ring-2 ring-offset-1 ring-offset-[#0B111F] ${st.ring}` : "hover:brightness-110"
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-100">{mod.moduleName}</p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {mod.air.status === "green" ? "All nominal" : mod.air.worstMetric.text}
                    </p>
                  </div>
                  <AirIcon status={mod.air.status} />
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {model.modules.map((mod) => {
            const st = AIR_STYLE[mod.air.status];
            const isSelected = mod.moduleId === selectedId;
            const isLowest = mod.moduleId === model.lowestCo2ModuleId;
            return (
              <div
                key={mod.moduleId}
                onClick={() => setSelectedId(mod.moduleId)}
                className={`cursor-pointer hud-panel rounded-lg border p-4 transition ${st.card} ${
                  isSelected ? `ring-2 ring-offset-1 ring-offset-[#0B111F] ${st.ring}` : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AirIcon status={mod.air.status} />
                    <h3 className="text-sm font-bold text-slate-100">{mod.moduleName} Module</h3>
                    {isLowest && model.counts.red > 0 && (
                      <span className="rounded bg-[#3B82F6]/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                        Lowest CO₂
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${st.badge}`}>
                      {st.label} · {mod.air.worstMetric.text}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {mod.air.metrics.map((m) => (
                    <div key={m.metric} className="rounded-xl border border-slate-800/80 bg-[#060A14] p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold uppercase text-slate-400">
                          {m.metric === "co2" ? "CO₂" : m.metric === "o2" ? "O₂" : m.metric}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`rounded px-1 py-0.5 font-mono text-[9px] font-semibold ${
                              m.tag === "REAL" ? "bg-[#3B82F6]/20 text-blue-300" : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {m.tag}
                          </span>
                          <AirIcon status={m.status} className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                        {fmtNum(m.value, m.metric === "co2" ? 2 : 1)} {m.unit}
                      </p>
                    </div>
                  ))}
                </div>

                {mod.infoMetrics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    {mod.infoMetrics.map((im) => (
                      <span
                        key={im.key}
                        className="rounded-md border border-slate-800 bg-[#060A14] px-2 py-0.5 font-mono"
                      >
                        {im.label}: {fmtNum(im.value, 1)} {im.unit}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Trend:</strong> <TrendBadge mod={mod} />
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${LEVEL_BADGE[mod.level]}`}>
                      CO₂ {mod.level}
                    </span>
                  </div>
                  <p>
                    <strong>Headache Odds:</strong> {mod.multiplierText} · {mod.weeklyRiskText}
                    {mod.forecast.state === "ready"
                      ? ` · +2h proj: ${fmtNum(mod.forecast.projectedCo2Mmhg, 2)} mmHg`
                      : ""}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Exposure: {mod.ledger.minutesAboveLimit} min above {V.limits.co2TargetMmhg} mmHg · Max CO₂{" "}
                    {fmtNum(mod.ledger.maxCo2Mmhg, 2)} mmHg
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CO2 Telemetry & +2h Projection Charts */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">
              Per-Module CO₂ History, +2h Projection &amp; NASA Target ({V.limits.co2TargetMmhg} mmHg)
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.co2_headache_risk}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <span className="text-[11px] text-slate-400">
            Solid: last 2 h · Dashed blue: +2 h trend projection
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {charts.map((chart) => (
            <HazardTelemetryChart key={chart.id} chart={chart} />
          ))}
        </div>
      </section>

      {role === "lead" && (
        <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display flex items-center gap-2 text-sm font-bold text-slate-100">
                <Users className="h-4 w-4 text-[#3B82F6]" />
                Crew Habitat Relocation &amp; Accountability ({mission.crew.length} Crew)
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {hazard.leadView.privacyRule}
              </p>
            </div>
            <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
              Safe Zone Target: {safestGreenModule?.moduleName ?? "No green module"}
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {mission.crew.map((member, idx) => {
              const assignedMod = model.modules[idx % model.modules.length];
              const modStatus = assignedMod?.air.status ?? "green";
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs ${
                    member.id === activeCharacter.id
                      ? "border-[#3B82F6]/45 bg-[#3B82F6]/10"
                      : "border-slate-800 bg-[#060A14]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100">{member.callsign}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          member.isLeadSlot
                            ? "bg-[#3B82F6]/20 text-blue-300"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {member.isLeadSlot ? "LEAD" : "MEMBER"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{member.assignedRoleTitle}</p>
                    <p className="mt-0.5 text-[11px] text-slate-300">
                      Station: <strong>{assignedMod?.moduleName ?? "Habitat"}</strong>
                      {modStatus !== "green" && safestGreenModule
                        ? ` → Move to ${safestGreenModule.moduleName}`
                        : " · Clear"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${AIR_STYLE[modStatus].badge}`}
                  >
                    {AIR_STYLE[modStatus].label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
