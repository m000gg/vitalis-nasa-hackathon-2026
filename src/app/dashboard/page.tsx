"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS } from "@/lib/hazards";
import { TEAM_BUFFS_SLOTS, TEAM_DEBUFFS_SLOTS } from "@/lib/domain";

export default function DashboardOverviewPage() {
  const { mission, role, selectedMemberId, linkOnline, reentryMode, dtnQueue, shelterConfirmations } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  const activeMember = mission.crew.find((c) => c.id === selectedMemberId) ?? mission.crew[1] ?? mission.crew[0];
  const shelteredCount = Object.values(shelterConfirmations).filter(Boolean).length;

  return (
    <DashboardShell>
      {/* Top Role Banner */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span
              className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                role === "lead" ? "bg-sky-950 text-sky-300" : "bg-emerald-950 text-emerald-300"
              }`}
            >
              {role === "lead" ? "Lead / Commander Dashboard" : `Member Dashboard — ${activeMember.callsign}`}
            </span>
            <h1 className="text-xl font-bold text-white sm:text-2xl">{mission.name}</h1>
            <p className="text-xs text-slate-400">{mission.scenarioDescriptionSlot}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: role === "lead" ? "Lead Action Toast" : "Member Check-In Toast",
                  message:
                    role === "lead"
                      ? "Here is: Team-wide readiness notification dispatched to Lead."
                      : "Here is: Personal Estimated Time of Action & 1–2 solutions notification.",
                  variant: "info",
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
            >
              <Bell className="h-3.5 w-3.5 text-sky-400" />
              Trigger Role Toast
            </button>
            <button
              type="button"
              onClick={() => {
                const h = HAZARDS[4]; // Closed environment / CO2 example
                triggerAlarm({
                  hazardNumber: h.number,
                  hazardTitle: h.title,
                  ...h.alarmPreset,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded border border-red-600/70 bg-red-950/60 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/60"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Test Full-Screen Alarm
            </button>
          </div>
        </div>

        {/* Key Operational Slots */}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="text-slate-400">Earth Comms State</p>
            <p className={`mt-1 font-bold ${linkOnline ? "text-emerald-400" : "text-amber-400"}`}>
              {linkOnline ? "ONLINE (Sync Ready)" : "BLACKOUT (Offline-First)"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{mission.commsDelayLabel}</p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="text-slate-400">DTN Outbound Queue</p>
            <p className="mt-1 font-bold text-white">
              {dtnQueue.filter((m) => m.status === "PENDING").length} Pending / {dtnQueue.length} Total
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Here is: Store-and-Forward reports</p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="text-slate-400">{role === "lead" ? "Shelter Confirmations" : "Personal Readiness"}</p>
            <p className="mt-1 font-bold text-white">
              {role === "lead"
                ? `${shelteredCount} / ${mission.crew.length} Confirmed`
                : `${activeMember.readinessState} (EVA: ${activeMember.evaGateState})`}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Here is: Role-scoped readiness readout</p>
          </div>

          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="text-slate-400">UI / Alert Cadence</p>
            <p className="mt-1 font-bold text-indigo-300">
              {reentryMode ? "RE-ENTRY (1-Step Cap)" : "OPERATIONAL (1–2 Steps)"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Here is: Mission-phase calibration</p>
          </div>
        </div>
      </section>

      {/* ROLE-SPECIFIC MAIN SECTION */}
      {role === "lead" ? (
        <div className="space-y-6">
          {/* Lead: Privacy-Preserving Crew Matrix */}
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">Crew-Wide Readiness Matrix (Lead View)</h2>
                <p className="text-xs text-slate-400">
                  Here is: Non-clinical duty readiness, EVA gates, and shelter confirmations. Raw personal mental-health
                  notes are masked by the privacy firewall.
                </p>
              </div>
              <Link
                href="/dashboard/crew"
                className="inline-flex items-center gap-1 rounded border border-sky-700/60 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-900/50"
              >
                Open Crew Matrix &amp; Task Rotation
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {mission.crew.map((c) => (
                <div key={c.id} className="space-y-2 rounded border border-slate-800 bg-slate-950 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{c.callsign}</p>
                      <p className="text-[11px] text-slate-400">{c.assignedRoleTitle}</p>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        c.readinessState === "GO"
                          ? "bg-emerald-950 text-emerald-300"
                          : c.readinessState === "CONDITIONAL"
                          ? "bg-amber-950 text-amber-300"
                          : "bg-red-950 text-red-300"
                      }`}
                    >
                      {c.readinessState} | EVA: {c.evaGateState}
                    </span>
                  </div>
                  <p className="text-slate-300">{c.publicStatusSummary}</p>
                  <div className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-400">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span>Private Journal / Clinical Notes: Masked from Lead</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Lead: Team-Wide Buffs & Debuffs */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-emerald-900/50 bg-slate-900/40 p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Team-Wide Buffs (Protective Factors)</h2>
              </div>
              <div className="space-y-2.5">
                {TEAM_BUFFS_SLOTS.map((b) => (
                  <div key={b.id} className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{b.name}</span>
                      <span className="text-[10px] text-emerald-400">{b.source}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{b.description}</p>
                    <p className="mt-1.5 rounded border border-dashed border-slate-700 p-1.5 text-[11px] text-slate-400">
                      {b.inputSlot}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-amber-900/50 bg-slate-900/40 p-5">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Team-Wide Debuffs (Shared Stressors)</h2>
              </div>
              <div className="space-y-2.5">
                {TEAM_DEBUFFS_SLOTS.map((d) => (
                  <div key={d.id} className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{d.name}</span>
                      <span className="text-[10px] text-amber-400">{d.source}</span>
                    </div>
                    <p className="mt-1 text-slate-300">{d.description}</p>
                    <p className="mt-1.5 rounded border border-dashed border-slate-700 p-1.5 text-[11px] text-slate-400">
                      {d.inputSlot}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        /* MEMBER PERSONAL READY-TO-ACT DASHBOARD */
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-emerald-800/50 bg-slate-900/40 p-5">
              <h2 className="text-base font-bold text-white">Personal Ready-to-Act Summary</h2>
              <p className="text-xs text-slate-300">
                Here is: Your mission-phase baseline comparison, Estimated Time of Action, and 1–2 constrained
                countermeasures filtered by onboard inventory.
              </p>
              <div className="space-y-2 text-xs">
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <p className="font-semibold text-sky-300">Estimated Time of Action (ETA) Slot</p>
                  <p className="mt-1 text-slate-300">
                    Add your info: Nearest countdown window (e.g., 48h Pre-EVA health status / shelter transit / circadian
                    reset) here.
                  </p>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950 p-3">
                  <p className="font-semibold text-emerald-300">
                    {reentryMode ? "1 Actionable Solution (Re-Entry Decision-Fatigue Cap)" : "1–2 Actionable Solutions"}
                  </p>
                  <p className="mt-1 text-slate-300">
                    Here is: Solution 1 — Inventory-verified immediate action (e.g., relocate sleep bay / run 3-min
                    PVT-B / check shelter supplies).
                  </p>
                  {!reentryMode && (
                    <p className="mt-1 text-slate-400">
                      Here is: Solution 2 — Scheduled preventative action (e.g., 10-min Veggie plant check / 2.5h
                      exercise target).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Your Private Space &amp; Quick Actions</h2>
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  <Lock className="h-3 w-3" /> Private to You
                </span>
              </div>
              <p className="text-xs text-slate-400">{activeMember.privateMemberNotesSlot}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  href="/dashboard/crew"
                  className="rounded border border-emerald-700/60 bg-emerald-950/30 p-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/60"
                >
                  Open 60s Self-Check &amp; Private Journal →
                </Link>
                <Link
                  href="/dashboard/alerts"
                  className="rounded border border-amber-700/60 bg-amber-950/30 p-3 text-xs font-semibold text-amber-200 hover:bg-amber-950/60"
                >
                  Open Buddy-Rescue &amp; Alarms →
                </Link>
              </div>
              <div className="rounded border border-dashed border-slate-700 bg-slate-950 p-3 text-[11px] text-slate-400">
                Add your info: Personal wearable / dosimeter / calf volume manual entry notes here.
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ALL 5 HAZARDS GRID (Role-Aware Cards) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white">All 5 NASA HRP Hazards ({role.toUpperCase()} View)</h2>
            <p className="text-xs text-slate-400">
              Here is: Open any hazard page for role-tailored modules, normalized input slots, and hazard-specific
              alarms.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HAZARDS.map((h) => (
            <div
              key={h.slug}
              className="flex flex-col justify-between space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-sky-400">HAZARD {h.number}</span>
                  <span className="text-[10px] text-slate-500">{h.sourceDoc}</span>
                </div>
                <h3 className="text-sm font-bold text-white">{h.title}</h3>
                <p className="text-xs leading-relaxed text-slate-300">
                  {role === "lead" ? h.leadView.summary : h.memberView.summary}
                </p>
                <p className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-2 text-[11px] text-slate-400">
                  {h.outputSlots.etaSlot}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
                <Link
                  href={`/dashboard/hazards/${h.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300"
                >
                  Open Hazard {h.number} Page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    triggerAlarm({
                      hazardNumber: h.number,
                      hazardTitle: h.title,
                      ...h.alarmPreset,
                    })
                  }
                  className="rounded border border-red-700/60 bg-red-950/40 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-900/50"
                >
                  Alarm
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
