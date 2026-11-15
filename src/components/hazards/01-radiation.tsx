"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Beaker,
  CloudSun,
  Download,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { useMission } from "@/context/MissionContext";
import { evaluateHazardForActor } from "@/lib/evaluator";
import {
  normalizeDose,
  normalizeDoseRate,
  RADIATION_PIPELINE_VALUES,
} from "@/lib/hazards/01-radiation";
import type { HazardScreenProps } from "./types";

type ScenarioItem = {
  id: string;
  title: string;
  threatType: string;
  description: string;
};

type EmergencyItem = {
  eventId: string;
  state: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  severity: "WARNING" | "CRITICAL";
  reason: string;
  simulation: boolean;
  acknowledgements: Record<string, string>;
  shelterCheckIns?: Record<string, string>;
};

type DonkiEventType = "SEP" | "FLR" | "RBE";

type DonkiItem = {
  eventId: string;
  eventType: string;
  startTime: string | null;
  summary: string;
  link?: string | null;
};

type WhatIfResult = {
  label: string;
  rateMultiplier?: number;
  provenanceKind?: string;
  status?: string;
  explanation?: string;
  forecast?: {
    supported: boolean;
    projectedValue: number | null;
    lowerValue: number | null;
    upperValue: number | null;
    unit: string | null;
    remainingHours: number | null;
    reason?: string;
  };
};

