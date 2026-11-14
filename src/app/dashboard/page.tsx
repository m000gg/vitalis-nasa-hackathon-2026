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
      {/* Calm Role Summary Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span
              className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                role === "lead" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {role === "lead" ? "Lead Dashboard" : `Member Dashboard — ${activeMember.callsign}`}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{mission.name}</h1>
            <p className="text-sm text-slate-600">{mission.scenarioDescriptionSlot}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: role === "lead" ? "Lead Toast" : "Member Toast",
                  message:
                    role === "lead"
                      ? "Here is: Team-wide readiness notification."
                      : "Here is: Personal ETA & 1–2 solutions notification.",
                  variant: "info",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Bell className="h-3.5 w-3.5 text-sky-600" />
              Test Toast
            </button>
            <button
              type="button"
              onClick={() => {
                const h = HAZARDS[4];
                triggerAlarm({
                  hazardNumber: h.number,
                  hazardTitle: h.title,
                  ...h.alarmPreset,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Test Full-Screen Alarm
            </button>
          </div>
        </div>

        {/* 4 Simple Status Tiles */}
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
            <p className="text-xs text-slate-500">{role === "lead" ? "Shelter Confirmed" : "Personal Status"}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {role === "lead"
                ? `${shelteredCount} / ${mission.crew.length} Crew`
                : `${activeMember.readinessState} (EVA: ${activeMember.evaGateState})`}
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

      {/* ROLE-SPECIFIC BODY */}
      {role === "lead" ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Crew Readiness Matrix</h2>
                <p className="text-xs text-slate-500">
                  Here is: Non-clinical crew readiness. Raw private journals stay hidden from Lead.
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
              {mission.crew.map((c) => (
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
              <p className="mt-1 text-slate-600">
                Add your info: Nearest countdown window (e.g., 48h pre-EVA check or shelter window) here.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-xs">
              <p className="font-semibold text-emerald-700">
                {reentryMode ? "1 Actionable Solution (Re-Entry Cap)" : "1–2 Actionable Solutions"}
              </p>
              <p className="mt-1 text-slate-600">
                Here is: Solution 1 — Inventory-verified immediate action (e.g., sleep bay move / 3-min PVT-B).
              </p>
              {!reentryMode && (
                <p className="mt-1 text-slate-500">
                  Here is: Solution 2 — Scheduled preventative action (e.g., Veggie plant care / 2.5h exercise).
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Private Check-In &amp; Buddy-Rescue</h2>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Lock className="h-3 w-3" /> Private to You
              </span>
            </div>
            <p className="text-xs text-slate-600">{activeMember.privateMemberNotesSlot}</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
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
                Buddy-Rescue &amp; Alarms →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ALL 5 HAZARDS */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">All 5 Hazards ({role === "lead" ? "Lead" : "Member"} View)</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {HAZARDS.map((h) => (
            <div
              key={h.slug}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold text-sky-700">Hazard {h.number}</p>
                <h3 className="text-base font-bold text-slate-900">{h.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  {role === "lead" ? h.leadView.summary : h.memberView.summary}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link
                  href={`/dashboard/hazards/${h.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  Open Page <ArrowRight className="h-3.5 w-3.5" />
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
                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
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
