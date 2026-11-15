"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Dumbbell,
  HeartPulse,
  Lock,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import {
  InfoCircle,
  ResearchModal,
  type ActiveResearchInfoState,
} from "@/components/ResearchInfoModal";
import {
  ConditioningStatusLabel,
  evaluateGravityCrewOverview,
  evaluateGravityDiagnostics,
  formatTrendCiRange,
  GRAVITY_PIPELINE_VALUES,
  GRAVITY_RESEARCH_METADATA,
  GravityActorDiagnostics,
  GravityCrewOverview,
  LinearTrendResult,
  PreTestConditionCheckItem,
} from "@/lib/hazards/04-gravity";
import type { HazardScreenProps } from "./types";

/**
 * HAZARD 4: GRAVITY FIELDS SCREEN (Read-Only, DB-Driven)
 * Owner: Teammate 4 — Edit ONLY this file (and src/lib/hazards/04-gravity.ts).
 */

const CONDITION_STATUS_STYLES: Record<PreTestConditionCheckItem["status"], string> = {
  VALID: "bg-[#16A34A]/20 text-emerald-300",
  VIOLATED: "bg-[#DC2626]/20 text-red-300",
  UNLOGGED: "bg-slate-800/80 text-slate-400",
};

const CONDITIONING_STYLES: Record<ConditioningStatusLabel, string> = {
  ON_TRACK: "bg-[#16A34A]/20 text-emerald-300",
  WATCH: "bg-[#D97706]/20 text-amber-300",
  ALERT: "bg-[#DC2626]/20 text-red-300",
  UNLOGGED: "bg-slate-800/80 text-slate-400",
};

function formatSignedPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

function renderTrendForecast(trend: LinearTrendResult, thresholdPct: number): string | null {
  if (trend.latestPctChange <= thresholdPct) {
    return `Crossed ${thresholdPct}% limit at FD${trend.latestFlightDay}`;
  }
  if (trend.isThresholdProjectedCrossed && trend.projectedCrossFlightDay !== null) {
    const crossFd = Math.round(trend.projectedCrossFlightDay);
    return `Projected crossed ${thresholdPct}% (~FD${crossFd})${formatTrendCiRange(trend)}`;
  }
  if (trend.etaDaysToThreshold !== null) {
    return `Reaches ${thresholdPct}% in ~${trend.etaDaysToThreshold}d${formatTrendCiRange(trend)}`;
  }
  return null;
}

