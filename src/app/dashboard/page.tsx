"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Lock, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { HAZARDS } from "@/lib/hazards";
import { TEAM_BUFFS_SLOTS, TEAM_DEBUFFS_SLOTS } from "@/lib/domain";
import { evaluateCharacterDashboard, evaluateHazardForActor, evaluateLeaderDashboard } from "@/lib/evaluator";

export default function DashboardOverviewPage() {
  const { mission, activeCharacter, role, linkOnline, reentryMode, dtnQueue, shelterConfirmations, actorInputs } =
    useMission();

  const characterModel = evaluateCharacterDashboard(activeCharacter, {
    shelterConfirmed: !!shelterConfirmations[activeCharacter.id],
    reentryMode,
    customInputs: actorInputs[activeCharacter.id],
  });

  const leaderModel = evaluateLeaderDashboard(mission, shelterConfirmations);

  return (
    <DashboardShell>
      {/* Info-Agnostic Header Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="space-y-1">
          <span
            className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold ${
              role === "lead" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {role === "lead" ? `Lead Dashboard — ${characterModel.callsign}` : `Member Dashboard — ${characterModel.callsign}`}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{mission.name}</h1>
          <p className="text-sm text-slate-600">{mission.scenarioDescriptionSlot}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Earth Link</p>
            <p className={`mt-1 text-sm font-bold ${linkOnline ? "text-emerald-700" : "text-amber-700"}`}>
              {linkOnline ? "Online" : "Blackout (Offline)"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">DTN Queue</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {dtnQueue.filter((m) => m.status === "PENDING").length} Pending / {dtnQueue.length} Total
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{role === "lead" ? "Shelter Confirmed" : "Character Status"}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {role === "lead"
                ? `${leaderModel.shelteredCount} / ${leaderModel.totalCrew} Crew`
                : `${characterModel.readinessState} (EVA: ${characterModel.evaGateState})`}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Guidance Mode</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {reentryMode ? "Re-Entry (1-Step)" : "Ops (1–2 Steps)"}
            </p>
          </div>
        </div>
      </section>

      {/* ROLE-SPECIFIC BODY (Strictly Driven by Scenario + Character Model) */}
      {role === "lead" ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Crew Readiness Matrix ({leaderModel.goCount} GO · {leaderModel.conditionalCount} COND ·{" "}
                  {leaderModel.holdCount} HOLD)
                </h2>
                <p className="text-xs text-slate-500">
                  Here is: Generalized crew summary from the active scenario. Raw private logs remain masked.
                </p>
              </div>
              <Link
                href="/dashboard/crew"
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
              >
                Manage Matrix &amp; Privacy
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {leaderModel.crewMatrix.map((c) => (
                <div key={c.id} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{c.callsign}</p>
                      <p className="text-slate-500">{c.assignedRoleTitle}</p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        c.readinessState === "GO"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.readinessState === "CONDITIONAL"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.readinessState} · EVA {c.evaGateState}
                    </span>
                  </div>
                  <p className="text-slate-600">{c.publicStatusSummary}</p>
                  <p className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3" /> Private notes masked
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-sm font-bold">Team-Wide Buffs</h2>
              </div>
              <div className="space-y-2.5">
                {TEAM_BUFFS_SLOTS.map((b) => (
                  <div key={b.id} className="rounded-xl bg-slate-50 p-3.5 text-xs">
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="mt-1 text-slate-600">{b.description}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{b.inputSlot}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <h2 className="text-sm font-bold">Team-Wide Debuffs</h2>
              </div>
              <div className="space-y-2.5">
                {TEAM_DEBUFFS_SLOTS.map((d) => (
                  <div key={d.id} className="rounded-xl bg-slate-50 p-3.5 text-xs">
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    <p className="mt-1 text-slate-600">{d.description}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{d.inputSlot}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Your Ready-to-Act Briefing</h2>
            <div className="rounded-xl bg-slate-50 p-4 text-xs">
              <p className="font-semibold text-sky-700">Estimated Time of Action</p>
              <p className="mt-1 text-slate-600">{characterModel.etaLabel}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-xs">
              <p className="font-semibold text-emerald-700">
                {reentryMode ? "1 Actionable Solution (Re-Entry Cap)" : "1–2 Actionable Solutions"}
              </p>
              <div className="mt-1 space-y-1 text-slate-600">
                {characterModel.actions.map((act, idx) => (
                  <p key={idx}>{act}</p>
                ))}
              </div>
            </div>
            {characterModel.blockers.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-semibold">Active Blockers</p>
                <div className="mt-1 space-y-1">
                  {characterModel.blockers.map((b, idx) => (
                    <p key={idx}>{b}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Personal Metrics &amp; Private Space</h2>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Lock className="h-3 w-3" /> Private to You
              </span>
            </div>
            <div className="grid gap-2 text-xs">
              <p className="rounded-lg bg-slate-50 p-2.5 text-slate-600">{characterModel.metrics.doseSlot}</p>
              <p className="rounded-lg bg-slate-50 p-2.5 text-slate-600">{characterModel.metrics.sleepSlot}</p>
              <p className="rounded-lg bg-slate-50 p-2.5 text-slate-600">{characterModel.metrics.fatigueSlot}</p>
              <p className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
                {characterModel.metrics.exerciseAdherenceSlot}
              </p>
            </div>
            <div className="grid gap-2.5 pt-1 sm:grid-cols-2">
              <Link
                href="/dashboard/crew"
                className="rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                60s Self-Check &amp; EVA Gate →
              </Link>
              <Link
                href="/dashboard/alerts"
                className="rounded-xl bg-amber-50 p-3.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Alerts &amp; Buddy-Rescue →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ALL 5 HAZARDS */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">All 5 Hazards ({role === "lead" ? "Lead" : "Member"} View)</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HAZARDS.map((h) => {
            const snap = evaluateHazardForActor(mission, activeCharacter, h, {
              actorInputs: actorInputs[activeCharacter.id] ?? {},
              linkOnline,
              reentryMode,
            });
            return (
              <div
                key={h.slug}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-sky-700">Hazard {h.number}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        snap.status === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : snap.status === "ELEVATED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {snap.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{h.title}</h3>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {role === "lead" ? h.leadView.summary : h.memberView.summary}
                  </p>
                  <p className="font-mono text-[11px] text-slate-400">{h.ownerSlot}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <Link
                    href={`/dashboard/hazards/${h.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Open Hazard Page <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </DashboardShell>
  );
}
