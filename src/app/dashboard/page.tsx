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
    return "border border-red-200 bg-red-50 text-red-800";
  }
  if (status === "ELEVATED") {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border border-emerald-200 bg-emerald-50 text-emerald-800";
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

  // Closed Environments ("environment")
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Select a scenario and character first.
        </div>
      </DashboardShell>
    );
  }

  const currentActorInputs = actorInputs[activeCharacter.id] ?? {};
  const safeActorRecords = sanitizeHazardRecordsForRole(hazardRecords, role);
  const safeActorSamples = sanitizeHazardSamplesForRole(hazardSamples, role);
  const safeScenarioRecords = sanitizeHazardRecordsForRole(scenarioHazardRecords, role);

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
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded-md px-2.5 py-0.5 font-semibold ${
                  role === "lead" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {role === "lead" ? "LEADER" : "MEMBER"}
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                {mission.durationContext}
              </span>
              <span className="text-slate-500">{mission.commsDelayLabel}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {activeCharacter.callsign} · 5-Hazard Telemetry Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              {activeCharacter.assignedRoleTitle} · {mission.scenarioDescriptionSlot}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {role === "lead" && (
              <Link
                href="/dashboard/members"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Users className="h-3.5 w-3.5" />
                Members ({leaderModel?.totalCrew ?? mission.crew.length})
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                const topCritical = hazardZones.find((z) => z.snapshot.status === "CRITICAL")?.hazard ?? HAZARDS[0];
                triggerAlarm({
                  hazardNumber: topCritical.number,
                  hazardTitle: topCritical.title,
                  ...topCritical.alarmPreset,
                });
                pushToast({
                  title: "Hazard Alarm Test Triggered",
                  message: `Here is: Opened active alarm overlay for Hazard ${topCritical.number}.`,
                  variant: "hazard",
                });
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Test Alarm Overlay
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <p className="text-xs font-medium text-emerald-800">Nominal Hazard Zones</p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">{nominalZones} / 5</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <p className="text-xs font-medium text-amber-800">Elevated Hazard Zones</p>
            <p className="mt-1 text-2xl font-bold text-amber-950">{elevatedZones} / 5</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <p className="text-xs font-medium text-red-800">Critical Hazard Zones</p>
            <p className="mt-1 text-2xl font-bold text-red-950">{criticalZones} / 5</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            All 5 NASA HRP Hazard Zones · Live Vitals
          </h2>
          <span className="text-xs text-slate-500">
            Click any zone for detailed charts & protocol guidance
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {hazardZones.map(({ hazard, snapshot, vitals }) => (
            <div
              key={hazard.slug}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs ${
                snapshot.status === "CRITICAL"
                  ? "border-red-300"
                  : snapshot.status === "ELEVATED"
                  ? "border-amber-300"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Hazard {hazard.number} · {hazard.shortTitle}
                    </p>
                    <h3 className="mt-0.5 text-base font-bold text-slate-900">{hazard.title}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
                      snapshot.status
                    )}`}
                  >
                    {snapshot.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {vitals.map((vital) => (
                    <div key={vital.label} className="rounded-xl bg-slate-50 p-2.5">
                      <p className="truncate text-[11px] font-medium text-slate-500">{vital.label}</p>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-900" title={vital.value}>
                        {vital.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
                  <p className="font-semibold text-slate-700">Immediate Assessment</p>
                  <p className="leading-relaxed text-slate-600">{snapshot.immediateHorizon}</p>
                </div>

                {snapshot.solutions[0] && (
                  <div className="flex items-start gap-2 rounded-xl bg-sky-50/70 p-3 text-xs text-sky-950">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                    <p className="leading-relaxed">
                      <span className="font-semibold">Priority Action: </span>
                      {snapshot.solutions[0]}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="truncate text-xs text-slate-500">ETA: {snapshot.eta}</span>
                <Link
                  href={`/dashboard/hazards/${hazard.slug}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  Open Zone
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Priority Countermeasures ({activeCharacter.callsign})
          </h2>
          <div className="mt-4 space-y-2.5">
            {characterModel.actions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                No urgent countermeasures triggered by current telemetry.
              </p>
            ) : (
              characterModel.actions.map((action, idx) => (
                <div key={idx} className="rounded-xl bg-slate-50 p-3.5 text-sm text-slate-800">
                  <span className="mr-2 font-semibold text-sky-700">#{idx + 1}</span>
                  {action}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          {role === "lead" && leaderModel ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Users className="h-4 w-4 text-sky-600" />
                  Crew Status Summary
                </h2>
                <Link
                  href="/dashboard/members"
                  className="text-xs font-semibold text-sky-700 hover:underline"
                >
                  View All Members →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="font-medium text-emerald-700">Nominal</p>
                  <p className="mt-1 text-xl font-bold text-emerald-950">{leaderModel.nominalCount}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="font-medium text-amber-700">Elevated</p>
                  <p className="mt-1 text-xl font-bold text-amber-950">{leaderModel.elevatedCount}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="font-medium text-red-700">Critical</p>
                  <p className="mt-1 text-xl font-bold text-red-950">{leaderModel.criticalCount}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {leaderModel.derivedTeamAlerts.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    All crew hazard zones within nominal tolerances.
                  </p>
                ) : (
                  leaderModel.derivedTeamAlerts.slice(0, 3).map((alertText, idx) => (
                    <div key={idx} className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-950">
                      {alertText}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Active Hazard Watch Items
              </h2>
              <div className="mt-4 space-y-2.5">
                {characterModel.blockers.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800">
                    All 5 NASA HRP hazard telemetry streams are nominal for {activeCharacter.callsign}.
                  </p>
                ) : (
                  characterModel.blockers.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="rounded-xl bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-950">
                      {item}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
