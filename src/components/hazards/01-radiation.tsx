"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FlaskConical,
  Lock,
  Radio,
  Shield,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { evaluateHazardForActor } from "@/lib/evaluator";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";
import type { HazardDataRecord } from "@/lib/hazards/types";
import type { HazardScreenProps } from "./types";

type StatusKey = "NOMINAL" | "ELEVATED" | "CRITICAL";

const STATUS_STYLE: Record<
  StatusKey,
  { badge: string; panel: string; label: string }
> = {
  NOMINAL: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-200/80 bg-emerald-50/40",
    label: "NOMINAL",
  },
  ELEVATED: {
    badge: "border-amber-300 bg-amber-50 text-amber-900",
    panel: "border-amber-300/80 bg-amber-50/40",
    label: "ELEVATED",
  },
  CRITICAL: {
    badge: "border-red-300 bg-red-50 text-red-900",
    panel: "border-red-300/80 bg-red-50/40",
    label: "CRITICAL",
  },
};

function StatusIcon({ status, className = "h-3.5 w-3.5" }: { status: StatusKey; className?: string }) {
  if (status === "CRITICAL") return <ShieldAlert className={className} aria-hidden="true" />;
  if (status === "ELEVATED") return <AlertTriangle className={className} aria-hidden="true" />;
  return <CheckCircle2 className={className} aria-hidden="true" />;
}

function latestRecord(
  records: readonly HazardDataRecord[],
  streamName: string,
  characterId?: string
): HazardDataRecord | undefined {
  return records
    .filter(
      (r) =>
        r.hazardSlug === "radiation" &&
        r.streamName === streamName &&
        (!characterId || r.characterId === characterId)
    )
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

function readStr(payload: Record<string, unknown> | undefined, key: string): string | null {
  const val = payload?.[key];
  return typeof val === "string" && val.trim() !== "" ? val.trim() : null;
}

function readNumStr(payload: Record<string, unknown> | undefined, key: string): string | null {
  const val = payload?.[key];
  if (typeof val === "number" && Number.isFinite(val)) return String(val);
  if (typeof val === "string" && val.trim() !== "") return val.trim();
  return null;
}

function readBool(payload: Record<string, unknown> | undefined, key: string): boolean | null {
  const val = payload?.[key];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const norm = val.trim().toLowerCase();
    if (norm === "true" || norm === "yes" || norm === "1") return true;
    if (norm === "false" || norm === "no" || norm === "0") return false;
  }
  return null;
}

/**
 * HAZARD 1: SPACE RADIATION SCREEN (Read-Only, DB-Driven)
 * Renders evaluated outputs from 01-radiation.ts without inventing thresholds or clinical claims.
 */
