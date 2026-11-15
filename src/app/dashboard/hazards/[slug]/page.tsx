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
      <section className="hud-panel space-y-3 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-mono-tech text-xs text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Command Deck
          </Link>

          <div className="flex flex-wrap items-center gap-2 font-mono-tech text-xs">
            <span
              className={`rounded border px-2 py-0.5 font-bold ${
                snapshot.status === "CRITICAL"
                  ? "border-[#DC2626]/55 bg-[#DC2626]/15 text-red-300"
                  : snapshot.status === "ELEVATED"
                  ? "border-[#D97706]/55 bg-[#D97706]/15 text-amber-300"
                  : "border-[#16A34A]/50 bg-[#16A34A]/15 text-emerald-300"
              }`}
            >
              {snapshot.status}
            </span>
            <span className="rounded border border-slate-700 bg-[#060A14] px-2.5 py-0.5 text-slate-200">
              {activeCharacter.callsign} ({role.toUpperCase()})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl tracking-tight text-white">
            0{hazard.number} · {hazard.title}
          </h1>

          <div className="flex flex-wrap gap-1.5">
            {HAZARDS.map((h) => (
              <Link
                key={h.slug}
                href={`/dashboard/hazards/${h.slug}`}
                className={`rounded-md border px-2.5 py-1 font-mono-tech text-xs font-bold transition ${
                  h.slug === hazard.slug
                    ? "border-[#3B82F6]/65 bg-[#3B82F6]/20 text-blue-200"
                    : "border-slate-700/80 bg-[#060A14] text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                0{h.number}. {h.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </section>

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
