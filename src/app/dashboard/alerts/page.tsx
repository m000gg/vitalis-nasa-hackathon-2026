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
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Toasts, Full-Screen Alarms &amp; Buddy-Rescue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Here is: Offline local alert controls. Trigger toast popups or full-screen emergency alarms tailored to your
          active role ({role.toUpperCase()}).
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sky-700">
            <Bell className="h-4 w-4" />
            <h2 className="text-sm font-bold">Toast Popups</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fireVariantToast("info", "Info Toast", "Here is: Baseline or phase notice.")}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              Info Toast
            </button>
            <button
              type="button"
              onClick={() => fireVariantToast("success", "Success Toast", "Here is: Check-in or shelter confirmed.")}
              className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Success Toast
            </button>
            <button
              type="button"
              onClick={() =>
                fireVariantToast("warning", "Prolonged Hazard Toast", "Here is: Elevated CO₂ / sleep debt trend.")
              }
              className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Warning Toast
            </button>
            <button
              type="button"
              onClick={() =>
                fireVariantToast("hazard", "Immediate Hazard Toast", "Here is: Urgent hazard threshold crossed.")
              }
              className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-800 hover:bg-red-100"
            >
              Hazard Toast
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertOctagon className="h-4 w-4" />
            <h2 className="text-sm font-bold">All-Over-the-Screen Alarms</h2>
          </div>
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
                className="flex items-center justify-between rounded-xl bg-red-50 px-3.5 py-2.5 text-left text-xs font-medium text-red-900 hover:bg-red-100"
              >
                <span>
                  <strong>Hazard {h.number}:</strong> {h.alarmPreset.title}
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
