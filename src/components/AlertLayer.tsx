"use client";

import React from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, Volume2, VolumeX, X } from "lucide-react";
import { useAlerts } from "@/context/AlertContext";
import { useMission } from "@/context/MissionContext";
import { BUDDY_RESCUE_STEPS } from "@/lib/domain";

export function AlertLayer() {
  const {
    toasts,
    dismissToast,
    activeAlarm,
    acknowledgeAlarm,
    activateCaptainOverride,
    toggleBuddyRescue,
    dismissAlarm,
    audioEnabled,
    setAudioEnabled,
    pushToast,
  } = useAlerts();

  const { role, mission, shelterConfirmations, toggleCrewShelter } = useMission();

  const variantClasses = {
    info: "border-slate-200 bg-white text-slate-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-300 bg-amber-50 text-amber-950",
    hazard: "border-red-300 bg-red-50 text-red-950",
  };

  const VariantIcon = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    hazard: ShieldAlert,
  };

  return (
    <>
      {/* TOAST POPUP STACK */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const Icon = VariantIcon[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl border p-4 shadow-lg ${variantClasses[toast.variant]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{toast.title}</p>
                    <span className="text-[11px] opacity-60">{toast.createdAt}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-85">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ALL-OVER-THE-SCREEN EMERGENCY ALARM OVERLAY */}
      {activeAlarm && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="alarm-screen-overlay fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-slate-950/95 p-5 text-white sm:p-10"
        >
          {/* Top Alarm Header */}
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-red-500/40 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-white">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-red-600 px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {activeAlarm.severity} ALARM
                  </span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-slate-200">
                    Hazard {activeAlarm.hazardNumber}: {activeAlarm.hazardTitle}
                  </span>
                  <span className="rounded-md bg-sky-900/70 px-2 py-0.5 text-sky-200">
                    Role: {role.toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">{activeAlarm.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                {audioEnabled ? <Volume2 className="h-4 w-4 text-red-400" /> : <VolumeX className="h-4 w-4" />}
                {audioEnabled ? "Mute Tone" : "Unmute"}
              </button>
              <button
                type="button"
                onClick={dismissAlarm}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
                Clear Alarm
              </button>
            </div>
          </div>

          {/* Center Alarm Content */}
          <div className="mx-auto my-8 grid w-full max-w-4xl gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-red-500/30 bg-slate-900/90 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Estimated Time of Action
                </p>
                <p className="mt-1.5 rounded-lg bg-red-950/60 p-3 text-sm text-red-100">{activeAlarm.etaLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Situation Summary</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{activeAlarm.descriptionSlot}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-lg bg-slate-950 p-3">
                  <span className="text-slate-400">Lead Ack: </span>
                  <span className={activeAlarm.acknowledgedByLead ? "font-semibold text-emerald-400" : "font-semibold text-amber-400"}>
                    {activeAlarm.acknowledgedByLead ? "Confirmed" : "Pending"}
                  </span>
                </div>
                <div className="rounded-lg bg-slate-950 p-3">
                  <span className="text-slate-400">Member Ack: </span>
                  <span className={activeAlarm.acknowledgedByMember ? "font-semibold text-emerald-400" : "font-semibold text-amber-400"}>
                    {activeAlarm.acknowledgedByMember ? "Safe" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Role-Specific Actions */}
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
              {role === "lead" ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-sky-300">Lead / Commander Controls</h3>
                    {activeAlarm.captainOverrideActive && (
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        Override Active
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {activeAlarm.leadActions.map((act, i) => (
                      <li key={i} className="rounded-lg bg-slate-950 p-3">
                        {act}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      Crew Shelter Tracker ({mission?.name ?? "No Scenario"})
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(mission?.crew ?? []).map((member) => {
                        const confirmed = !!shelterConfirmations[member.id];
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleCrewShelter(member.id)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${
                              confirmed
                                ? "bg-emerald-950/60 text-emerald-200"
                                : "bg-red-950/50 text-red-200"
                            }`}
                          >
                            <span className="truncate">{member.callsign}</span>
                            <span className="ml-2 font-semibold">{confirmed ? "Sheltered" : "Pending"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => acknowledgeAlarm("lead")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Acknowledge as Lead
                    </button>
                    <button
                      type="button"
                      onClick={activateCaptainOverride}
                      className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Captain Emergency Override
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-emerald-300">Member Immediate Steps (1–2 Solutions)</h3>

                  {!activeAlarm.buddyRescueActive ? (
                    <ul className="space-y-2 text-sm text-slate-200">
                      {activeAlarm.memberActions.map((act, i) => (
                        <li key={i} className="rounded-lg bg-slate-950 p-3">
                          {act}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 rounded-xl bg-amber-950/40 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                        Buddy-Rescue Stabilization Mode
                      </p>
                      {BUDDY_RESCUE_STEPS.map((s) => (
                        <div key={s.step} className="rounded-lg bg-slate-950 p-2.5 text-xs">
                          <span className="font-semibold text-amber-200">
                            Step {s.step}: {s.title}
                          </span>
                          <p className="mt-0.5 text-slate-300">{s.detail}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => acknowledgeAlarm("member")}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Confirm Safe / Sheltered
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleBuddyRescue();
                        pushToast({
                          title: activeAlarm.buddyRescueActive ? "Buddy-Rescue Closed" : "Buddy-Rescue Activated",
                          message: "Here is: Offline stabilization guide toggled.",
                          variant: "warning",
                        });
                      }}
                      className="rounded-lg border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
                    >
                      {activeAlarm.buddyRescueActive ? "Hide Buddy-Rescue" : "Buddy-Rescue Mode"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-4xl items-center justify-between border-t border-red-500/30 pt-4 text-xs text-slate-400">
            <span>Offline-first onboard alert (works during Earth blackout)</span>
            <span>Triggered at {activeAlarm.triggeredAt}</span>
          </div>
        </div>
      )}
    </>
  );
}
