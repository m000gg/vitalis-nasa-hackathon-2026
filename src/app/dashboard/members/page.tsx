"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert, UserCheck, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS, HazardEvaluationResult } from "@/lib/hazards";
import { evaluateLeaderDashboard, sanitizeHazardRecordsForRole, sanitizeHazardSamplesForRole } from "@/lib/evaluator";
import { evaluateGravityCrewOverview } from "@/lib/hazards/04-gravity";

function statusPillClass(status: HazardEvaluationResult["status"]): string {
  if (status === "CRITICAL") {
    return "border border-red-200 bg-red-50 text-red-800";
  }
  if (status === "ELEVATED") {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border border-emerald-200 bg-emerald-50 text-emerald-800";
}

export default function MembersOverviewPage() {
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Select a scenario and character first.
        </div>
      </DashboardShell>
    );
  }

  if (role !== "lead") {
    return (
      <DashboardShell>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="space-y-2">
              <h1 className="text-base font-bold">Leader Access Only</h1>
              <p className="text-sm text-amber-900">
                The Members directory is restricted to crew leaders. Members have direct access to the
                5-hazard vital Dashboard and each individual hazard workspace.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
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

  return (
    <DashboardShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              <Users className="h-3.5 w-3.5" />
              LEADER DIRECTORY · {mission.name}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Crew Members & Hazard Matrix
            </h1>
            <p className="text-sm text-slate-600">
              Privacy-filtered crew health overview across all 5 NASA HRP hazards (private check-in notes
              and raw individual clinical biomarkers remain sealed).
            </p>
          </div>

          <div className="flex gap-3 text-center text-xs">
            <div className="rounded-xl bg-emerald-50 px-4 py-2.5">
              <p className="font-medium text-emerald-700">Nominal</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-950">{leaderModel.nominalCount}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-2.5">
              <p className="font-medium text-amber-700">Elevated</p>
              <p className="mt-0.5 text-xl font-bold text-amber-950">{leaderModel.elevatedCount}</p>
            </div>
            <div className="rounded-xl bg-red-50 px-4 py-2.5">
              <p className="font-medium text-red-700">Critical</p>
              <p className="mt-0.5 text-xl font-bold text-red-950">{leaderModel.criticalCount}</p>
            </div>
          </div>
        </div>
      </section>

      {leaderModel.derivedTeamAlerts.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Team-Level Hazard Alerts
          </h2>
          <div className="mt-2.5 grid gap-2 md:grid-cols-2">
            {leaderModel.derivedTeamAlerts.map((alertText, idx) => (
              <div key={idx} className="rounded-xl bg-white/90 px-3.5 py-2.5 text-xs text-amber-950">
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
            <div
              key={member.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        member.isLeadSlot
                          ? "bg-sky-50 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {member.isLeadSlot ? "LEADER" : "MEMBER"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(
                        member.overallStatus
                      )}`}
                    >
                      {member.overallStatus}
                    </span>
                    {member.blockerCount > 0 && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {member.blockerCount} active watch item{member.blockerCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{member.callsign}</h3>
                  <p className="text-xs font-medium text-slate-500">{member.assignedRoleTitle}</p>
                  <p className="text-xs text-slate-600">{member.publicStatusSummary}</p>
                </div>

                <div className="flex items-center gap-2">
                  {gravMember?.adherencePct !== null && gravMember?.adherencePct !== undefined && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-right text-xs">
                      <p className="text-slate-500">Exercise Adherence</p>
                      <p className="font-bold text-slate-900">{Math.round(gravMember.adherencePct)}%</p>
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
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {isCurrent ? "Active Profile" : "Inspect Vitals"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-5">
                {HAZARDS.map((hazard) => {
                  const st = member.hazardStatuses[hazard.slug];
                  return (
                    <Link
                      key={hazard.slug}
                      href={`/dashboard/hazards/${hazard.slug}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 transition hover:border-sky-300"
                    >
                      <span className="truncate text-xs font-medium text-slate-700">
                        {hazard.number}. {hazard.shortTitle}
                      </span>
                      <span
                        className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${statusPillClass(
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
