"use client";

import React from "react";
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, Volume2, VolumeX, X } from "lucide-react";
import { useAlerts } from "@/context/AlertContext";
import { useMission } from "@/context/MissionContext";

export function AlertLayer() {
  const {
    toasts,
    dismissToast,
    activeAlarm,
    acknowledgeAlarm,
    activateCaptainOverride,
    dismissAlarm,
    audioEnabled,
    setAudioEnabled,
  } = useAlerts();

  const { role } = useMission();

  const variantClasses = {
    info: "border-[#3B82F6]/45 bg-[#0B111F]/95 text-slate-100",
    success: "border-[#16A34A]/50 bg-[#0A1713]/95 text-emerald-100",
    warning: "border-[#D97706]/55 bg-[#191208]/95 text-amber-100",
    hazard: "border-[#DC2626]/65 bg-[#1B090C]/95 text-red-100",
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
              className={`pointer-events-auto rounded-lg border p-4 shadow-2xl backdrop-blur-md ${variantClasses[toast.variant]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold">{toast.title}</p>
                    <span className="font-mono-tech text-[11px] opacity-70">{toast.createdAt}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed opacity-85">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded p-1 opacity-70 hover:bg-white/10 hover:opacity-100"
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
          className="alarm-screen-overlay fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-[#04060D]/95 p-5 text-white backdrop-blur-sm sm:p-10"
        >
          {/* Top Alarm Header */}
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-[#DC2626]/40 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-400/50 bg-[#DC2626] text-white">
                <Bell className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono-tech text-xs">
                  <span className="rounded bg-[#DC2626] px-2 py-0.5 font-bold uppercase tracking-wide">
                    {activeAlarm.severity} ALARM
                  </span>
                  <span className="rounded border border-slate-700 bg-[#0B111F] px-2 py-0.5 text-slate-200">
                    Hazard {activeAlarm.hazardNumber}: {activeAlarm.hazardTitle}
                  </span>
                  <span className="rounded border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2 py-0.5 text-blue-200">
                    Role: {role.toUpperCase()}
                  </span>
                </div>
                <h2 className="font-display mt-1.5 text-xl tracking-wide text-white sm:text-2xl">
                  {activeAlarm.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0B111F] px-3 py-2 font-mono-tech text-xs text-slate-200 hover:bg-slate-800"
              >
                {audioEnabled ? <Volume2 className="h-4 w-4 text-red-400" /> : <VolumeX className="h-4 w-4" />}
                {audioEnabled ? "Mute Tone" : "Unmute"}
              </button>
              <button
                type="button"
                onClick={dismissAlarm}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-xs font-bold text-slate-900 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
                Clear Alarm
              </button>
            </div>
          </div>

          {/* Center Alarm Content */}
          <div className="mx-auto my-8 grid w-full max-w-4xl gap-6 lg:grid-cols-2">
            <div className="hud-panel space-y-4 rounded-lg border-[#DC2626]/40 p-6">
              <div>
                <p className="label-caps text-red-400">Estimated Time of Action</p>
                <p className="mt-1.5 rounded-md border border-red-500/30 bg-red-950/50 p-3 font-mono-tech text-sm text-red-100">
                  {activeAlarm.etaLabel}
                </p>
              </div>
              <div>
                <p className="label-caps text-slate-400">Situation Summary</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{activeAlarm.descriptionSlot}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 font-mono-tech text-xs">
                <div className="rounded-md border border-slate-800 bg-[#060A14] p-3">
                  <span className="text-slate-400">Lead Ack: </span>
                  <span
                    className={
                      activeAlarm.acknowledgedByLead ? "font-bold text-emerald-400" : "font-bold text-amber-400"
                    }
                  >
                    {activeAlarm.acknowledgedByLead ? "Confirmed" : "Pending"}
                  </span>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#060A14] p-3">
                  <span className="text-slate-400">Member Ack: </span>
                  <span
                    className={
                      activeAlarm.acknowledgedByMember ? "font-bold text-emerald-400" : "font-bold text-amber-400"
                    }
                  >
                    {activeAlarm.acknowledgedByMember ? "Acknowledged" : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Role-Specific Actions */}
            <div className="hud-panel space-y-4 rounded-lg p-6">
              {role === "lead" ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm text-blue-300">Commander Controls</h3>
                    {activeAlarm.captainOverrideActive && (
                      <span className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono-tech text-xs font-bold text-amber-300">
                        Override Active
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {activeAlarm.leadActions.map((act, i) => (
                      <li key={i} className="rounded-md border border-slate-800 bg-[#060A14] p-3">
                        {act}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => acknowledgeAlarm("lead")}
                      className="rounded-md bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Acknowledge as Lead
                    </button>
                    <button
                      type="button"
                      onClick={activateCaptainOverride}
                      className="rounded-md bg-[#DC2626] px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
                    >
                      Captain Override
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-display text-sm text-emerald-300">Member Immediate Steps</h3>
                  <ul className="space-y-2 text-sm text-slate-200">
                    {activeAlarm.memberActions.map((act, i) => (
                      <li key={i} className="rounded-md border border-slate-800 bg-[#060A14] p-3">
                        {act}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => acknowledgeAlarm("member")}
                      className="rounded-md bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      Acknowledge as Member
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-4xl items-center justify-between border-t border-[#DC2626]/30 pt-4 font-mono-tech text-xs text-slate-400">
            <span>ACTIVE HAZARD TELEMETRY ALERT</span>
            <span>Triggered at {activeAlarm.triggeredAt}</span>
          </div>
        </div>
      )}
    </>
  );
}
