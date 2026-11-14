"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BedDouble,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HeartHandshake,
  Home,
  Info,
  Lock,
  ShieldAlert,
  Sparkles,
  Users,
  Volume2,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { evaluateHazardForActor } from "@/lib/evaluator";
import {
  deriveShipLayoutProfile,
  ISOLATION_PIPELINE_VALUES,
  ISOLATION_RESEARCH_METADATA,
  type IsolationInfoEntry,
  type ShipLayoutProfile,
} from "@/lib/hazards/02-isolation";
import type { HazardChartSpec, HazardDataRecord } from "@/lib/hazards/types";
import type { HazardScreenProps } from "./types";

const V = ISOLATION_PIPELINE_VALUES;

const STREAM_WEARABLE = "Wearable / Actigraphy";
const STREAM_HABITAT = "Habitat Acoustics & Lighting";
const STREAM_SELF_CHECK = "60-Second Self-Check (Private)";
const STREAM_CONNECT = "CONNECT & Countermeasure Log";

type Tone = "nominal" | "elevated" | "critical";
type StatusKey = "NOMINAL" | "ELEVATED" | "CRITICAL";

const STATUS_STYLE: Record<
  StatusKey,
  { badge: string; panel: string; text: string; label: string }
> = {
  NOMINAL: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-200/80 bg-emerald-50/40",
    text: "text-emerald-800",
    label: "NOMINAL",
  },
  ELEVATED: {
    badge: "border-amber-300 bg-amber-50 text-amber-900",
    panel: "border-amber-300/80 bg-amber-50/40",
    text: "text-amber-900",
    label: "ELEVATED",
  },
  CRITICAL: {
    badge: "border-red-300 bg-red-50 text-red-900",
    panel: "border-red-300/80 bg-red-50/40",
    text: "text-red-900",
    label: "CRITICAL",
  },
};

const TONE_VALUE_CLASS: Record<Tone, string> = {
  nominal: "text-slate-900",
  elevated: "text-amber-800",
  critical: "text-red-700",
};

const TONE_SURFACE_CLASS: Record<Tone, string> = {
  nominal: "border-slate-200 bg-white",
  elevated: "border-amber-300 bg-amber-50/30",
  critical: "border-red-300 bg-red-50/30",
};

const CHART_META_MAP: Record<string, { metaKey: string; sourceTag: string }> = {
  "sample-wearable-actigraphy": {
    metaKey: "chart_sleep",
    sourceTag: "Barger et al. (2014) · Lancet Neurol.",
  },
  "isolation-sleep-debt": {
    metaKey: "chart_sleep_debt",
    sourceTag: "NASA HRR Sleep Risk · 3-Sample Debt",
  },
  "sample-60-second-self-check-private-": {
    metaKey: "chart_pvt",
    sourceTag: "Basner & Dinges (2011) · PVT-B 355 ms",
  },
  "sample-habitat-acoustics-lighting": {
    metaKey: "chart_acoustics",
    sourceTag: "NASA-STD-3001 [V2 6079] · NC-40",
  },
  "isolation-hypokinesis-activity": {
    metaKey: "chart_hypokinesis",
    sourceTag: "Mars500 Basner et al. (2014) · PLOS ONE",
  },
};

function StatusIcon({ status, className = "h-3.5 w-3.5" }: { status: StatusKey; className?: string }) {
  if (status === "CRITICAL") return <ShieldAlert className={className} aria-hidden="true" />;
  if (status === "ELEVATED") return <AlertTriangle className={className} aria-hidden="true" />;
  return <CheckCircle2 className={className} aria-hidden="true" />;
}

function findRecord(records: readonly HazardDataRecord[], streamName: string) {
  return records.find((r) => r.hazardSlug === "isolation" && r.streamName === streamName);
}

function getNum(record: HazardDataRecord | undefined, key: string): number | null {
  const val = record?.payload?.[key];
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getBool(record: HazardDataRecord | undefined, key: string): boolean | null {
  const val = record?.payload?.[key];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const norm = val.trim().toLowerCase();
    if (norm === "true" || norm === "yes" || norm === "1") return true;
    if (norm === "false" || norm === "no" || norm === "0") return false;
  }
  return null;
}

function getStr(record: HazardDataRecord | undefined, key: string): string | null {
  const val = record?.payload?.[key];
  return typeof val === "string" && val.trim() !== "" ? val.trim() : null;
}

