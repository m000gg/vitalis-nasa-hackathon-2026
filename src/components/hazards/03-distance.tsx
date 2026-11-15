"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Package,
  Radio,
  ShieldAlert,
  Users,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import {
  InfoCircle,
  ResearchModal,
  type ActiveResearchInfoState,
} from "@/components/ResearchInfoModal";
import {
  DISTANCE_PIPELINE_VALUES,
  DISTANCE_RESEARCH_METADATA,
} from "@/lib/hazards/03-distance";
import type { HazardScreenProps } from "./types";

type StatusKey = "NOMINAL" | "ELEVATED" | "CRITICAL";

const STATUS_STYLE: Record<
  StatusKey,
  { badge: string; panel: string }
> = {
  NOMINAL: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-200/80 bg-emerald-50/40",
  },
  ELEVATED: {
    badge: "border-amber-300 bg-amber-50 text-amber-900",
    panel: "border-amber-300/80 bg-amber-50/40",
  },
  CRITICAL: {
    badge: "border-red-300 bg-red-50 text-red-900",
    panel: "border-red-300/80 bg-red-50/40",
  },
};

function StatusIcon({ status, className = "h-3.5 w-3.5" }: { status: StatusKey; className?: string }) {
  if (status === "CRITICAL") return <ShieldAlert className={className} aria-hidden="true" />;
  if (status === "ELEVATED") return <AlertTriangle className={className} aria-hidden="true" />;
  return <CheckCircle2 className={className} aria-hidden="true" />;
}

/**
 * HAZARD 3: DISTANCE FROM EARTH SCREEN (Read-Only, DB-Driven)
 * Displays the evaluated light-time delay model and synced DB streams.
 */
export function DistanceHazardScreen({
  hazard,
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  scenarioHazardRecords,
}: HazardScreenProps) {
  const ephemerisRec = hazardRecords.find(
    (r) => r.streamName === "Earth–Mars Ephemeris (JPL Horizons)"
  );
  const inventoryRec = hazardRecords.find((r) => r.streamName === "Onboard Medical Inventory");
  const charts = snapshot.charts ?? [];
  const commsLabel = mission.commsDelayLabel?.replace(/^Add your info:\s*/i, "").trim();
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);

  const crewReadinessRows =
    role === "lead"
      ? mission.crew.map((member) => {
          const memberInv =
            scenarioHazardRecords.find(
              (r) =>
                r.characterId === member.id &&
                r.hazardSlug === "distance" &&
                r.streamName === "Onboard Medical Inventory"
            ) ?? inventoryRec;
          const memberEphem =
            scenarioHazardRecords.find(
              (r) =>
                r.characterId === member.id &&
                r.hazardSlug === "distance" &&
                r.streamName === "Earth–Mars Ephemeris (JPL Horizons)"
            ) ?? ephemerisRec;
          const distSnap = hazard.evaluate({
            mission,
            actor: member,
            role: "lead",
            actorInputs: {},
            hazardRecords: memberEphem ? [memberEphem] : [],
            hazardSamples: [],
            allHazardRecords: [],
            allHazardSamples: [],
            scenarioHazardRecords,
          });
          return {
            id: member.id,
            callsign: member.callsign,
            roleTitle: member.assignedRoleTitle,
            isLeadSlot: member.isLeadSlot,
            status: distSnap.status,
            eta: distSnap.eta,
            kitSummary: memberInv?.rawValue || "Nominal kit",
          };
        })
      : [];

  return (
    <div className="space-y-6">
      {/* 1. Ready-to-Act Primary Briefing */}
      <section className={`rounded-2xl border p-5 ${STATUS_STYLE[snapshot.status].panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[snapshot.status].badge}`}
            >
              <StatusIcon status={snapshot.status} className="h-3.5 w-3.5" />
              {snapshot.status}
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Deep Space Autonomy &amp; Light-Time Briefing
            </h2>
            <InfoCircle
              entry={DISTANCE_RESEARCH_METADATA.autonomy_briefing}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
              {role === "lead" ? (
                <>
                  <Users className="h-3 w-3" /> Commander View (All Crew)
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Personal View ({activeCharacter.callsign})
                </>
              )}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            {snapshot.eta}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Immediate Horizon (Local Autonomy Window)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Prolonged Horizon (Light-Time Separation &amp; Supply Status)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-sky-900 uppercase">
              Prioritized Steps ({snapshot.solutions.length} Max)
            </p>
            <ol className="mt-2.5 space-y-2">
              {snapshot.solutions.map((sol, idx) => (
                <li
                  key={sol}
                  className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm leading-snug text-sky-950"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <span>{sol}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 2. Core Distance & Medical Supply KPIs */}
      <section aria-label="Distance and medical inventory telemetry" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Radio className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-600">JPL Horizons Ephemeris</span>
            </div>
            <InfoCircle
              entry={DISTANCE_RESEARCH_METADATA.ephemeris_latency}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {ephemerisRec?.rawValue || "Awaiting ephemeris record"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            c = {DISTANCE_PIPELINE_VALUES.speedOfLightKmPerSecond.toLocaleString()} km/s · RTT = 2 × d / c
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-600">Signal Latency Profile</span>
            </div>
            <InfoCircle
              entry={DISTANCE_RESEARCH_METADATA.ephemeris_latency}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">{snapshot.eta}</p>
          {commsLabel && !commsLabel.toLowerCase().includes("here") && (
            <p className="mt-1 text-xs text-slate-500">{commsLabel}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="text-xs font-medium text-slate-600">Medical Inventory</span>
            </div>
            <InfoCircle
              entry={DISTANCE_RESEARCH_METADATA.medical_inventory}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {inventoryRec?.rawValue || "No inventory snapshot"}
          </p>
        </div>
      </section>

      {/* 3. Lead Crew Autonomy & Medical Supply Matrix */}
      {role === "lead" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-sky-600" />
                Crew Autonomous Readiness &amp; Med Kit Allocation ({crewReadinessRows.length} Crew)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {hazard.leadView.privacyRule}
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3.5 py-2.5">Crew Member</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Signal Delay Window</th>
                  <th className="px-3.5 py-2.5">Assigned Med Kit / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crewReadinessRows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === activeCharacter.id ? "bg-sky-50/50" : "bg-white"}
                  >
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{row.callsign}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            row.isLeadSlot
                              ? "bg-sky-100 text-sky-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.isLeadSlot ? "LEAD" : "MEMBER"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{row.roleTitle}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[row.status].badge}`}
                      >
                        <StatusIcon status={row.status} className="h-3 w-3" />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700">{row.eta}</td>
                    <td className="px-3.5 py-2.5 text-slate-700">{row.kitSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. Ephemeris / Telemetry Charts */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Ephemeris &amp; Distance Telemetry History</h2>
        {charts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {charts.map((chart) => (
              <HazardTelemetryChart key={chart.id} chart={chart} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">
            No numeric distance telemetry samples yet.
          </div>
        )}
      </section>

      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
