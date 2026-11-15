"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  Brain,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  Users,
  Volume2,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import {
  InfoCircle,
  ResearchModal,
  type ActiveResearchInfoState,
  type ResearchInfoEntry,
} from "@/components/ResearchInfoModal";
import { evaluateHazardForActor } from "@/lib/evaluator";
import {
  ISOLATION_PIPELINE_VALUES,
  ISOLATION_RESEARCH_METADATA,
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
    badge: "border-[#16A34A]/40 bg-[#16A34A]/15 text-emerald-300",
    panel: "border-[#16A34A]/40 bg-[#16A34A]/10",
    text: "text-emerald-300",
    label: "NOMINAL",
  },
  ELEVATED: {
    badge: "border-[#D97706]/45 bg-[#D97706]/15 text-amber-200",
    panel: "border-[#D97706]/45 bg-[#D97706]/12",
    text: "text-amber-200",
    label: "ELEVATED",
  },
  CRITICAL: {
    badge: "border-[#DC2626]/50 bg-[#DC2626]/15 text-red-200",
    panel: "border-[#DC2626]/50 bg-[#DC2626]/12",
    text: "text-red-200",
    label: "CRITICAL",
  },
};

const TONE_VALUE_CLASS: Record<Tone, string> = {
  nominal: "text-slate-100",
  elevated: "text-amber-300",
  critical: "text-red-300",
};

