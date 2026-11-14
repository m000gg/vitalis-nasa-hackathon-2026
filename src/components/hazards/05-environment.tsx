"use client";

import React from "react";
import type { HazardScreenProps } from "./types";

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN
 * Owner: Teammate 5 — Edit ONLY this file (and src/lib/hazards/05-environment.ts).
 */
export function EnvironmentHazardScreen({
  hazard,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
}: HazardScreenProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-600">
      <p className="text-sm font-semibold text-slate-900">
        Hazard {hazard.number}: {hazard.title} — Blank Canvas ({role.toUpperCase()})
      </p>
      <p className="mt-2">
        Synced telemetry for {activeCharacter.callsign}: {hazardRecords.length} record(s) ·{" "}
        {hazardSamples.length} sample(s) · Status: {snapshot.status}
      </p>
      <p className="mt-3 font-mono text-[11px] text-slate-500">
        Implement screen UI in src/components/hazards/05-environment.tsx · Logic &amp; privacy schema in{" "}
        {hazard.ownerSlot}
      </p>
    </section>
  );
}
