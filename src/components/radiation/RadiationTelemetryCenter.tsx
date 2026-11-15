"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CloudSun,
  Gauge,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Satellite,
  ShieldAlert,
  Users,
  WifiOff,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { CrewSlot } from "@/lib/domain";
import type { HazardDataRecord, HazardSampleRecord } from "@/lib/hazards";
import { generateSpacecraft } from "@/lib/spacecraft/generation";
import {
  acknowledgeTelemetryAlert,
  advanceDemoTelemetry,
  classifyDoseRate,
  computeImmediateForecast,
  computeProlongedForecast,
  createDemoTelemetryState,
  setDemoProfile,
  setSensorOnline,
  telemetryTimestamp,
  validateTelemetryThresholds,
  type DemoRadiationProfile,
  type RadiationTelemetryState,
  type TelemetryPoint,
  type TelemetrySeverity,
  type TelemetryThresholds,
} from "@/lib/radiation/telemetry-engine";

type TelemetrySection = "MONITOR" | "FORECAST" | "SPACE WEATHER" | "ALERTS";

type DonkiDisplayEvent = {
  eventId: string;
  eventType: "FLR" | "SEP" | "CME" | string;
  startTime: string | null;
  summary: string;
  sourceUrl: string;
  demo: boolean;
};

type DurableEmergency = {
  eventId: string;
  state: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  title: string;
  severity: "WARNING" | "CRITICAL";
  reason: string;
  simulation: boolean;
  acknowledgements: Record<string, string>;
};

type Props = {
  missionId: string;
  crew: readonly CrewSlot[];
  liveRecords: readonly HazardDataRecord[];
  liveSamples: readonly HazardSampleRecord[];
  standaloneDemo: boolean;
  activeCharacterId: string;
  durableEmergency: DurableEmergency | null;
  durableBusy: string | null;
  onAcknowledgeDurable: () => void;
  onShelterCheckIn: () => void;
  shelterConfirmed: boolean;
};

const mono = { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace" } as const;
const defaultThresholds: TelemetryThresholds = { warningMsvPerHour: 0.5, criticalMsvPerHour: 1.5 };

function severityStyle(status: TelemetrySeverity): string {
  if (status === "CRITICAL") return "border-red-600 bg-red-50 text-red-800";
  if (status === "WARNING") return "border-amber-500 bg-amber-50 text-amber-800";
  if (status === "OFFLINE") return "border-slate-500 bg-slate-100 text-slate-700";
  return "border-emerald-600 bg-emerald-50 text-emerald-800";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatDose(value: number, places = 3): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places });
}

function Sparkline({ points, color = "#4502FF", label }: { points: readonly TelemetryPoint[]; color?: string; label: string }) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0.000001);
  const span = Math.max(max - min, 0.000001);
  const polyline = points.map((point, index) => {
    const x = points.length <= 1 ? 0 : index / (points.length - 1) * 100;
    const y = 42 - (point.value - min) / span * 36;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 46" className="h-28 w-full" role="img" aria-label={label} preserveAspectRatio="none">
      <title>{label}</title>
      <line x1="0" y1="42" x2="100" y2="42" stroke="#CBD5E1" strokeWidth="0.5" />
      <line x1="0" y1="24" x2="100" y2="24" stroke="#E2E8F0" strokeWidth="0.35" strokeDasharray="2 2" />
      <polyline points={polyline || "0,42"} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      {points.length > 0 && <circle cx="100" cy={polyline.split(" ").at(-1)?.split(",")[1] ?? 42} r="1.7" fill={color} />}
    </svg>
  );
}

function Metric({ label, value, unit, help }: { label: string; value: string; unit?: string; help: string }) {
  return <div className="border border-slate-300 bg-white p-3">
    <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500" style={mono}>{label}<InfoTooltip label={`Explain ${label}`}>{help}</InfoTooltip></div>
    <p className="mt-1 text-2xl font-bold text-slate-950" style={mono}>{value} {unit && <span className="text-xs text-slate-500">{unit}</span>}</p>
  </div>;
}

