"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, ArrowLeft, Bell, Lock, Server, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { getHazardBySlug, HAZARDS } from "@/lib/hazards";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

export default function HazardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hazard = getHazardBySlug(slug);
  const { role } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  if (!hazard) {
    notFound();
  }

  const roleConfig = role === "lead" ? hazard.leadView : hazard.memberView;

  const handleSaveSlot = (streamName: string) => {
    const val = inputValues[streamName]?.trim();
    pushToast({
      title: `${hazard.shortTitle}: Input Slot Recorded`,
      message: val
        ? `Here is: "${val}" captured into ${streamName} ingestion slot.`
        : `Here is: ${streamName} slot flagged (empty — add your info to populate).`,
      variant: val ? "success" : "info",
    });
  };

  return (
    <DashboardShell>
      {/* Breadcrumb + Header */}
      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard Overview
          </Link>
          <span className="font-mono text-[11px] text-slate-500">Source: {hazard.sourceDoc}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-sky-950 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-300">
                HAZARD {hazard.number} OF 5
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                  role === "lead" ? "bg-sky-900/60 text-sky-200" : "bg-emerald-900/60 text-emerald-200"
                }`}
              >
                {role} perspective
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{hazard.title}</h1>
            <p className="max-w-3xl text-xs leading-relaxed text-slate-300">{hazard.overviewSlot}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: `Hazard ${hazard.number} Toast`,
                  message: `Here is: ${hazard.title} alert preview for ${role.toUpperCase()} role.`,
                  variant: "warning",
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
            >
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              Trigger Hazard Toast
            </button>
            <button
              type="button"
              onClick={() =>
                triggerAlarm({
                  hazardNumber: hazard.number,
                  hazardTitle: hazard.title,
                  ...hazard.alarmPreset,
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-red-600/70 bg-red-950/60 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/70"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              Trigger Full-Screen Alarm
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {hazard.nasaReferences.map((ref) => (
            <span key={ref} className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
              {ref}
            </span>
          ))}
        </div>
      </div>

      {/* Role-Tailored View & Privacy Rule */}
      <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white">
            {role === "lead" ? "Lead / Commander Modules" : "Member / Crew Astronaut Modules"}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300">
            <Lock className="h-3 w-3 text-sky-400" />
            {roleConfig.privacyRule}
          </span>
        </div>

        <p className="text-xs text-slate-300">{roleConfig.summary}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {roleConfig.modules.map((mod) => (
            <div key={mod.title} className="space-y-2 rounded border border-slate-800 bg-slate-950 p-4 text-xs">
              <h3 className="font-semibold text-white">{mod.title}</h3>
              <p className="leading-relaxed text-slate-300">{mod.detail}</p>
              <p className="rounded border border-dashed border-slate-700 bg-slate-900/50 p-2 text-[11px] text-slate-400">
                {mod.actionSlot}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Normalized Input Slots (Interactive) + Deterministic Output Slots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">
            Normalized Input Ingestion Slots
          </h2>
          <p className="text-xs text-slate-400">
            Here is: Manual / simulated / dataset-replay fields documented in {hazard.sourceDoc} (no fake hardcoded
            numbers or formulas).
          </p>

          <div className="space-y-3">
            {hazard.inputSlots.map((slot) => (
              <div key={slot.streamName} className="space-y-2 rounded border border-slate-800 bg-slate-950 p-3.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{slot.streamName}</span>
                  <span className="text-[10px] text-slate-500">{slot.sourceRef}</span>
                </div>
                <input
                  type="text"
                  value={inputValues[slot.streamName] ?? ""}
                  onChange={(e) => setInputValues((prev) => ({ ...prev, [slot.streamName]: e.target.value }))}
                  placeholder={slot.inputPrompt}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSlot(slot.streamName)}
                    className="rounded border border-sky-700/60 bg-sky-950/50 px-2.5 py-1 text-[11px] font-medium text-sky-200 hover:bg-sky-900/60"
                  >
                    Submit Slot Input
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
            Deterministic Output &amp; Guidance Slots
          </h2>
          <p className="text-xs text-slate-400">
            Here is: Dual-horizon output structure (Immediate vs. Prolonged), Estimated Time of Action, and 1–2
            constrained solutions.
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="font-semibold text-red-300">Immediate Horizon (Minutes–Hours)</p>
              <p className="mt-1 text-slate-300">{hazard.outputSlots.immediateHorizon}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="font-semibold text-amber-300">Prolonged Horizon (Days–Weeks)</p>
              <p className="mt-1 text-slate-300">{hazard.outputSlots.prolongedHorizon}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="font-semibold text-sky-300">Estimated Time of Action (ETA)</p>
              <p className="mt-1 text-slate-300">{hazard.outputSlots.etaSlot}</p>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="font-semibold text-emerald-300">1–2 Constrained Actionable Solutions</p>
              <p className="mt-1 text-slate-300">{hazard.outputSlots.solutionsSlot}</p>
            </div>
          </div>

          <div className="pt-2">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Server className="h-3.5 w-3.5" />
              Proposed Fullstack Endpoints
            </p>
            <div className="space-y-1.5">
              {hazard.proposedEndpoints.map((ep) => (
                <div
                  key={`${ep.method}-${ep.path}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px]"
                >
                  <span className="font-mono text-sky-300">
                    {ep.method} {ep.path}
                  </span>
                  <span className="text-slate-400">{ep.purpose}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Quick Switch to Other Hazards */}
      <section className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-xs">
        <span className="inline-flex items-center gap-1.5 text-slate-400">
          <ShieldAlert className="h-4 w-4 text-sky-400" />
          Navigate all 5 hazards:
        </span>
        <div className="flex flex-wrap gap-2">
          {HAZARDS.map((h) => (
            <Link
              key={h.slug}
              href={`/dashboard/hazards/${h.slug}`}
              className={`rounded border px-2.5 py-1 ${
                h.slug === hazard.slug
                  ? "border-sky-500 bg-sky-950 text-sky-200"
                  : "border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {h.number}. {h.shortTitle}
            </Link>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
