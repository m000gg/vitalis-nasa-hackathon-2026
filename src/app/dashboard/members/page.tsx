"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldAlert, UserCheck, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS, HazardEvaluationResult } from "@/lib/hazards";
import {
  evaluateLeaderDashboard,
  sanitizeHazardRecordsForRole,
  sanitizeHazardSamplesForRole,
} from "@/lib/evaluator";
import { evaluateGravityDiagnostics, evaluateGravityCrewOverview } from "@/lib/hazards/04-gravity";

function statusPillClass(status: HazardEvaluationResult["status"]): string {
  if (status === "CRITICAL") {
    return "border border-[#DC2626]/55 bg-[#DC2626]/15 text-red-300";
  }
  if (status === "ELEVATED") {
    return "border border-[#D97706]/55 bg-[#D97706]/15 text-amber-300";
  }
  return "border border-[#16A34A]/50 bg-[#16A34A]/15 text-emerald-300";
}

export default function MembersOverviewPage() {
  const router = useRouter();
  const {
    mission,
    activeCharacter,
    setActiveCharacterId,
    role,
    actorInputs,
    scenarioHazardRecords,
    scenarioHazardSamples,
  } = useMission();
  const { pushToast } = useAlerts();

  if (!mission || !activeCharacter) {
    return (
      <DashboardShell>
        <div className="hud-panel rounded-lg p-6 text-sm text-slate-300">
          Select a scenario and character first.
        </div>
      </DashboardShell>
    );
  }

  if (role !== "lead") {
    return (
      <DashboardShell>
        <div className="rounded-lg border border-[#D97706]/50 bg-[#D97706]/12 p-6 text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
            <div className="space-y-2">
              <h1 className="font-display text-base text-white">Leader Access Only</h1>
              <p className="text-sm text-amber-200">
                Switch to a Lead character to view the crew directory.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-600"
              >
                Return to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  const safeScenarioRecords = sanitizeHazardRecordsForRole(scenarioHazardRecords, "lead");
  const safeScenarioSamples = sanitizeHazardSamplesForRole(scenarioHazardSamples, "lead");

  const leaderModel = evaluateLeaderDashboard(mission, {
    actorInputs,
    scenarioHazardRecords,
    scenarioHazardSamples,
  });

  const gravityCrew = evaluateGravityCrewOverview(
    mission,
    safeScenarioRecords,
    safeScenarioSamples
  );

  // Keep import parity if diagnostics helper needed later
  void evaluateGravityDiagnostics;

  return (
    <DashboardShell>
      <section className="hud-panel rounded-lg p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="label-caps inline-flex items-center gap-1.5 rounded border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2.5 py-0.5 text-blue-300">
              <Users className="h-3.5 w-3.5" />
              LEADER DIRECTORY · {mission.name}
            </span>
            <h1 className="font-display text-2xl tracking-tight text-white">
              Crew Operational Matrix
            </h1>
            <p className="font-mono-tech text-xs text-slate-400">
              Operational status · private notes &amp; raw biomarkers masked
            </p>
          </div>

          <div className="flex gap-3 text-center text-xs">
            <div className="rounded-md border border-[#16A34A]/35 bg-[#060A14] px-4 py-2.5">
              <p className="label-caps text-emerald-300">Nominal</p>
              <p className="font-display mt-0.5 text-xl text-white tabular-nums">
                {leaderModel.nominalCount}
              </p>
            </div>
            <div className="rounded-md border border-[#D97706]/35 bg-[#060A14] px-4 py-2.5">
              <p className="label-caps text-amber-300">Elevated</p>
              <p className="font-display mt-0.5 text-xl text-white tabular-nums">
                {leaderModel.elevatedCount}
              </p>
            </div>
            <div className="rounded-md border border-[#DC2626]/40 bg-[#060A14] px-4 py-2.5">
              <p className="label-caps text-red-300">Critical</p>
              <p className="font-display mt-0.5 text-xl text-white tabular-nums">
                {leaderModel.criticalCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {leaderModel.derivedTeamAlerts.length > 0 && (
        <section className="rounded-lg border border-[#D97706]/45 bg-[#D97706]/10 p-5">
          <h2 className="label-caps text-amber-300">Team-Level Hazard Alerts</h2>
          <div className="mt-2.5 grid gap-2 md:grid-cols-2">
            {leaderModel.derivedTeamAlerts.map((alertText, idx) => (
              <div
                key={idx}
                className="rounded-md border border-slate-800 bg-[#060A14] px-3.5 py-2.5 text-xs text-amber-200"
              >
                {alertText}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4">
        {leaderModel.crewMatrix.map((member) => {
          const gravMember = gravityCrew.members.find((gm) => gm.id === member.id);
          const isCurrent = member.id === activeCharacter.id;

          return (
            <div key={member.id} className="hud-panel rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono-tech text-[11px] font-bold ${
                        member.isLeadSlot
                          ? "bg-[#3B82F6]/20 text-blue-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {member.isLeadSlot ? "LEADER" : "MEMBER"}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono-tech text-xs font-bold ${statusPillClass(
                        member.overallStatus
                      )}`}
                    >
                      {member.overallStatus}
                    </span>
                    {member.blockerCount > 0 && (
                      <span className="rounded border border-[#D97706]/40 bg-[#D97706]/15 px-2 py-0.5 font-mono-tech text-xs font-semibold text-amber-300">
                        {member.blockerCount} watch item{member.blockerCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg text-white">{member.callsign}</h3>
                  <p className="font-mono-tech text-xs text-slate-400">{member.assignedRoleTitle}</p>
                  <p className="text-xs text-slate-300">{member.publicStatusSummary}</p>
                </div>

                <div className="flex items-center gap-2">
                  {gravMember?.adherencePct !== null && gravMember?.adherencePct !== undefined && (
                    <div className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 text-right text-xs">
                      <p className="font-mono-tech text-[11px] text-slate-400">Exercise Adherence</p>
                      <p className="font-display text-sm text-white">
                        {Math.round(gravMember.adherencePct)}%
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => {
                      setActiveCharacterId(member.id);
                      pushToast({
                        title: `Viewing as ${member.callsign}`,
                        message: `Switched active crew profile to ${member.callsign}.`,
                        variant: "info",
                      });
                      if (!member.isLeadSlot) {
                        router.push("/dashboard");
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold ${
                      isCurrent
                        ? "border border-[#16A34A]/45 bg-[#16A34A]/15 text-emerald-300"
                        : "bg-[#3B82F6] text-white hover:bg-blue-500"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {isCurrent ? "Active Profile" : "Open Member View"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 text-xs">
                  <p className="font-mono-tech text-[11px] text-slate-400">Radiation (Rate · Cum)</p>
                  <p className="mt-0.5 font-mono-tech font-bold text-white">
                    {member.operationalVitals.doseRateLabel} ·{" "}
                    {member.operationalVitals.cumulativeDoseLabel}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 text-xs">
                  <p className="font-mono-tech text-[11px] text-slate-400">Isolation (Sleep · Noise)</p>
                  <p className="mt-0.5 font-mono-tech font-bold text-white">
                    {member.operationalVitals.sleepLabel} · {member.operationalVitals.acousticsLabel}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 text-xs">
                  <p className="font-mono-tech text-[11px] text-slate-400">Gravity Conditioning</p>
                  <p className="mt-0.5 font-mono-tech font-bold text-white">
                    {gravMember ? gravMember.conditioningStatus.replace("_", " ") : "—"}
                    {member.operationalVitals.exercisePct !== null
                      ? ` · ${member.operationalVitals.exercisePct}%`
                      : ""}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 text-xs">
                  <p className="font-mono-tech text-[11px] text-slate-400">Distance / Med Kit</p>
                  <p className="mt-0.5 font-mono-tech font-bold text-white">
                    {member.operationalVitals.medKitLabel}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-slate-800/80 pt-4 sm:grid-cols-5">
                {HAZARDS.map((hazard) => {
                  const st = member.hazardStatuses[hazard.slug];
                  return (
                    <Link
                      key={hazard.slug}
                      href={`/dashboard/hazards/${hazard.slug}`}
                      className="flex items-center justify-between rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 transition hover:border-[#3B82F6]/60"
                    >
                      <span className="truncate font-mono-tech text-xs font-medium text-slate-200">
                        0{hazard.number}. {hazard.shortTitle}
                      </span>
                      <span
                        className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-mono-tech text-[10px] font-bold ${statusPillClass(
                          st
                        )}`}
                      >
                        {st}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </DashboardShell>
  );
}