function responseError(payload: unknown, fallback: string): string {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function statusBadgeClass(status: string): string {
  if (status === "CRITICAL") return "bg-red-100 text-red-800";
  if (status === "ELEVATED") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function formatNum(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number(value.toFixed(digits)));
}

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
  const { refreshHazardTelemetry, refreshScenarios } = useMission();
  const S = RADIATION_PIPELINE_VALUES.streams;

  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [donkiType, setDonkiType] = useState<DonkiEventType>("RBE");
  const [donkiDays, setDonkiDays] = useState<7 | 30>(30);
  const [donkiEvents, setDonkiEvents] = useState<DonkiItem[]>([]);
  const [donkiQueryMeta, setDonkiQueryMeta] = useState<{
    type: DonkiEventType;
    start: string;
    end: string;
    error?: string;
  } | null>(null);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [whatIfLimitation, setWhatIfLimitation] = useState<string>("");
  const [customMultiplier, setCustomMultiplier] = useState<string>("0.5");
  const [customHours, setCustomHours] = useState<string>("24");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const refreshEmergencies = useCallback(async () => {
    const response = await fetch(
      `/api/radiation/emergencies?scenarioId=${encodeURIComponent(mission.id)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(responseError(data, "Unable to sync radiation emergencies."));
    }
    setEmergencies(Array.isArray(data.emergencies) ? data.emergencies : []);
  }, [mission.id]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/radiation/scenarios").then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(responseError(data, "Unable to load scenarios."));
        }
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
      }),
      refreshEmergencies(),
    ]).catch((error) => {
      setNotice(error instanceof Error ? error.message : "Radiation sync failed.");
    });
  }, [refreshEmergencies]);

  const activeEmergency = emergencies.find((item) => item.state !== "RESOLVED") ?? null;

  const radiationRecords = useMemo(
    () => scenarioHazardRecords.filter((record) => record.hazardSlug === "radiation"),
    [scenarioHazardRecords]
  );
  const personalRecords = useMemo(
    () => radiationRecords.filter((record) => record.streamName === S.personalDosimeter),
    [radiationRecords, S.personalDosimeter]
  );
  const compartmentRecords = useMemo(
    () => radiationRecords.filter((record) => record.streamName === S.compartmentSensors),
    [radiationRecords, S.compartmentSensors]
  );
  const researchRecords = useMemo(
    () => radiationRecords.filter((record) => record.streamName === S.researchLab),
    [radiationRecords, S.researchLab]
  );
  const currentPolicy = useMemo(
    () => radiationRecords.find((record) => record.streamName === S.missionPolicy),
    [radiationRecords, S.missionPolicy]
  );
  const syncedSpaceWeather = useMemo(
    () => radiationRecords.find((record) => record.streamName === S.spaceWeather),
    [radiationRecords, S.spaceWeather]
  );

  const displayedCharts = snapshot.charts ?? [];

  const crewDoseRows = useMemo(
    () =>
      mission.crew.map((crew) => {
        const record = personalRecords
          .filter((item) => item.characterId === crew.id)
          .slice()
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        const payload = record?.payload ?? {};
        const rate = normalizeDoseRate(
          payload.doseRateValue,
          payload.doseRateUnit ?? payload.unit
        );
        const cumulative = normalizeDose(
          payload.cumulativeDoseValue,
          payload.cumulativeDoseUnit
        );
        const memberStatus =
          role === "lead"
            ? evaluateHazardForActor(mission, crew, hazard, {
                actorInputs: {},
                scenarioHazardRecords,
                scenarioHazardSamples,
                role: "lead",
              }).status
            : snapshot.status;

        return {
          id: crew.id,
          callsign: crew.callsign,
          status: memberStatus,
          sheltered: Boolean(activeEmergency?.shelterCheckIns?.[crew.id]),
          rateLabel: rate ? `${formatNum(rate.value, 4)} ${rate.unit}` : "—",
          doseLabel: cumulative ? `${formatNum(cumulative.value, 4)} ${cumulative.unit}` : "—",
          quality: typeof payload.qualityFlag === "string" ? payload.qualityFlag : "—",
          instrument: typeof payload.instrument === "string" ? payload.instrument : "",
          provenance:
            typeof payload.provenanceKind === "string" ? payload.provenanceKind : "missing",
        };
      }),
    [
      activeEmergency?.shelterCheckIns,
      hazard,
      mission,
      personalRecords,
      role,
      scenarioHazardRecords,
      scenarioHazardSamples,
      snapshot.status,
    ]
  );

  const compartmentRows = useMemo(() => {
    const parsed = compartmentRecords.map((record) => {
      const payload = record.payload ?? {};
      const rate = normalizeDoseRate(
        payload.doseRateValue,
        payload.doseRateUnit ?? payload.unit
      );
      return {
        id: record.id,
        name: String(payload.compartmentId ?? payload.compartment ?? "Unnamed compartment"),
        rate,
        rateLabel: rate ? `${formatNum(rate.value, 4)} ${rate.unit}` : "—",
        status: String(payload.detectorStatus ?? "unknown"),
        provenance: String(payload.provenanceKind ?? "unknown"),
      };
    });
    const comparable = parsed.filter((item) => item.rate !== null);
    const safest =
      comparable.length >= 2
        ? comparable.reduce((min, item) =>
            item.rate!.value < min.rate!.value ? item : min
          ).id
        : null;
    return parsed.map((item) => ({ ...item, isLowestRate: item.id === safest }));
  }, [compartmentRecords]);

  const activeDosimeterSource = useMemo(() => {
    const own =
      personalRecords.find((item) => item.characterId === activeCharacter.id) ??
      (role === "lead" ? personalRecords[0] : undefined);
    if (!own) return null;
    const payload = own.payload ?? {};
    const rate = normalizeDoseRate(payload.doseRateValue, payload.doseRateUnit ?? payload.unit);
    const dose = normalizeDose(payload.cumulativeDoseValue, payload.cumulativeDoseUnit);
    if (!rate || !dose || rate.family !== dose.family) return null;
    return {
      rate,
      dose,
      uncertaintyPercent:
        typeof payload.uncertaintyPercent === "number" ? payload.uncertaintyPercent : null,
    };
  }, [activeCharacter.id, personalRecords, role]);

  const syncAll = useCallback(async () => {
    await Promise.all([refreshEmergencies(), refreshHazardTelemetry(), refreshScenarios()]);
  }, [refreshEmergencies, refreshHazardTelemetry, refreshScenarios]);

  const runScenario = async (scenarioId: string) => {
    setBusy(`scenario-${scenarioId}`);
    setNotice("");
    try {
      const response = await fetch("/api/radiation/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: mission.id,
          radiationScenarioId: scenarioId,
          actorId: activeCharacter.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Scenario runner failed."));
      await syncAll();
      setNotice(
        `${data.scenario?.title ?? "Scenario"} written to Supabase as reproducible simulated telemetry.`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Scenario runner failed.");
    } finally {
      setBusy(null);
    }
  };

  const acknowledge = async () => {
    if (!activeEmergency) return;
    setBusy("ack");
    setNotice("");
    try {
      const response = await fetch(
        `/api/radiation/emergencies/${encodeURIComponent(activeEmergency.eventId)}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: mission.id, actorId: activeCharacter.id }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Acknowledgement failed."));
      await syncAll();
      setNotice("Emergency acknowledgement saved to Supabase audit log.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Acknowledgement failed.");
    } finally {
      setBusy(null);
    }
  };

  const shelterCheckIn = async () => {
    if (!activeEmergency) return;
    setBusy("shelter");
    setNotice("");
    try {
      const response = await fetch(
        `/api/radiation/emergencies/${encodeURIComponent(activeEmergency.eventId)}/shelter-check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenarioId: mission.id, characterId: activeCharacter.id }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Shelter check-in failed."));
      await syncAll();
      setNotice("Shelter check-in confirmed in Supabase.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Shelter check-in failed.");
    } finally {
      setBusy(null);
    }
  };

  const exportIncidentReport = async () => {
    if (!activeEmergency) return;
    setBusy("report");
    setNotice("");
    try {
      const response = await fetch(
        `/api/radiation/emergencies/${encodeURIComponent(activeEmergency.eventId)}/report?scenarioId=${encodeURIComponent(mission.id)}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Report generation failed."));
      const blob = new Blob([JSON.stringify(data.report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `radiation-incident-${activeEmergency.eventId}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice(`Incident report exported for ${activeEmergency.eventId}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Report export failed.");
    } finally {
      setBusy(null);
    }
  };

  const resolveEmergency = async () => {
    if (!activeEmergency) return;
    setBusy("resolve");
    setNotice("");
    try {
      const response = await fetch("/api/radiation/emergencies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: mission.id,
          actorId: activeCharacter.id,
          eventId: activeEmergency.eventId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Unable to resolve emergency."));
      await syncAll();
      setNotice(`Marked ${activeEmergency.eventId} resolved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to resolve emergency.");
    } finally {
      setBusy(null);
    }
  };

  const loadDonki = async () => {
    setBusy("donki");
    setNotice("");
    const end = new Date();
    const start = new Date(end.getTime() - donkiDays * 86_400_000);
    const format = (date: Date) => date.toISOString().slice(0, 10);
    const startDate = format(start);
    const endDate = format(end);
    try {
      const response = await fetch(
        `/api/radiation/donki?eventType=${donkiType}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "NASA DONKI request failed."));
      const events = Array.isArray(data.events) ? data.events : [];
      setDonkiEvents(events);
      setDonkiQueryMeta({ type: donkiType, start: startDate, end: endDate });
      setNotice(
        `NASA DONKI ${donkiType} (${startDate} .. ${endDate}): ${events.length} event(s) loaded as space-weather context.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "NASA DONKI request failed.";
      setDonkiEvents([]);
      setDonkiQueryMeta({ type: donkiType, start: startDate, end: endDate, error: message });
      setNotice(message);
    } finally {
      setBusy(null);
    }
  };

  const runWhatIf = async () => {
    if (!activeDosimeterSource) {
      setNotice("Compatible dosimeter rate and cumulative dose are required for What-If modeling.");
      return;
    }
    const multiplier = Number(customMultiplier);
    const hours = Number(customHours);
    if (!Number.isFinite(multiplier) || multiplier < 0 || !Number.isFinite(hours) || hours < 0) {
      setNotice("Enter valid non-negative multiplier and remaining hours.");
      return;
    }

    setBusy("what-if");
    setNotice("");
    try {
      const response = await fetch("/api/radiation/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDoseValue: activeDosimeterSource.dose.value,
          currentDoseUnit: activeDosimeterSource.dose.unit,
          baselineRateValue: activeDosimeterSource.rate.value,
          baselineRateUnit: activeDosimeterSource.rate.unit,
          remainingHours: hours,
          uncertaintyPercent: activeDosimeterSource.uncertaintyPercent,
          choices: [
            { label: "Baseline trajectory (1.0x)", rateMultiplier: 1.0 },
            { label: "Shelter / attitude attenuation (0.5x modeled)", rateMultiplier: 0.5 },
            { label: "Higher-exposure task (1.8x modeled)", rateMultiplier: 1.8 },
            { label: `Custom scenario (${multiplier}x)`, rateMultiplier: multiplier },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "What-If calculation failed."));
      setWhatIfResults(Array.isArray(data.results) ? data.results : []);
      setWhatIfLimitation(typeof data.limitation === "string" ? data.limitation : "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "What-If calculation failed.");
    } finally {
      setBusy(null);
    }
  };

  const ownDosimeterRow = crewDoseRows.find((row) => row.id === activeCharacter.id);
  const selfSheltered = Boolean(activeEmergency?.shelterCheckIns?.[activeCharacter.id]);

  return (
    <section className="space-y-4 text-slate-900">
      {notice && (
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* Status Summary & Immediate / Prolonged Horizons */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Radiation Decision Summary</h2>
            <p className="mt-1 text-xs text-slate-500">
              {hazardRecords.length} personal snapshot(s) · {hazardSamples.length} sample(s) ·{" "}
              {currentPolicy
                ? String(currentPolicy.payload?.policyLabel ?? "Mission policy configured")
                : "No mission policy configured"}
            </p>
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(snapshot.status)}`}
          >
            {snapshot.status}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Immediate Horizon
            </p>
            <p className="mt-1.5 text-sm text-slate-800">{snapshot.immediateHorizon}</p>
            <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              {snapshot.eta}
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
              {snapshot.solutions.map((solution, index) => (
                <li key={solution} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="mr-1.5 font-semibold text-slate-900">{index + 1}.</span>
                  {solution}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Prolonged Forecast
            </p>
            <p className="mt-1.5 text-sm text-slate-800">{snapshot.prolongedHorizon}</p>
            <p className="mt-3 text-xs text-slate-500">
              Gy and Sv families remain strictly separated. Forecasts reflect configured model inputs,
              not medical diagnoses or lifetime cancer probabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency State & Crew/Personal Dosimetry */}
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldAlert className="h-4 w-4 text-slate-600" />
              Active Radiation Event &amp; Shelter Workflow
            </h3>
            {activeEmergency && (
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  activeEmergency.severity === "CRITICAL"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {activeEmergency.severity}
              </span>
            )}
          </div>

          {!activeEmergency ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
              No active durable radiation emergency in Supabase.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{activeEmergency.title}</p>
                <p className="mt-1 text-xs text-slate-600">{activeEmergency.reason}</p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Event {activeEmergency.eventId} ·{" "}
                  {activeEmergency.simulation ? "Simulated fixture" : "Operational record"} · State:{" "}
                  {activeEmergency.state}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={acknowledge}
                  disabled={
                    busy === "ack" || Boolean(activeEmergency.acknowledgements[activeCharacter.id])
                  }
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {activeEmergency.acknowledgements[activeCharacter.id]
                    ? "Acknowledged"
                    : busy === "ack"
                    ? "Saving..."
                    : "Acknowledge"}
                </button>
                <button
                  type="button"
                  onClick={shelterCheckIn}
                  disabled={busy === "shelter" || selfSheltered}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {selfSheltered
                    ? "Shelter Confirmed"
                    : busy === "shelter"
                    ? "Saving..."
                    : "Confirm Shelter"}
                </button>
                <button
                  type="button"
                  onClick={exportIncidentReport}
                  disabled={busy === "report"}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {busy === "report" ? "Exporting..." : "Export Report"}
                </button>
                {role === "lead" && (
                  <button
                    type="button"
                    onClick={resolveEmergency}
                    disabled={busy === "resolve"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy === "resolve" ? "Resolving..." : "Resolve"}
                  </button>
                )}
              </div>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4 text-slate-600" />
              {role === "lead" ? "Crew Exposure Summary (Operational)" : "Personal Dosimeter Summary"}
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {role === "lead" ? `${personalRecords.length} record(s)` : activeCharacter.callsign}
            </span>
          </div>

          {role === "lead" ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Crew</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Rate</th>
                    <th className="py-2 pr-3 font-medium">Cumulative</th>
                    <th className="py-2 pr-3 font-medium">Quality / Source</th>
                    <th className="py-2 font-medium">Shelter</th>
                  </tr>
                </thead>
                <tbody>
                  {crewDoseRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2 pr-3 font-medium text-slate-900">{row.callsign}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{row.rateLabel}</td>
                      <td className="py-2 pr-3">{row.doseLabel}</td>
                      <td className="py-2 pr-3 text-[11px] text-slate-500">
                        {row.quality} · {row.provenance}
                      </td>
                      <td className="py-2">
                        {activeEmergency ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                              row.sheltered
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {row.sheltered ? "Confirmed" : "Pending"}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Latest Rate</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {ownDosimeterRow?.rateLabel ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Cumulative Dose</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {ownDosimeterRow?.doseLabel ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Quality &amp; Provenance</p>
                <p className="mt-1 font-medium text-slate-800">
                  {ownDosimeterRow?.quality ?? "—"} · {ownDosimeterRow?.provenance ?? "missing"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">Instrument / Shelter</p>
                <p className="mt-1 font-medium text-slate-800">
                  {ownDosimeterRow?.instrument || "Dosimeter"} ·{" "}
                  {activeEmergency ? (selfSheltered ? "Sheltered" : "Pending") : "Nominal"}
                </p>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Telemetry Charts */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayedCharts.length > 0 ? (
          displayedCharts.map((chart) => <HazardTelemetryChart key={chart.id} chart={chart} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-xs text-slate-500">
            No numeric radiation samples synced yet. Telemetry charts render once dosimeter or
            compartment samples are stored.
          </div>
        )}
      </section>

      {/* Compartment Sensors */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-slate-600" />
            Compartment Sensors &amp; Shelter Route Context
          </h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {compartmentRows.length} reading(s)
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {compartmentRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 sm:col-span-2 lg:col-span-3">
              No compartment telemetry available.
            </p>
          ) : (
            compartmentRows.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Detector: {item.status} · {item.provenance}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{item.rateLabel}</p>
                  {item.isLowestRate && (
                    <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                      Lowest rate
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* What-If Simulator */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-slate-600" />
              What-If Decision Comparison
            </h3>
            <button
              type="button"
              onClick={runWhatIf}
              disabled={busy === "what-if" || !activeDosimeterSource}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "what-if" ? "Calculating..." : "Compare Options"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-slate-600">
              Custom multiplier:
              <input
                type="number"
                min="0"
                step="0.1"
                value={customMultiplier}
                onChange={(event) => setCustomMultiplier(event.target.value)}
                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-slate-900"
              />
            </label>
            <label className="flex items-center gap-1.5 text-slate-600">
              Horizon (h):
              <input
                type="number"
                min="0"
                step="1"
                value={customHours}
                onChange={(event) => setCustomHours(event.target.value)}
                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-slate-900"
              />
            </label>
          </div>

          {whatIfResults.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
              {activeDosimeterSource
                ? "Run comparison to evaluate baseline vs storm shelter vs higher-exposure multipliers."
                : "Requires an active compatible dosimeter reading before running What-If comparisons."}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {whatIfResults.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <span className="text-slate-700">
                    {item.forecast?.supported
                      ? `${formatNum(item.forecast.projectedValue)} ${item.forecast.unit ?? ""}${
                          item.forecast.lowerValue !== null && item.forecast.upperValue !== null
                            ? ` (${formatNum(item.forecast.lowerValue)}–${formatNum(item.forecast.upperValue)})`
                            : ""
                        }`
                      : item.explanation ?? item.forecast?.reason ?? "Unavailable"}
                  </span>
                </div>
              ))}
              {whatIfLimitation && <p className="text-[11px] text-slate-500">{whatIfLimitation}</p>}
            </div>
          )}
        </article>

        {/* NASA DONKI Context */}
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CloudSun className="h-4 w-4 text-slate-600" />
              NASA DONKI Space Weather Context
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={donkiType}
                onChange={(event) => setDonkiType(event.target.value as DonkiEventType)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value="RBE">RBE</option>
                <option value="SEP">SEP</option>
                <option value="FLR">FLR</option>
              </select>
              <select
                value={donkiDays}
                onChange={(event) => setDonkiDays(Number(event.target.value) === 7 ? 7 : 30)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
              </select>
              <button
                type="button"
                onClick={loadDonki}
                disabled={busy === "donki"}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy === "donki" ? "Loading..." : `Load ${donkiDays} Days`}
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            External heliophysics events only; never converted directly into spacecraft or crew dose.
          </p>

          {syncedSpaceWeather && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="font-medium text-slate-900">Mission DB stream: </span>
              <span className="text-slate-700">{syncedSpaceWeather.rawValue}</span>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {donkiQueryMeta?.error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {donkiQueryMeta.error}
              </p>
            ) : donkiEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                {donkiQueryMeta
                  ? `NASA DONKI returned 0 ${donkiQueryMeta.type} events for ${donkiQueryMeta.start} .. ${donkiQueryMeta.end} (quiet solar activity — try RBE or 30 days).`
                  : "Click Load to query live NASA DONKI events."}
              </p>
            ) : (
              donkiEvents.slice(0, 5).map((event) => (
                <div
                  key={event.eventId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
                        {event.eventType}
                      </span>
                      <span className="font-medium text-slate-900">{event.eventId}</span>
                    </div>
                    {event.startTime && (
                      <span className="text-[11px] text-slate-500">
                        {event.startTime.slice(0, 16).replace("T", " ")} UTC
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-slate-600">{event.summary}</p>
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-medium text-slate-700 underline hover:text-slate-900"
                      >
                        NASA Report ↗
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {researchRecords.length > 0 && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Beaker className="h-4 w-4 text-slate-600" />
            Experimental Research / BioShield Lab
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Experimental records only — not certified operational shielding.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {researchRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-900">
                  {String(record.payload.materialOrSpecimen ?? record.rawValue)}
                </p>
                <p className="mt-1 text-slate-600">
                  Experiment {String(record.payload.experimentId ?? record.id)} ·{" "}
                  {String(record.payload.resultValue ?? "—")}{" "}
                  {String(record.payload.resultUnit ?? "")}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}

      {role === "lead" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Reproducible Simulation Fixtures (Lead Only)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Writes clearly labeled simulated records and audit events to Supabase for end-to-end
            verification.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    {scenario.id}. {scenario.title}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-600">{scenario.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runScenario(scenario.id)}
                  disabled={busy === `scenario-${scenario.id}`}
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy === `scenario-${scenario.id}` ? "Running..." : "Run Simulation"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">Scientific Boundaries &amp; Reference Anchors</p>
        <p className="mt-1">
          Sv-family (equivalent/effective) and Gy-family (absorbed) quantities are never combined.
          DONKI space-weather events remain separate from onboard crew dosimetry.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {hazard.nasaReferences.map((ref) => (
            <li key={ref} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
              {ref}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
