"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Beaker,
  BookOpen,
  CheckCircle2,
  CloudSun,
  Database,
  Download,
  FlaskConical,
  GitCompareArrows,
  Gauge,
  ListChecks,
  Map as MapIcon,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Satellite,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { RadiationTelemetryCenter } from "@/components/radiation/RadiationTelemetryCenter";
import { MissionMapWorkbench } from "@/components/spacecraft/MissionMapWorkbench";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PARAMETER_GROUPS, validateWorkbenchParameters } from "@/lib/radiation/simulation-ux";
import type { ParameterGroup, WorkbenchParameterDefinition } from "@/lib/radiation/simulation-ux";
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

type MethodItem = {
  id: string;
  name: string;
  group: "core" | "workflow";
  status: "implemented" | "experimental" | "guarded";
  description: string;
};

type MethodResult = {
  id: string;
  name: string;
  status: "PASS" | "GUARDED";
  summary: string;
  provenanceKind: "simulated" | "modeled" | "experimental";
  output: Record<string, unknown>;
  limitations: string[];
};

type SimulationParameterValue = number | boolean | string;

type SimulationParameterDefinition = WorkbenchParameterDefinition;

type SimulationPreset = {
  id: string;
  label: string;
  description: string;
  values: Record<string, SimulationParameterValue>;
};

type SimulationDefinition = {
  id: string;
  title: string;
  category: "acute" | "operations" | "quality" | "research";
  description: string;
  parameters: SimulationParameterDefinition[];
  defaultParameters: Record<string, SimulationParameterValue>;
  whatsHappening: string;
  whatVitalisDoes: string;
  previewEvents: string[];
  resultHighlights: string[];
  presets: SimulationPreset[];
};

