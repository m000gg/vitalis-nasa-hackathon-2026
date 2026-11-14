"use client";

import React, { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Lock,
  ShieldAlert,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { evaluateHazardForActor } from "@/lib/evaluator";
import {
  ISOLATION_PIPELINE_VALUES,
  ISOLATION_RESEARCH_METADATA,
  type IsolationInfoEntry,
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

const CHART_META_MAP: Record<string, string> = {
  "sample-wearable-actigraphy": "chart_sleep",
  "sample-60-second-self-check-private-": "chart_pvt",
  "sample-habitat-acoustics-lighting": "chart_acoustics",
  "isolation-hypokinesis-activity": "chart_hypokinesis",
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

function formatNum(value: number | null, unit = "", digits?: number): string {
  if (value === null) return "—";
  const formatted = typeof digits === "number" ? value.toFixed(digits) : String(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

type ActiveInfoState = { triggerId: string; entry: IsolationInfoEntry } | null;

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
  activeInfo: ActiveInfoState;
  onSelectInfo: (next: ActiveInfoState) => void;
}) {
  const triggerId = useId();
  const isSelected = activeInfo?.triggerId === triggerId;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectInfo(isSelected ? null : { triggerId, entry });
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
  activeInfo: ActiveInfoState;
  onSelectInfo: (next: ActiveInfoState) => void;
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

/**
 * HAZARD 2: ISOLATION & CONFINEMENT SCREEN
 * Coherent, astronaut-accessible, 100% Read-Only DB-ingested telemetry view with:
 * - Action-First Ready-to-Act Guidance & Re-Entry overload throttling
 * - High-legibility KPI cards with accessible (i) research modals
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
  const [activeInfo, setActiveInfo] = useState<ActiveInfoState>(null);
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

  const sleepTone: Tone =
    sleepH !== null && sleepH < V.issHistoricalMeanSleepHours
      ? "critical"
      : sleepH !== null && sleepH < V.nasaStd3001SleepReqHours
      ? "elevated"
      : "nominal";

  const pvtTone: Tone =
    pvtRt !== null && pvtRt >= V.pvtLapseThresholdMs
      ? "critical"
      : pvtLapses !== null && pvtLapses > 0
      ? "elevated"
      : "nominal";

  const noiseTone: Tone =
    noiseDba !== null && noiseDba >= V.workAreaNoiseLimitNc50Dba
      ? "critical"
      : noiseDba !== null && noiseDba > V.sleepQuarterNoiseLimitNc40Dba
      ? "elevated"
      : "nominal";

  const statusTone: Tone =
    snapshot.status === "CRITICAL"
      ? "critical"
      : snapshot.status === "ELEVATED"
      ? "elevated"
      : "nominal";

  const charts: HazardChartSpec[] = snapshot.charts ?? [];
  const primaryCharts = charts.slice(0, 4);

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
            status: memberSnap.status,
          };
        })
      : [];

  const belowIssMeanCount = crewRows.filter(
    (r) => r.sleepH !== null && r.sleepH < V.issHistoricalMeanSleepHours
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
            <h2 className="text-base font-bold text-slate-900">Ready-to-Act Briefing</h2>
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
                entry={ISOLATION_RESEARCH_METADATA.mission_connect}
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
            subline={`${formatNum(pvtLapses, "lapses")} (>=355 ms) · Drift ${formatNum(circadianMin, "min")}`}
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
            label="CONNECT & Mission"
            value={missionPct !== null ? `${missionPct}%` : snapshot.status}
            subline={`Status: ${snapshot.status} · Veggie: ${veggieDone === true ? "Done" : veggieDone === false ? "Pending" : "—"} · Check-In: ${socialDone === true ? "Done" : socialDone === false ? "Pending" : "—"}`}
            tone={statusTone}
            icon={<Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.mission_connect}
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
                    Crew Telemetry Matrix (Anonymized)
                  </h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.crew_matrix}
                    activeInfo={activeInfo}
                    onSelectInfo={setActiveInfo}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                    {belowIssMeanCount}/{crewRows.length} &lt; {V.issHistoricalMeanSleepHours}h ISS mean
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
                          Status
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.mission_connect}
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
                              {row.status}
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
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Personal Stream Details</h2>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
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

              <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    Personal Reflection &amp; Sleep Aid
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.private_journal_firewall}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </span>
                  <span className="text-xs text-slate-700">
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

          {/* 4. Thresholded Telemetry Charts */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              Telemetry History &amp; NASA Thresholds
            </h2>

            {primaryCharts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {primaryCharts.map((chart) => {
                  const metaKey = CHART_META_MAP[chart.id] ?? "actigraphy_sleep";
                  const infoEntry = ISOLATION_RESEARCH_METADATA[metaKey];
                  return (
                    <div key={chart.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <HazardTelemetryChart chart={chart} />
                      </div>
                      <div className="pt-3.5">
                        <InfoCircle
                          entry={infoEntry}
                          activeInfo={activeInfo}
                          onSelectInfo={setActiveInfo}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
                Awaiting telemetry history for thresholded charts.
              </div>
            )}
          </section>
        </>
      )}

      {/* Unified accessible modal for all (i) research explanations & links */}
      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
