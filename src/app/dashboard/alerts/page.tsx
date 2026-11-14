"use client";

import React from "react";
import { AlertTriangle, HeartPulse, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useAlerts } from "@/context/AlertContext";
import { useMission } from "@/context/MissionContext";
import { HAZARDS } from "@/lib/hazards";
import { BUDDY_RESCUE_STEPS } from "@/lib/domain";
import { evaluateCharacterDashboard, evaluateLeaderDashboard } from "@/lib/evaluator";

export default function AlertsAndAlarmsPage() {
  const { triggerAlarm } = useAlerts();
  const {
    mission,
    activeCharacter,
    role,
    linkOnline,
    reentryMode,
    shelterConfirmations,
    actorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    auditLog,
  } = useMission();

  if (!mission || !activeCharacter) {
    return <DashboardShell>{null}</DashboardShell>;
  }

  const leaderModel = evaluateLeaderDashboard(mission, shelterConfirmations, {
    actorInputs,
    scenarioHazardRecords,
    scenarioHazardSamples,
    linkOnline,
    reentryMode,
  });
  const characterModel = evaluateCharacterDashboard(activeCharacter, {
    shelterConfirmed: !!shelterConfirmations[activeCharacter.id],
    reentryMode,
    customInputs: actorInputs[activeCharacter.id],
    mission,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    linkOnline,
    role,
  });

  const handleReportUnresponsiveCrewmate = () => {
    const h = HAZARDS[2]; // Distance from Earth / Deep Space Autonomy & Buddy-Rescue
    triggerAlarm({
      hazardNumber: h.number,
      hazardTitle: h.title,
      title: "UNRESPONSIVE CREWMATE — BUDDY-RESCUE PROTOCOL",
      severity: "CRITICAL",
      etaLabel: "Immediate onboard response required (Earth link cannot assist in real time)",
      descriptionSlot: `Here is: Crew member emergency flagged in ${mission.name} by ${activeCharacter.callsign}.`,
      leadActions: h.alarmPreset.leadActions,
      memberActions: h.alarmPreset.memberActions,
    });
  };

  return (
    <DashboardShell>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Active Alerts, Emergency Escalation &amp; Buddy-Rescue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Here is: Alerts derived from {mission.name} for {activeCharacter.callsign} ({role.toUpperCase()}).
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Derived Alerts */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-sm font-bold">
              {role === "lead" ? "Derived Team Alerts" : "Derived Character Blockers & Alerts"}
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            {role === "lead" ? (
              leaderModel.derivedTeamAlerts.map((alertText, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3.5 text-slate-700">
                  {alertText}
                </div>
              ))
            ) : characterModel.blockers.length > 0 ? (
              characterModel.blockers.map((blocker, i) => (
                <div key={i} className="rounded-xl bg-amber-50 p-3.5 text-amber-900">
                  {blocker}
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-emerald-50 p-3.5 text-emerald-900">
                Here is: No active blockers for {characterModel.callsign}.
              </div>
            )}
          </div>
        </section>

        {/* Operational Emergency Escalation */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-red-700">
            <ShieldAlert className="h-4 w-4" />
            <h2 className="text-sm font-bold">Declare Onboard Emergency</h2>
          </div>
          <p className="text-xs text-slate-600">
            Here is: Escalating a medical or habitat emergency activates the full-screen alarm across the crew console.
          </p>

          <button
            type="button"
            onClick={handleReportUnresponsiveCrewmate}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-xs font-semibold text-white hover:bg-red-700"
          >
            Report Unresponsive Crewmate (Launch Buddy-Rescue Alarm)
          </button>

          <div className="space-y-2 pt-1">
            {HAZARDS.map((h) => (
              <button
                key={h.slug}
                type="button"
                onClick={() =>
                  triggerAlarm({
                    hazardNumber: h.number,
                    hazardTitle: h.title,
                    ...h.alarmPreset,
                  })
                }
                className="flex w-full items-center justify-between rounded-xl bg-red-50 px-3.5 py-2.5 text-left text-xs font-medium text-red-900 hover:bg-red-100"
              >
                <span>
                  Escalate Hazard {h.number}: {h.shortTitle}
                </span>
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-amber-700">
            <HeartPulse className="h-4 w-4" />
            <h2 className="text-sm font-bold">Buddy-Rescue Stabilization Steps</h2>
          </div>
          <div className="space-y-2">
            {BUDDY_RESCUE_STEPS.map((s) => (
              <div key={s.step} className="rounded-xl bg-slate-50 p-3.5 text-xs">
                <p className="font-semibold text-slate-900">
                  Step {s.step}: {s.title}
                </p>
                <p className="mt-1 text-slate-600">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">Emergency Unlock Audit Log</h2>
          {auditLog.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
              No emergency medical detail unlocks logged yet.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {auditLog.map((a) => (
                <div key={a.id} className="rounded-xl bg-slate-50 p-3.5">
                  <p className="font-semibold text-slate-900">
                    {a.action} — {a.targetCallsign}
                  </p>
                  <p className="mt-0.5 text-slate-600">{a.reason}</p>
                  <p className="mt-0.5 text-slate-400">
                    {a.actorRole.toUpperCase()} · {a.timestamp}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
