"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Dumbbell,
  HeartPulse,
  Info,
  Lock,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import {
  ConditioningStatusLabel,
  evaluateGravityCrewOverview,
  evaluateGravityDiagnostics,
  EvaChainCheckItem,
  EvaGateDecision,
  GRAVITY_PIPELINE_VALUES,
  GravityActorDiagnostics,
  GravityCrewOverview,
  PreTestConditionCheckItem,
} from "@/lib/hazards/04-gravity";
import type { HazardScreenProps } from "./types";

/**
 * HAZARD 4: GRAVITY FIELDS SCREEN (Read-Only, DB-Driven)
 * Owner: Teammate 4 — Edit ONLY this file (and src/lib/hazards/04-gravity.ts).
 */

const GATE_STYLES: Record<EvaGateDecision, string> = {
  GO: "border-emerald-200 bg-emerald-100 text-emerald-800",
  CONDITIONAL: "border-amber-200 bg-amber-100 text-amber-800",
  "NO-GO": "border-red-200 bg-red-100 text-red-800",
};

const CHAIN_STATUS_STYLES: Record<EvaChainCheckItem["status"], string> = {
  PASS: "bg-emerald-100 text-emerald-800",
  BLOCKER: "bg-red-100 text-red-800",
  LOCKOUT: "bg-red-100 text-red-900",
  PENDING: "bg-amber-100 text-amber-800",
  NA: "bg-slate-100 text-slate-600",
};

const CONDITION_STATUS_STYLES: Record<PreTestConditionCheckItem["status"], string> = {
  VALID: "bg-emerald-100 text-emerald-800",
  VIOLATED: "bg-red-100 text-red-800",
  UNLOGGED: "bg-slate-100 text-slate-600",
};

const CONDITIONING_STYLES: Record<ConditioningStatusLabel, string> = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  WATCH: "bg-amber-100 text-amber-800",
  ALERT: "bg-red-100 text-red-800",
  UNLOGGED: "bg-slate-100 text-slate-600",
};

function formatSignedPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

