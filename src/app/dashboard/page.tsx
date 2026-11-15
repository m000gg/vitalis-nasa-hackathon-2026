"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles, Users } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS, HazardDataRecord, HazardEvaluationResult, HazardSlug } from "@/lib/hazards";
import {
  evaluateCharacterDashboard,
  evaluateHazardForActor,
  evaluateLeaderDashboard,
  HazardActorSnapshot,
  sanitizeHazardRecordsForRole,
  sanitizeHazardSamplesForRole,
} from "@/lib/evaluator";
import { evaluateGravityDiagnostics } from "@/lib/hazards/04-gravity";

interface VitalItem {
  label: string;
  value: string;
}

function statusBadgeClass(status: HazardEvaluationResult["status"]): string {
  if (status === "CRITICAL") {
    return "border border-[#DC2626]/55 bg-[#DC2626]/15 text-red-300";
  }
  if (status === "ELEVATED") {
    return "border border-[#D97706]/55 bg-[#D97706]/15 text-amber-300";
  }
  return "border border-[#16A34A]/50 bg-[#16A34A]/15 text-emerald-300";
}

function findStreamRecord(
  records: HazardDataRecord[],
  hazardSlug: HazardSlug,
  streamName: string
): HazardDataRecord | undefined {
  return records.find((r) => r.hazardSlug === hazardSlug && r.streamName === streamName);
}

