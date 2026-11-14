"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Info, X } from "lucide-react";
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

const STATUS_BADGE: Record<"NOMINAL" | "ELEVATED" | "CRITICAL", string> = {
  NOMINAL: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ELEVATED: "border-amber-200 bg-amber-50 text-amber-800",
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
};

const TONE_VALUE_CLASS: Record<Tone, string> = {
  nominal: "text-slate-900",
  elevated: "text-amber-700",
  critical: "text-red-700",
};

const CHART_INFO_MAP: Record<string, string> = {
  "sample-wearable-actigraphy": "chart_sleep",
  "isolation-sleep-debt": "chart_sleep_debt",
  "sample-60-second-self-check-private-": "chart_pvt",
  "sample-habitat-acoustics-lighting": "chart_acoustics",
  "isolation-hypokinesis-activity": "chart_hypokinesis",
};

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
  const label = (parts[1] ?? parts[0]).trim();
  return label.length > 18 ? `${label.slice(0, 16)}…` : label;
}

/**
 * Custom interactive (i) circle button with accessible popover containing
 * plain-language explanation, verified NASA thresholds, and clickable paper/dataset links.
 */
function InfoCircle({
  entry,
  popoverId,
  openId,
  onToggle,
  align = "left",
}: {
  entry: IsolationInfoEntry;
  popoverId: string;
  openId: string | null;
  onToggle: (id: string | null) => void;
  align?: "left" | "right";
}) {
  const isOpen = openId === popoverId;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle(null);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(isOpen ? null : popoverId);
        }}
        aria-label={`Research info: ${entry.title}`}
        aria-expanded={isOpen}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
          isOpen
            ? "border-sky-500 bg-sky-600 text-white"
            : "border-slate-300 bg-white text-slate-500 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
        }`}
      >
        <Info className="h-2.5 w-2.5" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={entry.title}
          className={`absolute top-6 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg sm:w-80 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
            <p className="text-[11px] font-bold text-slate-900">{entry.title}</p>
            <button
              type="button"
              onClick={() => onToggle(null)}
              aria-label="Close research info"
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">{entry.explanation}</p>

          <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] leading-snug text-slate-700">
            <span className="font-semibold text-slate-900">NASA Benchmark: </span>
            {entry.benchmark}
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
              Research Papers &amp; Datasets
            </p>
            <ul className="space-y-1">
              {entry.links.map((link) => (
                <li key={link.url + link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  subline,
  tone = "nominal",
  infoEntry,
  popoverId,
  openInfoId,
  onToggleInfo,
  infoAlign = "left",
}: {
  label: string;
  value: string;
  subline: string;
  tone?: Tone;
  infoEntry: IsolationInfoEntry;
  popoverId: string;
  openInfoId: string | null;
  onToggleInfo: (id: string | null) => void;
  infoAlign?: "left" | "right";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <InfoCircle
          entry={infoEntry}
          popoverId={popoverId}
          openId={openInfoId}
          onToggle={onToggleInfo}
          align={infoAlign}
        />
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${TONE_VALUE_CLASS[tone]}`}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500" title={subline}>
        {subline}
      </p>
    </div>
  );
}

function ShipHabitatLayoutCard({
  layout,
  activeCharacterId,
  openInfoId,
  onToggleInfo,
}: {
  layout: ShipLayoutProfile;
  activeCharacterId: string;
  openInfoId: string | null;
  onToggleInfo: (id: string | null) => void;
}) {
  const quartersCols = Math.min(layout.quarters.length, 3);
  const quartersRows = Math.ceil(layout.quarters.length / quartersCols);
  const svgW = 720;
  const svgH = Math.max(220, 64 + quartersRows * 74);

  const cellW = 112;
  const cellH = 62;
  const cellGap = 10;

  const privacyBadgeClass =
    layout.hasPrivacyDeficit || layout.hasVolumeDeficit
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const privacyLabel = layout.hasPrivacyDeficit
    ? `[V2 7071] Privacy Deficit (${layout.crewCount} crew / ${layout.privateQuartersCount} quarters)`
    : layout.hasVolumeDeficit
    ? `NHV Cramped (${layout.nhvPerCrewM3.toFixed(1)} < ${V.minNetHabitableVolumeM3PerCrew} m³/crew)`
    : `[V2 7071] 1:1 Private Quarters Compliant`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
            Ship &amp; Habitat Layout (Rooms vs. Crew Density)
          </h2>
          <InfoCircle
            entry={ISOLATION_RESEARCH_METADATA.ship_layout}
            popoverId="ship-layout-main"
            openId={openInfoId}
            onToggle={onToggleInfo}
            align="left"
          />
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${privacyBadgeClass}`}>
            {privacyLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>
            {layout.profileName}
            {layout.isDbOverride ? " (DB Telemetry)" : " (NASA Reference + Live Crew)"}
          </span>
        </div>
      </div>

      {/* Density Summary Metrics */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Astronauts</span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              popoverId="ship-metric-crew"
              openId={openInfoId}
              onToggle={onToggleInfo}
              align="left"
            />
          </div>
          <p className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
            {layout.crewCount} crew
          </p>
          <p className="text-[10px] text-slate-500">Synced from public.characters</p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Private Quarters
            </span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              popoverId="ship-metric-quarters"
              openId={openInfoId}
              onToggle={onToggleInfo}
              align="left"
            />
          </div>
          <p
            className={`mt-0.5 text-base font-bold tabular-nums ${
              layout.hasPrivacyDeficit ? "text-amber-700" : "text-slate-900"
            }`}
          >
            {layout.privateQuartersCount} rooms
          </p>
          <p className="text-[10px] text-slate-500">
            Ratio {(layout.privateQuartersCount / Math.max(1, layout.crewCount)).toFixed(2)} / crew
            ([V2 7071] &gt;= 1.0)
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Total Ship Rooms
            </span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              popoverId="ship-metric-rooms"
              openId={openInfoId}
              onToggle={onToggleInfo}
              align="right"
            />
          </div>
          <p className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
            {layout.totalHabitatRooms} rooms
          </p>
          <p className="text-[10px] text-slate-500">
            {layout.privateQuartersCount} private + {layout.sharedFunctionalRoomsCount} shared bays
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              Habitable Volume
            </span>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ship_layout}
              popoverId="ship-metric-nhv"
              openId={openInfoId}
              onToggle={onToggleInfo}
              align="right"
            />
          </div>
          <p
            className={`mt-0.5 text-base font-bold tabular-nums ${
              layout.hasVolumeDeficit ? "text-red-700" : "text-slate-900"
            }`}
          >
            {layout.nhvPerCrewM3.toFixed(1)} m³/crew
          </p>
          <p className="text-[10px] text-slate-500">
            {layout.habitableVolumeM3} m³ total (min {V.minNetHabitableVolumeM3PerCrew} m³/crew)
          </p>
        </div>
      </div>

      {/* Architectural SVG Spacecraft / Habitat Deck Schematic */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 lg:col-span-8">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">
              Habitat Deck Blueprint — Crew Quarters &amp; Shared Functional Bays
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> GO / Nominal
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Conditional / Shared
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Hold / NC-40 Breach
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full rounded-lg border border-slate-200 bg-white"
            role="img"
            aria-label={`Ship habitat layout showing ${layout.privateQuartersCount} private quarters and ${layout.sharedFunctionalRoomsCount} shared bays for ${layout.crewCount} astronauts`}
          >
            {/* Outer pressurized hull */}
            <rect
              x={8}
              y={8}
              width={svgW - 16}
              height={svgH - 16}
              rx={18}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />

            {/* Zone headers */}
            <text x={22} y={28} fontSize={10} fontWeight="700" fill="#334155">
              PRIVATE CREW QUARTERS ({layout.privateQuartersCount})
            </text>
            <text x={410} y={28} fontSize={10} fontWeight="700" fill="#334155">
              SHARED HABITAT SPINE ({layout.sharedZones.length} CORE BAYS)
            </text>

            {/* Central pressurized corridor spine */}
            <rect
              x={376}
              y={38}
              width={18}
              height={svgH - 54}
              rx={6}
              fill="#e2e8f0"
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <text
              x={385}
              y={svgH / 2 + 4}
              fontSize={8}
              fontWeight="600"
              fill="#475569"
              textAnchor="middle"
              transform={`rotate(-90 385 ${svgH / 2 + 4})`}
            >
              CORRIDOR / AIRLOCK
            </text>

            {/* Crew Quarters Grid */}
            {layout.quarters.map((q, idx) => {
              const col = idx % quartersCols;
              const row = Math.floor(idx / quartersCols);
              const x = 20 + col * (cellW + cellGap);
              const y = 38 + row * (cellH + 10);
              const containsActive = q.occupants.some((o) => o.characterId === activeCharacterId);
              const hasHold = q.occupants.some((o) => o.readinessState === "HOLD");
              const hasCond = q.occupants.some((o) => o.readinessState === "CONDITIONAL");

              const strokeColor = containsActive
                ? "#0284c7"
                : q.nc40Breached || hasHold
                ? "#ef4444"
                : q.isOverflowShared || hasCond
                ? "#f59e0b"
                : "#cbd5e1";

              const fillColor =
                q.nc40Breached || hasHold
                  ? "#fef2f2"
                  : q.isOverflowShared
                  ? "#fffbeb"
                  : containsActive
                  ? "#f0f9ff"
                  : "#ffffff";

              const dotColor =
                q.nc40Breached || hasHold
                  ? "#ef4444"
                  : q.isOverflowShared || hasCond
                  ? "#f59e0b"
                  : q.occupants.length > 0
                  ? "#10b981"
                  : "#94a3b8";

              const firstOccupant = q.occupants[0];
              const occupantLabel =
                q.occupants.length === 0
                  ? "Unassigned"
                  : q.occupants.length === 1
                  ? shortCallsign(firstOccupant.callsign)
                  : `${shortCallsign(firstOccupant.callsign)} +${q.occupants.length - 1}`;

              const metricLine =
                q.noiseDba !== null
                  ? `${q.noiseDba.toFixed(0)} dBA · ${firstOccupant?.sleepH !== null && firstOccupant?.sleepH !== undefined ? `${firstOccupant.sleepH}h` : "—"}`
                  : firstOccupant?.sleepH !== null && firstOccupant?.sleepH !== undefined
                  ? `Sleep ${firstOccupant.sleepH}h`
                  : "Awaiting stream";

              return (
                <g key={q.roomId}>
                  <rect
                    x={x}
                    y={y}
                    width={cellW}
                    height={cellH}
                    rx={8}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={containsActive ? 2 : 1.25}
                  />
                  <circle cx={x + cellW - 11} cy={y + 13} r={4} fill={dotColor} />
                  <text x={x + 8} y={y + 16} fontSize={10} fontWeight="700" fill="#0f172a">
                    {q.roomId}
                    {containsActive ? " (You)" : ""}
                  </text>
                  <text x={x + 8} y={y + 32} fontSize={9} fontWeight="600" fill="#334155">
                    {occupantLabel}
                  </text>
                  <text
                    x={x + 8}
                    y={y + 48}
                    fontSize={8.5}
                    fill={q.isOverflowShared ? "#b45309" : q.nc40Breached ? "#b91c1c" : "#64748b"}
                  >
                    {q.isOverflowShared ? "SHARED · V2 7071" : metricLine}
                  </text>
                </g>
              );
            })}

            {/* Shared Functional Bays */}
            {layout.sharedZones.map((zone, idx) => {
              const col = idx % 2;
              const row = Math.floor(idx / 2);
              const x = 408 + col * 148;
              const y = 38 + row * 56;
              const w = idx === 4 ? 290 : 140;
              const h = 46;

              return (
                <g key={zone.id}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={8}
                    fill={zone.alertFlag ? "#fffbeb" : "#ffffff"}
                    stroke={zone.alertFlag ? "#f59e0b" : "#cbd5e1"}
                    strokeWidth={1.25}
                  />
                  <text x={x + 8} y={y + 17} fontSize={9.5} fontWeight="700" fill="#0f172a">
                    {zone.name}
                  </text>
                  <text
                    x={x + 8}
                    y={y + 33}
                    fontSize={8.5}
                    fill={zone.alertFlag ? "#b45309" : "#64748b"}
                  >
                    {zone.detail.length > (idx === 4 ? 54 : 26)
                      ? `${zone.detail.slice(0, idx === 4 ? 52 : 24)}…`
                      : zone.detail}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Room Occupancy & Isolation Risk Breakdown */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] lg:col-span-4">
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-wide text-slate-600 uppercase">
              Quarter-by-Quarter Allocation
            </p>
            <ul className="space-y-1.5">
              {layout.quarters.map((q) => (
                <li
                  key={`list-${q.roomId}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">{q.roomId}</span>
                    <span className="ml-1.5 text-slate-600">
                      {q.occupants.length > 0
                        ? q.occupants.map((o) => shortCallsign(o.callsign)).join(", ")
                        : "Empty"}
                    </span>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    {q.isOverflowShared ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        Shared ({q.occupants.length})
                      </span>
                    ) : q.noiseDba !== null ? (
                      <span
                        className={`text-[10px] font-semibold ${
                          q.nc40Breached ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {q.noiseDba.toFixed(1)} dBA
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Private</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-2.5 border-t border-slate-200 pt-2 text-[10px] leading-snug text-slate-500">
            {layout.referenceNote}. Optional DB overrides via{" "}
            <code className="rounded bg-slate-200/70 px-1">private_quarters_count</code>,{" "}
            <code className="rounded bg-slate-200/70 px-1">total_habitat_rooms</code>, and{" "}
            <code className="rounded bg-slate-200/70 px-1">habitable_volume_m3</code>.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * HAZARD 2: ISOLATION & CONFINEMENT SCREEN
 * 100% Read-Only DB-ingested telemetry view with strict Lead/Member privacy firewall,
 * Ship Habitat Layout occupancy map, and research-backed (i) explanation circles.
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
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Row 1: 4 Read-Only Stream KPI Cards (each with custom (i) research citation circle) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Actigraphy Sleep"
          value={formatNum(sleepH, "h", 1)}
          subline={`Eff ${formatNum(sleepEff, "%")} · HRV ${formatNum(hrvMs, "ms")} · Target ${V.scheduledSleepHours}h`}
          tone={sleepTone}
          infoEntry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
          popoverId="kpi-sleep"
          openInfoId={openInfoId}
          onToggleInfo={setOpenInfoId}
          infoAlign="left"
        />
        <KpiCard
          label="Cognition PVT-B"
          value={formatNum(pvtRt, "ms")}
          subline={`${formatNum(pvtLapses, "lapses")} (>355 ms) · Shift ${formatNum(circadianMin, "min")}`}
          tone={pvtTone}
          infoEntry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
          popoverId="kpi-pvt"
          openInfoId={openInfoId}
          onToggleInfo={setOpenInfoId}
          infoAlign="left"
        />
        <KpiCard
          label="Sleep-Quarter Acoustics"
          value={formatNum(noiseDba, "dBA", 1)}
          subline={`NC-40 <= ${V.sleepQuarterNoiseLimitNc40Dba} dBA · ${formatNum(impulseSpikes, "spikes")} · Lux ${formatNum(luxMatch, "%")}`}
          tone={noiseTone}
          infoEntry={ISOLATION_RESEARCH_METADATA.sleep_acoustics}
          popoverId="kpi-acoustics"
          openInfoId={openInfoId}
          onToggleInfo={setOpenInfoId}
          infoAlign="right"
        />
        <KpiCard
          label="Readiness & CONNECT"
          value={`${readinessScore} · ${snapshot.status}`}
          subline={`Mission ${formatNum(missionPct, "%")} · Veggie ${veggieDone ? "Yes" : veggieDone === false ? "No" : "—"} · Check-In ${socialDone ? "Yes" : socialDone === false ? "No" : "—"}`}
          tone={readinessTone}
          infoEntry={ISOLATION_RESEARCH_METADATA.readiness_connect}
          popoverId="kpi-readiness"
          openInfoId={openInfoId}
          onToggleInfo={setOpenInfoId}
          infoAlign="right"
        />
      </div>

      {/* Row 2: Ship & Habitat Layout (Rooms vs. Astronauts Density & Occupancy) */}
      <ShipHabitatLayoutCard
        layout={shipLayout}
        activeCharacterId={activeCharacter.id}
        openInfoId={openInfoId}
        onToggleInfo={setOpenInfoId}
      />

      {/* Row 3: 2-Column Ready-to-Act Guidance + Role View & Thresholded Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Evaluated Guidance + Role View */}
        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                  Ready-to-Act Guidance
                </h2>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.ready_to_act_guidance}
                  popoverId="guidance-main"
                  openId={openInfoId}
                  onToggle={setOpenInfoId}
                  align="left"
                />
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[snapshot.status]}`}
                >
                  {snapshot.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span>ETA: {snapshot.eta}</span>
                {reentryMode && (
                  <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                    Re-Entry Cap (1)
                  </span>
                )}
                {!linkOnline && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                    DTN Offline
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Immediate Horizon
                  </p>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
                    popoverId="guidance-immediate"
                    openId={openInfoId}
                    onToggle={setOpenInfoId}
                    align="left"
                  />
                </div>
                <p className="mt-0.5 leading-snug text-slate-800">{snapshot.immediateHorizon}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Prolonged Horizon
                  </p>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
                    popoverId="guidance-prolonged"
                    openId={openInfoId}
                    onToggle={setOpenInfoId}
                    align="left"
                  />
                </div>
                <p className="mt-0.5 leading-snug text-slate-700">{snapshot.prolongedHorizon}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Actionable Countermeasures ({snapshot.solutions.length})
                  </p>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.readiness_connect}
                    popoverId="guidance-solutions"
                    openId={openInfoId}
                    onToggle={setOpenInfoId}
                    align="left"
                  />
                </div>
                <ul className="mt-1 space-y-1.5">
                  {snapshot.solutions.map((sol) => (
                    <li
                      key={sol}
                      className="rounded-lg border border-sky-100 bg-sky-50/70 px-2.5 py-1.5 text-[11px] leading-snug text-sky-950"
                    >
                      {sol}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {role === "lead" ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                    Crew Readiness Matrix (Anonymized)
                  </h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.crew_matrix}
                    popoverId="crew-matrix-main"
                    openId={openInfoId}
                    onToggle={setOpenInfoId}
                    align="left"
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  {belowSleepFloorCount}/{crewRows.length} &lt; 6.5h · {nc40BreachCount} NC-40 ·{" "}
                  {veggieActiveCount} Veggie
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{hazard.leadView.privacyRule}</p>

              <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-2.5 py-1.5">Slot</th>
                      <th className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          Sleep
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
                            popoverId="matrix-col-sleep"
                            openId={openInfoId}
                            onToggle={setOpenInfoId}
                            align="left"
                          />
                        </span>
                      </th>
                      <th className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          Noise
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.sleep_acoustics}
                            popoverId="matrix-col-noise"
                            openId={openInfoId}
                            onToggle={setOpenInfoId}
                            align="left"
                          />
                        </span>
                      </th>
                      <th className="px-2 py-1.5">
                        <span className="inline-flex items-center gap-1">
                          PVT-B
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
                            popoverId="matrix-col-pvt"
                            openId={openInfoId}
                            onToggle={setOpenInfoId}
                            align="right"
                          />
                        </span>
                      </th>
                      <th className="px-2.5 py-1.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          Readiness
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.readiness_connect}
                            popoverId="matrix-col-readiness"
                            openId={openInfoId}
                            onToggle={setOpenInfoId}
                            align="right"
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
                          <td className="px-2.5 py-1.5 text-slate-900">{row.callsign}</td>
                          <td className="px-2 py-1.5 tabular-nums text-slate-700">
                            {formatNum(row.sleepH, "h", 1)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums text-slate-700">
                            {formatNum(row.noiseDba, "dBA", 1)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums text-slate-700">
                            {formatNum(row.pvtRt, "ms")}
                          </td>
                          <td className="px-2.5 py-1.5 text-right">
                            <span
                              className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[row.status]}`}
                            >
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
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold tracking-wide text-slate-800 uppercase">
                    Personal Stream Details
                  </h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                    popoverId="personal-stream-main"
                    openId={openInfoId}
                    onToggle={setOpenInfoId}
                    align="left"
                  />
                </div>
                <span className="text-[10px] font-medium text-emerald-700">
                  Private Firewall Active
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-slate-500">Fatigue (1–5)</p>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      popoverId="personal-fatigue"
                      openId={openInfoId}
                      onToggle={setOpenInfoId}
                      align="left"
                    />
                  </div>
                  <p className="font-semibold text-slate-900">{formatNum(fatigue, "/ 5")}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-slate-500">Strain (1–5)</p>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      popoverId="personal-strain"
                      openId={openInfoId}
                      onToggle={setOpenInfoId}
                      align="left"
                    />
                  </div>
                  <p className="font-semibold text-slate-900">{formatNum(strain, "/ 5")}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-slate-500">Activity</p>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.chart_hypokinesis}
                      popoverId="personal-activity"
                      openId={openInfoId}
                      onToggle={setOpenInfoId}
                      align="right"
                    />
                  </div>
                  <p className="font-semibold text-slate-900">{formatNum(activityCnt, "cnt")}</p>
                </div>
              </div>

              <div className="mt-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-indigo-800 uppercase">
                    Private to You (Masked from Lead)
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.private_journal_firewall}
                      popoverId="personal-private-box"
                      openId={openInfoId}
                      onToggle={setOpenInfoId}
                      align="left"
                    />
                  </span>
                  <span className="text-indigo-700">
                    Mood: <strong>{formatNum(privateMood, "/ 5")}</strong> · Sleep Aid:{" "}
                    <strong>
                      {privateSleepMed === true ? "Yes" : privateSleepMed === false ? "No" : "—"}
                    </strong>
                  </span>
                </div>
                <p className="mt-1 text-slate-700">
                  {privateJournal ?? "No reflection note in latest snapshot."}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Right: Thresholded Telemetry Charts with per-chart (i) circles */}
        <div className="space-y-3 lg:col-span-7">
          {primaryCharts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {primaryCharts.map((chart, idx) => {
                const infoKey = CHART_INFO_MAP[chart.id] ?? "actigraphy_sleep";
                const infoEntry = ISOLATION_RESEARCH_METADATA[infoKey];
                return (
                  <div key={chart.id} className="relative">
                    <div className="mb-1 flex items-center justify-between px-1">
                      <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                        Telemetry Dataset &amp; Thresholds
                      </span>
                      <InfoCircle
                        entry={infoEntry}
                        popoverId={`chart-${chart.id}`}
                        openId={openInfoId}
                        onToggle={setOpenInfoId}
                        align={idx % 2 === 1 ? "right" : "left"}
                      />
                    </div>
                    <HazardTelemetryChart chart={chart} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
              Awaiting DB-ingested telemetry history for thresholded charts.
            </div>
          )}

          {hypokinesisChart && hypokinesisChart.series.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-800">{hypokinesisChart.title}:</span>
                <span className="text-slate-600">
                  Latest{" "}
                  <strong className="text-slate-900">
                    {hypokinesisChart.series[hypokinesisChart.series.length - 1].value}{" "}
                    {hypokinesisChart.unit}
                  </strong>{" "}
                  ({hypokinesisChart.series.length} pts synced)
                </span>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.chart_hypokinesis}
                  popoverId="hypokinesis-summary"
                  openId={openInfoId}
                  onToggle={setOpenInfoId}
                  align="right"
                />
              </div>
              <span className="text-[11px] text-slate-500">
                Elevates alert if &lt;= {V.hypokinesisDropElevPct}% vs baseline
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