const TONE_SURFACE_CLASS: Record<Tone, string> = {
  nominal: "border-slate-800 bg-[#0B111F]",
  elevated: "border-[#D97706]/45 bg-[#D97706]/10",
  critical: "border-[#DC2626]/50 bg-[#DC2626]/10",
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
  infoEntry: ResearchInfoEntry;
  activeInfo: ActiveResearchInfoState;
  onSelectInfo: (next: ActiveResearchInfoState) => void;
}) {
  const toneLabel = tone === "critical" ? "Critical" : tone === "elevated" ? "Elevated" : "Nominal";
  return (
    <article className={`hud-panel rounded-lg border p-4 transition-colors ${TONE_SURFACE_CLASS[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
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
              tone === "critical" ? "bg-[#DC2626]/20 text-red-300" : "bg-[#D97706]/20 text-amber-200"
            }`}
          >
            {toneLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-400">{subline}</p>
    </article>
  );
}

/**
 * HAZARD 2: ISOLATION & CONFINEMENT SCREEN
 * Coherent, astronaut-accessible, 100% Read-Only DB-ingested telemetry view with:
 * - Action-First Ready-to-Act Guidance
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
}: HazardScreenProps) {
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);

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
          });
          const mWearable = findRecord(memberRecords, STREAM_WEARABLE);
          const mHabitat = findRecord(memberRecords, STREAM_HABITAT);
          const mCheck = findRecord(memberRecords, STREAM_SELF_CHECK);
          const mConnect = findRecord(memberRecords, STREAM_CONNECT);
          return {
            id: member.id,
            callsign: member.callsign,
            roleTitle: member.assignedRoleTitle,
            isLeadSlot: member.isLeadSlot,
            sleepH: getNum(mWearable, "sleep_duration_h"),
            noiseDba: getNum(mHabitat, "sleep_quarter_noise_dba"),
            pvtRt: getNum(mCheck, "pvt_median_rt_ms"),
            veggieDone: getBool(mConnect, "veggie_plant_care_done"),
            socialDone: getBool(mConnect, "crew_social_checkin_done"),
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

  return (
    <div className="space-y-6">
      {/* 1. Ready-to-Act Primary Briefing (Action-First for Fatigued Crew & Commanders) */}
      <section className={`hud-panel rounded-lg border p-5 ${STATUS_STYLE[snapshot.status].panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_STYLE[snapshot.status].badge}`}
            >
              <StatusIcon status={snapshot.status} className="h-3.5 w-3.5" />
              {snapshot.status}
            </span>
            <h2 className="font-display text-base font-bold text-slate-100">Ready-to-Act Briefing</h2>
            <InfoCircle
              entry={ISOLATION_RESEARCH_METADATA.ready_to_act_guidance}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
            <span className="inline-flex items-center gap-1 rounded-md bg-[#3B82F6]/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
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

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B111F] px-2.5 py-1 font-medium text-slate-300">
              <Clock className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              {snapshot.eta}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-800 bg-[#0B111F] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                  Immediate Horizon (Minutes – Hours)
                </p>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-100">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#0B111F] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                  Prolonged Horizon (Days – Weeks)
                </p>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#3B82F6]/35 bg-[#0B111F] p-4 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wide text-blue-200 uppercase">
                Prioritized Countermeasures ({snapshot.solutions.length} Max)
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
                  className="flex items-start gap-2.5 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/15 p-3 text-sm leading-snug text-blue-100"
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3B82F6] text-xs font-bold text-white">
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
            icon={<BedDouble className="h-4 w-4 text-blue-300" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.actigraphy_sleep}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="Cognition PVT-B"
            value={formatNum(pvtRt, "ms")}
            subline={`${formatNum(pvtLapses, "lapses")} (>=355 ms) · Drift ${formatNum(circadianMin, "min")}`}
            tone={pvtTone}
            icon={<Brain className="h-4 w-4 text-violet-300" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.pvt_cognition}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="Sleep Acoustics"
            value={formatNum(noiseDba, "dBA", 1)}
            subline={`NC-40 <= ${V.sleepQuarterNoiseLimitNc40Dba} dBA · ${formatNum(impulseSpikes, "spikes")} · Lux ${formatNum(luxMatch, "%")}`}
            tone={noiseTone}
            icon={<Volume2 className="h-4 w-4 text-amber-300" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.sleep_acoustics}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
          <KpiCard
            label="CONNECT & Mission"
            value={missionPct !== null ? `${missionPct}%` : snapshot.status}
            subline={`Status: ${snapshot.status} · Veggie: ${veggieDone === true ? "Done" : veggieDone === false ? "Pending" : "—"} · Check-In: ${socialDone === true ? "Done" : socialDone === false ? "Pending" : "—"}`}
            tone={statusTone}
            icon={<Users className="h-4 w-4 text-emerald-300" aria-hidden="true" />}
            infoEntry={ISOLATION_RESEARCH_METADATA.mission_connect}
            activeInfo={activeInfo}
            onSelectInfo={setActiveInfo}
          />
        </div>
      </section>

      {/* 3. Role-Specific Workspace (Lead Matrix or Member Private Stream) */}
          {role === "lead" ? (
            <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <h2 className="font-display text-sm font-bold text-slate-100">
                    Crew Telemetry Matrix (Anonymized)
                  </h2>
                  <InfoCircle
                    entry={ISOLATION_RESEARCH_METADATA.crew_matrix}
                    activeInfo={activeInfo}
                    onSelectInfo={setActiveInfo}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 font-medium">
                    {belowIssMeanCount}/{crewRows.length} &lt; {V.issHistoricalMeanSleepHours}h ISS mean
                  </span>
                  <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 font-medium">
                    {nc40BreachCount} NC-40 breach
                  </span>
                  <span className="rounded-lg bg-slate-800/80 px-2.5 py-1 font-medium">
                    {veggieActiveCount} Veggie active
                  </span>
                </div>
              </div>

              <p className="mt-1.5 text-xs text-slate-400">{hazard.leadView.privacyRule}</p>

              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#060A14] text-xs font-semibold text-slate-400">
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
                          Veggie / CONNECT
                          <InfoCircle
                            entry={ISOLATION_RESEARCH_METADATA.mission_connect}
                            activeInfo={activeInfo}
                            onSelectInfo={setActiveInfo}
                          />
                        </span>
                      </th>
                      <th className="px-3.5 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {crewRows.map((row) => {
                      const isActive = row.id === activeCharacter.id;
                      return (
                        <tr
                          key={row.id}
                          className={isActive ? "bg-[#3B82F6]/12" : "bg-[#0B111F]"}
                        >
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100">{row.callsign}</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  row.isLeadSlot
                                    ? "bg-[#3B82F6]/20 text-blue-300"
                                    : "bg-slate-800/80 text-slate-400"
                                }`}
                              >
                                {row.isLeadSlot ? "LEAD" : "MEMBER"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">{row.roleTitle}</div>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            {formatNum(row.sleepH, "h", 1)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            {formatNum(row.noiseDba, "dBA", 1)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-300">
                            {formatNum(row.pvtRt, "ms")}
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-[11px] text-slate-300">
                            {row.veggieDone === true ? "Veggie ✓" : "Veggie —"} ·{" "}
                            {row.socialDone === true ? "CONNECT ✓" : "CONNECT —"}
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
            <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-slate-100">Personal Stream Details</h2>
                <InfoCircle
                  entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                  activeInfo={activeInfo}
                  onSelectInfo={setActiveInfo}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800/80 bg-[#060A14] p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-400">Subjective Fatigue</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
                    {formatNum(fatigue, "/ 5")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-[#060A14] p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-400">Workload Strain</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.personal_fatigue_strain}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
                    {formatNum(strain, "/ 5")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800/80 bg-[#060A14] p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-medium text-slate-400">Daytime Activity</span>
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.chart_hypokinesis}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-100 tabular-nums">
                    {formatNum(activityCnt, "cnt")}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-800/80 bg-[#060A14] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-100">
                    Personal Reflection &amp; Sleep Aid
                    <InfoCircle
                      entry={ISOLATION_RESEARCH_METADATA.private_journal_firewall}
                      activeInfo={activeInfo}
                      onSelectInfo={setActiveInfo}
                    />
                  </span>
                  <span className="text-xs text-slate-300">
                    Mood: <strong>{formatNum(privateMood, "/ 5")}</strong> · Sleep Aid:{" "}
                    <strong>
                      {privateSleepMed === true ? "Yes" : privateSleepMed === false ? "No" : "—"}
                    </strong>
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {privateJournal ?? "No personal reflection note recorded in latest snapshot."}
                </p>
              </div>
            </section>
          )}

          {/* 4. Thresholded Telemetry Charts */}
          <section className="space-y-3">
            <h2 className="font-display text-sm font-bold text-slate-100">
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
              <div className="hud-panel rounded-lg border border-dashed border-slate-700 bg-[#0B111F] p-6 text-center text-xs text-slate-400">
                Awaiting telemetry history for thresholded charts.
              </div>
            )}
          </section>

      {/* Unified accessible modal for all (i) research explanations & links */}
      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
