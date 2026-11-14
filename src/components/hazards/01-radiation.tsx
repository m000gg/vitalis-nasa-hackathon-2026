"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Beaker,
  CheckCircle2,
  CloudSun,
  Database,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import type { HazardScreenProps } from "./types";

type ScenarioItem = {
  id: string;
  title: string;
  status: "implemented" | "contract_only" | "experimental" | "unsupported_model";
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
};

type DonkiItem = {
  eventId: string;
  eventType: string;
  startTime: string | null;
  summary: string;
};

const arcade = { fontFamily: "VT323, 'Courier New', monospace" } as const;
const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" } as const;

function responseError(payload: unknown, fallback: string): string {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function statusClass(status: string) {
  if (status === "CRITICAL") return "border-[#DC2626] bg-red-50 text-red-900";
  if (status === "ELEVATED") return "border-[#D97706] bg-amber-50 text-amber-900";
  return "border-[#16A34A] bg-emerald-50 text-emerald-900";
}

function scenarioClass(status: ScenarioItem["status"]) {
  if (status === "implemented") return "bg-emerald-100 text-emerald-900";
  if (status === "experimental") return "bg-violet-100 text-violet-900";
  if (status === "unsupported_model") return "bg-red-100 text-red-900";
  return "bg-slate-200 text-slate-700";
}

export function RadiationHazardScreen({
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  scenarioHazardRecords,
  linkOnline,
}: HazardScreenProps) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [donkiEvents, setDonkiEvents] = useState<DonkiItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const refreshEmergencies = useCallback(async () => {
    const response = await fetch(`/api/radiation/emergencies?scenarioId=${encodeURIComponent(mission.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(responseError(data, "Unable to sync radiation emergencies."));
    setEmergencies(Array.isArray(data.emergencies) ? data.emergencies : []);
  }, [mission.id]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/radiation/scenarios")
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(responseError(data, "Unable to load scenarios."));
          setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
        }),
      refreshEmergencies(),
    ]).catch((error) => setNotice(error instanceof Error ? error.message : "Radiation module sync failed."));
  }, [refreshEmergencies]);

  const activeEmergency = emergencies.find((item) => item.state !== "RESOLVED") ?? null;
  const radiationRecords = scenarioHazardRecords.filter((record) => record.hazardSlug === "radiation");
  const personalRecords = radiationRecords.filter((record) => record.streamName === "Personal Dosimeter");
  const compartments = radiationRecords.filter((record) => record.streamName === "Compartment Sensors");
  const currentPolicy = radiationRecords.find((record) => record.streamName === "Radiation Mission Policy");
  const displayedCharts = snapshot.charts ?? [];

  const crewDoseRows = useMemo(
    () =>
      mission.crew.map((crew) => {
        const record = personalRecords.find((item) => item.characterId === crew.id);
        const payload = record?.payload ?? {};
        return {
          id: crew.id,
          callsign: crew.callsign,
          sheltered: crew.shelterConfirmed,
          dose: typeof payload.cumulativeDoseValue === "number" ? payload.cumulativeDoseValue : null,
          unit: typeof payload.cumulativeDoseUnit === "string" ? payload.cumulativeDoseUnit : "",
          provenance: typeof payload.provenanceKind === "string" ? payload.provenanceKind : "missing",
        };
      }),
    [mission.crew, personalRecords]
  );

  const runScenario = async (scenarioId: string) => {
    setBusy(`scenario-${scenarioId}`);
    setNotice("");
    try {
      const response = await fetch("/api/radiation/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: mission.id, radiationScenarioId: scenarioId, actorId: activeCharacter.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Scenario runner failed."));
      await refreshEmergencies();
      setNotice(`${data.scenario?.title ?? "Scenario"} was saved as reproducible simulated telemetry. Use Sync DB to refresh shared telemetry.`);
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
      const response = await fetch(`/api/radiation/emergencies/${encodeURIComponent(activeEmergency.eventId)}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: mission.id, actorId: activeCharacter.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Acknowledgement failed."));
      await refreshEmergencies();
      setNotice("Acknowledgement persisted to Supabase audit telemetry.");
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
      const response = await fetch(`/api/radiation/emergencies/${encodeURIComponent(activeEmergency.eventId)}/shelter-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: mission.id, characterId: activeCharacter.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Shelter check-in failed."));
      setNotice("Shelter check-in was persisted. Use Sync DB to refresh shared crew state.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Shelter check-in failed.");
    } finally {
      setBusy(null);
    }
  };

  const loadDonki = async () => {
    setBusy("donki");
    setNotice("");
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86_400_000);
    try {
      const format = (date: Date) => date.toISOString().slice(0, 10);
      const response = await fetch(`/api/radiation/donki?eventType=SEP&startDate=${format(start)}&endDate=${format(end)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "NASA DONKI request failed."));
      setDonkiEvents(Array.isArray(data.events) ? data.events : []);
      setNotice("NASA DONKI SEP events loaded as space-weather context; they are not crew dose readings.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "NASA DONKI request failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-5 text-slate-900" style={arcade}>
      <div className="border-2 border-[#4502FF] bg-white p-5 shadow-[6px_6px_0_#FFDA14]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#4502FF]" style={mono}>VITALIS+ / HAZARD 01</p>
            <h2 className="mt-1 text-3xl leading-none">RADIATION CONTROL DECK</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-700">DB-synced radiation decision support. Dose units, data provenance and space-weather context remain visibly separate.</p>
          </div>
          <div className={`border-2 px-3 py-2 text-center ${statusClass(snapshot.status)}`}>
            <p className="text-[10px] tracking-widest" style={mono}>CURRENT STATUS</p>
            <p className="text-xl font-bold">{snapshot.status}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-3" style={mono}>
          <p className="border border-slate-300 bg-slate-50 p-2 text-[11px]"><Database className="mr-1 inline h-3.5 w-3.5" />{hazardRecords.length} personal snapshot(s) / {hazardSamples.length} sample(s)</p>
          <p className="border border-slate-300 bg-slate-50 p-2 text-[11px]"><Radio className="mr-1 inline h-3.5 w-3.5" />{linkOnline ? "EARTH LINK ONLINE" : "OFFLINE-FIRST MODE"}</p>
          <p className="border border-slate-300 bg-slate-50 p-2 text-[11px]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />{currentPolicy ? "MISSION POLICY PRESENT" : "NO MISSION POLICY"}</p>
        </div>
      </div>

      {notice && <div className="border-2 border-[#4502FF] bg-[#F4F0FF] p-3 text-sm" role="status">{notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="border-2 border-slate-900 bg-white p-5">
          <p className="text-xs font-bold tracking-[0.18em] text-[#4502FF]" style={mono}>IMMEDIATE HORIZON</p>
          <p className="mt-2 text-base leading-relaxed">{snapshot.immediateHorizon}</p>
          <p className="mt-4 border-l-4 border-[#FFDA14] bg-yellow-50 p-3 text-sm">{snapshot.eta}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {snapshot.solutions.map((solution, index) => <p key={solution} className="border border-slate-300 p-3 text-sm"><strong className="mr-2 text-[#4502FF]">0{index + 1}</strong>{solution}</p>)}
          </div>
        </article>
        <article className="border-2 border-slate-900 bg-[#111827] p-5 text-white">
          <p className="text-xs font-bold tracking-[0.18em] text-[#FFDA14]" style={mono}>PROLONGED HORIZON</p>
          <p className="mt-2 text-base leading-relaxed text-slate-100">{snapshot.prolongedHorizon}</p>
          <p className="mt-4 border border-slate-600 p-3 text-xs text-slate-300" style={mono}>Gy and Sv never mix. Forecasts are explicit constant-rate models, not clinical risk predictions.</p>
        </article>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayedCharts.length > 0 ? displayedCharts.map((chart) => <HazardTelemetryChart key={chart.id} chart={chart} />) : <div className="border-2 border-dashed border-slate-400 bg-white p-5 text-sm">No numeric radiation samples yet. Ingest device/API telemetry to render dose-rate and cumulative charts.</div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="border-2 border-slate-900 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl"><Users className="mr-2 inline h-5 w-5 text-[#4502FF]" />CREW EXPOSURE MATRIX</h3><span className="border border-slate-300 px-2 py-1 text-xs" style={mono}>{personalRecords.length} records</span></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead style={mono}><tr className="border-b-2 border-slate-900 text-xs"><th className="p-2">CREW</th><th className="p-2">CUMULATIVE</th><th className="p-2">PROVENANCE</th><th className="p-2">SHELTER</th></tr></thead><tbody>{crewDoseRows.map((row) => <tr key={row.id} className="border-b border-slate-200"><td className="p-2 font-bold">{row.callsign}</td><td className="p-2">{row.dose === null ? "—" : `${row.dose} ${row.unit}`}</td><td className="p-2"><span className="border border-slate-300 px-1.5 py-0.5 text-xs" style={mono}>{row.provenance.toUpperCase()}</span></td><td className="p-2">{row.sheltered ? <span className="text-emerald-700">CONFIRMED</span> : <span className="text-amber-700">PENDING</span>}</td></tr>)}</tbody></table></div>
        </article>
        <article className="border-2 border-slate-900 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl"><Activity className="mr-2 inline h-5 w-5 text-[#4502FF]" />COMPARTMENT SENSORS</h3><span className="border border-slate-300 px-2 py-1 text-xs" style={mono}>{compartments.length} latest records</span></div>
          <div className="mt-4 space-y-2">{compartments.length === 0 ? <p className="border border-dashed border-slate-300 p-3 text-sm text-slate-600">No compartment telemetry has arrived from Supabase.</p> : compartments.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-300 p-3 text-sm"><span className="font-bold">{String(record.payload.compartmentId ?? record.payload.compartment ?? "Unnamed compartment")}</span><span style={mono}>{String(record.payload.doseRateValue ?? "—")} {String(record.payload.doseRateUnit ?? "")}</span><span className="text-xs text-slate-600">{String(record.payload.detectorStatus ?? "quality unknown")}</span></div>)}</div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="border-2 border-[#4502FF] bg-white p-5 shadow-[5px_5px_0_#4502FF]">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl"><CloudSun className="mr-2 inline h-5 w-5 text-[#4502FF]" />NASA DONKI CONTEXT</h3><button type="button" onClick={loadDonki} disabled={busy === "donki"} className="border-2 border-[#4502FF] bg-[#4502FF] px-3 py-1.5 text-xs font-bold text-white enabled:hover:translate-x-px enabled:hover:translate-y-px disabled:opacity-50">{busy === "donki" ? "LOADING…" : "LOAD SEP / 7 DAYS"}</button></div>
          <p className="mt-2 text-sm text-slate-700">Historical NASA space-weather events help explain context. They never become crew dose readings automatically.</p>
          <div className="mt-4 space-y-2">{donkiEvents.length === 0 ? <p className="border border-dashed border-slate-300 p-3 text-sm text-slate-600">No DONKI events loaded in this browser session.</p> : donkiEvents.slice(0, 5).map((event) => <div key={event.eventId} className="border border-slate-300 p-3 text-sm"><span className="mr-2 border border-[#FFDA14] bg-yellow-50 px-1.5 text-xs" style={mono}>{event.eventType}</span><strong>{event.eventId}</strong><p className="mt-1 text-slate-600">{event.summary}</p></div>)}</div>
        </article>

        <article className="border-2 border-slate-900 bg-white p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl"><ShieldAlert className="mr-2 inline h-5 w-5 text-red-600" />EMERGENCY STATE</h3>{activeEmergency && <span className={`border-2 px-2 py-1 text-xs font-bold ${activeEmergency.severity === "CRITICAL" ? "border-red-600 bg-red-50 text-red-800" : "border-amber-500 bg-amber-50 text-amber-800"}`}>{activeEmergency.severity}</span>}</div>
          {!activeEmergency ? <p className="mt-4 border border-dashed border-slate-300 p-3 text-sm text-slate-600">No active durable radiation emergency in Supabase.</p> : <div className="mt-4 space-y-3"><p className="font-bold">{activeEmergency.title}</p><p className="text-sm text-slate-700">{activeEmergency.reason}</p><p className="text-xs" style={mono}>EVENT {activeEmergency.eventId} · {activeEmergency.simulation ? "SIMULATED" : "OPERATIONAL RECORD"}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={acknowledge} disabled={busy === "ack" || Boolean(activeEmergency.acknowledgements[activeCharacter.id])} className="border-2 border-[#16A34A] bg-[#16A34A] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{activeEmergency.acknowledgements[activeCharacter.id] ? "ACKNOWLEDGED" : busy === "ack" ? "SAVING…" : "ACKNOWLEDGE"}</button><button type="button" onClick={shelterCheckIn} disabled={busy === "shelter" || activeCharacter.shelterConfirmed} className="border-2 border-[#4502FF] bg-white px-3 py-2 text-xs font-bold text-[#4502FF] disabled:opacity-50">{activeCharacter.shelterConfirmed ? "SHELTERED" : busy === "shelter" ? "SAVING…" : "CONFIRM SHELTER"}</button></div></div>}
        </article>
      </section>

      {role === "lead" && <section className="border-2 border-slate-900 bg-[#FFDA14] p-5"><div className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /><h3 className="text-xl">REPRODUCIBLE SCENARIO CONSOLE</h3></div><p className="mt-1 text-sm">These buttons write clearly marked simulation telemetry to the existing Supabase tables. They are not fake frontend alarms.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{scenarios.filter((scenario) => ["A", "B", "C", "D"].includes(scenario.id)).map((scenario) => <div key={scenario.id} className="border-2 border-slate-900 bg-white p-3"><p className="font-bold">{scenario.id}. {scenario.title}</p><p className="mt-1 min-h-12 text-xs text-slate-700">{scenario.description}</p><button type="button" onClick={() => runScenario(scenario.id)} disabled={busy === `scenario-${scenario.id}`} className="mt-3 w-full border-2 border-slate-900 bg-[#4502FF] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === `scenario-${scenario.id}` ? "WRITING…" : "RUN SIMULATION"}</button></div>)}</div></section>}

      <section className="border-2 border-slate-900 bg-white p-5"><div className="flex items-center gap-2"><Beaker className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl">RESEARCH / MODEL STATUS</h3></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{scenarios.map((scenario) => <div key={scenario.id} className="border border-slate-300 p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong>{scenario.id}. {scenario.title}</strong><span className={`px-1.5 py-0.5 text-[10px] font-bold ${scenarioClass(scenario.status)}`} style={mono}>{scenario.status.toUpperCase()}</span></div><p className="mt-1 text-xs text-slate-600">{scenario.description}</p></div>)}</div><p className="mt-4 text-xs text-slate-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[#16A34A]" />Experimental models are stored and displayed honestly; unsupported scientific algorithms are never fabricated.</p></section>
    </section>
  );
}