function formatTrendCi(etaMin: number | null, etaMax: number | null): string {
  if (etaMin === null || etaMax === null) return "";
  return ` [CI: ${etaMin}–${etaMax}d]`;
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
  linkOnline,
  reentryMode,
}: HazardScreenProps) {
  const diagnostics = evaluateGravityDiagnostics({
    actor: activeCharacter,
    role,
    hazardRecords,
    hazardSamples,
    allHazardRecords: scenarioHazardRecords,
    reentryMode,
  });

  const crewOverview =
    role === "lead"
      ? evaluateGravityCrewOverview(
          mission,
          scenarioHazardRecords,
          scenarioHazardSamples,
          reentryMode
        )
      : null;

  const charts = snapshot.charts ?? [];

  return (
    <div className="space-y-4">
      {/* 1. Autonomous Telemetry & Role Context Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                {role === "lead" ? (
                  <>
                    <Users className="h-3.5 w-3.5" /> Commander Flight Note View (RBAC Masked)
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Astronaut Private Telemetry View
                  </>
                )}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
                  linkOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                {linkOnline ? "Telemetry Link Active" : "DTN Autonomous Edge Mode"}
              </span>
              {reentryMode && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                  <ShieldAlert className="h-3.5 w-3.5" /> Reentry Mode · 1-Action Cap (MR026L)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              {hazard.overviewSlot.replace(/^Here is:\s*/i, "")} Ground comms ({mission.commsDelayLabel})
              cannot verify Pre-EVA readiness or condition windows in real time — all checks run
              deterministically on-board from synced DB records.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-[11px] text-slate-600">
            <div className="font-semibold text-slate-800">{mission.name}</div>
            <div>
              {hazardRecords.length} synced record(s) · {hazardSamples.length} sample(s)
            </div>
          </div>
        </div>
      </section>

      {/* 2. Evaluated Deterministic Outputs & Guidance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Deterministic Evaluation Outputs ({activeCharacter.callsign})
          </h2>
          <span className="text-[11px] text-slate-500">
            Read-only DB-synced output · Auto-refreshes every 12s
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Immediate Horizon · Pre-EVA Gate
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                  GATE_STYLES[diagnostics.evaGate.decision]
                }`}
              >
                EVA: {diagnostics.evaGate.decision}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-800">
              {snapshot.immediateHorizon}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Prolonged Horizon · Atrophy &amp; Bone-Shield
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  CONDITIONING_STYLES[diagnostics.conditioningStatus]
                }`}
              >
                {diagnostics.conditioningStatus}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-800">
              {snapshot.prolongedHorizon}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Clock className="h-3.5 w-3.5 text-sky-600" /> Estimated Time of Action
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-900">{snapshot.eta}</p>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">
                {reentryMode ? "Priority Action (Reentry 1-Action Cap)" : "1–2 Actionable Solutions"}
              </span>
              <span className="text-[11px] text-sky-700">Deterministic MRID/MEDB priority</span>
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-800">
              {snapshot.solutions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Role-Specific Operational Views */}
      {role === "lead" && crewOverview ? (
        <LeadGravitySection overview={crewOverview} hazard={hazard} />
      ) : (
        <MemberGravitySection diagnostics={diagnostics} reentryMode={reentryMode} />
      )}

      {/* 4. Deterministic Telemetry Charts (with dashed threshold lines) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {role === "lead"
                ? "Crew Conditioning & Adherence Telemetry (RBAC-Safe)"
                : "Personal Conditioning & Exercise Trends"}
            </h2>
            <p className="text-xs text-slate-500">
              Dashed reference lines mark NASA targets or team-configured [ASSUMPTION] alert cutoffs.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-700">
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
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
            {role === "lead"
              ? "No crew exercise adherence logs synced yet for this mission scenario."
              : "No anthropometric or exercise time-series samples synced yet for this astronaut."}
          </div>
        )}
      </section>

      {/* 5. Synced DB Telemetry Streams & NASA Citations Footer */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
              <Database className="h-3.5 w-3.5 text-sky-600" />
              Synced DB Telemetry Streams ({activeCharacter.callsign})
            </h3>
            <div className="mt-2.5 space-y-2">
              {hazard.inputSlots.map((slot) => {
                const rec = hazardRecords.find((r) => r.streamName === slot.streamName);
                const streamSamples = hazardSamples.filter((s) => s.streamName === slot.streamName);
                const hasAnyPrivateSubfield = slot.subfields?.some((sf) => sf.isPrivate);
                const hideRawSummaryForLead =
                  role === "lead" && slot.streamName === "Handgrip & Calf Volume";

                return (
                  <div
                    key={slot.streamName}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{slot.streamName}</span>
                      <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                        {slot.sourceRef}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {hideRawSummaryForLead
                        ? "Personal anthropometric values masked for Crew Lead (RBAC)."
                        : rec?.rawValue
                        ? rec.rawValue
                        : "Awaiting DB telemetry record"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                      <span>
                        {rec
                          ? `Last synced: ${new Date(rec.updatedAt).toLocaleString()}`
                          : "Not yet persisted"}
                        {slot.recordSample ? ` · ${streamSamples.length} sample(s)` : ""}
                      </span>
                      {hasAnyPrivateSubfield && (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Lock className="h-3 w-3" /> Private subfields RBAC-protected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
                <Info className="h-3.5 w-3.5 text-sky-600" />
                NASA Reference Anchors &amp; Scope Guardrails
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                {hazard.nasaReferences.map((ref) => (
                  <li key={ref}>{ref}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900">
              <p className="font-semibold">
                Explicit [ASSUMPTION] Cutoffs vs. NASA MRID/MEDB Rules
              </p>
              <p className="mt-1 leading-relaxed">
                Pre-EVA chain sequences, fasting/caffeine/exercise windows, MEDB 5.2 (150 min/d),
                and MR026L (120 min/d reconditioning) come directly from NASA documentation. Alert
                cutoffs ({GRAVITY_PIPELINE_VALUES.assumptions.calfAtrophyAlertPct}% calf atrophy,{" "}
                {GRAVITY_PIPELINE_VALUES.assumptions.gripDeclineAlertPct}% grip decline,{" "}
                {GRAVITY_PIPELINE_VALUES.assumptions.weeklyAdherenceAlertPct}% weekly/load
                discipline) are team-configured [ASSUMPTION] thresholds against each astronaut&apos;s
                personal L+14 / FD14 baseline.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LeadGravitySection({
  overview,
  hazard,
}: {
  overview: GravityCrewOverview;
  hazard: HazardScreenProps["hazard"];
}) {
  return (
    <section className="space-y-4">
      {/* Crew Exercise Discipline Buff & Gate Summary */}
      <div className="grid gap-3 md:grid-cols-4">
        <div
          className={`rounded-2xl border p-4 md:col-span-2 ${
            overview.teamExerciseBuffActive
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Dumbbell className="h-4 w-4 text-emerald-700" />
              Team Exercise Discipline Buff
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                overview.teamExerciseBuffActive
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {overview.teamExerciseBuffActive ? "BUFF ACTIVE" : "INACTIVE / MONITORING"}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-700">
            {overview.loggedExerciseCrewCount > 0 ? (
              <>
                Team mean adherence:{" "}
                <strong className="font-semibold">
                  {overview.teamExerciseDisciplinePct}%
                </strong>{" "}
                ({overview.disciplinedCrewCount}/{overview.loggedExerciseCrewCount} logged crew{" "}
                &ge; {GRAVITY_PIPELINE_VALUES.assumptions.weeklyAdherenceAlertPct}% target
                [ASSUMPTION]).
              </>
            ) : (
              "No daily exercise logs synced across crew slots yet."
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Crew EVA Gate Split
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">
              GO: {overview.goCount}
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
              COND: {overview.conditionalCount}
            </span>
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-red-800">
              NO-GO: {overview.noGoCount}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-600" /> RBAC Privacy Firewall
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
            {hazard.leadView.privacyRule}
          </p>
        </div>
      </div>

      {/* Crew EVA Readiness Matrix (Flight Note View) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Crew EVA Readiness Gate Matrix (Flight Note View · MEDB 6.1 / 6.2)
            </h2>
            <p className="text-xs text-slate-500">
              Shows gate decision, blocker categories, conditioning band, and schedule adherence
              only — no raw biometrics or private notes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-semibold">Crew Member</th>
                <th className="px-3 py-2 font-semibold">EVA Gate</th>
                <th className="px-3 py-2 font-semibold">Conditioning</th>
                <th className="px-3 py-2 font-semibold">Exercise Disc.</th>
                <th className="px-3 py-2 font-semibold">Blocker Categories &amp; Flags</th>
                <th className="py-2 pl-3 font-semibold">Nearest ETA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.members.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-slate-900">{m.callsign}</div>
                    <div className="text-[11px] text-slate-500">{m.assignedRoleTitle}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                        GATE_STYLES[m.evaDecision]
                      }`}
                    >
                      {m.evaDecision}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        CONDITIONING_STYLES[m.conditioningStatus]
                      }`}
                    >
                      {m.conditioningStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-800">
                    {m.adherencePct !== null ? `${m.adherencePct}%` : "—"}
                    {m.reconditioningDayRPlus !== null && (
                      <div className="text-[10px] text-sky-700">
                        MR026L R+{m.reconditioningDayRPlus}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-700">
                    {m.blockerCategories.length > 0 ? (
                      <ul className="list-disc space-y-0.5 pl-4">
                        {m.blockerCategories.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-700">No active blockers</span>
                    )}
                    {m.conditionFlagCount > 0 && (
                      <div className="mt-1 font-medium text-amber-800">
                        Pre-test condition flags: {m.conditionFlagCount}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-slate-600">
                    {m.nearestDeadlineLabel}
                  </td>
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
  reentryMode,
}: {
  diagnostics: GravityActorDiagnostics;
  reentryMode: boolean;
}) {
  const { evaInput, evaGate, atrophy } = diagnostics;
  const A = GRAVITY_PIPELINE_VALUES.assumptions;

  return (
    <div className="space-y-4">
      {/* Feature 1: Pre-EVA Readiness Gate & Condition Guard */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Feature 1 · Autonomous Pre-EVA Readiness Gate &amp; Condition Guard
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluates MR081L, MEDB 6.1/6.3, MR087L, and MR090L locally against pre-test validity
              rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-700">
              FD {evaInput.currentFlightDay ?? "—"}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-700">
              Suit: {evaInput.suitType ?? "—"}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-700">
              EVA T-{evaInput.hoursToPlannedEva !== null ? `${evaInput.hoursToPlannedEva}h` : "—"}
            </span>
            <span
              className={`rounded-md border px-2.5 py-1 font-bold ${
                GATE_STYLES[evaGate.decision]
              }`}
            >
              {evaGate.decision}
            </span>
          </div>
        </div>

        {evaGate.noteCategory && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Private Pre-EVA Symptom Classification</p>
              <p className="mt-0.5">
                Category raised: <strong>{evaGate.noteCategory}</strong>. Your raw free-text note is
                protected under RBAC and never shown raw to Lead without audit-logged unlock.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Pre-EVA Verification Chain */}
          <div className="space-y-2 lg:col-span-7">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Pre-EVA Verification Chain (7 NASA Gates)
            </h3>
            <div className="space-y-2">
              {evaGate.chainChecks.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.label}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        {item.medbRef}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{item.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      CHAIN_STATUS_STYLES[item.status]
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-Test Condition Guard */}
          <div className="space-y-2 lg:col-span-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Pre-Test Condition Guard (Validity Windows)
            </h3>
            <div className="space-y-2">
              {evaGate.conditionChecks.map((cond) => (
                <div
                  key={cond.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{cond.label}</div>
                    <div className="text-[11px] text-slate-500">
                      {cond.requirement} ·{" "}
                      <span className="font-medium text-slate-700">{cond.detail}</span>
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
          </div>
        </div>
      </section>

      {/* Feature 2: Microgravity Atrophy, Proxy Bone-Shield & Conditioning */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-4 w-4 text-sky-600" />
              Feature 2 · Microgravity Atrophy, Proxy Bone-Shield &amp; Conditioning
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Low-N OLS projection against personal L+14 / FD14 baseline + resistance loading bone
              proxy (DXA pre/postflight only, MEDB 1.11).
            </p>
          </div>
          {atrophy.adherenceSummary?.reconditioningDayRPlus !== null &&
          atrophy.adherenceSummary?.reconditioningDayRPlus !== undefined ? (
            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">
              MR026L Postflight R+{atrophy.adherenceSummary.reconditioningDayRPlus} (120 min/d)
            </span>
          ) : reentryMode ? (
            <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Reentry Transition · MR026L Card Ready
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Calf Volume */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Calf Volume (MEDB 5.4)</span>
              {atrophy.calfDaysOverdue !== null && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  Overdue {atrophy.calfDaysOverdue}d
                </span>
              )}
            </div>
            {atrophy.calfTrend ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-900">
                  {formatSignedPct(atrophy.calfTrend.latestPctChange)}
                </div>
                <div className="text-[11px] text-slate-600">
                  vs L+14 baseline · N={atrophy.calfTrend.sampleSize} · Slope{" "}
                  {(atrophy.calfTrend.slopePctPerDay * 7).toFixed(2)}%/wk
                </div>
                {atrophy.calfTrend.etaDaysToThreshold !== null && (
                  <div className="text-[11px] font-medium text-amber-800">
                    Reaches {A.calfAtrophyAlertPct}% [ASSUMPTION] in ~
                    {atrophy.calfTrend.etaDaysToThreshold}d
                    {formatTrendCi(atrophy.calfTrend.etaMinDays, atrophy.calfTrend.etaMaxDays)}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                No valid morning fasted calf + paired mass samples yet.
              </p>
            )}
            {atrophy.invalidCalfSamplesCount > 0 && (
              <p className="mt-1.5 text-[10px] font-medium text-red-700">
                {atrophy.invalidCalfSamplesCount} sample(s) excluded (non-fasted/unpaired).
              </p>
            )}
          </div>

          {/* Handgrip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Handgrip (MR081L)</span>
              {atrophy.gripDaysOverdue !== null && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  Overdue {atrophy.gripDaysOverdue}d
                </span>
              )}
            </div>
            {atrophy.gripTrend ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-900">
                  {formatSignedPct(atrophy.gripTrend.latestPctChange)}
                </div>
                <div className="text-[11px] text-slate-600">
                  vs FD14 baseline · N={atrophy.gripTrend.sampleSize} · Slope{" "}
                  {(atrophy.gripTrend.slopePctPerDay * 7).toFixed(2)}%/wk
                </div>
                {atrophy.gripTrend.etaDaysToThreshold !== null && (
                  <div className="text-[11px] font-medium text-amber-800">
                    Reaches {A.gripDeclineAlertPct}% [ASSUMPTION] in ~
                    {atrophy.gripTrend.etaDaysToThreshold}d
                    {formatTrendCi(atrophy.gripTrend.etaMinDays, atrophy.gripTrend.etaMaxDays)}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                No valid monthly handgrip samples synced yet (every 30d).
              </p>
            )}
          </div>

          {/* 7d Exercise & Proxy Bone-Shield */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Exercise &amp; Bone Proxy</span>
              <HeartPulse className="h-3.5 w-3.5 text-sky-600" />
            </div>
            {atrophy.adherenceSummary ? (
              <div className="mt-2 space-y-1">
                <div className="text-lg font-bold text-slate-900">
                  {atrophy.adherenceSummary.reconditioningPct ??
                    atrophy.adherenceSummary.overallPct}
                  %
                </div>
                <div className="text-[11px] text-slate-600">
                  Avg {atrophy.adherenceSummary.avgTotalMinutes} min/d · Aerobic{" "}
                  {atrophy.adherenceSummary.aerobicPct}% · Resist{" "}
                  {atrophy.adherenceSummary.resistancePct}%
                </div>
                {atrophy.adherenceSummary.loadRatioPct !== null && (
                  <div className="text-[11px] font-medium text-slate-700">
                    Resistance load ratio (MEDB 1.11 proxy):{" "}
                    {atrophy.adherenceSummary.loadRatioPct}%
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                Target 150 min/d (60m aerobic + 90m resistance, MEDB 5.2).
              </p>
            )}
          </div>

          {/* Meal/Sleep Guard & Postflight Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="font-semibold text-slate-900">Timing Guard &amp; MR026L</div>
            {atrophy.adherenceSummary ? (
              <div className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {atrophy.adherenceSummary.mealViolations === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span>
                    Post-meal &ge;90m violations: {atrophy.adherenceSummary.mealViolations}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {atrophy.adherenceSummary.sleepViolations === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>
                    Pre-sleep &ge;2h violations: {atrophy.adherenceSummary.sleepViolations}
                  </span>
                </div>
                {diagnostics.sleepCrossNote && (
                  <p className="text-[10px] text-amber-800">{diagnostics.sleepCrossNote}</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
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