export function RadiationHazardScreen({
  hazard,
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  scenarioHazardRecords,
  scenarioHazardSamples,
}: HazardScreenProps) {
  const S = RADIATION_PIPELINE_VALUES.streams;

  const dosimeterRec = latestRecord(hazardRecords, S.personalDosimeter, activeCharacter.id);
  const policyRec = latestRecord(scenarioHazardRecords, S.missionPolicy);
  const weatherRec = latestRecord(scenarioHazardRecords, S.spaceWeather);

  const compartmentRecs = scenarioHazardRecords.filter(
    (r) => r.hazardSlug === "radiation" && r.streamName === S.compartmentSensors
  );
  const researchRecs = hazardRecords.filter(
    (r) => r.hazardSlug === "radiation" && r.streamName === S.researchLab
  );

  const rateVal = readNumStr(dosimeterRec?.payload, "doseRateValue");
  const rateUnit =
    readStr(dosimeterRec?.payload, "doseRateUnit") ?? readStr(dosimeterRec?.payload, "unit");
  const cumVal = readNumStr(dosimeterRec?.payload, "cumulativeDoseValue");
  const cumUnit = readStr(dosimeterRec?.payload, "cumulativeDoseUnit");
  const qualityFlag = readStr(dosimeterRec?.payload, "qualityFlag") ?? "unknown";
  const provenanceKind = readStr(dosimeterRec?.payload, "provenanceKind") ?? "unlabeled";
  const instrument = readStr(dosimeterRec?.payload, "instrument");

  const policyLabel = readStr(policyRec?.payload, "policyLabel") ?? "No configured mission policy";
  const policyMode = readStr(policyRec?.payload, "policyMode");
  const policyFamily = readStr(policyRec?.payload, "quantityFamily");
  const remainingHours = readNumStr(policyRec?.payload, "remainingMissionHours");

  const weatherActive = readBool(weatherRec?.payload, "active");
  const weatherType = readStr(weatherRec?.payload, "eventType");
  const weatherEventId = readStr(weatherRec?.payload, "eventId");
  const weatherSource = readStr(weatherRec?.payload, "source");

  const charts = snapshot.charts ?? [];

  const crewRows =
    role === "lead"
      ? mission.crew.map((member) => {
          const memberSnap = evaluateHazardForActor(mission, member, hazard, {
            actorInputs: {},
            scenarioHazardRecords,
            scenarioHazardSamples,
            role: "lead",
          });
          const mDosimeter = latestRecord(scenarioHazardRecords, S.personalDosimeter, member.id);
          const mRate = readNumStr(mDosimeter?.payload, "doseRateValue");
          const mRateUnit =
            readStr(mDosimeter?.payload, "doseRateUnit") ?? readStr(mDosimeter?.payload, "unit");
          const mCum = readNumStr(mDosimeter?.payload, "cumulativeDoseValue");
          const mCumUnit = readStr(mDosimeter?.payload, "cumulativeDoseUnit");
          const mQuality = readStr(mDosimeter?.payload, "qualityFlag") ?? "—";
          const mProv = readStr(mDosimeter?.payload, "provenanceKind") ?? "—";

          return {
            id: member.id,
            callsign: member.callsign,
            assignedRoleTitle: member.assignedRoleTitle,
            status: memberSnap.status,
            rateLabel: mRate ? `${mRate}${mRateUnit ? ` ${mRateUnit}` : ""}` : "—",
            cumLabel: mCum ? `${mCum}${mCumUnit ? ` ${mCumUnit}` : ""}` : "—",
            quality: mQuality,
            provenance: mProv,
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
            <h2 className="text-base font-bold text-slate-900">Ready-to-Act Briefing</h2>
          </div>

          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
            ETA: {snapshot.eta}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Immediate Horizon (Dose Rate &amp; Data Quality)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-900">
                {snapshot.immediateHorizon}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                Prolonged Horizon (Mission Exposure Forecast)
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {snapshot.prolongedHorizon}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-white p-4 lg:col-span-6">
            <p className="text-xs font-bold tracking-wide text-sky-900 uppercase">
              Prioritized Flight-Rule Actions ({snapshot.solutions.length} Max)
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

      {/* 2. Core Radiation Telemetry & Provenance KPIs */}
      <section aria-label="Core radiation telemetry" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Personal Dosimeter</span>
            <Activity className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {rateVal ? `${rateVal}${rateUnit ? ` ${rateUnit}` : ""}` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Cumulative: {cumVal ? `${cumVal}${cumUnit ? ` ${cumUnit}` : ""}` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Provenance: <span className="font-semibold uppercase">{provenanceKind}</span> · Quality: {qualityFlag}
            {instrument ? ` · ${instrument}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Mission Policy</span>
            <Shield className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">{policyLabel}</p>
          <p className="mt-1 text-xs text-slate-600">
            Family: {policyFamily ?? "—"} · Remaining: {remainingHours ? `${remainingHours} h` : "—"}
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            {policyMode === "approved"
              ? "APPROVED FLIGHT RULE"
              : policyRec
              ? "SIMULATION POLICY — NOT A UNIVERSAL NASA LIMIT"
              : "No policy record synced"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Space Weather (DONKI)</span>
            <Sun className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {weatherActive ? `ACTIVE (${weatherType ?? "EVENT"})` : weatherRec ? "Quiet / Inactive" : "No Event Synced"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {weatherEventId ? `Event ID: ${weatherEventId}` : "Space-weather timeline only"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Event context ≠ crew dose reading{weatherSource ? ` · ${weatherSource}` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Compartments &amp; Lab</span>
            <Database className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
            {compartmentRecs.length} sensor(s)
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Synced personal records: {hazardRecords.length} · Samples: {hazardSamples.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Experimental lab records: {researchRecs.length}
          </p>
        </div>
      </section>

      {/* 3. Role-Tailored View (Lead Crew Comparison & Compartments vs Member Profile & Experimental Lab) */}
      {role === "lead" ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">
                  Crew Radiation Comparison (Mission-Safety Dosimetry)
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                <Lock className="h-3 w-3" /> {hazard.leadView.privacyRule}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] tracking-wide text-slate-500 uppercase">
                    <th className="py-2 pr-3 font-semibold">Crew Slot</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Dose Rate</th>
                    <th className="px-3 py-2 font-semibold">Cumulative</th>
                    <th className="px-3 py-2 font-semibold">Quality</th>
                    <th className="py-2 pl-3 font-semibold">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crewRows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-slate-900">{row.callsign}</div>
                        <div className="text-[11px] text-slate-500">{row.assignedRoleTitle}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[row.status].badge}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-800">{row.rateLabel}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-800">{row.cumLabel}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.quality}</td>
                      <td className="py-2.5 pl-3 text-[11px] uppercase text-slate-600">{row.provenance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {compartmentRecs.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Radio className="h-4 w-4 text-sky-700" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">Compartment Sensors</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {compartmentRecs.map((rec) => {
                  const compId = readStr(rec.payload, "compartmentId") ?? rec.rawValue ?? "Compartment";
                  const rVal = readNumStr(rec.payload, "doseRateValue") ?? "—";
                  const rUnit = readStr(rec.payload, "doseRateUnit") ?? readStr(rec.payload, "unit") ?? "";
                  const detStatus = readStr(rec.payload, "detectorStatus") ?? "unknown";
                  const pos = readStr(rec.payload, "position");
                  const prov = readStr(rec.payload, "provenanceKind") ?? "unlabeled";
                  return (
                    <div key={rec.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{compId}</span>
                        <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                          {detStatus}
                        </span>
                      </div>
                      <p className="mt-1.5 text-base font-bold text-slate-900">
                        {rVal} {rUnit}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Provenance: {prov}
                        {pos ? ` · ${pos}` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Lock className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Personal Radiation Profile &amp; Experimental Research Context
            </h2>
            <span className="text-[11px] text-slate-500">{hazard.memberView.privacyRule}</span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <p className="font-semibold text-slate-900">Synced DB Streams ({activeCharacter.callsign})</p>
              {hazardRecords.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-slate-700">
                  {hazardRecords.map((rec) => (
                    <li key={rec.id} className="rounded-lg bg-white p-2">
                      <span className="font-semibold text-slate-900">{rec.streamName}:</span>{" "}
                      {rec.rawValue || JSON.stringify(rec.payload)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-slate-500">No personal radiation snapshots synced yet.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <FlaskConical className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
                Shielding &amp; BioShield Lab (Experimental Only)
              </div>
              {researchRecs.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-slate-700">
                  {researchRecs.map((rec) => (
                    <li key={rec.id} className="rounded-lg bg-white p-2">
                      <span className="mr-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                        EXPERIMENTAL
                      </span>
                      {readStr(rec.payload, "materialOrSpecimen") ?? rec.rawValue ?? "Experiment record"} —{" "}
                      {readNumStr(rec.payload, "resultValue") ?? "—"}{" "}
                      {readStr(rec.payload, "resultUnit") ?? ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-slate-500">
                  No experimental OLTARIS / BioShield / BioSentinel records synced. Experimental results are never operational protection claims.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Thresholded Telemetry Charts */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Radiation Telemetry History &amp; Comparisons
        </h2>
        {charts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {charts.map((chart) => (
              <HazardTelemetryChart key={chart.id} chart={chart} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
            Awaiting DB dose-rate time-series samples to render radiation charts.
          </div>
        )}
      </section>

      {/* 5. Scientific Boundaries & NASA References */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
        <p className="font-bold text-slate-900">Scientific Boundaries &amp; NASA Reference Anchors</p>
        <p className="mt-1">
          Sv-family (equivalent/effective) and Gy-family (absorbed) quantities are kept strictly separate.
          DONKI space-weather events are tracked independently from crew dosimetry.
        </p>
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