function parseReadinessScore(immediateHorizon: string): string {
  const match = immediateHorizon.match(/\[Readiness\s+(\d+\/9)\]/i);
  return match ? match[1] : "—";
}

function formatNum(value: number | null, unit = "", digits?: number): string {
  if (value === null) return "—";
  const formatted = typeof digits === "number" ? value.toFixed(digits) : String(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function shortCallsign(callsign: string): string {
  const parts = callsign.split("—");
  return (parts[1] ?? parts[0]).trim();
}

/**
 * Accessible (i) button with comfortable astronaut-friendly hit target (24x24px).
 * Opens the unified viewport-safe ResearchModal so popovers never clip inside tables or mobile screens.
 */
function InfoCircle({
  entry,
  activeInfo,
  onSelectInfo,
}: {
  entry: IsolationInfoEntry;
  activeInfo: IsolationInfoEntry | null;
  onSelectInfo: (entry: IsolationInfoEntry | null) => void;
}) {
  const isSelected = activeInfo?.id === entry.id;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectInfo(isSelected ? null : entry);
      }}
      aria-label={`Explain ${entry.title} and view NASA sources`}
      aria-expanded={isSelected}
      title={`NASA source & explanation: ${entry.title}`}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
        isSelected
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
      }`}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

/**
 * Accessible, non-clipping modal dialog displaying plain-language explanation,
 * verified NASA benchmark/thresholds, and clickable research paper & dataset links.
 */
function ResearchModal({
  entry,
  onClose,
}: {
  entry: IsolationInfoEntry | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!entry) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="isolation-research-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 id="isolation-research-title" className="text-sm font-bold text-slate-900">
              {entry.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close research details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{entry.explanation}</p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              NASA Thresholds &amp; Dataset Benchmark
            </p>
            <p className="mt-1">{entry.benchmark}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              Verified Research Papers &amp; Datasets
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {entry.links.map((link) => (
                <li key={link.url + link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs font-medium text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subline,
  tone = "nominal",
  icon,
  infoEntry,
  activeInfo,
  onSelectInfo,
}: {
  label: string;
  value: string;
  subline: string;
  tone?: Tone;
  icon: React.ReactNode;
  infoEntry: IsolationInfoEntry;
  activeInfo: IsolationInfoEntry | null;
  onSelectInfo: (entry: IsolationInfoEntry | null) => void;
}) {
  const toneLabel = tone === "critical" ? "Critical" : tone === "elevated" ? "Elevated" : "Nominal";
  return (
    <article className={`rounded-2xl border p-4 transition-colors ${TONE_SURFACE_CLASS[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {icon}
          <span>{label}</span>
        </div>
        <InfoCircle entry={infoEntry} activeInfo={activeInfo} onSelectInfo={onSelectInfo} />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className={`text-2xl font-bold tracking-tight tabular-nums ${TONE_VALUE_CLASS[tone]}`}>
          {value}
        </p>
        {tone !== "nominal" && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              tone === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {toneLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-600">{subline}</p>
    </article>
  );
}

function SharedZoneBadgeIcon({ category }: { category: ShipLayoutProfile["sharedZones"][number]["category"] }) {
  if (category === "commons") return <HeartHandshake className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />;
  if (category === "biophilia") return <Sparkles className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />;
  if (category === "eclss") return <Wrench className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />;
  if (category === "exercise") return <Activity className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />;
  return <BedDouble className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />;
}

function ShipHabitatLayoutCard({
  layout,
  activeCharacterId,
  activeInfo,
  onSelectInfo,
}: {
  layout: ShipLayoutProfile;
  activeCharacterId: string;
  activeInfo: IsolationInfoEntry | null;
  onSelectInfo: (entry: IsolationInfoEntry | null) => void;
}) {
  const privacyRatio = layout.privateQuartersCount / Math.max(1, layout.crewCount);
  const densityStatus: StatusKey = layout.hasVolumeDeficit
    ? "CRITICAL"
    : layout.hasPrivacyDeficit
    ? "ELEVATED"
    : "NOMINAL";

  const densityLabel = layout.hasPrivacyDeficit
    ? `[V2 7071] Privacy Deficit: ${layout.crewCount} crew / ${layout.privateQuartersCount} quarters`
    : layout.hasVolumeDeficit
    ? `NHV Below Floor: ${layout.nhvPerCrewM3.toFixed(1)} < ${V.minNetHabitableVolumeM3PerCrew} m³/crew`
    : `[V2 7071] 1:1 Private Quarters Compliant`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Home className="h-4 w-4 text-sky-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-900">
            Ship &amp; Habitat Layout — Rooms vs. Crew Density
          </h2>
          <InfoCircle
            entry={ISOLATION_RESEARCH_METADATA.ship_layout}
            activeInfo={activeInfo}
            onSelectInfo={onSelectInfo}
          />
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[densityStatus].badge}`}
          >
            <StatusIcon status={densityStatus} className="h-3.5 w-3.5" />
            {densityLabel}
          </span>
        </div>

        <span className="text-xs font-medium text-slate-600">
          {layout.profileName} ·{" "}
          {layout.isDbOverride ? "DB Telemetry Override" : "NASA Reference + Live Crew"}
        </span>
      </div>

      {/* Density Summary Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-600">Astronauts Onboard</span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              activeInfo={activeInfo}
              onSelectInfo={onSelectInfo}
            />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {layout.crewCount} crew
          </p>
          <p className="text-xs text-slate-500">Live from public.characters</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-600">Private Sleep Quarters</span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              activeInfo={activeInfo}
              onSelectInfo={onSelectInfo}
            />
          </div>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              layout.hasPrivacyDeficit ? "text-amber-800" : "text-slate-900"
            }`}
          >
            {layout.privateQuartersCount} rooms
          </p>
          <p className="text-xs text-slate-500">
            {privacyRatio.toFixed(2)} rooms/crew ([V2 7071] &ge; 1.0)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-600">Total Habitat Rooms</span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              activeInfo={activeInfo}
              onSelectInfo={onSelectInfo}
            />
          </div>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
            {layout.totalHabitatRooms} rooms
          </p>
          <p className="text-xs text-slate-500">
            {layout.privateQuartersCount} private + {layout.sharedFunctionalRoomsCount} shared bays
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-medium text-slate-600">Net Habitable Volume</span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              activeInfo={activeInfo}
              onSelectInfo={onSelectInfo}
            />
          </div>
          <p
            className={`mt-1 text-lg font-bold tabular-nums ${
              layout.hasVolumeDeficit ? "text-red-700" : "text-slate-900"
            }`}
          >
            {layout.nhvPerCrewM3.toFixed(1)} m³/crew
          </p>
          <p className="text-xs text-slate-500">
            {layout.habitableVolumeM3} m³ total (min {V.minNetHabitableVolumeM3PerCrew} m³/crew)
          </p>
        </div>
      </div>

      {/* Responsive Architectural Habitat Deck Blueprint (HTML Grid inside pressurized hull frame) */}
      <div className="mt-4 rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            Pressurized Deck Plan — Private Quarters &amp; Shared Functional Bays
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Nominal / Private
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" aria-hidden="true" />
              Shared Berth / Conditional
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden="true" />
              Hold / NC-40 Breach
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_auto_1fr]">
          {/* Left Wing: Private Crew Quarters */}
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-slate-700 uppercase">
              Private Crew Quarters ({layout.privateQuartersCount})
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {layout.quarters.map((q) => {
                const containsActive = q.occupants.some((o) => o.characterId === activeCharacterId);
                const hasHold = q.occupants.some((o) => o.readinessState === "HOLD");
                const hasCond = q.occupants.some((o) => o.readinessState === "CONDITIONAL");

                const quarterStatus: StatusKey =
                  q.nc40Breached || hasHold
                    ? "CRITICAL"
                    : q.isOverflowShared || hasCond
                    ? "ELEVATED"
                    : "NOMINAL";

                const cardBorder = containsActive
                  ? "border-sky-500 ring-2 ring-sky-200 bg-sky-50/50"
                  : quarterStatus === "CRITICAL"
                  ? "border-red-300 bg-red-50/50"
                  : quarterStatus === "ELEVATED"
                  ? "border-amber-300 bg-amber-50/50"
                  : "border-slate-200 bg-white";

                return (
                  <div key={q.roomId} className={`rounded-xl border p-3 ${cardBorder}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {q.roomId}
                        {containsActive && (
                          <span className="ml-1.5 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            YOU
                          </span>
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[quarterStatus].badge}`}
                      >
                        <StatusIcon status={quarterStatus} className="h-3 w-3" />
                        {q.isOverflowShared ? `Shared (${q.occupants.length})` : quarterStatus}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      {q.occupants.length === 0 ? (
                        <p className="text-xs text-slate-500">Unassigned quarter</p>
                      ) : (
                        q.occupants.map((occ) => (
                          <div
                            key={occ.characterId}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-medium text-slate-800">
                              {shortCallsign(occ.callsign)}
                            </span>
                            <span className="text-slate-600 tabular-nums">
                              {occ.sleepH !== null ? `${occ.sleepH}h` : "—"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-1.5 text-[11px]">
                      <span className="text-slate-600">
                        Acoustic:{" "}
                        <strong className={q.nc40Breached ? "text-red-700" : "text-slate-800"}>
                          {q.noiseDba !== null ? `${q.noiseDba.toFixed(1)} dBA` : "Awaiting stream"}
                        </strong>
                      </span>
                      {q.isOverflowShared && (
                        <span className="font-semibold text-amber-800">[V2 7071] Deficit</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Spine: Pressurized Corridor & Airlock */}
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-200/70 px-3 py-2 text-center lg:w-12 lg:py-4">
            <span className="text-[11px] font-bold tracking-widest text-slate-600 uppercase lg:[writing-mode:vertical-rl] lg:rotate-180">
              Pressurized Corridor · Airlock Spine
            </span>
          </div>

          {/* Right Wing: Shared Functional Bays */}
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-wide text-slate-700 uppercase">
              Shared Habitat Bays ({layout.sharedZones.length} Core Zones)
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {layout.sharedZones.map((zone, idx) => (
                <div
                  key={zone.id}
                  className={`rounded-xl border p-3 ${
                    idx === layout.sharedZones.length - 1 ? "sm:col-span-2" : ""
                  } ${
                    zone.alertFlag
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <SharedZoneBadgeIcon category={zone.category} />
                      <span className="text-xs font-bold text-slate-900">{zone.name}</span>
                    </div>
                    {zone.alertFlag && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                    )}
                  </div>
                  <p
                    className={`mt-1 text-xs leading-snug ${
                      zone.alertFlag ? "font-medium text-amber-900" : "text-slate-600"
                    }`}
                  >
                    {zone.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(layout.hasPrivacyDeficit || layout.hasVolumeDeficit) && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <span className="font-bold">Isolation Crowding Risk Detected: </span>
              {layout.hasPrivacyDeficit
                ? `${layout.crewCount} astronauts share ${layout.privateQuartersCount} private quarters, breaching NASA-STD-3001 [V2 7071] (>30-day individual privacy requirement) and increasing sleep fragmentation and team tension.`
                : `Net Habitable Volume (${layout.nhvPerCrewM3.toFixed(1)} m³/crew) falls below the ${V.minNetHabitableVolumeM3PerCrew} m³/crew Stromgren / DRA 5.0 consensus floor.`}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-600">
          {layout.referenceNote}. Optional DB telemetry keys:{" "}
          <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px]">
            private_quarters_count
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px]">
            total_habitat_rooms
          </code>
          ,{" "}
          <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px]">
            habitable_volume_m3
          </code>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * HAZARD 2: ISOLATION & CONFINEMENT SCREEN
 * Coherent, astronaut-accessible, 100% Read-Only DB-ingested telemetry view with:
 * - Action-First Ready-to-Act Guidance & Re-Entry overload throttling
 * - High-legibility KPI cards with accessible (i) research modals
 * - Responsive Ship & Habitat Layout (rooms vs. astronauts density)
 * - Strict Lead/Member privacy firewall & thresholded telemetry charts
 */
export function IsolationHazardScreen({
  hazard,
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  scenarioHazardRecords,
  scenarioHazardSamples,
  linkOnline,
  reentryMode,
}: HazardScreenProps) {
  const [activeInfo, setActiveInfo] = useState<IsolationInfoEntry | null>(null);
  const [showAllInReentry, setShowAllInReentry] = useState(false);

  const wearable = findRecord(hazardRecords, STREAM_WEARABLE);
  const habitat = findRecord(hazardRecords, STREAM_HABITAT);
  const selfCheck = findRecord(hazardRecords, STREAM_SELF_CHECK);
  const connect = findRecord(hazardRecords, STREAM_CONNECT);

  const sleepH = getNum(wearable, "sleep_duration_h");
  const sleepEff = getNum(wearable, "sleep_efficiency_pct");
  const circadianMin = getNum(wearable, "circadian_phase_shift_min");
  const activityCnt = getNum(wearable, "daytime_activity_counts");
  const hrvMs = getNum(wearable, "resting_hrv_rmssd");

  const noiseDba = getNum(habitat, "sleep_quarter_noise_dba");
  const impulseSpikes = getNum(habitat, "impulse_noise_events_sleep");
  const luxMatch = getNum(habitat, "ambient_lux_schedule_match");
  const missionPct = getNum(habitat, "mission_day_pct");

  const pvtRt = getNum(selfCheck, "pvt_median_rt_ms");
  const pvtLapses = getNum(selfCheck, "pvt_lapses_count");
  const fatigue = getNum(selfCheck, "subjective_fatigue_1_5");
  const strain = getNum(selfCheck, "team_workload_strain_1_5");

  const veggieDone = getBool(connect, "veggie_plant_care_done");
  const socialDone = getBool(connect, "crew_social_checkin_done");

  // Strictly private to member (never rendered in Lead view; already stripped by evaluator)
  const privateMood = getNum(selfCheck, "mood_valence_private");
  const privateJournal = getStr(selfCheck, "private_journal_note");
  const privateSleepMed = getBool(connect, "sleep_med_used_private");

  const readinessScore = parseReadinessScore(snapshot.immediateHorizon);

  const sleepTone: Tone =
    sleepH !== null && sleepH < V.criticalSleepHours
      ? "critical"
      : sleepH !== null && sleepH < V.elevatedSleepHours
      ? "elevated"
      : "nominal";

  const pvtTone: Tone =
    (pvtRt !== null && pvtRt >= V.pvtLapseThresholdMs) ||
    (pvtLapses !== null && pvtLapses >= V.pvtLapsesCrit)
      ? "critical"
      : pvtLapses !== null && pvtLapses >= V.pvtLapsesElev
      ? "elevated"
      : "nominal";

  const noiseTone: Tone =
    noiseDba !== null && noiseDba >= V.workAreaNoiseLimitNc50Dba
      ? "critical"
      : noiseDba !== null && noiseDba > V.sleepQuarterNoiseLimitNc40Dba
      ? "elevated"
      : "nominal";

  const readinessTone: Tone =
    snapshot.status === "CRITICAL"
      ? "critical"
      : snapshot.status === "ELEVATED"
      ? "elevated"
      : "nominal";

  const charts: HazardChartSpec[] = snapshot.charts ?? [];
  const primaryCharts = charts.slice(0, 4);
  const hypokinesisChart = charts.find((c) => c.id === "isolation-hypokinesis-activity");

  const shipLayout = deriveShipLayoutProfile(mission, scenarioHazardRecords, hazardRecords);

  // Lead-only anonymized crew matrix computed through evaluator (enforcing Lead privacy firewall)
  const crewRows =
    role === "lead"
      ? mission.crew.map((member) => {
          const memberRecords = scenarioHazardRecords.filter((r) => r.characterId === member.id);
          const memberSnap = evaluateHazardForActor(mission, member, hazard, {
            actorInputs: {},
            scenarioHazardRecords,
            scenarioHazardSamples,
            role: "lead",
            linkOnline,
            reentryMode,
          });
          const mWearable = findRecord(memberRecords, STREAM_WEARABLE);
          const mHabitat = findRecord(memberRecords, STREAM_HABITAT);
          const mCheck = findRecord(memberRecords, STREAM_SELF_CHECK);
          const mConnect = findRecord(memberRecords, STREAM_CONNECT);
          return {
            id: member.id,
            callsign: member.callsign,
            sleepH: getNum(mWearable, "sleep_duration_h"),
            noiseDba: getNum(mHabitat, "sleep_quarter_noise_dba"),
            pvtRt: getNum(mCheck, "pvt_median_rt_ms"),
            veggieDone: getBool(mConnect, "veggie_plant_care_done"),
            readiness: parseReadinessScore(memberSnap.immediateHorizon),
            status: memberSnap.status,
          };
        })
      : [];

  const belowSleepFloorCount = crewRows.filter(
    (r) => r.sleepH !== null && r.sleepH < V.elevatedSleepHours
  ).length;
  const nc40BreachCount = crewRows.filter(
    (r) => r.noiseDba !== null && r.noiseDba > V.sleepQuarterNoiseLimitNc40Dba
  ).length;
  const veggieActiveCount = crewRows.filter((r) => r.veggieDone === true).length;

  const hideDensePanels = reentryMode && !showAllInReentry;

  return (
    <div className="space-y-6">
      {/* Re-Entry Mode Sensory & Decision-Fatigue Guard (Five Tips on Emerging from Isolation) */}
      {reentryMode && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wide text-indigo-900 uppercase">
                Post-Isolation Re-Entry Mode Active
              </span>
              <InfoCircle
                entry={ISOLATION_RESEARCH_METADATA.ready_to_act_guidance}
                activeInfo={activeInfo}
                onSelectInfo={setActiveInfo}
              />
            </div>
            <p className="text-xs text-indigo-800">
              Actions are capped to 1 step and secondary charts are minimized to prevent sensory and decision overload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllInReentry((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-100/60 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
          >
            {showAllInReentry ? (
              <>
                Simplify View <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Show Full Telemetry <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </section>
      )}

      {/* 1. Ready-to-Act Primary Briefing (Action-First for Fatigued Crew & Commanders) */}
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
              Ready-to-Act Briefing · Readiness {readinessScore}
            </h2>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ready_to_act_guidance}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
              ETA: {snapshot.eta}
            </span>
            {!linkOnline && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                Offline-First Local Mode
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                  Immediate Horizon (Minutes – Hours)
                </p>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                  Prolonged Horizon (Days – Weeks)
                </p>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-4 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-sky-900 uppercase">
                Prioritized Countermeasures ({snapshot.solutions.length}{" "}
                {reentryMode ? "· Re-Entry Cap" : "Max"})
              </p>
              <InfoCircle
                entry={ISOLATION_RESEARCH_METADATA.readiness_connect}
                activeInfo={activeInfo}
                onSelectInfo={setActiveInfo}
              />
            </div>
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

      {/* 2. Core Isolation Telemetry KPIs */}
      <section aria-label="Core isolation telemetry">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Actigraphy Sleep"
            value={formatNum(sleepH, "h", 1)}
            subline={`Efficiency ${formatNum(sleepEff, "%")} · HRV ${formatNum(hrvMs, "ms")} · Target ${V.scheduledSleepHours}h`}
            tone={sleepTone}
            icon={<BedDouble className="h-4 w-4 text-sky-700" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="Cognition PVT-B"
            value={formatNum(pvtRt, "ms")}
            subline={`${formatNum(pvtLapses, "lapses")} (>355 ms) · Drift ${formatNum(circadianMin, "min")}`}
            tone={pvtTone}
            icon={<Brain className="h-4 w-4 text-indigo-700" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="Sleep Acoustics"
            value={formatNum(noiseDba, "dBA", 1)}
            subline={`NC-40 <= ${V.sleepQuarterNoiseLimitNc40Dba} dBA · ${formatNum(impulseSpikes, "spikes")} · Lux ${formatNum(luxMatch, "%")}`}
            tone={noiseTone}
            icon={<Volume2 className="h-4 w-4 text-amber-700" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.sleep_acoustics}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="Readiness & CONNECT"
            value={`${readinessScore} · ${snapshot.status}`}
            subline={`Mission ${formatNum(missionPct, "%")} · Veggie: ${veggieDone === true ? "Done" : veggieDone === false ? "Pending" : "—"} · Check-In: ${socialDone === true ? "Done" : socialDone === false ? "Pending" : "—"}`}
            tone={readinessTone}
            icon={<Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.readiness_connect}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
        </div>
      </section>

      {!hideDensePanels && (
        <>
          {/* 3. Role-Specific Workspace (Lead Matrix or Member Private Stream) */}
          {role === "lead" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Crew Readiness Matrix (Anonymized)
                  </h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.crew_matrix}
                    activeInfo={activeInfo}
                    onSelectInfo={setActiveInfo}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                    {belowSleepFloorCount}/{crewRows.length} &lt; 6.5h sleep
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                    {nc40BreachCount} NC-40 breach
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                    {veggieActiveCount} Veggie active
                  </span>
                </div>
              </div>

              <p className="mt-1.5 text-xs text-slate-600">{hazard.leadView.privacyRule}</p>

              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5">Crew Slot</th>
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          Sleep
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
                            activeInfo={activeInfo}
                            onSelectInfo={setActiveInfo}
                          />
                        </span>
                      </th>
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          Quarter Noise
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.sleep_acoustics}
                            activeInfo={activeInfo}
                            onSelectInfo={setActiveInfo}
                          />
                        </span>
                      </th>
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          PVT-B RT
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
                            activeInfo={activeInfo}
                            onSelectInfo={setActiveInfo}
                          />
                        </span>
                      </th>
                      <th className="px-3.5 py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          Readiness
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.readiness_connect}
                            activeInfo={activeInfo}
                            onSelectInfo={setActiveInfo}
                          />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {crewRows.map((row) => {
                      const isActive = row.id === activeCharacter.id;
                      return (
                        <tr
                          key={row.id}
                          className={isActive ? "bg-sky-50/60 font-medium" : "bg-white"}
                        >
                          <td className="px-3.5 py-2.5 text-slate-900">{row.callsign}</td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700">
                            {formatNum(row.sleepH, "h", 1)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700">
                            {formatNum(row.noiseDba, "dBA", 1)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-700">
                            {formatNum(row.pvtRt, "ms")}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status].badge}`}
                            >
                              <StatusIcon status={row.status} className="h-3 w-3" />
                              {row.readiness} · {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Personal Stream Details</h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                    activeInfo={activeInfo}
                    onSelectInfo={setActiveInfo}
                  />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Private Firewall Active
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-600">Subjective Fatigue</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {formatNum(fatigue, "/ 5")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-600">Workload Strain</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {formatNum(strain, "/ 5")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-600">Daytime Activity</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.chart_hypokinesis}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {formatNum(activityCnt, "cnt")}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Lock className="h-3.5 w-3.5 text-indigo-700" aria-hidden="true" />
                    Private to You (Strictly Masked from Commander)
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.private_journal_firewall}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </span>
                  <span className="text-xs text-indigo-900">
                    Mood: <strong>{formatNum(privateMood, "/ 5")}</strong> · Sleep Aid:{" "}
                    <strong>
                      {privateSleepMed === true ? "Yes" : privateSleepMed === false ? "No" : "—"}
                    </strong>
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700 sm:text-sm">
                  {privateJournal ?? "No personal reflection note recorded in latest snapshot."}
                </p>
              </div>
            </section>
          )}

          {/* 4. Ship & Habitat Layout (Rooms vs. Crew Density) */}
          <ShipHabitatLayoutCard
            layout={shipLayout}
            activeCharacterId={activeCharacter.id}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />

          {/* 5. Thresholded Telemetry Charts */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                DB-Synced Telemetry History &amp; NASA Thresholds
              </h2>
              <span className="text-xs text-slate-600">
                Select any <span className="font-semibold">(i)</span> circle to inspect equations and source datasets
              </span>
            </div>

            {primaryCharts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {primaryCharts.map((chart) => {
                  const metaCfg = CHART_META_MAP[chart.id] ?? {
                    metaKey: "actigraphy_sleep",
                    sourceTag: "NASA HRP Telemetry",
                  };
                  const infoEntry = ISOLATION_RESEARCH_METADATA[metaCfg.metaKey];
                  return (
                    <div
                      key={chart.id}
                      className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-xs font-semibold text-slate-600">
                          {metaCfg.sourceTag}
                        </span>
                        <InfoCircle
                          entry={infoEntry}
                          activeInfo={activeInfo}
                          onSelectInfo={setActiveInfo}
                        />
                      </div>
                      <HazardTelemetryChart chart={chart} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
                Awaiting DB-ingested telemetry history in <code className="rounded bg-slate-100 px-1">public.character_hazard_samples</code> for thresholded charts.
              </div>
            )}

            {hypokinesisChart && hypokinesisChart.series.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-700" aria-hidden="true" />
                  <span className="font-bold text-slate-900">{hypokinesisChart.title}:</span>
                  <span className="text-slate-700">
                    Latest{" "}
                    <strong className="text-slate-900">
                      {hypokinesisChart.series[hypokinesisChart.series.length - 1].value}{" "}
                      {hypokinesisChart.unit}
                    </strong>{" "}
                    ({hypokinesisChart.series.length} pts synced)
                  </span>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.chart_hypokinesis}
                    activeInfo={activeInfo}
                    onSelectInfo={setActiveInfo}
                  />
                </div>
                <span className="text-slate-600">
                  Elevates alert if &lt;= {V.hypokinesisDropElevPct}% vs. early-mission baseline
                </span>
              </div>
            )}
          </section>
        </>
      )}

      {/* Unified accessible modal for all (i) research explanations & links */}
      <ResearchModal entry={activeInfo} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