function readPayloadString(rec: HazardDataRecord | undefined, key: string): string {
  if (!rec?.payload) return "";
  const val = rec.payload[key];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function formatNumberOrDash(value: unknown, suffix = ""): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(1)}${suffix}`;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return `${parsed.toFixed(1)}${suffix}`;
    }
    return `${value}${suffix}`;
  }
  return "—";
}

function extractHazardVitals(params: {
  slug: HazardSlug;
  snapshot: HazardActorSnapshot;
  role: "lead" | "member";
  safeActorRecords: HazardDataRecord[];
  safeScenarioRecords: HazardDataRecord[];
  commsDelayLabel: string;
  doseSlot: string;
  sleepSlot: string;
  gravityDiagnostics: ReturnType<typeof evaluateGravityDiagnostics>;
}): VitalItem[] {
  const {
    slug,
    snapshot,
    role,
    safeActorRecords,
    safeScenarioRecords,
    commsDelayLabel,
    doseSlot,
    sleepSlot,
    gravityDiagnostics,
  } = params;

  const findPreferred = (streamName: string) =>
    findStreamRecord(safeActorRecords, slug, streamName) ??
    findStreamRecord(safeScenarioRecords, slug, streamName);

  if (slug === "radiation") {
    const dosimeter = findPreferred("Personal Dosimeter");
    const weather = findPreferred("Space Weather (DONKI)");
    const rateVal = readPayloadString(dosimeter, "doseRateValue");
    const rateUnit = readPayloadString(dosimeter, "doseRateUnit");
    const cumVal = readPayloadString(dosimeter, "cumulativeDoseValue");
    const cumUnit = readPayloadString(dosimeter, "cumulativeDoseUnit");
    const solarActive = weather?.payload?.active;

    return [
      {
        label: "Dose Rate",
        value: rateVal ? `${rateVal} ${rateUnit}`.trim() : dosimeter?.rawValue || doseSlot || "—",
      },
      {
        label: "Cumulative Dose",
        value: cumVal ? `${cumVal} ${cumUnit}`.trim() : "—",
      },
      {
        label: "Space Weather",
        value:
          typeof solarActive === "boolean"
            ? solarActive
              ? "Active Flare"
              : "Quiet"
            : weather?.rawValue || "Monitored",
      },
    ];
  }

  if (slug === "isolation") {
    const wearable = findPreferred("Wearable / Actigraphy");
    const acoustics = findPreferred("Habitat Acoustics & Lighting");
    const selfCheck = findPreferred("60-Second Self-Check (Private)");
    const sleepDuration = wearable?.payload?.sleep_duration_h;
    const sleepEfficiency = wearable?.payload?.sleep_efficiency_pct;
    const noiseDba = acoustics?.payload?.sleep_quarter_noise_dba;
    const pvtRt = selfCheck?.payload?.pvt_median_rt_ms;

    return [
      {
        label: "Sleep Duration",
        value:
          sleepDuration !== undefined
            ? formatNumberOrDash(sleepDuration, " h")
            : wearable?.rawValue || sleepSlot || "—",
      },
      {
        label: "Sleep Efficiency",
        value: sleepEfficiency !== undefined ? formatNumberOrDash(sleepEfficiency, "%") : "—",
      },
      role === "member" && pvtRt !== undefined
        ? {
            label: "PVT Median RT",
            value: `${Number(pvtRt).toFixed(0)} ms`,
          }
        : {
            label: "Sleep Acoustics",
            value: noiseDba !== undefined ? formatNumberOrDash(noiseDba, " dBA") : "Masked",
          },
    ];
  }

  if (slug === "distance") {
    const ephemeris = findPreferred("Earth–Mars Ephemeris (JPL Horizons)");
    const inventory = findPreferred("Onboard Medical Inventory");
    const distKm = ephemeris?.payload?.distanceKm;

    return [
      {
        label: "Light-Time Delay",
        value: snapshot.eta || commsDelayLabel || "—",
      },
      {
        label: "Range to Earth",
        value:
          typeof distKm === "number" && Number.isFinite(distKm)
            ? `${(distKm / 1_000_000).toFixed(1)}M km`
            : ephemeris?.rawValue || "—",
      },
      {
        label: "Medical Kit",
        value: inventory?.rawValue || "Stocked",
      },
    ];
  }

  if (slug === "gravity") {
    const adherence = gravityDiagnostics.atrophy.adherenceSummary;
    const calfPct = gravityDiagnostics.atrophy.calfTrend?.latestPctChange;
    const gripPct = gravityDiagnostics.atrophy.gripTrend?.latestPctChange;

    return [
      {
        label: "Conditioning",
        value: gravityDiagnostics.conditioningStatus.replace("_", " "),
      },
      {
        label: "Exercise Target",
        value: adherence
          ? `${Math.round(adherence.avgTotalMinutes)} min/wk (${Math.round(adherence.overallPct)}%)`
          : "Unlogged",
      },
      role === "lead"
        ? {
            label: "Condition Guard",
            value:
              gravityDiagnostics.conditionViolations.length > 0
                ? `${gravityDiagnostics.conditionViolations.length} flag(s)`
                : "Valid",
          }
        : {
            label: "Calf / Grip Delta",
            value:
              typeof calfPct === "number" || typeof gripPct === "number"
                ? `${typeof calfPct === "number" ? `${calfPct.toFixed(1)}%` : "—"} / ${
                    typeof gripPct === "number" ? `${gripPct.toFixed(1)}%` : "—"
                  }`
                : "Baseline",
          },
    ];
  }

  const chartLatestValues = (snapshot.charts ?? [])
    .map((chart) => {
      const last = chart.series[chart.series.length - 1];
      return last ? { title: chart.title, value: last.value } : null;
    })
    .filter((x): x is { title: string; value: number } => x !== null);

  const peakCo2 = chartLatestValues.reduce<number | null>(
    (max, item) => (max === null || item.value > max ? item.value : max),
    null
  );

  return [
    {
      label: "Peak Module CO₂",
      value: peakCo2 !== null ? `${peakCo2.toFixed(2)} mmHg` : "—",
    },
    {
      label: "Monitored Modules",
      value: chartLatestValues.length > 0 ? `${chartLatestValues.length} Active` : "Active",
    },
    {
      label: "Target Time",
      value: snapshot.eta || "Nominal",
    },
  ];
}

export default function DashboardOverviewPage() {
  const {
    mission,
    activeCharacter,
    setActiveCharacterId,
    role,
    actorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
  } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  if (!mission || !activeCharacter) {
    return (
      <DashboardShell>
        <div className="hud-panel rounded-lg p-6 text-sm text-slate-300">
          Select a scenario and character first.
        </div>
      </DashboardShell>
    );
  }

  const currentActorInputs = actorInputs[activeCharacter.id] ?? {};
  const safeActorRecords = sanitizeHazardRecordsForRole(hazardRecords, role, activeCharacter.id);
  const safeActorSamples = sanitizeHazardSamplesForRole(hazardSamples, role, activeCharacter.id);
  const safeScenarioRecords = sanitizeHazardRecordsForRole(
    scenarioHazardRecords,
    role,
    activeCharacter.id
  );

  const characterModel = evaluateCharacterDashboard(activeCharacter, {
    customInputs: currentActorInputs,
    mission,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    role,
  });

  const leaderModel =
    role === "lead"
      ? evaluateLeaderDashboard(mission, {
          actorInputs,
          scenarioHazardRecords,
          scenarioHazardSamples,
        })
      : null;

  const gravityDiagnostics = evaluateGravityDiagnostics({
    actor: activeCharacter,
    role,
    actorInputs: currentActorInputs,
    hazardRecords: safeActorRecords,
    hazardSamples: safeActorSamples,
    allHazardRecords: safeActorRecords,
  });

  const hazardZones = HAZARDS.map((hazard) => {
    const snapshot = evaluateHazardForActor(mission, activeCharacter, hazard, {
      actorInputs: currentActorInputs,
      hazardRecords,
      hazardSamples,
      scenarioHazardRecords,
      scenarioHazardSamples,
      role,
    });

    const vitals = extractHazardVitals({
      slug: hazard.slug,
      snapshot,
      role,
      safeActorRecords,
      safeScenarioRecords,
      commsDelayLabel: mission.commsDelayLabel,
      doseSlot: characterModel.metrics.doseSlot,
      sleepSlot: characterModel.metrics.sleepSlot,
      gravityDiagnostics,
    });

    return { hazard, snapshot, vitals };
  });

  const criticalZones = hazardZones.filter((z) => z.snapshot.status === "CRITICAL").length;
  const elevatedZones = hazardZones.filter((z) => z.snapshot.status === "ELEVATED").length;
  const nominalZones = hazardZones.filter((z) => z.snapshot.status === "NOMINAL").length;

  return (
    <DashboardShell>
      {/* Command Header Panel */}
      <section className="hud-panel relative overflow-hidden rounded-lg p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#3B82F6]/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono-tech text-xs">
              <span
                className={`rounded border px-2 py-0.5 font-bold ${
                  role === "lead"
                    ? "border-[#3B82F6]/45 bg-[#3B82F6]/15 text-blue-300"
                    : "border-[#16A34A]/45 bg-[#16A34A]/15 text-emerald-300"
                }`}
              >
                {role === "lead" ? "LEADER" : "MEMBER"}
              </span>
              <span className="rounded border border-slate-700 bg-[#060A14] px-2 py-0.5 text-slate-300">
                {mission.durationContext}
              </span>
              <span className="text-slate-400">{mission.commsDelayLabel}</span>
            </div>
            <h1 className="font-display text-2xl tracking-tight text-white">
              {activeCharacter.callsign} · Telemetry Overview
            </h1>
            <p className="text-xs text-slate-400">
              {activeCharacter.assignedRoleTitle} · {mission.scenarioDescriptionSlot}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {role === "lead" && (
              <Link
                href="/dashboard/members"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#3B82F6] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
              >
                <Users className="h-3.5 w-3.5" />
                Crew Matrix ({leaderModel?.totalCrew ?? mission.crew.length})
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                const topCritical =
                  hazardZones.find((z) => z.snapshot.status === "CRITICAL")?.hazard ?? HAZARDS[0];
                triggerAlarm({
                  hazardNumber: topCritical.number,
                  hazardTitle: topCritical.title,
                  ...topCritical.alarmPreset,
                });
                pushToast({
                  title: "Hazard Alarm Test Triggered",
                  message: `Opened active alarm overlay for Hazard ${topCritical.number}.`,
                  variant: "hazard",
                });
              }}
              className="rounded-md border border-[#DC2626]/55 bg-[#DC2626]/15 px-3.5 py-2 text-xs font-semibold text-red-200 transition hover:bg-[#DC2626]/25"
            >
              Test Alarm Overlay
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-[#16A34A]/35 border-t-2 border-t-[#16A34A] bg-[#060A14] p-3.5">
            <p className="label-caps text-emerald-300">Nominal Zones</p>
            <p className="font-display mt-1 text-2xl text-white tabular-nums">{nominalZones} / 5</p>
          </div>
          <div className="rounded-md border border-[#D97706]/35 border-t-2 border-t-[#D97706] bg-[#060A14] p-3.5">
            <p className="label-caps text-amber-300">Elevated Zones</p>
            <p className="font-display mt-1 text-2xl text-white tabular-nums">{elevatedZones} / 5</p>
          </div>
          <div className="rounded-md border border-[#DC2626]/40 border-t-2 border-t-[#DC2626] bg-[#060A14] p-3.5">
            <p className="label-caps text-red-300">Critical Zones</p>
            <p className="font-display mt-1 text-2xl text-white tabular-nums">{criticalZones} / 5</p>
          </div>
        </div>
      </section>

      {/* 5 NASA HRP Hazard Bento Grid */}
      <section className="space-y-3">
        <h2 className="label-caps text-slate-400">5 NASA HRP Channels · Live Vitals</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {hazardZones.map(({ hazard, snapshot, vitals }) => (
            <div
              key={hazard.slug}
              className={`hud-panel flex flex-col justify-between rounded-lg p-5 transition ${
                snapshot.status === "CRITICAL"
                  ? "border-[#DC2626]/55 shadow-[0_0_24px_rgba(220,38,38,0.12)]"
                  : snapshot.status === "ELEVATED"
                  ? "border-[#D97706]/50"
                  : "border-slate-800 hover:border-[#3B82F6]/45"
              }`}
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-tech text-xs font-bold text-[#3B82F6]">
                      H-0{hazard.number} · {hazard.shortTitle.toUpperCase()}
                    </p>
                    <h3 className="font-display mt-0.5 text-base text-white">{hazard.title}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 font-mono-tech text-xs font-bold ${statusBadgeClass(
                      snapshot.status
                    )}`}
                  >
                    {snapshot.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {vitals.map((vital) => (
                    <div
                      key={vital.label}
                      className="rounded-md border border-slate-800/90 bg-[#060A14] p-2.5"
                    >
                      <p className="truncate font-mono-tech text-[11px] text-slate-400">
                        {vital.label}
                      </p>
                      <p
                        className="mt-0.5 truncate font-mono-tech text-xs font-bold text-white"
                        title={vital.value}
                      >
                        {vital.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 rounded-md border border-slate-800/80 bg-[#060A14]/80 p-3 text-xs">
                  <p className="label-caps text-slate-400">Immediate Assessment</p>
                  <p className="leading-relaxed text-slate-200">{snapshot.immediateHorizon}</p>
                </div>

                {snapshot.solutions[0] && (
                  <div className="flex items-start gap-2 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-3 text-xs text-blue-100">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B82F6]" />
                    <p className="leading-relaxed">
                      <span className="font-bold text-blue-300">Priority: </span>
                      {snapshot.solutions[0]}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="truncate font-mono-tech text-xs text-slate-400">
                  ETA: {snapshot.eta}
                </span>
                <Link
                  href={`/dashboard/hazards/${hazard.slug}`}
                  className="inline-flex shrink-0 items-center gap-1 font-mono-tech text-xs font-bold text-blue-300 transition hover:text-white"
                >
                  OPEN ZONE
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Countermeasures + Role Summary */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="hud-panel rounded-lg p-6">
          <h2 className="font-display flex items-center gap-2 text-sm text-white">
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
            Countermeasures · {activeCharacter.callsign}
          </h2>
          <div className="mt-4 space-y-2">
            {characterModel.actions.length === 0 ? (
              <p className="rounded-md border border-slate-800 bg-[#060A14] p-3 text-xs text-slate-400">
                No urgent countermeasures triggered.
              </p>
            ) : (
              characterModel.actions.map((action, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-slate-800 bg-[#060A14] p-3 text-sm text-slate-200"
                >
                  <span className="mr-2 font-mono-tech font-bold text-[#3B82F6]">#0{idx + 1}</span>
                  {action}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hud-panel rounded-lg p-6">
          {role === "lead" && leaderModel ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display flex items-center gap-2 text-sm text-white">
                  <Users className="h-4 w-4 text-[#3B82F6]" />
                  Crew Status Summary
                </h2>
                <Link
                  href="/dashboard/members"
                  className="font-mono-tech text-xs font-bold text-blue-300 hover:text-white"
                >
                  VIEW ALL →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="rounded-md border border-[#16A34A]/35 bg-[#060A14] p-3">
                  <p className="label-caps text-emerald-300">Nominal</p>
                  <p className="font-display mt-1 text-xl text-white tabular-nums">
                    {leaderModel.nominalCount}
                  </p>
                </div>
                <div className="rounded-md border border-[#D97706]/35 bg-[#060A14] p-3">
                  <p className="label-caps text-amber-300">Elevated</p>
                  <p className="font-display mt-1 text-xl text-white tabular-nums">
                    {leaderModel.elevatedCount}
                  </p>
                </div>
                <div className="rounded-md border border-[#DC2626]/40 bg-[#060A14] p-3">
                  <p className="label-caps text-red-300">Critical</p>
                  <p className="font-display mt-1 text-xl text-white tabular-nums">
                    {leaderModel.criticalCount}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {leaderModel.derivedTeamAlerts.length === 0 ? (
                  <p className="rounded-md border border-slate-800 bg-[#060A14] p-3 text-xs text-slate-400">
                    All crew streams within tolerance.
                  </p>
                ) : (
                  leaderModel.derivedTeamAlerts.slice(0, 3).map((alertText, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-[#D97706]/35 bg-[#D97706]/10 p-3 text-xs text-amber-200"
                    >
                      {alertText}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display flex items-center gap-2 text-sm text-white">
                <ShieldAlert className="h-4 w-4 text-[#D97706]" />
                Active Watch Items
              </h2>
              <div className="mt-4 space-y-2">
                {characterModel.blockers.length === 0 ? (
                  <p className="rounded-md border border-[#16A34A]/35 bg-[#16A34A]/10 p-3.5 text-xs text-emerald-200">
                    All 5 NASA HRP streams nominal for {activeCharacter.callsign}.
                  </p>
                ) : (
                  characterModel.blockers.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-[#D97706]/35 bg-[#D97706]/10 p-3 text-xs leading-relaxed text-amber-200"
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {role === "lead" && leaderModel && (
        <section className="hud-panel rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display flex items-center gap-2 text-sm text-white">
                <Users className="h-4 w-4 text-[#3B82F6]" />
                Crew Operational Roster ({leaderModel.totalCrew})
              </h2>
              <p className="mt-0.5 font-mono-tech text-xs text-slate-400">
                Operational overview · private notes masked
              </p>
            </div>
            <Link
              href="/dashboard/members"
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#060A14] px-3 py-1.5 font-mono-tech text-xs font-bold text-slate-200 hover:border-[#3B82F6]/60 hover:text-white"
            >
              Directory
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-800/90">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#060A14]">
                <tr className="border-b border-slate-800 font-mono-tech text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5">Crew Member</th>
                  <th className="px-3 py-2.5">Overall</th>
                  <th className="px-3 py-2.5">5 Hazards (R · I · D · G · E)</th>
                  <th className="px-3 py-2.5">Dose Rate</th>
                  <th className="px-3 py-2.5">Sleep / Noise</th>
                  <th className="px-3 py-2.5">Exercise</th>
                  <th className="px-3 py-2.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {leaderModel.crewMatrix.map((member) => {
                  const isCurrent = member.id === activeCharacter.id;
                  return (
                    <tr
                      key={member.id}
                      className={isCurrent ? "bg-[#3B82F6]/10" : "hover:bg-slate-800/40"}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{member.callsign}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono-tech text-[10px] font-bold ${
                              member.isLeadSlot
                                ? "bg-[#3B82F6]/20 text-blue-300"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {member.isLeadSlot ? "LEAD" : "MEMBER"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{member.assignedRoleTitle}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-mono-tech text-[11px] font-bold ${statusBadgeClass(
                            member.overallStatus
                          )}`}
                        >
                          {member.overallStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {HAZARDS.map((h) => {
                            const st = member.hazardStatuses[h.slug];
                            return (
                              <Link
                                key={h.slug}
                                href={`/dashboard/hazards/${h.slug}`}
                                title={`${h.title}: ${st}`}
                                className={`rounded px-1.5 py-0.5 font-mono-tech text-[10px] font-bold transition hover:opacity-80 ${statusBadgeClass(
                                  st
                                )}`}
                              >
                                {h.number}.{h.shortTitle.slice(0, 3)}
                              </Link>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono-tech text-slate-200">
                        {member.operationalVitals.doseRateLabel}
                      </td>
                      <td className="px-3 py-3 font-mono-tech text-slate-200">
                        {member.operationalVitals.sleepLabel} · {member.operationalVitals.acousticsLabel}
                      </td>
                      <td className="px-3 py-3 font-mono-tech text-slate-200">
                        {member.operationalVitals.exercisePct !== null
                          ? `${member.operationalVitals.exercisePct}%`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isCurrent ? (
                          <span className="rounded border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2.5 py-1 font-mono-tech text-[11px] font-bold text-blue-300">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCharacterId(member.id);
                              pushToast({
                                title: `Switched to ${member.callsign}`,
                                message: member.isLeadSlot
                                  ? "Viewing Commander oversight."
                                  : "Viewing Member personal stats only.",
                                variant: "info",
                              });
                            }}
                            className="rounded border border-slate-700 bg-[#060A14] px-2.5 py-1 font-mono-tech text-[11px] font-bold text-slate-200 hover:border-[#3B82F6]/60 hover:text-white"
                          >
                            Switch View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </DashboardShell>
  );
}
