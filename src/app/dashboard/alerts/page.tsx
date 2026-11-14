"use client";

import React from "react";
import { AlertOctagon, Bell, HeartPulse, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { ToastVariant, useAlerts } from "@/context/AlertContext";
import { useMission } from "@/context/MissionContext";
import { HAZARDS } from "@/lib/hazards";
import { BUDDY_RESCUE_STEPS } from "@/lib/domain";

export default function AlertsAndAlarmsPage() {
  const { pushToast, triggerAlarm } = useAlerts();
  const { role, auditLog } = useMission();

  const fireVariantToast = (variant: ToastVariant, title: string, message: string) => {
    pushToast({ variant, title, message });
  };

  return (
    <DashboardShell>
      <section className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <h1 className="text-xl font-bold text-white">
          Toast Popups, All-Over-the-Screen Alarms &amp; Buddy-Rescue Console
        </h1>
        <p className="text-xs text-slate-400">
          Here is: Dual-horizon local notification system working completely offline. Use the triggers below to verify
          toast popups and full-viewport emergency alarms across Lead and Member roles.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Toast Triggers */}
        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-sky-300">
            <Bell className="h-4 w-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">1. Toast Popup Triggers</h2>
          </div>
          <p className="text-xs text-slate-400">
            Here is: Non-blocking toast notifications for prolonged hazards, check-in confirmations, and DTN syncs.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                fireVariantToast("info", "Info Toast", "Here is: Baseline update or mission-phase calibration notice.")
              }
              className="rounded border border-sky-700/60 bg-sky-950/40 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-900/50"
            >
              Trigger Info Toast
            </button>
            <button
              type="button"
              onClick={() =>
                fireVariantToast("success", "Success Toast", "Here is: Shelter check or self-check confirmed.")
              }
              className="rounded border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/50"
            >
              Trigger Success Toast
            </button>
            <button
              type="button"
              onClick={() =>
                fireVariantToast(
                  "warning",
                  "Prolonged Hazard Toast",
                  "Here is: Sleep debt / CO₂ rising trend (Estimated Time of Action slot)."
                )
              }
              className="rounded border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/50"
            >
              Trigger Warning Toast
            </button>
            <button
              type="button"
              onClick={() =>
                fireVariantToast(
                  "hazard",
                  "Immediate Hazard Toast",
                  "Here is: Urgent hazard threshold crossed — prepare action."
                )
              }
              className="rounded border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/50"
            >
              Trigger Hazard Toast
            </button>
          </div>
        </section>

        {/* Full-Screen Alarm Triggers */}
        <section className="space-y-3 rounded-lg border border-red-900/50 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-red-300">
            <AlertOctagon className="h-4 w-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">2. All-Over-the-Screen Alarm Triggers</h2>
          </div>
          <p className="text-xs text-slate-400">
            Here is: Full-screen emergency takeover tailored to your active role ({role.toUpperCase()}) with optional
            alarm tone, Captain override, and Buddy-Rescue mode.
          </p>
          <div className="grid gap-2">
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
                className="flex items-center justify-between rounded border border-red-700/50 bg-red-950/30 px-3 py-2 text-left text-xs text-red-100 hover:bg-red-900/40"
              >
                <span>
                  <strong>Hazard {h.number}:</strong> {h.alarmPreset.title}
                </span>
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Buddy-Rescue Standalone Protocol + Audit Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-amber-800/50 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-amber-300">
            <HeartPulse className="h-4 w-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">
              Buddy-Rescue Stabilization Mode (Non-Physician Crew)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Here is: Step-by-step stabilization mode for non-physician crewmates when an astronaut becomes
            unresponsive during comms blackout.
          </p>
          <div className="space-y-2">
            {BUDDY_RESCUE_STEPS.map((s) => (
              <div key={s.step} className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                <p className="font-semibold text-amber-200">
                  Step {s.step}: {s.title}
                </p>
                <p className="mt-1 text-slate-300">{s.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Commander Emergency Access Audit Log
          </h2>
          <p className="text-xs text-slate-400">
            Here is: Every emergency medical detail unlock triggered by Lead is recorded here and notified to the crew
            member.
          </p>
          {auditLog.length === 0 ? (
            <div className="rounded border border-dashed border-slate-700 bg-slate-950 p-4 text-xs text-slate-500">
              No emergency medical unlocks logged yet. (Lead can trigger one in Crew Matrix &amp; Privacy.)
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {auditLog.map((a) => (
                <div key={a.id} className="rounded border border-slate-800 bg-slate-950 p-3">
                  <p className="font-semibold text-amber-300">
                    {a.action} — {a.targetCallsign}
                  </p>
                  <p className="mt-0.5 text-slate-300">{a.reason}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Actor: {a.actorRole.toUpperCase()} • {a.timestamp}
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