type SimulationResult = {
  runId: string;
  scenarioId: string;
  title: string;
  severity: "NOMINAL" | "ELEVATED" | "CRITICAL";
  provenanceKind: "simulated" | "modeled" | "experimental";
  summary: string;
  explanation: string;
  metrics: Array<{ label: string; value: number | string; unit?: string; tone: "neutral" | "good" | "warning" | "danger" }>;
  actions: string[];
  protocol: Array<{ id: string; label: string; required: boolean }>;
  events: Array<{ offsetMinutes: number; label: string; kind: "info" | "warning" | "action" }>;
  chart: Array<{ label: string; value: number; unit: string }>;
  assignments?: Array<{ crewMember: string; shelter: string }>;
  protocolCompletion?: Record<string, boolean>;
  parameters: Record<string, SimulationParameterValue>;
  limitations: string[];
  comparisonValue: number | null;
  comparisonUnit: string | null;
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

function methodClass(status: MethodItem["status"]) {
  if (status === "implemented") return "border-[#16A34A] bg-emerald-50 text-emerald-900";
  if (status === "experimental") return "border-[#4502FF] bg-violet-50 text-violet-900";
  return "border-[#D97706] bg-amber-50 text-amber-900";
}

function ParameterHelp({ parameter }: { parameter: SimulationParameterDefinition }) {
  return <InfoTooltip label={`Explain ${parameter.label}`}>{parameter.tooltip}</InfoTooltip>;
}

export function RadiationHazardScreen({
  mission,
  activeCharacter,
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  scenarioHazardRecords,
  scenarioHazardSamples,
  linkOnline,
}: HazardScreenProps) {
  const standaloneDemo = mission.id === "radiation-demo-local";
  const legacyTelemetryEnabled: boolean = false;
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyItem[]>([]);
  const [donkiEvents, setDonkiEvents] = useState<DonkiItem[]>([]);
  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [methodResults, setMethodResults] = useState<Record<string, MethodResult>>({});
  const [methodFilter, setMethodFilter] = useState<"all" | "core" | "workflow">("all");
  const [simulationCatalog, setSimulationCatalog] = useState<SimulationDefinition[]>([]);
  const [selectedSimulationId, setSelectedSimulationId] = useState("A");
  const [simulationParameterSets, setSimulationParameterSets] = useState<Record<string, Record<string, SimulationParameterValue>>>({});
  const [simulationRuns, setSimulationRuns] = useState<SimulationResult[]>([]);
  const [activeSimulationRunId, setActiveSimulationRunId] = useState<string | null>(null);
  const [protocolCompletion, setProtocolCompletion] = useState<Record<string, boolean>>({});
  const [showComparison, setShowComparison] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "simulator" | "map" | "telemetry" | "engineering">(standaloneDemo ? "simulator" : "overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const refreshEmergencies = useCallback(async () => {
    if (standaloneDemo) {
      setEmergencies([]);
      return;
    }
    const response = await fetch(`/api/radiation/emergencies?scenarioId=${encodeURIComponent(mission.id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(responseError(data, "Unable to sync radiation emergencies."));
    setEmergencies(Array.isArray(data.emergencies) ? data.emergencies : []);
  }, [mission.id, standaloneDemo]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/radiation/scenarios")
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(responseError(data, "Unable to load scenarios."));
          setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
        }),
      fetch("/api/radiation/methods")
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(responseError(data, "Unable to load radiation method catalog."));
          setMethods(Array.isArray(data.methods) ? data.methods : []);
        }),
      fetch("/api/radiation/simulate")
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(responseError(data, "Unable to load radiation scenarios."));
          const loaded = Array.isArray(data.scenarios) ? data.scenarios as SimulationDefinition[] : [];
          setSimulationCatalog(loaded);
          setSimulationParameterSets((current) => {
            const next = { ...current };
            for (const scenario of loaded) {
              if (!next[scenario.id]) next[scenario.id] = scenario.defaultParameters;
            }
            return next;
          });
        }),
      refreshEmergencies(),
    ]).catch((error) => setNotice(error instanceof Error ? error.message : "Radiation module sync failed."));
  }, [refreshEmergencies]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`vitalis-radiation-workbench:${mission.id}`);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        selectedSimulationId?: string;
        parameterSets?: Record<string, Record<string, SimulationParameterValue>>;
        runs?: SimulationResult[];
      };
      if (parsed.selectedSimulationId) setSelectedSimulationId(parsed.selectedSimulationId);
      if (parsed.parameterSets) setSimulationParameterSets(parsed.parameterSets);
      if (Array.isArray(parsed.runs)) {
        setSimulationRuns(parsed.runs.slice(0, 12));
        setActiveSimulationRunId(parsed.runs[0]?.runId ?? null);
        setProtocolCompletion(parsed.runs[0]?.protocolCompletion ?? {});
      }
    } catch {
      window.localStorage.removeItem(`vitalis-radiation-workbench:${mission.id}`);
    }
  }, [mission.id]);

  useEffect(() => {
    if (simulationCatalog.length === 0) return;
    window.localStorage.setItem(
      `vitalis-radiation-workbench:${mission.id}`,
      JSON.stringify({ selectedSimulationId, parameterSets: simulationParameterSets, runs: simulationRuns.slice(0, 12) })
    );
  }, [mission.id, selectedSimulationId, simulationCatalog.length, simulationParameterSets, simulationRuns]);

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

  const runMethod = async (methodId: string) => {
    setBusy(`method-${methodId}`);
    setNotice("");
    try {
      const response = await fetch("/api/radiation/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Radiation method failed."));
      const item = data.result as MethodResult;
      setMethodResults((current) => ({ ...current, [item.id]: item }));
      setNotice(`${item.name}: ${item.summary}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Radiation method failed.");
    } finally {
      setBusy(null);
    }
  };

  const runAllMethods = async () => {
    setBusy("methods-all");
    setNotice("");
    try {
      const response = await fetch("/api/radiation/methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runAll: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Radiation method suite failed."));
      const next = Object.fromEntries(
        (Array.isArray(data.results) ? data.results : []).map((item: MethodResult) => [item.id, item])
      );
      setMethodResults(next);
      setNotice(`Method suite complete: ${data.passed} passed, ${data.guarded} safety guards confirmed.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Radiation method suite failed.");
    } finally {
      setBusy(null);
    }
  };

  const visibleMethods = methods.filter((method) => methodFilter === "all" || method.group === methodFilter);
  const activeSimulationDefinition = simulationCatalog.find((scenario) => scenario.id === selectedSimulationId) ?? null;
  const activeSimulationParameters = useMemo(
    () => simulationParameterSets[selectedSimulationId] ?? activeSimulationDefinition?.defaultParameters ?? {},
    [activeSimulationDefinition, selectedSimulationId, simulationParameterSets]
  );
  const activeSimulationResult = simulationRuns.find((run) => run.runId === activeSimulationRunId) ?? null;
  const simulationValidationErrors = useMemo(
    () => activeSimulationDefinition
      ? validateWorkbenchParameters(activeSimulationDefinition, activeSimulationParameters)
      : {},
    [activeSimulationDefinition, activeSimulationParameters]
  );
  const groupedSimulationParameters = useMemo(() => {
    if (!activeSimulationDefinition) return [] as Array<[ParameterGroup, SimulationParameterDefinition[]]>;
    return PARAMETER_GROUPS
      .map((group) => [group, activeSimulationDefinition.parameters.filter((parameter) => parameter.group === group)] as [ParameterGroup, SimulationParameterDefinition[]])
      .filter(([, parameters]) => parameters.length > 0);
  }, [activeSimulationDefinition]);

  const updateSimulationParameter = (key: string, value: SimulationParameterValue) => {
    setSimulationParameterSets((current) => ({
      ...current,
      [selectedSimulationId]: { ...(current[selectedSimulationId] ?? {}), [key]: value },
    }));
  };

  const selectSimulation = (scenarioId: string) => {
    setSelectedSimulationId(scenarioId);
    setActiveSimulationRunId(null);
    setProtocolCompletion({});
    setShowComparison(false);
    setNotice("");
  };

  const applySimulationPreset = (preset: SimulationPreset) => {
    if (!activeSimulationDefinition) return;
    setSimulationParameterSets((current) => ({
      ...current,
      [activeSimulationDefinition.id]: { ...activeSimulationDefinition.defaultParameters, ...preset.values },
    }));
    setActiveSimulationRunId(null);
    setProtocolCompletion({});
    setShowComparison(false);
    setNotice(`${preset.label} preset applied. Review the inputs, then run the scenario.`);
  };

  const runInteractiveSimulation = async () => {
    if (!activeSimulationDefinition) return;
    if (Object.keys(simulationValidationErrors).length > 0) {
      setNotice("Fix the highlighted configuration errors before running the scenario.");
      return;
    }
    setBusy("simulation");
    setNotice("");
    try {
      const response = await fetch("/api/radiation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: activeSimulationDefinition.id, parameters: activeSimulationParameters }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Radiation simulation failed."));
      const simulationResult = data.result as SimulationResult;
      const uniqueRun = { ...simulationResult, runId: `${simulationResult.runId}-${Date.now().toString(36)}`, protocolCompletion: {} };
      setSimulationRuns((current) => [uniqueRun, ...current].slice(0, 12));
      setActiveSimulationRunId(uniqueRun.runId);
      setProtocolCompletion({});
      setShowComparison(false);
      setNotice(`${simulationResult.title}: ${simulationResult.summary}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Radiation simulation failed.");
    } finally {
      setBusy(null);
    }
  };

  const resetInteractiveSimulation = () => {
    if (!activeSimulationDefinition) return;
    setSimulationParameterSets((current) => ({ ...current, [activeSimulationDefinition.id]: activeSimulationDefinition.defaultParameters }));
    setActiveSimulationRunId(null);
    setProtocolCompletion({});
    setShowComparison(false);
    setNotice(`${activeSimulationDefinition.title}: parameters reset to deterministic Demo Mode defaults.`);
  };

  const toggleProtocolStep = (stepId: string) => {
    if (!activeSimulationResult) return;
    setProtocolCompletion((current) => {
      const next = { ...current, [stepId]: !current[stepId] };
      setSimulationRuns((runs) => runs.map((run) => run.runId === activeSimulationResult.runId
        ? { ...run, protocolCompletion: next }
        : run));
      return next;
    });
  };

  const clearSimulationHistory = () => {
    setSimulationRuns([]);
    setActiveSimulationRunId(null);
    setProtocolCompletion({});
    setShowComparison(false);
    setNotice("Local Demo Mode run history cleared.");
  };

  const downloadSimulationReport = () => {
    if (!activeSimulationResult) return;
    const payload = JSON.stringify({ generatedAt: new Date().toISOString(), mode: "demo", result: activeSimulationResult, protocolCompletion }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vitalis-radiation-${activeSimulationResult.scenarioId}-${activeSimulationResult.runId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const comparisonRuns = simulationRuns.slice(0, 2);
  const comparisonCompatible = comparisonRuns.length === 2
    && comparisonRuns[0].scenarioId === comparisonRuns[1].scenarioId
    && comparisonRuns[0].comparisonValue !== null
    && comparisonRuns[1].comparisonValue !== null
    && comparisonRuns[0].comparisonUnit === comparisonRuns[1].comparisonUnit;
  const simulationChartMax = Math.max(1, ...(activeSimulationResult?.chart.map((point) => Math.abs(point.value)) ?? [1]));
  const completedProtocolSteps = activeSimulationResult?.protocol.filter((step) => protocolCompletion[step.id]).length ?? 0;
  const essentialParameterGroups = groupedSimulationParameters.filter(([group]) => group !== "Safety Thresholds" && group !== "Simulation Assumptions");
  const advancedParameterGroups = groupedSimulationParameters.filter(([group]) => group === "Safety Thresholds" || group === "Simulation Assumptions");

  const renderParameterGroup = ([group, parameters]: [ParameterGroup, SimulationParameterDefinition[]]) => (
    <fieldset key={group} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <legend className="px-2 text-xs font-bold tracking-wider text-[#4502FF]" style={mono}>{group.toUpperCase()}</legend>
      <div className="space-y-3">
        {parameters.map((parameter) => {
          const error = simulationValidationErrors[parameter.key];
          return <div key={parameter.key} className={`rounded-lg border bg-white p-3 ${error ? "border-red-500" : "border-slate-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1"><label htmlFor={`sim-${parameter.key}`} className="text-xs font-bold" style={mono}>{parameter.label.toUpperCase()}</label><ParameterHelp parameter={parameter} /></span>
              {parameter.unit && <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600" style={mono}>{parameter.unit}</span>}
            </div>
            {parameter.type === "number" && <div className="mt-2 grid grid-cols-[1fr_92px] items-center gap-3">
              <input id={`sim-${parameter.key}`} type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={Number(activeSimulationParameters[parameter.key] ?? parameter.defaultValue)} onChange={(event) => updateSimulationParameter(parameter.key, Number(event.target.value))} className="w-full accent-[#4502FF]" />
              <input type="number" min={parameter.min} max={parameter.max} step={parameter.step} value={Number(activeSimulationParameters[parameter.key] ?? parameter.defaultValue)} onChange={(event) => updateSimulationParameter(parameter.key, Number(event.target.value))} aria-label={`${parameter.label} numeric value`} aria-invalid={Boolean(error)} className="rounded border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-[#FFDA14]" style={mono} />
            </div>}
            {parameter.type === "boolean" && <button id={`sim-${parameter.key}`} type="button" role="switch" aria-checked={Boolean(activeSimulationParameters[parameter.key] ?? parameter.defaultValue)} onClick={() => updateSimulationParameter(parameter.key, !Boolean(activeSimulationParameters[parameter.key] ?? parameter.defaultValue))} className={`mt-2 w-full rounded-lg border px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FFDA14] ${Boolean(activeSimulationParameters[parameter.key] ?? parameter.defaultValue) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-slate-100 text-slate-700"}`} style={mono}>{Boolean(activeSimulationParameters[parameter.key] ?? parameter.defaultValue) ? "YES / CONFIRMED" : "NO / NOT CONFIRMED"}</button>}
            {parameter.type === "select" && <select id={`sim-${parameter.key}`} value={String(activeSimulationParameters[parameter.key] ?? parameter.defaultValue)} onChange={(event) => updateSimulationParameter(parameter.key, event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-[#FFDA14]">{parameter.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
            {error && <p className="mt-2 text-xs font-bold text-red-700" role="alert">{error}</p>}
          </div>;
        })}
      </div>
    </fieldset>
  );

  return (
    <section className="space-y-5 text-slate-900" style={arcade}>
      <div className="border-2 border-[#4502FF] bg-white p-5 shadow-[6px_6px_0_#FFDA14]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-[#4502FF]" style={mono}>VITALIS+ / HAZARD 01</p>
            <h2 className="mt-1 text-3xl leading-none">SPACE RADIATION</h2>
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

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" aria-label="Radiation workspace">
        {([
          ["overview", "Overview", Gauge],
          ["simulator", "Simulator", SlidersHorizontal],
          ["map", "Spacecraft Map", MapIcon],
          ["telemetry", "Telemetry", Satellite],
          ["engineering", "Engineering", Wrench],
        ] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setWorkspaceTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4502FF] ${workspaceTab === id ? "bg-[#4502FF] text-white" : "text-slate-600 hover:bg-slate-100"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>

      {notice && <div className="border-2 border-[#4502FF] bg-[#F4F0FF] p-3 text-sm" role="status">{notice}</div>}

      {workspaceTab === "overview" && <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500" style={mono}>CURRENT ASSESSMENT</p><p className={`mt-3 inline-flex rounded-lg border px-3 py-2 text-xl font-bold ${statusClass(snapshot.status)}`}>{snapshot.status}</p><p className="mt-3 text-sm text-slate-600">{snapshot.immediateHorizon}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500" style={mono}>NEXT ACTION</p><p className="mt-3 text-lg font-bold">{snapshot.solutions[0] ?? "Monitor available telemetry."}</p><button type="button" onClick={() => setWorkspaceTab("simulator")} className="mt-4 rounded-lg bg-[#4502FF] px-3 py-2 text-sm font-bold text-white">OPEN SIMULATOR</button></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500" style={mono}>DATA STATUS</p><p className="mt-3 text-2xl font-bold">{hazardSamples.length}</p><p className="text-sm text-slate-600">radiation sample(s)</p><button type="button" onClick={() => setWorkspaceTab("telemetry")} className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold">VIEW TELEMETRY</button></article>
      </section>}

      {workspaceTab === "map" && <section className="rounded-xl border border-slate-200 bg-slate-100 p-2 sm:p-4"><MissionMapWorkbench embedded radiationResult={activeSimulationResult} /></section>}

      {workspaceTab === "simulator" && role === "lead" && (
        <section className="overflow-hidden border-2 border-slate-900 bg-[#F8FAFC] shadow-[8px_8px_0_#4502FF]">
          <div className="border-b-2 border-slate-900 bg-[#111827] p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[#FFDA14]" style={mono}>DEMO MODE · DETERMINISTIC · NO LIVE CREW DATA</p>
                <h3 className="mt-1 text-3xl">RADIATION SCENARIO WORKBENCH</h3>
              </div>
              <div className="space-y-2 text-right text-xs" style={mono}>
                <div className="border border-slate-600 px-3 py-2">
                  <p>{simulationCatalog.length} SCENARIOS AVAILABLE</p>
                  <p className="mt-1 text-[#FFDA14]">{simulationRuns.length} LOCAL RUN(S) SAVED</p>
                </div>
                <button type="button" onClick={() => setShowGuide(true)} className="w-full border-2 border-[#FFDA14] bg-transparent px-3 py-2 font-bold text-[#FFDA14] hover:bg-[#FFDA14] hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-white">
                  <BookOpen className="mr-1 inline h-4 w-4" />HOW DOES THIS WORK?
                </button>
              </div>
            </div>
          </div>

          {showGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="radiation-guide-title" onKeyDown={(event) => { if (event.key === "Escape") setShowGuide(false); }}>
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-slate-900 bg-white p-5 shadow-[8px_8px_0_#FFDA14]">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold tracking-wider text-[#4502FF]" style={mono}>QUICK GUIDE · DEMO MODE</p><h4 id="radiation-guide-title" className="mt-1 text-3xl">How the Workbench works</h4></div>
                  <button type="button" aria-label="Close guide" onClick={() => setShowGuide(false)} className="border-2 border-slate-900 p-2 hover:bg-[#FFDA14] focus:outline-none focus:ring-2 focus:ring-[#4502FF]"><X className="h-5 w-5" /></button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">This Workbench runs deterministic educational scenarios through the existing Vitalis+ calculation engine. Values are simulated inputs, not live NASA telemetry or medical advice.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[{ n: "01", title: "Configure", text: "Choose a scenario, read the explanations, or apply a quick preset." }, { n: "02", title: "Simulate", text: "Run the validated inputs through the real scenario engine." }, { n: "03", title: "Understand", text: "Review the decision, numbers, crew actions, and chronological timeline." }].map((step) => <div key={step.n} className="border-2 border-slate-900 p-3"><span className="text-xl font-bold text-[#4502FF]" style={mono}>{step.n}</span><p className="mt-2 font-bold">{step.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{step.text}</p></div>)}
                </div>
                <div className="mt-5 border-l-4 border-[#D97706] bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><strong>Important:</strong> configurable thresholds and shielding factors are demo assumptions. Vitalis+ labels those assumptions and does not present them as universal NASA limits.</div>
                <button type="button" onClick={() => setShowGuide(false)} className="mt-5 w-full border-2 border-slate-900 bg-[#4502FF] px-4 py-3 font-bold text-white shadow-[3px_3px_0_#111827] hover:translate-x-px hover:translate-y-px">START EXPLORING</button>
              </div>
            </div>
          )}

          <div className="grid xl:grid-cols-[0.9fr_1.4fr]">
            <div className="border-b-2 border-slate-900 p-5 xl:border-b-0 xl:border-r-2">
              <label className="text-xs font-bold tracking-wider text-[#4502FF]" htmlFor="radiation-scenario-select" style={mono}>SELECT SCENARIO</label>
              <select id="radiation-scenario-select" value={selectedSimulationId} onChange={(event) => selectSimulation(event.target.value)} className="mt-2 w-full border-2 border-slate-900 bg-white p-3 text-base font-bold outline-none focus:ring-4 focus:ring-[#FFDA14]">
                {simulationCatalog.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.id}. {scenario.title}</option>)}
              </select>
              <div className="mt-3 grid grid-cols-7 gap-1 sm:grid-cols-10 xl:grid-cols-7">
                {simulationCatalog.map((scenario) => <button key={scenario.id} type="button" onClick={() => selectSimulation(scenario.id)} aria-label={`Select ${scenario.title}`} className={`border-2 px-1 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#4502FF] ${selectedSimulationId === scenario.id ? "border-slate-900 bg-[#FFDA14] text-slate-900" : "border-slate-300 bg-white text-slate-600 hover:border-[#4502FF]"}`} style={mono}>{scenario.id}</button>)}
              </div>

              {activeSimulationDefinition && (
                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="border border-[#4502FF] bg-violet-50 px-2 py-1 text-[10px] font-bold text-[#4502FF]" style={mono}>{activeSimulationDefinition.category.toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500" style={mono}>SCENARIO {activeSimulationDefinition.id}</span>
                  </div>
                  <h4 className="mt-2 text-2xl">{activeSimulationDefinition.title}</h4>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <span>Scenario {activeSimulationDefinition.id}</span>
                    <InfoTooltip label={`Explain ${activeSimulationDefinition.title}`}>
                      <p className="font-bold text-slate-900">What&apos;s happening?</p>
                      <p className="mt-1">{activeSimulationDefinition.whatsHappening}</p>
                      <p className="mt-3 font-bold text-slate-900">What will Vitalis+ do?</p>
                      <p className="mt-1">{activeSimulationDefinition.whatVitalisDoes}</p>
                    </InfoTooltip>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-bold tracking-wider text-slate-500" style={mono}>QUICK PRESETS</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeSimulationDefinition.presets.map((preset) => <span key={preset.id} className="inline-flex items-center gap-0.5"><button type="button" onClick={() => applySimulationPreset(preset)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:border-[#4502FF] hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-[#FFDA14]">{preset.id === "normal" || preset.id === "quiet" || preset.id === "healthy" || preset.id === "stable" ? "Normal" : preset.id === "critical" || preset.id === "overflow" || preset.id === "combined" || preset.id === "late" ? "Critical" : "Elevated"}</button><InfoTooltip label={`Explain ${preset.label}`}><strong className="text-slate-900">{preset.label}</strong><p className="mt-1">{preset.description}</p></InfoTooltip></span>)}
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">{essentialParameterGroups.map(renderParameterGroup)}</div>
                  {advancedParameterGroups.length > 0 && <details className="mt-4 rounded-lg border border-slate-300 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700" style={mono}>ADVANCED PARAMETERS</summary><div className="mt-4 space-y-4">{advancedParameterGroups.map(renderParameterGroup)}</div></details>}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={runInteractiveSimulation} disabled={busy !== null || Object.keys(simulationValidationErrors).length > 0} className="border-2 border-slate-900 bg-[#4502FF] px-3 py-3 text-sm font-bold text-white shadow-[3px_3px_0_#111827] enabled:hover:translate-x-px enabled:hover:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"><Play className="mr-2 inline h-4 w-4" />{busy === "simulation" ? "RUNNING…" : Object.keys(simulationValidationErrors).length > 0 ? "FIX INPUT ERRORS" : "RUN SCENARIO"}</button>
                    <button type="button" onClick={resetInteractiveSimulation} disabled={busy !== null} className="border-2 border-slate-900 bg-white px-3 py-3 text-sm font-bold enabled:hover:bg-[#FFDA14] disabled:opacity-50"><RotateCcw className="mr-2 inline h-4 w-4" />RESET INPUTS</button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5">
              {!activeSimulationResult ? (
                activeSimulationDefinition && <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="max-w-md">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-[#4502FF]"><SlidersHorizontal className="h-8 w-8" aria-hidden="true" /></div>
                    <div className="mt-5 flex items-center justify-center gap-2"><p className="text-xs font-bold tracking-[0.18em] text-[#4502FF]" style={mono}>READY TO SIMULATE</p><InfoTooltip label={`Preview ${activeSimulationDefinition.title}`}><p className="font-bold text-slate-900">{activeSimulationDefinition.title}</p><p className="mt-1">{activeSimulationDefinition.whatsHappening}</p><p className="mt-2 font-bold text-slate-900">This run models</p><ul className="mt-1 list-disc pl-5">{activeSimulationDefinition.previewEvents.map((event) => <li key={event}>{event}</li>)}</ul></InfoTooltip></div>
                    <h4 className="mt-2 text-3xl">{activeSimulationDefinition.id}. {activeSimulationDefinition.title}</h4>
                    <p className="mt-3 text-base text-slate-600">Configure parameters and run the scenario.</p>
                    <span className="mt-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-[#4502FF]" style={mono}>SIMULATED · DEMO MODEL</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className={`border-2 p-4 ${statusClass(activeSimulationResult.severity)}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider" style={mono}>SIMULATED RESULT · {activeSimulationResult.provenanceKind.toUpperCase()}</p>
                        <h4 className="mt-1 text-2xl">{activeSimulationResult.scenarioId}. {activeSimulationResult.title}</h4>
                      </div>
                      <span className="border-2 border-current px-3 py-1 text-sm font-bold" style={mono}>{activeSimulationResult.severity}</span>
                    </div>
                    <p className="mt-4 text-[10px] font-bold tracking-wider" style={mono}>WHAT HAPPENED?</p>
                    <p className="mt-1 text-base font-bold">{activeSimulationResult.summary}</p>
                  </div>

                  <div className="flex items-center gap-2"><span className="text-xs font-bold text-[#4502FF]" style={mono}>WHY THIS RESULT?</span><InfoTooltip label="Explain this result"><p className="font-bold text-slate-900">Decision basis</p><p className="mt-1">{activeSimulationResult.explanation}</p><p className="mt-3 text-xs text-slate-500">Inputs: configured Workbench values · Calculation: deterministic scenario engine.</p></InfoTooltip></div>

                  <div><p className="mb-2 text-xs font-bold text-[#4502FF]" style={mono}>UNDERSTAND THE NUMBERS</p><div className="grid gap-2 sm:grid-cols-3">
                    {activeSimulationResult.metrics.map((item) => <div key={item.label} className={`rounded-lg border p-3 ${item.tone === "danger" ? "border-red-500 bg-red-50" : item.tone === "warning" ? "border-amber-500 bg-amber-50" : item.tone === "good" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}><p className="text-[10px] font-bold tracking-wide text-slate-500" style={mono}>{item.label.toUpperCase()}</p><p className="mt-1 text-xl font-bold">{item.value} {item.unit ?? ""}</p></div>)}
                  </div></div>

                  {activeSimulationResult.assignments && <div className="border-2 border-slate-900 bg-white p-4"><p className="text-xs font-bold text-[#4502FF]" style={mono}>CREW-TO-SHELTER ALLOCATION</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{activeSimulationResult.assignments.map((assignment) => <div key={assignment.crewMember} className={`flex items-center justify-between gap-3 border p-2 text-sm ${assignment.shelter === "UNASSIGNED" ? "border-red-500 bg-red-50" : "border-slate-300"}`}><span>{assignment.crewMember}</span><strong>{assignment.shelter}</strong></div>)}</div></div>}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <article className="border-2 border-slate-900 bg-white p-4">
                      <p className="text-xs font-bold text-[#4502FF]" style={mono}>RESULT VISUALIZATION</p>
                      <div className="mt-4 space-y-3">
                        {activeSimulationResult.chart.map((point) => <div key={point.label}><div className="flex justify-between gap-3 text-xs"><span>{point.label}</span><strong style={mono}>{Math.round(point.value * 1000) / 1000} {point.unit}</strong></div><div className="mt-1 h-4 border border-slate-300 bg-slate-100"><div className="h-full bg-[#4502FF] transition-[width] duration-500" style={{ width: `${Math.max(2, Math.min(100, Math.abs(point.value) / simulationChartMax * 100))}%` }} /></div></div>)}
                      </div>
                    </article>
                    <article className="border-2 border-slate-900 bg-[#111827] p-4 text-white">
                      <p className="text-xs font-bold text-[#FFDA14]" style={mono}>WHAT SHOULD THE CREW DO NEXT?</p>
                      <ol className="mt-3 space-y-3">{activeSimulationResult.actions.slice(0, 2).map((action, index) => <li key={action} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#FFDA14] text-[#FFDA14]" style={mono}>0{index + 1}</span><span>{action}</span></li>)}</ol>
                    </article>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <article className="border-2 border-slate-900 bg-white p-4">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#4502FF]" style={mono}>RESPONSE PROTOCOL</p><p className="mt-1 text-xs text-slate-500">{completedProtocolSteps}/{activeSimulationResult.protocol.length} steps confirmed</p></div><div className="h-3 w-28 border border-slate-900 bg-slate-100"><div className="h-full bg-[#16A34A] transition-[width]" style={{ width: `${activeSimulationResult.protocol.length ? completedProtocolSteps / activeSimulationResult.protocol.length * 100 : 0}%` }} /></div></div>
                      <div className="mt-3 space-y-2">{activeSimulationResult.protocol.map((step) => <button key={step.id} type="button" onClick={() => toggleProtocolStep(step.id)} className={`flex w-full items-center gap-3 border-2 p-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-[#4502FF] ${protocolCompletion[step.id] ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-white hover:border-[#4502FF]"}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 text-xs ${protocolCompletion[step.id] ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400"}`}>{protocolCompletion[step.id] ? "✓" : ""}</span><span>{step.label}</span>{step.required && <span className="ml-auto text-[9px] font-bold text-red-600" style={mono}>REQUIRED</span>}</button>)}</div>
                    </article>
                    <article className="border-2 border-slate-900 bg-white p-4">
                      <p className="text-xs font-bold text-[#4502FF]" style={mono}>EVENT TIMELINE</p>
                      <div className="mt-3 space-y-0">{activeSimulationResult.events.map((event, index) => <div key={`${event.offsetMinutes}-${event.label}`} className="grid grid-cols-[54px_14px_1fr] gap-2 text-xs"><span className="py-2 text-right text-slate-500" style={mono}>T+{event.offsetMinutes}</span><div className="relative flex justify-center"><span className={`mt-2 h-3 w-3 border-2 ${event.kind === "warning" ? "border-red-500 bg-red-100" : event.kind === "action" ? "border-[#4502FF] bg-violet-100" : "border-slate-400 bg-white"}`} />{index < activeSimulationResult.events.length - 1 && <span className="absolute top-5 bottom-0 w-px bg-slate-300" />}</div><span className="py-2">{event.label}</span></div>)}</div>
                    </article>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={downloadSimulationReport} className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-bold hover:bg-[#FFDA14]"><Download className="mr-1 inline h-4 w-4" />DOWNLOAD REPORT</button>
                    <button type="button" onClick={() => setShowComparison((current) => !current)} disabled={!comparisonCompatible} title={comparisonCompatible ? "Compare two compatible runs" : "Run the same scenario twice with the same comparison unit"} className="border-2 border-slate-900 bg-white px-3 py-2 text-xs font-bold hover:bg-[#FFDA14] disabled:opacity-40"><GitCompareArrows className="mr-1 inline h-4 w-4" />COMPARE LATEST 2</button>
                    <button type="button" onClick={clearSimulationHistory} className="border-2 border-red-600 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">CLEAR LOCAL HISTORY</button>
                  </div>

                  {comparisonRuns.length >= 2 && !comparisonCompatible && <p className="border border-amber-500 bg-amber-50 p-3 text-xs text-amber-900" role="status">Comparison is available only for two runs of the same scenario with the same metric unit.</p>}
                  {showComparison && comparisonCompatible && <div className="border-2 border-[#4502FF] bg-violet-50 p-4"><p className="text-xs font-bold text-[#4502FF]" style={mono}>COMPATIBLE RUN COMPARISON</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{comparisonRuns.map((run, index) => <div key={run.runId} className="border border-[#4502FF] bg-white p-3"><p className="text-[10px] text-slate-500" style={mono}>RUN {index + 1} · {run.scenarioId}</p><p className="mt-1 font-bold">{run.title}</p><p className="mt-2 text-2xl font-bold text-[#4502FF]">{run.comparisonValue === null ? "—" : Math.round(run.comparisonValue * 1000) / 1000} <span className="text-sm">{run.comparisonUnit}</span></p><p className="mt-2 text-xs text-slate-600">{run.summary}</p></div>)}</div></div>}

                  <details className="rounded-lg border border-slate-300 bg-white p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700" style={mono}>TECHNICAL DETAILS</summary><p className="mt-3 text-xs font-bold text-slate-700">MODEL LIMITATIONS</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">{activeSimulationResult.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul><p className="mt-3 text-xs font-bold text-slate-700">INPUT SNAPSHOT · {activeSimulationResult.provenanceKind.toUpperCase()}</p><pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-3 text-[10px] text-emerald-300" style={mono}>{JSON.stringify(activeSimulationResult.parameters, null, 2)}</pre></details>
                </div>
              )}

              {simulationRuns.length > 0 && <div className="mt-5 border-t-2 border-slate-900 pt-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[#4502FF]" style={mono}>LOCAL RUN HISTORY</p><span className="text-[10px] text-slate-500" style={mono}>RESULT + PROTOCOL RESTORED AFTER RELOAD</span></div><div className="mt-2 flex gap-2 overflow-x-auto pb-2">{simulationRuns.map((run) => <button key={run.runId} type="button" onClick={() => { setActiveSimulationRunId(run.runId); setProtocolCompletion(run.protocolCompletion ?? {}); }} className={`min-w-48 border-2 p-3 text-left text-xs ${activeSimulationResult?.runId === run.runId ? "border-[#4502FF] bg-violet-50" : "border-slate-300 bg-white"}`}><span className="font-bold">{run.scenarioId}. {run.title}</span><span className={`mt-2 block text-[10px] font-bold ${run.severity === "CRITICAL" ? "text-red-600" : run.severity === "ELEVATED" ? "text-amber-600" : "text-emerald-600"}`} style={mono}>{run.severity}</span><span className="mt-1 block text-[9px] text-slate-500" style={mono}>{Object.values(run.protocolCompletion ?? {}).filter(Boolean).length}/{run.protocol.length} PROTOCOL</span></button>)}</div></div>}
            </div>
          </div>
        </section>
      )}

      {workspaceTab === "telemetry" && (
        <RadiationTelemetryCenter
          missionId={mission.id}
          crew={mission.crew}
          liveRecords={scenarioHazardRecords}
          liveSamples={scenarioHazardSamples}
          standaloneDemo={standaloneDemo}
          activeCharacterId={activeCharacter.id}
          durableEmergency={activeEmergency}
          durableBusy={busy}
          onAcknowledgeDurable={acknowledge}
          onShelterCheckIn={shelterCheckIn}
          shelterConfirmed={activeCharacter.shelterConfirmed}
        />
      )}

      {legacyTelemetryEnabled && <>
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

      </>}

      {workspaceTab === "engineering" && role === "lead" && (
        <section className="border-2 border-[#4502FF] bg-white p-5 shadow-[7px_7px_0_#111827]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#4502FF]" style={mono}>ENGINEERING SIMULATION / SAFE FIXTURES</p>
              <h3 className="mt-1 text-2xl"><FlaskConical className="mr-2 inline h-6 w-6" />RADIATION FIXTURE VERIFICATION LAB</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-700">Execute deterministic engineering fixtures for 20 product-function contracts and 14 workflow contracts. These are verification cases, not 34 arbitrary-input user tools, and they never overwrite astronaut telemetry.</p>
            </div>
            <button type="button" onClick={runAllMethods} disabled={busy !== null} className="border-2 border-slate-900 bg-[#FFDA14] px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#111827] enabled:hover:translate-x-px enabled:hover:translate-y-px disabled:opacity-50">
              <ListChecks className="mr-2 inline h-4 w-4" />{busy === "methods-all" ? "RUNNING 34 FIXTURES…" : "RUN ALL 34 FIXTURES"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "core", "workflow"] as const).map((filter) => (
              <button key={filter} type="button" onClick={() => setMethodFilter(filter)} className={`border-2 px-3 py-1 text-xs font-bold ${methodFilter === filter ? "border-[#4502FF] bg-[#4502FF] text-white" : "border-slate-300 bg-white text-slate-700"}`} style={mono}>
                {filter === "all" ? `ALL (${methods.length})` : filter === "core" ? `CORE (${methods.filter((item) => item.group === "core").length})` : `WORKFLOWS (${methods.filter((item) => item.group === "workflow").length})`}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-600" style={mono}>{Object.keys(methodResults).length}/{methods.length} EXECUTED</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleMethods.map((method) => {
              const methodResult = methodResults[method.id];
              return (
                <article key={method.id} className={`border-2 p-3 ${methodClass(method.status)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-wider" style={mono}>{method.group.toUpperCase()} · {method.status.toUpperCase()}</p>
                      <h4 className="mt-1 text-base font-bold leading-tight">{method.name}</h4>
                    </div>
                    {methodResult && <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${methodResult.status === "PASS" ? "border-emerald-700 bg-emerald-100 text-emerald-900" : "border-amber-700 bg-amber-100 text-amber-900"}`} style={mono}>{methodResult.status}</span>}
                  </div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed">{method.description}</p>
                  <button type="button" onClick={() => runMethod(method.id)} disabled={busy !== null} className="mt-3 w-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 enabled:hover:bg-[#FFDA14] disabled:opacity-50">
                    <Play className="mr-1 inline h-3.5 w-3.5" />{busy === `method-${method.id}` ? "RUNNING…" : methodResult ? "RUN AGAIN" : "RUN METHOD"}
                  </button>
                  {methodResult && (
                    <div className="mt-3 border border-slate-400 bg-white/80 p-2 text-slate-900">
                      <p className="text-xs font-bold">{methodResult.summary}</p>
                      <p className="mt-1 text-[10px] text-slate-600" style={mono}>PROVENANCE: {methodResult.provenanceKind.toUpperCase()}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-[#4502FF]">VIEW OUTPUT</summary>
                        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-2 text-[10px] leading-relaxed text-emerald-300" style={mono}>{JSON.stringify(methodResult.output, null, 2)}</pre>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] text-slate-600">{methodResult.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
                      </details>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {workspaceTab === "engineering" && <>
      {role === "lead" && !standaloneDemo && <section className="border-2 border-slate-900 bg-[#FFDA14] p-5"><div className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /><h3 className="text-xl">REPRODUCIBLE SCENARIO CONSOLE</h3></div><p className="mt-1 text-sm">These buttons write clearly marked simulation telemetry to the existing Supabase tables. They are not fake frontend alarms.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{scenarios.filter((scenario) => ["A", "B", "C", "D"].includes(scenario.id)).map((scenario) => <div key={scenario.id} className="border-2 border-slate-900 bg-white p-3"><p className="font-bold">{scenario.id}. {scenario.title}</p><p className="mt-1 min-h-12 text-xs text-slate-700">{scenario.description}</p><button type="button" onClick={() => runScenario(scenario.id)} disabled={busy === `scenario-${scenario.id}`} className="mt-3 w-full border-2 border-slate-900 bg-[#4502FF] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === `scenario-${scenario.id}` ? "WRITING…" : "RUN SIMULATION"}</button></div>)}</div></section>}

      <section className="border-2 border-slate-900 bg-white p-5"><div className="flex items-center gap-2"><Beaker className="h-5 w-5 text-[#4502FF]" /><h3 className="text-xl">LIVE INTEGRATION / MODEL STATUS</h3></div><p className="mt-2 text-xs text-slate-600">All A–S scenarios are executable in the deterministic Workbench above. The labels below separately describe whether each workflow is connected to validated live mission data and hardware.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{scenarios.map((scenario) => <div key={scenario.id} className="border border-slate-300 p-3 text-sm"><div className="flex items-start justify-between gap-2"><strong>{scenario.id}. {scenario.title}</strong><span className={`px-1.5 py-0.5 text-[10px] font-bold ${scenarioClass(scenario.status)}`} style={mono}>{scenario.status.toUpperCase()}</span></div><p className="mt-1 text-xs text-slate-600">{scenario.description}</p></div>)}</div><p className="mt-4 text-xs text-slate-600"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[#16A34A]" />Experimental models are stored and displayed honestly; unsupported scientific algorithms are never fabricated.</p></section>
      </>}
    </section>
  );
}
