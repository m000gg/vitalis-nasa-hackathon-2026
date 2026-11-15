"use client";

import React, { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { HazardScreen } from "@/components/hazards";
import { getHazardBySlug, HAZARDS } from "@/lib/hazards";
import { useMission } from "@/context/MissionContext";
import {
  evaluateHazardForActor,
  sanitizeHazardRecordsForRole,
  sanitizeHazardSamplesForRole,
} from "@/lib/evaluator";

export default function HazardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hazard = getHazardBySlug(slug);
  const {
    mission,
    activeCharacter,
    role,
    actorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
  } = useMission();

  if (!hazard) {
    notFound();
  }

  if (!mission || !activeCharacter) {
    return <DashboardShell>{null}</DashboardShell>;
  }

  const currentActorInputs = actorInputs[activeCharacter.id] ?? {};
  const snapshot = evaluateHazardForActor(mission, activeCharacter, hazard, {
    actorInputs: currentActorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    role,
  });

  const safeScenarioRecords = sanitizeHazardRecordsForRole(
    scenarioHazardRecords,
    role,
    activeCharacter.id
  );
  const safeScenarioSamples = sanitizeHazardSamplesForRole(
    scenarioHazardSamples,
    role,
    activeCharacter.id
  );
  const safeHazardRecords = safeScenarioRecords.filter(
    (r) => r.characterId === activeCharacter.id && r.hazardSlug === hazard.slug
  );
  const safeHazardSamples = safeScenarioSamples.filter(
    (s) => s.characterId === activeCharacter.id && s.hazardSlug === hazard.slug
  );

  return (
    <DashboardShell>
      {/* Minimal Shared Header Chrome */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Overview
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                snapshot.status === "CRITICAL"
                  ? "bg-red-100 text-red-800"
                  : snapshot.status === "ELEVATED"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {snapshot.status}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
              {activeCharacter.callsign} ({role.toUpperCase()})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            Hazard {hazard.number}: {hazard.title}
          </h1>

          <div className="flex flex-wrap gap-1.5">
            {HAZARDS.map((h) => (
              <Link
                key={h.slug}
                href={`/dashboard/hazards/${h.slug}`}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  h.slug === hazard.slug
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {h.number}. {h.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Isolated Per-Hazard Screen Canvas */}
      <HazardScreen
        hazard={hazard}
        mission={mission}
        activeCharacter={activeCharacter}
        role={role}
        snapshot={snapshot}
        hazardRecords={safeHazardRecords}
        hazardSamples={safeHazardSamples}
        scenarioHazardRecords={safeScenarioRecords}
        scenarioHazardSamples={safeScenarioSamples}
      />
    </DashboardShell>
  );
}
