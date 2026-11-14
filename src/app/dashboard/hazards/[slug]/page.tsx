"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, ArrowLeft, Bell, Lock } from "lucide-react";
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
      title: `${hazard.shortTitle}: Input Recorded`,
      message: val
        ? `Here is: "${val}" captured in ${streamName}.`
        : `Here is: ${streamName} slot opened (add your info to populate).`,
      variant: val ? "success" : "info",
    });
  };

  return (
    <DashboardShell>
      {/* Header Card */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Overview
          </Link>
          <span className="text-xs text-slate-400">Doc: {hazard.sourceDoc}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              Hazard {hazard.number} of 5 · {role.toUpperCase()} View
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{hazard.title}</h1>
            <p className="max-w-3xl text-sm text-slate-600">{hazard.overviewSlot}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: `Hazard ${hazard.number} Toast`,
                  message: `Here is: ${hazard.title} notification for ${role.toUpperCase()}.`,
                  variant: "warning",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              Hazard Toast
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              Screen Alarm
            </button>
          </div>
        </div>
      </section>

      {/* Role-Specific Modules */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            {role === "lead" ? "Lead Controls & Matrix" : "Member Controls & Personal View"}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <Lock className="h-3.5 w-3.5 text-sky-600" />
            {roleConfig.privacyRule}
          </span>
        </div>

        <p className="text-sm text-slate-600">{roleConfig.summary}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {roleConfig.modules.map((mod) => (
            <div key={mod.title} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
              <h3 className="text-sm font-semibold text-slate-900">{mod.title}</h3>
              <p className="text-slate-600">{mod.detail}</p>
              <p className="text-slate-400">{mod.actionSlot}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Input Slots + Output Slots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Input Ingestion Slots</h2>
          <div className="space-y-3">
            {hazard.inputSlots.map((slot) => (
              <div key={slot.streamName} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{slot.streamName}</span>
                  <span className="text-slate-400">{slot.sourceRef}</span>
                </div>
                <input
                  type="text"
                  value={inputValues[slot.streamName] ?? ""}
                  onChange={(e) => setInputValues((prev) => ({ ...prev, [slot.streamName]: e.target.value }))}
                  placeholder={slot.inputPrompt}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveSlot(slot.streamName)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Submit Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Outputs &amp; Guidance Slots</h2>
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-red-700">Immediate Horizon</p>
              <p className="mt-1 text-slate-600">{hazard.outputSlots.immediateHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-amber-700">Prolonged Horizon</p>
              <p className="mt-1 text-slate-600">{hazard.outputSlots.prolongedHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-sky-700">Estimated Time of Action</p>
              <p className="mt-1 text-slate-600">{hazard.outputSlots.etaSlot}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-emerald-700">1–2 Actionable Solutions</p>
              <p className="mt-1 text-slate-600">{hazard.outputSlots.solutionsSlot}</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-xs font-semibold text-slate-500">Proposed API Endpoints</p>
            {hazard.proposedEndpoints.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
              >
                <span className="font-mono text-sky-700">
                  {ep.method} {ep.path}
                </span>
                <span className="text-slate-500">{ep.purpose}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Switcher */}
      <div className="flex flex-wrap gap-2">
        {HAZARDS.map((h) => (
          <Link
            key={h.slug}
            href={`/dashboard/hazards/${h.slug}`}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              h.slug === hazard.slug
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {h.number}. {h.shortTitle}
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
