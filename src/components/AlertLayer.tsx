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
    info: "border-sky-500/60 bg-slate-900/95 text-slate-100",
    success: "border-emerald-500/60 bg-slate-900/95 text-emerald-100",
    warning: "border-amber-500/70 bg-amber-950/90 text-amber-100",
    hazard: "border-red-500/80 bg-red-950/95 text-red-100",
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
        className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => {
          const Icon = VariantIcon[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-lg border p-3.5 shadow-2xl backdrop-blur ${variantClasses[toast.variant]}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide">{toast.title}</p>
                    <span className="text-[10px] opacity-70">{toast.createdAt}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded p-0.5 opacity-70 hover:bg-white/10 hover:opacity-100"
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
          className="alarm-screen-overlay fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-black/92 p-4 sm:p-8"
        >
          {/* Top Alarm Bar */}
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 border-b border-red-500/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-red-400 bg-red-500/20 text-red-400">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    {activeAlarm.severity} FULL-SCREEN ALARM
                  </span>
                  <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                    Hazard {activeAlarm.hazardNumber}: {activeAlarm.hazardTitle}
                  </span>
                  <span className="rounded border border-sky-700/60 bg-sky-950/60 px-2 py-0.5 text-[11px] text-sky-300">
                    Active View: {role.toUpperCase()}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-white sm:text-2xl">
                  {activeAlarm.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                {audioEnabled ? <Volume2 className="h-4 w-4 text-red-400" /> : <VolumeX className="h-4 w-4" />}
                {audioEnabled ? "Mute Tone" : "Unmute Tone"}
              </button>
              <button
                type="button"
                onClick={dismissAlarm}
                className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
                Clear Alarm
              </button>
            </div>
          </div>

          {/* Center Alarm Body */}
          <div className="mx-auto my-6 grid w-full max-w-5xl gap-5 lg:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-red-500/40 bg-slate-950/90 p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                  Estimated Time of Action (ETA)
                </p>
                <p className="mt-1 rounded border border-red-500/30 bg-red-950/30 p-2.5 text-sm font-mono text-red-100">
                  {activeAlarm.etaLabel}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  What Happened & Telemetry Provenance
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-200">{activeAlarm.descriptionSlot}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="rounded border border-slate-800 bg-slate-900 p-2.5">
                  <span className="text-slate-400">Lead Ack:</span>{" "}
                  <span className={activeAlarm.acknowledgedByLead ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
                    {activeAlarm.acknowledgedByLead ? "CONFIRMED" : "PENDING"}
                  </span>
                </div>
                <div className="rounded border border-slate-800 bg-slate-900 p-2.5">
                  <span className="text-slate-400">Member Ack:</span>{" "}
                  <span className={activeAlarm.acknowledgedByMember ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
                    {activeAlarm.acknowledgedByMember ? "IN SHELTER / SAFE" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>

            {/* Role-Tailored Action Panel */}
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/90 p-5">
              {role === "lead" ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-sky-300">
                      Lead / Commander Alarm Controls
                    </h3>
                    {activeAlarm.captainOverrideActive && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        OVERRIDE ACTIVE
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {activeAlarm.leadActions.map((act, i) => (
                      <li key={i} className="rounded border border-slate-800 bg-slate-900 p-2.5">
                        {act}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Crew Evacuation / Shelter Tracker ({mission.name})
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {mission.crew.map((member) => {
                        const confirmed = !!shelterConfirmations[member.id];
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleCrewShelter(member.id)}
                            className={`flex items-center justify-between rounded border px-2.5 py-2 text-left text-xs ${
                              confirmed
                                ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-200"
                                : "border-red-600/50 bg-red-950/30 text-red-200"
                            }`}
                          >
                            <span className="truncate">{member.callsign}</span>
                            <span className="ml-2 font-bold">{confirmed ? "SHELTERED" : "UNCONFIRMED"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => acknowledgeAlarm("lead")}
                      className="rounded bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Acknowledge as Lead
                    </button>
                    <button
                      type="button"
                      onClick={activateCaptainOverride}
                      className="rounded bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Trigger Captain Emergency Override
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                      Member / Crew Immediate Guidance (1–2 Solutions)
                    </h3>
                  </div>

                  {!activeAlarm.buddyRescueActive ? (
                    <ul className="space-y-2 text-sm text-slate-200">
                      {activeAlarm.memberActions.map((act, i) => (
                        <li key={i} className="rounded border border-slate-800 bg-slate-900 p-2.5">
                          {act}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-2 rounded border border-amber-500/50 bg-amber-950/25 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Buddy-Rescue Stabilization Mode Active (Non-Physician Crew Guide)
                      </p>
                      {BUDDY_RESCUE_STEPS.map((s) => (
                        <div key={s.step} className="rounded border border-slate-800 bg-slate-950 p-2 text-xs">
                          <span className="font-bold text-amber-200">
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
                      className="rounded bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Confirm Safe / Reached Shelter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleBuddyRescue();
                        pushToast({
                          title: activeAlarm.buddyRescueActive ? "Buddy-Rescue Closed" : "Buddy-Rescue Activated",
                          message: "Here is: Offline step-by-step crewmate stabilization protocol.",
                          variant: "warning",
                        });
                      }}
                      className="rounded border border-amber-500 bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                    >
                      {activeAlarm.buddyRescueActive ? "Hide Buddy-Rescue" : "Crewmate Unresponsive? Buddy-Rescue"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-5xl items-center justify-between border-t border-red-500/30 pt-3 text-xs text-slate-400">
            <span>Offline-first onboard alert layer (no Earth connectivity required)</span>
            <span>Triggered at {activeAlarm.triggeredAt}</span>
          </div>
        </div>
      )}
    </>
  );
}
