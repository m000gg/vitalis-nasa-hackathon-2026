"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, Lock } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { getHazardBySlug, HAZARDS } from "@/lib/hazards";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { evaluateHazardForActor } from "@/lib/evaluator";

export default function HazardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hazard = getHazardBySlug(slug);
  const {
    mission,
    activeCharacter,
    role,
    dbSource,
    linkOnline,
    reentryMode,
    actorInputs,
    hazardRecords,
    saveActorInput,
  } = useMission();
  const { pushToast } = useAlerts();

  const currentActorInputs = actorInputs[activeCharacter.id] ?? {};
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  if (!hazard) {
    notFound();
  }

  const scopedRecords = hazardRecords.filter((r) => r.hazardSlug === hazard.slug);
  const roleConfig = role === "lead" ? hazard.leadView : hazard.memberView;
  const snapshot = evaluateHazardForActor(mission, activeCharacter, hazard, {
    actorInputs: currentActorInputs,
    hazardRecords,
    linkOnline,
    reentryMode,
  });

  const handleSaveSlot = async (streamName: string) => {
    const persisted = scopedRecords.find((r) => r.streamName === streamName)?.rawValue ?? "";
    const val = (draftValues[streamName] ?? currentActorInputs[streamName] ?? persisted).trim();
    if (val) {
      await saveActorInput(streamName, val, hazard.slug);
    }
    pushToast({
      title: `${hazard.shortTitle}: Input Saved`,
      message: val
        ? `Here is: "${val}" stored for ${activeCharacter.callsign} in ${streamName} (${
            dbSource === "supabase" ? "Supabase Remote" : "Local Fallback"
          }).`
        : `Here is: Add your info to ${streamName} to update character telemetry.`,
      variant: val ? "success" : "info",
    });
  };

  return (
    <DashboardShell>
      {/* Info-Agnostic Hazard Header */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Overview
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                dbSource === "supabase"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Database className="h-3 w-3" />
              {dbSource === "supabase" ? "Supabase Remote" : "Local Fallback"} · {scopedRecords.length} saved
            </span>
            <span className="font-mono text-xs text-slate-400">
              Logic: {hazard.ownerSlot} · Doc: {hazard.sourceDoc}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              Hazard {hazard.number} of 5 · {role.toUpperCase()} View
            </span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                snapshot.status === "CRITICAL"
                  ? "bg-red-100 text-red-800"
                  : snapshot.status === "ELEVATED"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Status: {snapshot.status}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
              {snapshot.actorStatusLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{hazard.title}</h1>
          <p className="max-w-3xl text-sm text-slate-600">{hazard.overviewSlot}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Active Scenario Slot ({mission.name}): </span>
          {snapshot.scenarioStatusSlot}
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

      {/* Input Slots + Evaluated Output Slots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Input Ingestion Slots</h2>
          <div className="space-y-3">
            {hazard.inputSlots.map((slot) => {
              const savedRec = scopedRecords.find((r) => r.streamName === slot.streamName);
              const displayValue =
                draftValues[slot.streamName] ??
                currentActorInputs[slot.streamName] ??
                savedRec?.rawValue ??
                "";
              return (
                <div key={slot.streamName} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{slot.streamName}</span>
                    <span className="text-slate-400">
                      {savedRec ? `Saved (${new Date(savedRec.updatedAt).toLocaleTimeString()})` : slot.sourceRef}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => setDraftValues((prev) => ({ ...prev, [slot.streamName]: e.target.value }))}
                    placeholder={slot.inputPrompt}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveSlot(slot.streamName)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Save Input
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Evaluated Outputs &amp; Guidance</h2>
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-red-700">Immediate Horizon</p>
              <p className="mt-1 text-slate-600">{snapshot.immediateHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-amber-700">Prolonged Horizon</p>
              <p className="mt-1 text-slate-600">{snapshot.prolongedHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-sky-700">Estimated Time of Action</p>
              <p className="mt-1 text-slate-600">{snapshot.eta}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-emerald-700">
                {reentryMode ? "1 Actionable Solution (Re-Entry Cap)" : "1–2 Actionable Solutions"}
              </p>
              <div className="mt-1 space-y-1 text-slate-600">
                {snapshot.solutions.map((sol, idx) => (
                  <p key={idx}>{sol}</p>
                ))}
              </div>
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