export function GravityHazardScreen({
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
  const diagnostics = evaluateGravityDiagnostics({
    actor: activeCharacter,
    role,
    hazardRecords,
    hazardSamples,
    allHazardRecords: scenarioHazardRecords.filter((r) => r.characterId === activeCharacter.id),
    missionContext: `${mission.name} ${mission.durationContext}`,
  });

  const crewOverview =
    role === "lead"
      ? evaluateGravityCrewOverview(
          mission,
          scenarioHazardRecords,
          scenarioHazardSamples
        )
      : null;

  // Exclude generic sample-* fallback charts so dedicated normalized Calf %, Grip %, Exercise min, or RBAC Crew charts render cleanly
  const charts = (snapshot.charts ?? []).filter((c) => !c.id.startsWith("sample-"));
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);

  return (
    <div className="space-y-4">
      <section
        className={`hud-panel rounded-lg border p-5 ${
          snapshot.status === "CRITICAL"
            ? "border-[#DC2626]/50 bg-[#DC2626]/12"
            : snapshot.status === "ELEVATED"
            ? "border-[#D97706]/45 bg-[#D97706]/12"
            : "border-[#16A34A]/40 bg-[#16A34A]/10"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                snapshot.status === "CRITICAL"
                  ? "border-[#DC2626]/50 bg-[#DC2626]/15 text-red-200"
                  : snapshot.status === "ELEVATED"
                  ? "border-[#D97706]/45 bg-[#D97706]/15 text-amber-200"
                  : "border-[#16A34A]/40 bg-[#16A34A]/15 text-emerald-300"
              }`}
            >
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              {snapshot.status}
            </span>
            <h2 className="font-display text-base font-bold text-slate-100">
              Gravity &amp; Conditioning Briefing
            </h2>
            <InfoCircle
              entry={GRAVITY_RESEARCH_METADATA.eva_readiness_gate}
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
            <span className="rounded-md border border-slate-800 bg-[#0B111F]/90 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              FD {diagnostics.currentFlightDay ?? "—"} ·{" "}
              {diagnostics.conditioningStatus.replace("_", " ")}
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
                Immediate Horizon (Condition Guard &amp; Cadence)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B111F] p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                Prolonged Horizon (Atrophy &amp; Bone-Shield)
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#3B82F6]/35 bg-[#0B111F] p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-blue-200 uppercase">
              Prioritized Conditioning Actions ({snapshot.solutions.length} Max)
            </p>
            <ol className="mt-2.5 space-y-2">
              {snapshot.solutions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/15 p-3 text-sm leading-snug text-blue-100"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 3. Role-Specific Operational Views */}
      {role === "lead" && crewOverview ? (
        <LeadGravitySection
          overview={crewOverview}
          hazard={hazard}
          activeInfo={activeInfo}
          onSelectInfo={setActiveInfo}
        />
      ) : (
        <MemberGravitySection
          diagnostics={diagnostics}
          activeInfo={activeInfo}
          onSelectInfo={setActiveInfo}
        />
      )}

      {/* 4. Deterministic Telemetry Charts (with dashed threshold lines) */}
      <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              {role === "lead"
                ? "Crew Conditioning & Adherence Telemetry"
                : "Personal Conditioning & Exercise Trends"}
            </h2>
            <p className="text-xs text-slate-400">
              Dashed lines mark target thresholds.
            </p>
          </div>
          <span className="rounded-md bg-slate-800/80 px-2.5 py-1 font-mono text-[11px] text-slate-300">
            {charts.length} active chart(s)
          </span>
        </div>

        {charts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {charts.map((chart) => (
              <HazardTelemetryChart key={chart.id} chart={chart} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-[#060A14] p-6 text-center text-xs text-slate-400">
            {role === "lead"
              ? "No crew exercise adherence logs recorded yet."
              : "No conditioning or exercise time-series samples recorded yet."}
          </div>
        )}
      </section>

      {/* 5. Telemetry Streams */}
      <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-300">
            <Database className="h-3.5 w-3.5 text-[#3B82F6]" />
            Telemetry Streams ({activeCharacter.callsign})
          </h3>
          <InfoCircle
            entry={GRAVITY_RESEARCH_METADATA.exercise_timing_reconditioning}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {hazard.inputSlots.map((slot) => {
            const rec = hazardRecords.find((r) => r.streamName === slot.streamName);
            const hasAnyPrivateSubfield = slot.subfields?.some((sf) => sf.isPrivate);
            const hideRawSummaryForLead =
              role === "lead" && slot.streamName === "Handgrip & Calf Volume";

            return (
              <div
                key={slot.streamName}
                className="rounded-xl border border-slate-800 bg-[#060A14] p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{slot.streamName}</span>
                  <span className="rounded bg-[#0B111F] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    {slot.sourceRef}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {hideRawSummaryForLead
                    ? "Personal metrics hidden from Lead view."
                    : rec?.rawValue
                    ? rec.rawValue
                    : "No telemetry yet"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>
                    {rec ? `Updated ${new Date(rec.updatedAt).toLocaleString()}` : "—"}
                  </span>
                  {hasAnyPrivateSubfield && (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Lock className="h-3 w-3" /> Private to crew member
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}

function LeadGravitySection({
  overview,
  hazard,
  activeInfo,
  onSelectInfo,
}: {
  overview: GravityCrewOverview;
  hazard: HazardScreenProps["hazard"];
  activeInfo: ActiveResearchInfoState;
  onSelectInfo: (next: ActiveResearchInfoState) => void;
}) {
  return (
    <section className="space-y-4">
      {/* Crew Exercise Discipline Buff & Conditioning Split */}
      <div className="grid gap-3 md:grid-cols-4">
        <div
          className={`hud-panel rounded-lg border p-4 md:col-span-2 ${
            overview.teamExerciseBuffActive
              ? "border-[#16A34A]/40 bg-[#16A34A]/15"
              : "border-slate-800 bg-[#0B111F]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <Dumbbell className="h-4 w-4 text-emerald-300" />
              Team Exercise Discipline Buff
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                overview.teamExerciseBuffActive
                  ? "bg-[#16A34A]/25 text-emerald-200"
                  : "bg-slate-800/80 text-slate-300"
              }`}
            >
              {overview.teamExerciseBuffActive ? "ON TARGET" : "MONITORING"}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            {overview.loggedExerciseCrewCount > 0 ? (
              <>
                Team mean adherence:{" "}
                <strong className="font-semibold">
                  {overview.teamExerciseDisciplinePct}%
                </strong>{" "}
                ({overview.disciplinedCrewCount}/{overview.loggedExerciseCrewCount} logged crew{" "}
                &ge; {GRAVITY_PIPELINE_VALUES.assumptions.weeklyAdherenceAlertPct}% target).
              </>
            ) : (
              "No daily exercise logs recorded yet."
            )}
          </p>
        </div>

        <div className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Crew Conditioning Split
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-md bg-[#16A34A]/20 px-2 py-0.5 text-emerald-300">
              ON TRACK: {overview.onTrackCount}
            </span>
            <span className="rounded-md bg-[#D97706]/20 px-2 py-0.5 text-amber-300">
              WATCH: {overview.watchCount}
            </span>
            <span className="rounded-md bg-[#DC2626]/20 px-2 py-0.5 text-red-300">
              ALERT: {overview.alertCount}
            </span>
          </div>
        </div>

        <div className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Lock className="h-3.5 w-3.5 text-slate-400" /> Crew Privacy Guard
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
            {hazard.leadView.privacyRule}
          </p>
        </div>
      </div>

      {/* Crew Conditioning & Atrophy Matrix */}
      <div className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-slate-100">
                Crew Conditioning &amp; Atrophy Matrix (MEDB 5.2 / 5.4)
              </h2>
              <InfoCircle
                entry={GRAVITY_RESEARCH_METADATA.calf_atrophy_bone}
                activeInfo={activeInfo}
                onSelectInfo={onSelectInfo}
              />
            </div>
            <p className="text-xs text-slate-400">
              Conditioning band, flags &amp; adherence only · raw anthropometrics sealed
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3 font-semibold">Crew Member</th>
                <th className="px-3 py-2 font-semibold">Conditioning</th>
                <th className="px-3 py-2 font-semibold">Exercise Disc.</th>
                <th className="px-3 py-2 font-semibold">Blocker Categories &amp; Flags</th>
                <th className="py-2 pl-3 font-semibold">Projected ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {overview.members.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-slate-100">{m.callsign}</div>
                    <div className="text-[11px] text-slate-400">{m.assignedRoleTitle}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        CONDITIONING_STYLES[m.conditioningStatus]
                      }`}
                    >
                      {m.conditioningStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-200">
                    {m.adherencePct !== null ? `${m.adherencePct}%` : "—"}
                    {m.reconditioningDayRPlus !== null && (
                      <div className="text-[10px] text-blue-300">
                        MR026L R+{m.reconditioningDayRPlus}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-300">
                    {m.blockerCategories.length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4">
                        {m.blockerCategories.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-300">No active blockers</span>
                    )}
                    {m.conditionFlagCount > 0 && (
                      <div className="mt-1 font-medium text-amber-300">
                        Pre-test condition flags: {m.conditionFlagCount}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-slate-400">{m.etaLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MemberGravitySection({
  diagnostics,
  activeInfo,
  onSelectInfo,
}: {
  diagnostics: GravityActorDiagnostics;
  activeInfo: ActiveResearchInfoState;
  onSelectInfo: (next: ActiveResearchInfoState) => void;
}) {
  const { currentFlightDay, conditionChecks, atrophy } = diagnostics;
  const A = GRAVITY_PIPELINE_VALUES.assumptions;

  return (
    <div className="space-y-4">
      {/* Feature 1: Pre-Test Condition Guard */}
      <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display flex items-center gap-2 text-sm font-bold text-slate-100">
                <ShieldCheck className="h-4 w-4 text-[#3B82F6]" />
                Pre-Test Condition Guard (Validity Windows)
              </h2>
              <InfoCircle
                entry={GRAVITY_RESEARCH_METADATA.eva_readiness_gate}
                activeInfo={activeInfo}
                onSelectInfo={onSelectInfo}
              />
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Fasting, caffeine, exercise &amp; morning timing checks
            </p>
          </div>
          <span className="rounded-md bg-slate-800/80 px-2.5 py-1 font-mono text-[11px] text-slate-300">
            FD {currentFlightDay ?? "—"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {conditionChecks.map((cond) => (
            <div
              key={cond.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#060A14] px-3 py-2 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-100">{cond.label}</div>
                <div className="text-[11px] text-slate-400">
                  {cond.requirement} ·{" "}
                  <span className="font-medium text-slate-300">{cond.detail}</span>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  CONDITION_STATUS_STYLES[cond.status]
                }`}
              >
                {cond.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Feature 2: Microgravity Atrophy, Proxy Bone-Shield & Conditioning */}
      <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display flex items-center gap-2 text-sm font-bold text-slate-100">
              <Activity className="h-4 w-4 text-[#3B82F6]" />
              Microgravity Atrophy, Proxy Bone-Shield &amp; Conditioning
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              L+14 / FD14 trends &amp; resistance adherence
            </p>
          </div>
          {atrophy.adherenceSummary?.reconditioningDayRPlus !== null &&
            atrophy.adherenceSummary?.reconditioningDayRPlus !== undefined && (
              <span className="rounded-md bg-[#3B82F6]/20 px-2.5 py-1 text-xs font-semibold text-blue-200">
                MR026L Postflight R+{atrophy.adherenceSummary.reconditioningDayRPlus} (120 min/d)
              </span>
            )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Calf Volume */}
          <div className="rounded-xl border border-slate-800 bg-[#060A14] p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">Calf Volume (MEDB 5.4)</span>
              <div className="flex items-center gap-1.5">
                {atrophy.calfDaysOverdue !== null && atrophy.calfDaysOverdue > 0 && (
                  <span className="rounded bg-[#D97706]/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    Overdue {atrophy.calfDaysOverdue}d
                  </span>
                )}
                <InfoCircle
                  entry={GRAVITY_RESEARCH_METADATA.calf_atrophy_bone}
                  activeInfo={activeInfo}
                  onSelectInfo={onSelectInfo}
                />
              </div>
            </div>
            {atrophy.calfTrend ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-100">
                  {formatSignedPct(atrophy.calfTrend.latestPctChange)}
                </div>
                <div className="text-[11px] text-slate-400">
                  vs L+14 baseline (FD{atrophy.calfTrend.latestFlightDay}) · N=
                  {atrophy.calfTrend.sampleSize} · Slope{" "}
                  {(atrophy.calfTrend.slopePctPerDay * 7).toFixed(2)}%/wk
                </div>
                {renderTrendForecast(atrophy.calfTrend, A.calfAtrophyAlertPct) && (
                  <div
                    className={`text-[11px] font-medium ${
                      atrophy.calfTrend.isThresholdProjectedCrossed
                        ? "text-red-300"
                        : "text-amber-300"
                    }`}
                  >
                    {renderTrendForecast(atrophy.calfTrend, A.calfAtrophyAlertPct)}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                No valid morning fasted calf + paired mass samples yet.
              </p>
            )}
            {atrophy.invalidCalfSamplesCount > 0 && (
              <p className="mt-1.5 text-[10px] font-medium text-red-300">
                {atrophy.invalidCalfSamplesCount} sample(s) excluded (non-fasted/unpaired).
              </p>
            )}
          </div>

          {/* Handgrip */}
          <div className="rounded-xl border border-slate-800 bg-[#060A14] p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">Handgrip (MR081L)</span>
              <div className="flex items-center gap-1.5">
                {atrophy.gripDaysOverdue !== null && atrophy.gripDaysOverdue > 0 && (
                  <span className="rounded bg-[#D97706]/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    Overdue {atrophy.gripDaysOverdue}d
                  </span>
                )}
                <InfoCircle
                  entry={GRAVITY_RESEARCH_METADATA.handgrip_dynamometry}
                  activeInfo={activeInfo}
                  onSelectInfo={onSelectInfo}
                />
              </div>
            </div>
            {atrophy.gripTrend ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-100">
                  {formatSignedPct(atrophy.gripTrend.latestPctChange)}
                </div>
                <div className="text-[11px] text-slate-400">
                  vs FD14 baseline (FD{atrophy.gripTrend.latestFlightDay}) · N=
                  {atrophy.gripTrend.sampleSize} · Slope{" "}
                  {(atrophy.gripTrend.slopePctPerDay * 7).toFixed(2)}%/wk
                </div>
                {renderTrendForecast(atrophy.gripTrend, A.gripDeclineAlertPct) && (
                  <div
                    className={`text-[11px] font-medium ${
                      atrophy.gripTrend.isThresholdProjectedCrossed
                        ? "text-red-300"
                        : "text-amber-300"
                    }`}
                  >
                    {renderTrendForecast(atrophy.gripTrend, A.gripDeclineAlertPct)}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                No monthly handgrip samples recorded yet (every 30d).
              </p>
            )}
          </div>

          {/* 7d Exercise & Proxy Bone-Shield */}
          <div className="rounded-xl border border-slate-800 bg-[#060A14] p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">Exercise &amp; Bone Proxy</span>
              <div className="flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-[#3B82F6]" />
                <InfoCircle
                  entry={GRAVITY_RESEARCH_METADATA.exercise_timing_reconditioning}
                  activeInfo={activeInfo}
                  onSelectInfo={onSelectInfo}
                />
              </div>
            </div>
            {atrophy.adherenceSummary ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-100">
                  {atrophy.adherenceSummary.reconditioningPct ??
                    atrophy.adherenceSummary.overallPct}
                  %
                </div>
                <div className="text-[11px] text-slate-400">
                  Avg {atrophy.adherenceSummary.avgTotalMinutes} min/d (
                  {atrophy.adherenceSummary.reconditioningDayRPlus !== null
                    ? `target 120 min/d MR026L R+${atrophy.adherenceSummary.reconditioningDayRPlus}`
                    : "target 150 min/d MEDB 5.2"}
                  ) · Aerobic {atrophy.adherenceSummary.aerobicPct}% · Resist{" "}
                  {atrophy.adherenceSummary.resistancePct}%
                </div>
                {atrophy.adherenceSummary.loadRatioPct !== null && (
                  <div className="text-[11px] font-medium text-slate-300">
                    Resistance load ratio (MEDB 1.11 proxy):{" "}
                    {atrophy.adherenceSummary.loadRatioPct}%
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                Target 150 min/d (60m aerobic + 90m resistance, MEDB 5.2).
              </p>
            )}
          </div>

          {/* Meal/Sleep Guard & Postflight Card */}
          <div className="rounded-xl border border-slate-800 bg-[#060A14] p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">Timing Guard &amp; MR026L</span>
              <InfoCircle
                entry={GRAVITY_RESEARCH_METADATA.exercise_timing_reconditioning}
                activeInfo={activeInfo}
                onSelectInfo={onSelectInfo}
              />
            </div>
            {atrophy.adherenceSummary ? (
              <div className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {atrophy.adherenceSummary.mealViolations === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span>
                    Post-meal &ge;90m violations: {atrophy.adherenceSummary.mealViolations}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {atrophy.adherenceSummary.sleepViolations === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>
                    Pre-sleep &ge;2h violations: {atrophy.adherenceSummary.sleepViolations}
                  </span>
                </div>
                {diagnostics.sleepCrossNote && (
                  <p className="text-[10px] text-amber-300">{diagnostics.sleepCrossNote}</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-400">
                Enforces MEDB 5.2 (&ge;90m post-meal, &ge;2h pre-sleep) and R+0..R+45 120 min/d
                reconditioning.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