function demoDonkiEvents(): DonkiDisplayEvent[] {
  return [
    { eventId: "DEMO-FLR-001", eventType: "FLR", startTime: "2026-11-15T00:12:00Z", summary: "Synthetic M-class solar flare context fixture.", sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/", demo: true },
    { eventId: "DEMO-SEP-001", eventType: "SEP", startTime: "2026-11-15T01:40:00Z", summary: "Synthetic solar energetic particle event fixture.", sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/", demo: true },
    { eventId: "DEMO-CME-001", eventType: "CME", startTime: "2026-11-15T03:05:00Z", summary: "Synthetic coronal mass ejection context fixture.", sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/", demo: true },
  ];
}

function buildLiveState(
  missionId: string,
  crew: readonly CrewSlot[],
  records: readonly HazardDataRecord[],
  samples: readonly HazardSampleRecord[],
  thresholds: TelemetryThresholds,
): RadiationTelemetryState | null {
  const radiationRecords = records.filter((record) => record.hazardSlug === "radiation");
  const compartmentRecords = radiationRecords.filter((record) => record.streamName === "Compartment Sensors");
  const personalRecords = radiationRecords.filter((record) => record.streamName === "Personal Dosimeter");
  if (compartmentRecords.length === 0 && personalRecords.length === 0) return null;
  const sensors = compartmentRecords.map((record, index) => {
    const value = numberValue(record.payload.doseRateValue) ?? numberValue(record.payload.doseRateMsvPerHour);
    const sensorSamples = samples.filter((sample) => sample.streamName === "Compartment Sensors" && sample.characterId === record.characterId && sample.numericValue !== null);
    return {
      id: textValue(record.payload.sensorId, record.id),
      compartmentId: textValue(record.payload.compartmentId, `live-${index + 1}`),
      compartmentName: textValue(record.payload.compartment, textValue(record.payload.compartmentId, `Compartment ${index + 1}`)),
      compartmentType: textValue(record.payload.compartmentType, "LIVE_COMPARTMENT"),
      doseRateMsvPerHour: value,
      status: value === null ? "OFFLINE" as const : classifyDoseRate(value, thresholds),
      online: value !== null,
      history: sensorSamples.map((sample, sampleIndex) => ({ simulationSecond: sampleIndex * 2, value: sample.numericValue as number })).slice(-120),
    };
  });
  const crewTelemetry = crew.map((member, index) => {
    const record = personalRecords.find((item) => item.characterId === member.id);
    const rate = numberValue(record?.payload.currentDoseRateValue) ?? numberValue(record?.payload.doseRateValue) ?? 0;
    const cumulative = numberValue(record?.payload.cumulativeDoseValue) ?? 0;
    const history = samples.filter((sample) => sample.streamName === "Personal Dosimeter" && sample.characterId === member.id && sample.numericValue !== null)
      .map((sample, sampleIndex) => ({ simulationSecond: sampleIndex * 2, value: sample.numericValue as number })).slice(-120);
    return { id: member.id, callsign: member.callsign, compartmentId: sensors[index % Math.max(1, sensors.length)]?.compartmentId ?? "unassigned", currentDoseRateMsvPerHour: rate, cumulativeDoseMsv: cumulative, status: classifyDoseRate(rate, thresholds), history: history.length ? history : [{ simulationSecond: 0, value: cumulative }] };
  });
  const rate = Math.max(0, ...sensors.map((sensor) => sensor.doseRateMsvPerHour ?? 0), ...crewTelemetry.map((member) => member.currentDoseRateMsvPerHour));
  return { seed: `live-${missionId}`, profile: "QUIET", simulationSecond: Math.max(0, samples.length * 2), overallStatus: classifyDoseRate(rate, thresholds), ambientDoseRateMsvPerHour: rate, sensors, crew: crewTelemetry, alerts: [] };
}

export function RadiationTelemetryCenter(props: Props) {
  const blueprint = useMemo(() => generateSpacecraft({ shapeFamily: "LINEAR", compartmentCount: 10 }, `telemetry-${props.missionId}`), [props.missionId]);
  const compartments = useMemo(() => blueprint.compartments.filter((compartment) => compartment.type !== "CORRIDOR"), [blueprint]);
  const [mode, setMode] = useState<"DEMO" | "LIVE">(props.standaloneDemo ? "DEMO" : "LIVE");
  const [section, setSection] = useState<TelemetrySection>("MONITOR");
  const [running, setRunning] = useState(true);
  const [seed, setSeed] = useState("VITALIS-126");
  const [thresholds, setThresholds] = useState<TelemetryThresholds>(defaultThresholds);
  const [state, setState] = useState(() => createDemoTelemetryState({ seed: "VITALIS-126", compartments, crew: props.crew, thresholds: defaultThresholds }));
  const [selectedCrewId, setSelectedCrewId] = useState(props.crew[0]?.id ?? "");
  const [selectedSensorId, setSelectedSensorId] = useState(state.sensors[0]?.id ?? "");
  const [donkiEvents, setDonkiEvents] = useState<DonkiDisplayEvent[]>(demoDonkiEvents());
  const [donkiBusy, setDonkiBusy] = useState(false);
  const [donkiError, setDonkiError] = useState("");
  const thresholdErrors = validateTelemetryThresholds(thresholds);
  const liveState = useMemo(() => buildLiveState(props.missionId, props.crew, props.liveRecords, props.liveSamples, thresholds), [props.missionId, props.crew, props.liveRecords, props.liveSamples, thresholds]);
  const displayedState = mode === "DEMO" ? state : liveState;

  useEffect(() => {
    if (mode !== "DEMO" || !running || thresholdErrors.length > 0) return;
    const timer = window.setInterval(() => setState((current) => advanceDemoTelemetry(current, 2, thresholds)), 2_000);
    return () => window.clearInterval(timer);
  }, [mode, running, thresholds, thresholdErrors.length]);

  const resetDemo = () => {
    const next = createDemoTelemetryState({ seed, compartments, crew: props.crew, thresholds });
    setState(next);
    setSelectedSensorId(next.sensors[0]?.id ?? "");
    setSelectedCrewId(next.crew[0]?.id ?? "");
    setRunning(true);
    setDonkiEvents(demoDonkiEvents());
  };

  const loadDonki = async () => {
    if (mode === "DEMO") {
      setDonkiEvents(demoDonkiEvents());
      setDonkiError("");
      return;
    }
    setDonkiBusy(true);
    setDonkiError("");
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86_400_000);
    const query = `startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`;
    try {
      const responses = await Promise.all(["FLR", "SEP", "CME"].map(async (eventType) => {
        const response = await fetch(`/api/radiation/donki?eventType=${eventType}&${query}`);
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `DONKI ${eventType} request failed.`);
        const sourceUrl = typeof data.sourceUrl === "string" ? data.sourceUrl : "https://kauai.ccmc.gsfc.nasa.gov/DONKI/";
        return (Array.isArray(data.events) ? data.events : []).map((event: Record<string, unknown>) => ({
          eventId: textValue(event.eventId, `${eventType}-unknown`), eventType: textValue(event.eventType, eventType), startTime: typeof event.startTime === "string" ? event.startTime : null,
          summary: textValue(event.summary, "NASA DONKI event"), sourceUrl, demo: false,
        }));
      }));
      setDonkiEvents(responses.flat().sort((a, b) => String(b.startTime).localeCompare(String(a.startTime))));
    } catch (error) {
      setDonkiEvents([]);
      setDonkiError(error instanceof Error ? error.message : "NASA DONKI request failed.");
    } finally {
      setDonkiBusy(false);
    }
  };

  if (!displayedState) {
    return <section className="border-2 border-slate-900 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#4502FF]" style={mono}>TELEMETRY / LIVE</p><h2 className="mt-1 text-2xl font-bold">No live radiation stream</h2></div><ModeSwitch mode={mode} setMode={setMode} /></div>
      <div className="mt-5 border-2 border-dashed border-slate-400 p-6 text-sm text-slate-600"><WifiOff className="mb-2 h-6 w-6" />Connect Supabase/device telemetry or switch to DEMO to use the autonomous synthetic stream.</div>
    </section>;
  }

  const selectedCrew = displayedState.crew.find((member) => member.id === selectedCrewId) ?? displayedState.crew[0];
  const selectedSensor = displayedState.sensors.find((sensor) => sensor.id === selectedSensorId) ?? displayedState.sensors[0];
  const immediate = computeImmediateForecast(displayedState);
  const prolonged = computeProlongedForecast(displayedState);
  const pendingAlerts = displayedState.alerts.filter((alert) => alert.severity !== "NORMAL" && alert.acknowledgedAtSecond === null).length;
  const latestAlert = displayedState.alerts[0] ?? null;

  return <section className="space-y-4" data-testid="radiation-telemetry-center">
    <header className="border-2 border-slate-900 bg-[#111827] p-4 text-white shadow-[5px_5px_0_#4502FF]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="border border-[#FFDA14] p-2 text-[#FFDA14]"><Radio className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h2 className="text-2xl font-bold">RADIATION TELEMETRY</h2><InfoTooltip label="Explain radiation telemetry">One coherent monitoring stream drives compartment readings, crew exposure, forecasts and alerts. DEMO data is synthetic and is never persisted as measured telemetry.</InfoTooltip></div><p className="mt-1 text-xs text-slate-300" style={mono}>{mode === "DEMO" ? "SYNTHETIC · AUTONOMOUS · NOT SAVED" : "LIVE · API / SUPABASE SOURCES"}</p></div></div>
        <div className="flex flex-wrap items-center gap-2"><ModeSwitch mode={mode} setMode={(next) => { setMode(next); setRunning(next === "DEMO"); }} />{mode === "DEMO" && <><button type="button" onClick={() => setRunning((current) => !current)} className="border-2 border-white px-3 py-2 text-xs font-bold hover:bg-white hover:text-slate-950">{running ? <Pause className="mr-1 inline h-4 w-4" /> : <Play className="mr-1 inline h-4 w-4" />}{running ? "PAUSE" : "RESUME"}</button><button type="button" onClick={resetDemo} className="border-2 border-[#FFDA14] bg-[#FFDA14] px-3 py-2 text-xs font-bold text-slate-950"><RotateCcw className="mr-1 inline h-4 w-4" />RESET</button></>}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="SYSTEM STATE" value={displayedState.overallStatus} help="Calculated from the highest available onboard dose-rate reading and the configurable demo thresholds." />
        <Metric label="AMBIENT RATE" value={formatDose(displayedState.ambientDoseRateMsvPerHour)} unit="mSv/h" help="Current modeled or measured dose rate used as the common input for forecasts. It is not absorbed dose in Gy." />
        <Metric label="SENSORS ONLINE" value={`${displayedState.sensors.filter((sensor) => sensor.online).length}/${displayedState.sensors.length}`} help="Compartment dosimeters currently supplying a usable mSv/h value." />
        <Metric label="UNACKNOWLEDGED" value={String(mode === "DEMO" ? pendingAlerts : props.durableEmergency ? 1 : 0)} help="Warning or critical events that still require acknowledgement." />
      </div>
    </header>

    <nav className="flex gap-2 overflow-x-auto border-b-2 border-slate-900 pb-2" aria-label="Telemetry sections">
      {(["MONITOR", "FORECAST", "SPACE WEATHER", "ALERTS"] as const).map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`whitespace-nowrap border-2 px-4 py-2 text-xs font-bold ${section === item ? "border-[#4502FF] bg-[#4502FF] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"}`} style={mono}>{item}</button>)}
    </nav>

    {mode === "DEMO" && <div className="flex flex-wrap items-center gap-2 border-2 border-[#4502FF] bg-violet-50 p-3">
      <span className="text-xs font-bold text-[#4502FF]" style={mono}>EVENT PROFILE</span>
      {(["QUIET", "ELEVATED", "CRITICAL"] as DemoRadiationProfile[]).map((profile) => <button key={profile} type="button" onClick={() => setState((current) => setDemoProfile(current, profile))} className={`border px-3 py-1.5 text-xs font-bold ${state.profile === profile ? "border-[#4502FF] bg-[#4502FF] text-white" : "border-slate-400 bg-white"}`}>{profile === "QUIET" ? "NORMAL" : profile}</button>)}
      <label className="ml-auto flex items-center gap-2 text-xs font-bold">SEED<input value={seed} onChange={(event) => setSeed(event.target.value)} className="w-36 border-2 border-slate-900 bg-white px-2 py-1 text-slate-950" style={mono} /></label>
      <InfoTooltip label="Explain demo controls">Select a radiation profile to drive every panel from the same deterministic stream. Change the seed, then Reset, to reproduce a different run.</InfoTooltip>
    </div>}

    {section === "MONITOR" && <div className="grid gap-4 xl:grid-cols-2">
      <article className="border-2 border-slate-900 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">CREW EXPOSURE</h3><InfoTooltip label="Explain crew exposure">Cumulative dose integrates the current mSv/h stream over elapsed simulation time. Threshold status uses current dose rate, not a medical diagnosis.</InfoTooltip></div><span className="text-xs text-slate-500" style={mono}>AUTO UPDATE</span></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b-2 border-slate-900 text-[10px]" style={mono}><th className="p-2">CREW</th><th className="p-2">RATE</th><th className="p-2">CUMULATIVE</th><th className="p-2">STATE</th></tr></thead><tbody>{displayedState.crew.map((member) => <tr key={member.id} onClick={() => setSelectedCrewId(member.id)} className={`cursor-pointer border-b border-slate-200 ${selectedCrew?.id === member.id ? "bg-violet-50" : "hover:bg-slate-50"}`}><td className="p-2 font-bold">{member.callsign}</td><td className="p-2" style={mono}>{formatDose(member.currentDoseRateMsvPerHour)} mSv/h</td><td className="p-2" style={mono}>{formatDose(member.cumulativeDoseMsv, 6)} mSv</td><td className="p-2"><span className={`border px-2 py-0.5 text-[10px] font-bold ${severityStyle(member.status)}`}>{member.status}</span></td></tr>)}</tbody></table></div>
        {selectedCrew && <div className="mt-3 border border-slate-300 p-3"><div className="flex items-center justify-between"><strong>{selectedCrew.callsign}</strong><span className="text-xs text-slate-500" style={mono}>CUMULATIVE mSv</span></div><Sparkline points={selectedCrew.history} label={`Cumulative exposure history for ${selectedCrew.callsign}`} /></div>}
      </article>

      <article className="border-2 border-slate-900 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">COMPARTMENT SENSORS</h3><InfoTooltip label="Explain compartment sensors">Dosimeters are attached to the existing generated spacecraft compartments. Offline sensors stop contributing new readings until restored.</InfoTooltip></div><span className="text-xs text-slate-500" style={mono}>{displayedState.sensors.length} NODES</span></div>
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{displayedState.sensors.map((sensor) => <button key={sensor.id} type="button" onClick={() => setSelectedSensorId(sensor.id)} className={`border-2 p-3 text-left ${selectedSensor?.id === sensor.id ? "border-[#4502FF] bg-violet-50" : "border-slate-300 bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold">{sensor.compartmentName}</span><span className={`border px-1 text-[9px] font-bold ${severityStyle(sensor.status)}`}>{sensor.status}</span></div><p className="mt-2 text-lg font-bold" style={mono}>{sensor.doseRateMsvPerHour === null ? "—" : formatDose(sensor.doseRateMsvPerHour)} <span className="text-[10px] text-slate-500">mSv/h</span></p></button>)}</div>
        {selectedSensor && <div className="mt-3 border border-slate-300 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{selectedSensor.compartmentName}</strong>{mode === "DEMO" && <button type="button" onClick={() => setState((current) => setSensorOnline(current, selectedSensor.id, !selectedSensor.online))} className={`border-2 px-3 py-1 text-xs font-bold ${selectedSensor.online ? "border-red-600 text-red-700" : "border-emerald-600 text-emerald-700"}`}>{selectedSensor.online ? "SIMULATE FAILURE" : "RESTORE SENSOR"}</button>}</div><Sparkline points={selectedSensor.history} color={selectedSensor.status === "CRITICAL" ? "#DC2626" : selectedSensor.status === "WARNING" ? "#D97706" : "#4502FF"} label={`Dose-rate history for ${selectedSensor.compartmentName}`} /></div>}
      </article>

      <article className="border-2 border-slate-900 bg-white p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">DEMO THRESHOLDS</h3><InfoTooltip label="Explain thresholds">Configurable demonstration thresholds used to classify current mSv/h values. They are not universal NASA safety limits.</InfoTooltip></div><span className="border border-[#4502FF] px-2 py-1 text-[10px] font-bold text-[#4502FF]" style={mono}>SIMULATION POLICY</span></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">WARNING · mSv/h<input type="number" min="0" step="0.05" value={thresholds.warningMsvPerHour} onChange={(event) => setThresholds((current) => ({ ...current, warningMsvPerHour: Number(event.target.value) }))} className="mt-1 block w-full border-2 border-slate-900 px-3 py-2" /></label><label className="text-xs font-bold">CRITICAL · mSv/h<input type="number" min="0.01" step="0.05" value={thresholds.criticalMsvPerHour} onChange={(event) => setThresholds((current) => ({ ...current, criticalMsvPerHour: Number(event.target.value) }))} className="mt-1 block w-full border-2 border-slate-900 px-3 py-2" /></label></div>
        {thresholdErrors.map((error) => <p key={error} className="mt-2 text-xs font-bold text-red-700" role="alert">{error}</p>)}
      </article>
    </div>}

    {section === "FORECAST" && <div className="grid gap-4 xl:grid-cols-2">
      <article className="border-2 border-slate-900 bg-white p-4"><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">IMMEDIATE HORIZON</h3><InfoTooltip label="Explain immediate forecast">15-minute, 1-hour and 6-hour projections use the recent telemetry trend with damping. The shaded numerical range is an uncertainty estimate, not an independent random curve.</InfoTooltip></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{immediate.horizons.map((item) => <div key={item.minutes} className="border border-slate-300 p-3"><p className="text-[10px] font-bold text-slate-500" style={mono}>{item.minutes === 60 ? "1 HOUR" : item.minutes === 360 ? "6 HOURS" : "15 MIN"}</p><p className="mt-1 text-xl font-bold" style={mono}>{formatDose(item.projectedDoseRateMsvPerHour)} <span className="text-[9px]">mSv/h</span></p><p className="mt-1 text-xs text-slate-600">+{formatDose(item.additionalDoseMsv)} mSv · ±{item.uncertaintyPercent}%</p></div>)}</div><Sparkline points={immediate.points.map((point) => ({ simulationSecond: point.minute * 60, value: point.doseRateMsvPerHour }))} label="Immediate radiation dose-rate projection" /><details className="border-t border-slate-300 pt-2 text-xs"><summary className="cursor-pointer font-bold text-[#4502FF]">ASSUMPTIONS & UNCERTAINTY</summary><p className="mt-2 text-slate-600">{immediate.assumption}</p></details></article>
      <article className="border-2 border-slate-900 bg-[#111827] p-4 text-white"><div className="flex items-center gap-2"><Satellite className="h-5 w-5 text-[#FFDA14]" /><h3 className="text-xl font-bold">PROLONGED HORIZON</h3><InfoTooltip label="Explain prolonged forecast">Conditional dose extrapolations at 24 hours, 7 days and 30 days. Constant, decaying and persistent cases all start from the same current telemetry rate.</InfoTooltip></div><div className="mt-4 space-y-3">{prolonged.horizons.map((item) => <div key={item.hours} className="border border-slate-600 p-3"><div className="flex items-center justify-between"><strong>{item.hours === 24 ? "24 HOURS" : item.hours === 168 ? "7 DAYS" : "30 DAYS"}</strong><span className="text-xs text-[#FFDA14]" style={mono}>{formatDose(item.constantRateDoseMsv)} mSv</span></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300"><span>Decaying: {formatDose(item.decayingEventDoseMsv)} mSv</span><span>Persistent: {formatDose(item.persistentEventDoseMsv)} mSv</span></div></div>)}</div><p className="mt-4 border border-[#FFDA14] p-3 text-xs text-slate-300">{prolonged.assumption}</p></article>
    </div>}

    {section === "SPACE WEATHER" && <article className="border-2 border-[#4502FF] bg-white p-4 shadow-[5px_5px_0_#4502FF]">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><CloudSun className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">NASA DONKI CONTEXT</h3><InfoTooltip label="Explain NASA DONKI context">Solar flares, energetic particle events and CMEs provide external space-weather context. They are not measurements of radiation inside the spacecraft.</InfoTooltip></div><button type="button" onClick={loadDonki} disabled={donkiBusy} className="border-2 border-[#4502FF] bg-[#4502FF] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><RefreshCw className={`mr-1 inline h-4 w-4 ${donkiBusy ? "animate-spin" : ""}`} />{mode === "DEMO" ? "RESET FIXTURES" : donkiBusy ? "LOADING" : "LOAD 7 DAYS"}</button></div>
      <div className="mt-4 flex gap-2"><span className={`border px-2 py-1 text-[10px] font-bold ${mode === "DEMO" ? "border-violet-500 bg-violet-50 text-violet-800" : "border-emerald-600 bg-emerald-50 text-emerald-800"}`} style={mono}>{mode === "DEMO" ? "SYNTHETIC CONTEXT" : "NASA DONKI"}</span><span className="border border-amber-500 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800" style={mono}>NOT ONBOARD DOSE</span></div>
      {donkiError && <p className="mt-4 border border-red-500 bg-red-50 p-3 text-sm text-red-800" role="alert">{donkiError}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">{donkiEvents.length === 0 ? <p className="border border-dashed border-slate-400 p-4 text-sm text-slate-600">No DONKI events returned for this date range.</p> : donkiEvents.map((event) => <div key={event.eventId} className="border-2 border-slate-300 p-3"><div className="flex items-center justify-between"><span className="border border-[#FFDA14] bg-yellow-50 px-2 py-0.5 text-[10px] font-bold" style={mono}>{event.eventType}</span>{event.demo && <span className="text-[9px] font-bold text-violet-700" style={mono}>DEMO</span>}</div><p className="mt-2 text-xs font-bold">{event.eventId}</p><p className="mt-1 text-xs text-slate-600">{event.startTime ? new Date(event.startTime).toLocaleString() : "Time unavailable"}</p><p className="mt-2 text-sm">{event.summary}</p><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-[#4502FF] underline">NASA SOURCE ↗</a></div>)}</div>
    </article>}

    {section === "ALERTS" && <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <article className={`border-2 p-4 ${severityStyle(mode === "DEMO" ? displayedState.overallStatus : props.durableEmergency?.severity ?? "NORMAL")}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /><h3 className="text-xl font-bold">EMERGENCY STATE</h3></div><span className="border border-current px-2 py-1 text-xs font-bold" style={mono}>{mode === "DEMO" ? displayedState.overallStatus : props.durableEmergency?.severity ?? "NORMAL"}</span></div>{mode === "DEMO" ? <div className="mt-4"><p className="font-bold">{latestAlert?.reason ?? "No threshold event is active."}</p><p className="mt-2 text-xs" style={mono}>DERIVED FROM TELEMETRY · T+{displayedState.simulationSecond}s</p>{latestAlert && latestAlert.severity !== "NORMAL" && latestAlert.acknowledgedAtSecond === null && <button type="button" onClick={() => setState((current) => acknowledgeTelemetryAlert(current, latestAlert.id))} className="mt-4 border-2 border-slate-900 bg-slate-900 px-3 py-2 text-xs font-bold text-white">ACKNOWLEDGE</button>}</div> : props.durableEmergency ? <div className="mt-4"><p className="font-bold">{props.durableEmergency.title}</p><p className="mt-2 text-sm">{props.durableEmergency.reason}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={props.onAcknowledgeDurable} disabled={props.durableBusy === "ack" || Boolean(props.durableEmergency.acknowledgements[props.activeCharacterId])} className="border-2 border-slate-900 bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{props.durableEmergency.acknowledgements[props.activeCharacterId] ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}</button><button type="button" onClick={props.onShelterCheckIn} disabled={props.durableBusy === "shelter" || props.shelterConfirmed} className="border-2 border-[#4502FF] bg-white px-3 py-2 text-xs font-bold text-[#4502FF] disabled:opacity-50">{props.shelterConfirmed ? "SHELTERED" : "CONFIRM SHELTER"}</button></div></div> : <p className="mt-4 text-sm">No active durable radiation emergency.</p>}</article>
      <article className="border-2 border-slate-900 bg-white p-4"><div className="flex items-center gap-2"><BellRing className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl font-bold">EVENT HISTORY</h3><InfoTooltip label="Explain alert history">Entries are created only when telemetry crosses a configured threshold or returns to normal. They are not generated independently.</InfoTooltip></div>{mode === "LIVE" ? <p className="mt-4 border border-dashed border-slate-300 p-3 text-sm text-slate-600">Live durable event history remains in the existing Supabase emergency workflow.</p> : <div className="mt-4 space-y-2">{displayedState.alerts.length === 0 ? <p className="border border-dashed border-slate-300 p-3 text-sm text-slate-600">No threshold transitions in this run.</p> : displayedState.alerts.map((alert) => <div key={alert.id} className="grid grid-cols-[82px_1fr_auto] gap-3 border border-slate-300 p-3 text-xs"><span style={mono}>{telemetryTimestamp(alert.simulationSecond).slice(11, 19)}</span><div><strong>{alert.reason}</strong><p className="mt-1 text-slate-500">T+{alert.simulationSecond}s</p></div><span className={`h-fit border px-2 py-0.5 text-[9px] font-bold ${severityStyle(alert.severity)}`}>{alert.acknowledgedAtSecond === null && alert.severity !== "NORMAL" ? "PENDING" : alert.severity === "NORMAL" ? "RECOVERY" : "ACK"}</span></div>)}</div>}</article>
    </div>}

    <footer className="flex flex-wrap items-center gap-2 border border-slate-400 bg-slate-50 p-3 text-[10px] text-slate-600" style={mono}><AlertTriangle className="h-4 w-4 text-amber-600" />{mode === "DEMO" ? "SIMULATED TELEMETRY · DETERMINISTIC SEED · NOT WRITTEN TO SUPABASE" : "LIVE VALUES RETAIN THEIR SOURCE PROVENANCE"}<span className="ml-auto">UPDATED {telemetryTimestamp(displayedState.simulationSecond).slice(11, 19)}Z</span></footer>
  </section>;
}

function ModeSwitch({ mode, setMode }: { mode: "DEMO" | "LIVE"; setMode: (mode: "DEMO" | "LIVE") => void }) {
  return <div className="inline-flex border-2 border-white bg-slate-950 p-0.5" role="group" aria-label="Telemetry source mode">{(["DEMO", "LIVE"] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} aria-pressed={mode === item} className={`px-3 py-1.5 text-xs font-bold ${mode === item ? "bg-[#FFDA14] text-slate-950" : "text-white"}`} style={mono}>{item}</button>)}</div>;
}
