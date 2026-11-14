"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Lock,
  Package,
  Radio,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { DISTANCE_PIPELINE_VALUES } from "@/lib/hazards/03-distance";
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
 * Displays the evaluated light-time delay model, DTN autonomy state, and synced DB streams.
 */
export function DistanceHazardScreen({
  hazard,
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  linkOnline,
  reentryMode,
}: HazardScreenProps) {
  const ephemerisRec = hazardRecords.find(
    (r) => r.streamName === "Earth–Mars Ephemeris (JPL Horizons)"
  );
  const dtnRec = hazardRecords.find((r) => r.streamName === "DTN Outbound Medical Queue");
  const inventoryRec = hazardRecords.find((r) => r.streamName === "Onboard Medical Inventory");
  const roleMeta = role === "lead" ? hazard.leadView : hazard.memberView;
  const charts = snapshot.charts ?? [];

  return (
    <div className="space-y-6">
      {reentryMode && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5">
          <span className="text-xs font-bold tracking-wide text-indigo-900 uppercase">
            Re-Entry Mode Active · 1-Action Cap
          </span>
          <p className="mt-0.5 text-xs text-indigo-800">
            Autonomous recommendations are capped to 1 prioritized step.
          </p>
        </section>
      )}

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
                Prolonged Horizon (DTN Queue &amp; Supply Readiness)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-sky-900 uppercase">
              Prioritized Steps ({snapshot.solutions.length}{" "}
              {reentryMode ? "· Re-Entry Cap" : "Max"})
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

      {/* 2. Core Distance & DTN KPIs */}
      <section aria-label="Distance and communications telemetry" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Earth Link State</span>
            {linkOnline ? (
              <Wifi className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
            )}
          </div>
          <p className={`mt-2 text-lg font-bold ${linkOnline ? "text-emerald-700" : "text-amber-800"}`}>
            {linkOnline ? "Online" : "Blackout (Offline)"}
          </p>
          <p className="mt-1 text-xs text-slate-600">{mission.commsDelayLabel}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">JPL Horizons Ephemeris</span>
            <Radio className="h-4 w-4 text-sky-600" aria-hidden="true" />
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
            <span className="text-xs font-medium text-slate-600">DTN Outbound Queue</span>
            <Database className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {dtnRec?.rawValue || "No stream snapshot synced"}
          </p>
          <Link
            href="/dashboard/comms"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
          >
            Open DTN Queue Console <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Medical Inventory</span>
            <Package className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {inventoryRec?.rawValue || "No inventory snapshot synced"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {hazardRecords.length} record(s) · {hazardSamples.length} sample(s) ({activeCharacter.callsign})
          </p>
        </div>
      </section>

      {/* 3. Role-Tailored View & Synced Streams */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {role === "lead" ? "Commander Autonomy & DTN Oversight" : "Member Offline Autonomy Guidance"}
          </h2>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            <Lock className="h-3 w-3" /> {roleMeta.privacyRule}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-600">{roleMeta.summary}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roleMeta.modules.map((mod) => (
            <div key={mod.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <p className="font-semibold text-slate-900">{mod.title}</p>
              <p className="mt-1 text-slate-700">{mod.detail}</p>
            </div>
          ))}
        </div>
      </section>

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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
            Awaiting Earth–Mars Ephemeris samples in Supabase to render telemetry charts.
          </div>
        )}
      </section>

      {/* 5. NASA References */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
        <p className="font-bold text-slate-900">NASA Reference Anchors</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {hazard.nasaReferences.map((ref) => (
            <li key={ref} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">
              {ref}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
