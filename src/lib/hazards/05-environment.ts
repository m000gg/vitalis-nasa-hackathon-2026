import type { ResearchInfoEntry } from "@/components/ResearchInfoModal";
import {
  HazardChartSpec,
  HazardChartThreshold,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

export const ENVIRONMENT_RESEARCH_METADATA: Record<string, ResearchInfoEntry> = {
  habitat_air_briefing: {
    id: "habitat_air_briefing",
    title: "Closed-Habitat Atmosphere & Pressure Limits",
    explanation:
      "Monitors module O₂ partial pressure, total cabin pressure, CO₂, and acoustic exposure across Lab, Habitat, Galley, and Airlock to prevent acute hypoxia or decompression risks.",
    benchmark:
      "O₂ normal ~149 mmHg with 122 mmHg (1-h TWA) absolute lower floor; total pressure 5.0–15.0 psia indefinite exposure; CO₂ target <=4 mmHg; noise <85 dBA (NC-40 in sleep areas).",
    links: [
      {
        label: "NASA HRP — Hazard: Hostile/Closed Environments",
        url: "https://www.nasa.gov/hrp/hazard-hostile-closed-environments/",
      },
      {
        label: "NASA OCHMO Habitable Atmosphere Technical Brief (PDF)",
        url: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf",
      },
    ],
  },
  co2_headache_risk: {
    id: "co2_headache_risk",
    title: "CO₂ Partial Pressure & Astronaut Headache Odds",
    explanation:
      "Tracks rising module ppCO₂ trends, 30-min linear projection (+2 h), and cumulative time above NASA's 4 mmHg target, replaying ISS cabin telemetry from NASA OSDR alongside module offsets.",
    benchmark:
      "NASA operational CO₂ target <=4 mmHg cuts weekly headache risk from ~3.3% to ~1.6%; each +1 mmHg CO₂ doubles the odds of a crew headache.",
    links: [
      {
        label: "NASA OCHMO CO₂ Technical Brief (PDF)",
        url: "https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf",
      },
      {
        label: "NASA Study on CO₂ and Crew Headaches",
        url: "https://www.news-medical.net/news/20140501/Headaches-an-occupational-hazard-astronauts.aspx",
      },
      {
        label: "NASA OSDR Environmental Data App (EDA)",
        url: "https://visualization.osdr.nasa.gov/eda",
      },
      {
        label: "OSDR EDA Download & Mission Comparison Guide",
        url: "https://dev2-osdr-tutorials.readthedocs.io/en/latest/pages/guides/environmental_data_application.html",
      },
    ],
  },
  module_acoustics: {
    id: "module_acoustics",
    title: "Hazardous & Sleep-Area Acoustic Exposure",
    explanation:
      "Compares module sound pressure levels against acute hearing limits and sleep-quarter acoustic curves to flag noisy compartments before sleep quality degrades.",
    benchmark:
      "Hazardous noise must remain <85 dBA regardless of duration; missions over 30 days limit continuous sleep-area noise to the NC-40 curve.",
    links: [
      {
        label: "NASA OCHMO Acoustics Technical Brief (PDF)",
        url: "https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf",
      },
      {
        label: "NASA HRP — Hazard: Hostile/Closed Environments",
        url: "https://www.nasa.gov/hrp/hazard-hostile-closed-environments/",
      },
    ],
  },
};

/**
 * ============================================================================
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS
 * Owner: Teammate 5 — Edit ONLY this file (src/lib/hazards/05-environment.ts).
 * ============================================================================
 */

// [SECTION 1: HAZARD 5 VALUES & THRESHOLD SLOTS]
export const ENVIRONMENT_PIPELINE_VALUES = {
  supportedStreams: [
    "Cabin CO2 Replay",
    "Lab Air Readings",
    "Habitat Air Readings",
    "Galley Air Readings",
    "Airlock Air Readings",
    "Demo Scenario",
    "Simulated Minutes Elapsed",
  ],

  streams: {
    cabinCo2: "Cabin CO2 Replay",
    demoScenario: "Demo Scenario",
    simulatedMinutes: "Simulated Minutes Elapsed",
  },

  limits: {
    co2TargetMmhg: 4, // NASA target: CO2 <= 4 mmHg
    o2GreenFromMmhg: 130, // green >= 130 mmHg, yellow 122..130 mmHg
    o2YellowBelowMmhg: 130,
    o2RedBelowMmhg: 122, // 1-hour TWA lower limit
    pressureMinPsia: 5.0,
    pressureMaxPsia: 15.0,
    noiseHazardDba: 85,
    noiseReferenceText: "sleep areas on missions over 30 days: NC-40",
  },

  risk: {
    oddsFactorPerMmhg: 2, // each +1 mmHg CO2 doubles headache odds
    weeklyOddsAtTarget: 0.0163, // anchored at ~1.6% weekly risk for 4 mmHg
  },

  arithmetic: {
    co2PpmToMmhg: 0.00076,
    co2PercentToMmhg: 7.6,
    ppmFromValue: 100,
    slopeThresholdMmhgPerMin: 0.001,
  },

  demoSettings: {
    forecastWindowMin: 30,
    forecastHorizonMin: 120,
    historyWindowMin: 120,
    projectionStepMin: 30,
    replayStepMin: 10,
    replaySpeeds: [1, 60, 600],
    maxSimulatedMin: 1_000_000,
    sensorNoise: { o2Mmhg: 0.5, pressurePsia: 0.05, noiseDba: 1 },
  },

  modules: [
    { id: "lab", name: "Lab", streamName: "Lab Air Readings", co2OffsetMmhg: 0, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 62 },
    { id: "habitat", name: "Habitat", streamName: "Habitat Air Readings", co2OffsetMmhg: 0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 45 },
    { id: "galley", name: "Galley", streamName: "Galley Air Readings", co2OffsetMmhg: 0.2, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 58 },
    { id: "airlock", name: "Airlock", streamName: "Airlock Air Readings", co2OffsetMmhg: -0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 52 },
  ],

  demoScenarios: {
    ids: ["none", "co2-scrubber-failure", "o2-leak-lab", "noisy-galley", "chaos"],
    labels: {
      none: "Nominal Ops",
      "co2-scrubber-failure": "CO₂ Scrubber Failure",
      "o2-leak-lab": "O₂ Leak (Lab)",
      "noisy-galley": "Noisy Equipment (Galley)",
      chaos: "Chaos Telemetry Stress",
    } as Record<string, string>,
    co2ScrubberFailure: { co2RiseMmhgPerMin: 0.04, co2RiseCapMmhg: 3 },
    o2LeakLab: { moduleId: "lab", o2FallsToMmhg: 118, overMin: 20 },
    noisyGalley: { moduleId: "galley", noiseRisesToDba: 90, overMin: 10 },
  },

  demoCo2SeriesMmhg: [
    3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8,
  ],

  messages: {
    low: "CO₂ is within the NASA 4 mmHg target.",
    elevated: "Reaches 4 mmHg limit in ~{n} min at current slope.",
    high: "CO₂ exceeds 4 mmHg; each +1 mmHg doubles headache odds.",
    collecting: "Collecting trend window (needs 30 min)...",
  },

  alertActions: {
    warning: ["Inspect CO₂ scrubber in {Module}", "Limit non-essential time in {Module} until CO₂ stabilizes"],
    critical: ["Inspect CO₂ scrubber in {Module} immediately", "Move non-essential work out of {Module} (lowest: {Lowest})"],
  },

  otherActions: {
    inspectScrubber: "Inspect CO₂ scrubber / ECLSS ventilation loop ({Module})",
    o2: "Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop ({Module})",
    isolate: "Evacuate/isolate affected module ({Module})",
  },

  studyFactsText:
    "ISS data links CO₂ <= 4 mmHg with ~1.6% weekly headache risk vs ~3.3% uncapped.",

  chart: {
    limitLabel: "NASA limit",
    limitColor: "#ef4444",
    projectionLabel: "Projected +2 h",
    projectionColor: "#f59e0b",
  },
};

// [SECTION 2: HAZARD 5 FORMULAS & EVALUATION PIPELINE]
const V = ENVIRONMENT_PIPELINE_VALUES;
const FORMAT = { co2Decimals: 2, otherDecimals: 1, slopeDecimals: 3, storeDecimals: 2, floatGuardDecimals: 6 };

export type AirStatus = "green" | "yellow" | "red";
export type AirMetric = "co2" | "o2" | "pressure" | "noise";
export type Co2Unit = "ppm" | "percent" | "mmHg";
export type TrendLabel = "rising" | "stable" | "falling";
export type Co2Level = "low" | "elevated" | "high";
export type AlertSeverity = "warning" | "critical";
export type DataTag = "REAL" | "SIM";

export interface ModuleReading {
  co2Mmhg: number;
  o2Mmhg: number;
  pressurePsia: number;
  noiseDba: number;
  temperatureC: number | null;
  humidityPct: number | null;
}

export interface Co2Sample {
  tMin: number;
  co2Mmhg: number;
}

export interface MetricStatus {
  metric: AirMetric;
  value: number;
  unit: string;
  status: AirStatus;
  tag: DataTag;
  text: string;
  tagNote?: string;
}

export interface InfoMetric {
  key: "temperature" | "humidity";
  label: string;
  value: number;
  unit: string;
  tag: DataTag;
}

export interface ModuleAirStatus {
  status: AirStatus;
  worstMetric: MetricStatus;
  metrics: MetricStatus[];
}

export interface AirLayerEntry {
  moduleId: string;
  status: AirStatus;
  worstMetric: MetricStatus;
}

export type Co2Forecast =
  | { state: "collecting" }
  | {
      state: "ready";
      slopeMmhgPerMin: number;
      trend: TrendLabel;
      minutesToLimit: number | null;
      projectedCo2Mmhg: number;
    };

export interface ModuleLedger {
  minutesAboveLimit: number;
  maxCo2Mmhg: number;
}

export interface ModuleAlert {
  id: string;
  ackKey: string;
  moduleId: string;
  moduleName: string;
  severity: AlertSeverity;
  title: string;
  startedAtMin: number;
  etaMin: number;
  actions: string[];
}

export interface ModuleModel {
  moduleId: string;
  moduleName: string;
  reading: ModuleReading;
  air: ModuleAirStatus;
  infoMetrics: InfoMetric[];
  history: Co2Sample[];
  projection: Co2Sample[];
  forecast: Co2Forecast;
  level: Co2Level;
  multiplier: number;
  multiplierText: string;
  weeklyRisk: number;
  weeklyRiskText: string;
  message: string;
  alert: ModuleAlert | null;
  ledger: ModuleLedger;
}

export interface EnvironmentModel {
  nowMin: number;
  scenarioId: string;
  scenarioLabel: string;
  dataTag: DataTag;
  modules: ModuleModel[];
  counts: Record<AirStatus, number>;
  banner: string;
  alerts: ModuleAlert[];
  lowestCo2ModuleId: string;
}

export interface CabinRow {
  co2Mmhg: number;
  temperatureC: number | null;
  humidityPct: number | null;
}

export interface CabinCo2Source {
  tag: DataTag;
  rows: CabinRow[];
}

export interface EnvironmentState {
  elapsedMin: number;
  scenarioId: string;
  scenarioStartMin: number;
  cabin: CabinCo2Source;
  moduleSamples: Record<string, HazardSampleRecord[]>;
  modulePayloads: Record<string, Record<string, unknown>>;
}

export interface EnvironmentStateSource {
  actorInputs?: Record<string, string>;
  hazardRecords?: readonly HazardDataRecord[];
  hazardSamples?: readonly HazardSampleRecord[];
  scenarioHazardRecords?: readonly HazardDataRecord[];
  scenarioHazardSamples?: readonly HazardSampleRecord[];
}

type ModuleConfig = (typeof ENVIRONMENT_PIPELINE_VALUES.modules)[number];

const STATUS_SEVERITY: Record<AirStatus, number> = { green: 0, yellow: 1, red: 2 };
const LEVEL_TO_STATUS: Record<Co2Level, AirStatus> = { low: "green", elevated: "yellow", high: "red" };

function fmt(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

function cleanFloat(value: number): number {
  return Number(value.toFixed(FORMAT.floatGuardDecimals));
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function jitter(a: number, b: number, c: number): number {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

export function co2ToMmhg(value: number, unit: Co2Unit): number {
  if (unit === "ppm") return value * V.arithmetic.co2PpmToMmhg;
  if (unit === "percent") return value * V.arithmetic.co2PercentToMmhg;
  return value;
}

function resolveCo2Unit(value: number, rawUnit: unknown): Co2Unit {
  const unit = typeof rawUnit === "string" ? rawUnit.trim().toLowerCase() : "";
  if (unit === "ppm") return "ppm";
  if (unit === "percent" || unit === "%") return "percent";
  if (unit === "mmhg") return "mmHg";
  return value >= V.arithmetic.ppmFromValue ? "ppm" : "mmHg";
}

export function co2RiskMultiplier(co2Mmhg: number): number {
  return Math.pow(V.risk.oddsFactorPerMmhg, co2Mmhg - V.limits.co2TargetMmhg);
}

export function illustrativeWeeklyRisk(co2Mmhg: number): number {
  const odds = V.risk.weeklyOddsAtTarget * co2RiskMultiplier(co2Mmhg);
  return odds / (1 + odds);
}

export function co2Forecast(history: readonly Co2Sample[], historyStartMin = history[0]?.tMin ?? 0): Co2Forecast {
  if (history.length < 2) return { state: "collecting" };
  const latest = history[history.length - 1];
  if (latest.tMin - historyStartMin < V.demoSettings.forecastWindowMin) return { state: "collecting" };

  const fromMin = latest.tMin - V.demoSettings.forecastWindowMin;
  let start = history.length - 1;
  while (start > 0 && history[start - 1].tMin >= fromMin) start--;
  const count = history.length - start;
  if (count < 2) return { state: "collecting" };

  let sumT = 0;
  let sumY = 0;
  for (let i = start; i < history.length; i++) {
    sumT += history[i].tMin;
    sumY += history[i].co2Mmhg;
  }
  const meanT = sumT / count;
  const meanY = sumY / count;
  let num = 0;
  let den = 0;
  for (let i = start; i < history.length; i++) {
    const dt = history[i].tMin - meanT;
    num += dt * (history[i].co2Mmhg - meanY);
    den += dt * dt;
  }
  if (den === 0) return { state: "collecting" };

  const slope = num / den;
  const threshold = V.arithmetic.slopeThresholdMmhgPerMin;
  const co2 = latest.co2Mmhg;
  return {
    state: "ready",
    slopeMmhgPerMin: slope,
    trend: slope > threshold ? "rising" : slope < -threshold ? "falling" : "stable",
    minutesToLimit: slope > threshold && co2 <= V.limits.co2TargetMmhg ? (V.limits.co2TargetMmhg - co2) / slope : null,
    projectedCo2Mmhg: Math.max(0, co2 + slope * V.demoSettings.forecastHorizonMin),
  };
}

export function co2Level(co2Mmhg: number, forecast: Co2Forecast): Co2Level {
  if (co2Mmhg > V.limits.co2TargetMmhg) return "high";
  if (forecast.state === "ready" && forecast.minutesToLimit !== null && forecast.minutesToLimit <= V.demoSettings.forecastHorizonMin) {
    return "elevated";
  }
  return "low";
}

export function co2Message(level: Co2Level, forecast: Co2Forecast): string {
  if (level === "high") return V.messages.high;
  if (level === "elevated" && forecast.state === "ready" && forecast.minutesToLimit !== null) {
    return fill(V.messages.elevated, { n: String(Math.round(forecast.minutesToLimit)) });
  }
  if (forecast.state === "collecting") return V.messages.collecting;
  return V.messages.low;
}

export function co2Status(co2Mmhg: number, forecast: Co2Forecast = { state: "collecting" }): AirStatus {
  return LEVEL_TO_STATUS[co2Level(co2Mmhg, forecast)];
}

export function o2Status(o2Mmhg: number): AirStatus {
  if (o2Mmhg < V.limits.o2RedBelowMmhg) return "red";
  if (o2Mmhg < V.limits.o2GreenFromMmhg) return "yellow";
  return "green";
}

export function pressureStatus(psia: number): AirStatus {
  return psia >= V.limits.pressureMinPsia && psia <= V.limits.pressureMaxPsia ? "green" : "red";
}

export function noiseStatus(dba: number): AirStatus {
  return dba >= V.limits.noiseHazardDba ? "red" : "green";
}

function formatMetric(metric: AirMetric, value: number): string {
  if (metric === "co2") return `CO₂ ${fmt(value, FORMAT.co2Decimals)} mmHg`;
  if (metric === "o2") return `O₂ ${fmt(value, FORMAT.otherDecimals)} mmHg`;
  if (metric === "pressure") return `Pressure ${fmt(value, FORMAT.otherDecimals)} psia`;
  return `Noise ${fmt(value, FORMAT.otherDecimals)} dBA`;
}

export function evaluateModuleAir(
  reading: Pick<ModuleReading, "co2Mmhg" | "o2Mmhg" | "pressurePsia" | "noiseDba">,
  forecast: Co2Forecast = { state: "collecting" },
  co2Tag: DataTag = "SIM",
  co2TagNote?: string
): ModuleAirStatus {
  const metrics: MetricStatus[] = [
    {
      metric: "co2",
      value: reading.co2Mmhg,
      unit: "mmHg",
      status: co2Status(reading.co2Mmhg, forecast),
      tag: co2Tag,
      text: formatMetric("co2", reading.co2Mmhg),
      ...(co2TagNote ? { tagNote: co2TagNote } : {}),
    },
    { metric: "o2", value: reading.o2Mmhg, unit: "mmHg", status: o2Status(reading.o2Mmhg), tag: "SIM", text: formatMetric("o2", reading.o2Mmhg) },
    {
      metric: "pressure",
      value: reading.pressurePsia,
      unit: "psia",
      status: pressureStatus(reading.pressurePsia),
      tag: "SIM",
      text: formatMetric("pressure", reading.pressurePsia),
    },
    { metric: "noise", value: reading.noiseDba, unit: "dBA", status: noiseStatus(reading.noiseDba), tag: "SIM", text: formatMetric("noise", reading.noiseDba) },
  ];
  let worst = metrics[0];
  for (const m of metrics) {
    if (STATUS_SEVERITY[m.status] > STATUS_SEVERITY[worst.status]) worst = m;
  }
  return { status: worst.status, worstMetric: worst, metrics };
}

function countStatuses(statuses: readonly AirStatus[]): Record<AirStatus, number> {
  const counts: Record<AirStatus, number> = { green: 0, yellow: 0, red: 0 };
  for (const s of statuses) counts[s]++;
  return counts;
}

export function formatBanner(statuses: readonly AirStatus[]): string {
  const c = countStatuses(statuses);
  return `Modules: ${c.green} green, ${c.yellow} yellow, ${c.red} red`;
}

export function advanceSimulatedMinutes(currentMin: number, realSecondsElapsed: number, speed: number): number {
  const next = currentMin + (Math.max(0, realSecondsElapsed) / 60) * Math.max(0, speed);
  return Math.min(Math.max(0, next), V.demoSettings.maxSimulatedMin);
}

export function demoCabinSource(): CabinCo2Source {
  return { tag: "SIM", rows: V.demoCo2SeriesMmhg.map((co2Mmhg) => ({ co2Mmhg, temperatureC: null, humidityPct: null })) };
}

export function cabinSourceFromSamples(samples: readonly HazardSampleRecord[]): CabinCo2Source | null {
  const ordered = [...samples];
  const allIndexed = ordered.length > 0 && ordered.every((s) => toFiniteNumber(s.samplePayload?.rowIndex) !== null);
  ordered.sort((a, b) => {
    const byKey = allIndexed
      ? (toFiniteNumber(a.samplePayload.rowIndex) as number) - (toFiniteNumber(b.samplePayload.rowIndex) as number)
      : Date.parse(a.recordedAt) - Date.parse(b.recordedAt);
    return byKey || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });

  const rows: CabinRow[] = [];
  for (const s of ordered) {
    const payload = s.samplePayload ?? {};
    const raw = s.numericValue ?? toFiniteNumber(payload.co2);
    if (raw === null || !Number.isFinite(raw) || raw < 0) continue;
    rows.push({
      co2Mmhg: cleanFloat(co2ToMmhg(raw, resolveCo2Unit(raw, payload.unit))),
      temperatureC: toFiniteNumber(payload.temperatureC),
      humidityPct: toFiniteNumber(payload.humidityPct),
    });
  }
  return rows.length > 0 ? { tag: "REAL", rows } : null;
}

function normalizeScenario(raw: string): string {
  const key = raw.trim().toLowerCase();
  for (const id of V.demoScenarios.ids) {
    if (id === key || V.demoScenarios.labels[id].toLowerCase() === key) return id;
  }
  return "none";
}

function latestRecord(records: readonly HazardDataRecord[], streamName: string): HazardDataRecord | undefined {
  let best: HazardDataRecord | undefined;
  for (const r of records) {
    if (r.hazardSlug !== "environment" || r.streamName !== streamName) continue;
    if (!best || Date.parse(r.updatedAt) > Date.parse(best.updatedAt)) best = r;
  }
  return best;
}

function pickCabinSamples(src: EnvironmentStateSource): HazardSampleRecord[] {
  const isCabin = (s: HazardSampleRecord) => s.hazardSlug === "environment" && s.streamName === V.streams.cabinCo2;
  const own = (src.hazardSamples ?? []).filter(isCabin);
  if (own.length > 0) return own;

  const byCharacter = new Map<string, HazardSampleRecord[]>();
  for (const s of src.scenarioHazardSamples ?? []) {
    if (!isCabin(s)) continue;
    const list = byCharacter.get(s.characterId) ?? [];
    list.push(s);
    byCharacter.set(s.characterId, list);
  }
  let best: HazardSampleRecord[] = [];
  byCharacter.forEach((list) => {
    if (list.length > best.length) best = list;
  });
  return best;
}

export function readEnvironmentState(src: EnvironmentStateSource): EnvironmentState {
  const records = [...(src.hazardRecords ?? []), ...(src.scenarioHazardRecords ?? [])];
  const samples = [...(src.hazardSamples ?? []), ...(src.scenarioHazardSamples ?? [])];
  const read = (streamName: string) => {
    const record = latestRecord(records, streamName);
    const direct = src.actorInputs?.[streamName]?.trim();
    return { raw: direct || record?.rawValue || "", payload: record?.payload ?? {} };
  };

  const scenario = read(V.streams.demoScenario);
  const elapsed = toFiniteNumber(read(V.streams.simulatedMinutes).raw);
  const start = toFiniteNumber(scenario.payload.startedAtMin);

  const moduleSamples: Record<string, HazardSampleRecord[]> = {};
  const modulePayloads: Record<string, Record<string, unknown>> = {};
  for (const mod of V.modules) {
    const modList = samples
      .filter((s) => s.hazardSlug === "environment" && s.streamName === mod.streamName && s.numericValue !== null)
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
    if (modList.length > 0) {
      moduleSamples[mod.id] = modList.slice(-16);
    }
    const rec = latestRecord(records, mod.streamName);
    if (rec?.payload) {
      modulePayloads[mod.id] = rec.payload;
    }
  }

  return {
    elapsedMin: elapsed !== null && elapsed > 0 ? Math.min(elapsed, V.demoSettings.maxSimulatedMin) : 0,
    scenarioId: normalizeScenario(scenario.raw),
    scenarioStartMin: start !== null && start > 0 ? start : 0,
    cabin: cabinSourceFromSamples(pickCabinSamples(src)) ?? demoCabinSource(),
    moduleSamples,
    modulePayloads,
  };
}

interface ModuleRun {
  history: Co2Sample[];
  forecast: Co2Forecast;
  level: Co2Level;
  ledger: ModuleLedger;
  alertStartMin: number | null;
  reading: ModuleReading;
}

function runModule(module: ModuleConfig, moduleIndex: number, state: EnvironmentState, lastIndex: number): ModuleRun {
  const step = V.demoSettings.replayStepMin;
  const modSamples = state.moduleSamples[module.id] ?? [];
  const modPayload = state.modulePayloads[module.id];

  // Live chaos DB sample path (for --mode chaos)
  if (state.scenarioId === "chaos" && modSamples.length >= 2) {
    const t0 = Date.parse(modSamples[0].recordedAt) || 0;
    const history: Co2Sample[] = [];
    const window: Co2Sample[] = [];
    let forecast: Co2Forecast = { state: "collecting" };
    let level: Co2Level = "low";
    let alertStartMin: number | null = null;
    let minutesAboveLimit = 0;
    let maxCo2Mmhg = -Infinity;

    modSamples.forEach((s, idx) => {
      const ts = Date.parse(s.recordedAt) || t0 + idx * step * 60_000;
      const tMin = Math.max(0, Math.round((ts - t0) / 60_000));
      const co2Mmhg = cleanFloat(s.numericValue as number);
      const sample = { tMin, co2Mmhg };
      history.push(sample);
      window.push(sample);
      while (window[0].tMin < tMin - V.demoSettings.forecastWindowMin) window.shift();
      forecast = co2Forecast(window, 0);
      level = co2Level(co2Mmhg, forecast);
      if (level === "low") alertStartMin = null;
      else if (alertStartMin === null) alertStartMin = tMin;
      if (idx > 0 && co2Mmhg > V.limits.co2TargetMmhg) {
        minutesAboveLimit += Math.max(1, tMin - history[idx - 1].tMin);
      }
      maxCo2Mmhg = Math.max(maxCo2Mmhg, co2Mmhg);
    });

    const latestPayload = modPayload ?? modSamples[modSamples.length - 1].samplePayload ?? {};
    const num = (key: string, fb: number) => toFiniteNumber(latestPayload[key]) ?? fb;
    return {
      history,
      forecast,
      level,
      ledger: { minutesAboveLimit, maxCo2Mmhg },
      alertStartMin,
      reading: {
        co2Mmhg: history[history.length - 1].co2Mmhg,
        o2Mmhg: cleanFloat(num("o2MmHg", module.o2Mmhg)),
        pressurePsia: cleanFloat(num("pressurePsia", module.pressurePsia)),
        noiseDba: cleanFloat(num("noiseDba", module.noiseDba)),
        temperatureC: toFiniteNumber(latestPayload.temperatureC),
        humidityPct: toFiniteNumber(latestPayload.humidityPct),
      },
    };
  }

  // Deterministic chaos fallback without DB samples
  if (state.scenarioId === "chaos") {
    const chaosLastIdx = Math.max(11, lastIndex);
    const chaosNowMin = chaosLastIdx * step;
    const window: Co2Sample[] = [];
    const history: Co2Sample[] = [];
    let forecast: Co2Forecast = { state: "collecting" };
    let level: Co2Level = "low";
    let alertStartMin: number | null = null;
    let minutesAboveLimit = 0;
    let maxCo2Mmhg = -Infinity;

    for (let k = 0; k <= chaosLastIdx; k++) {
      const tMin = k * step;
      const swing = Math.sin((k + 1) * 1.85 + moduleIndex * 1.4) * 3.4;
      const spike = (k + moduleIndex) % 2 === 0 ? 2.2 : -1.4;
      const co2Mmhg = cleanFloat(Math.max(1.2, 4.9 + swing + spike));
      const sample = { tMin, co2Mmhg };
      window.push(sample);
      while (window[0].tMin < tMin - V.demoSettings.forecastWindowMin) window.shift();
      forecast = co2Forecast(window, 0);
      level = co2Level(co2Mmhg, forecast);
      if (level === "low") alertStartMin = null;
      else if (alertStartMin === null) alertStartMin = tMin;
      if (k > 0 && co2Mmhg > V.limits.co2TargetMmhg) minutesAboveLimit += step;
      maxCo2Mmhg = Math.max(maxCo2Mmhg, co2Mmhg);
      if (tMin >= chaosNowMin - V.demoSettings.historyWindowMin) history.push(sample);
    }

    const phase = chaosNowMin / step + moduleIndex;
    return {
      history,
      forecast,
      level,
      ledger: { minutesAboveLimit, maxCo2Mmhg },
      alertStartMin,
      reading: {
        co2Mmhg: history[history.length - 1].co2Mmhg,
        o2Mmhg: cleanFloat(132 + Math.cos(phase * 2.1) * 24),
        pressurePsia: cleanFloat(10.2 + Math.sin(phase * 1.7) * 5.6),
        noiseDba: cleanFloat(76 + Math.sin(phase * 2.5) * 26),
        temperatureC: null,
        humidityPct: null,
      },
    };
  }

  const nowMin = lastIndex * step;
  const rows = state.cabin.rows;
  const scrubber = V.demoScenarios.co2ScrubberFailure;
  const scrubberOn = state.scenarioId === "co2-scrubber-failure";

  const window: Co2Sample[] = [];
  const history: Co2Sample[] = [];
  let forecast: Co2Forecast = { state: "collecting" };
  let level: Co2Level = "low";
  let alertStartMin: number | null = null;
  let minutesAboveLimit = 0;
  let maxCo2Mmhg = -Infinity;

  for (let k = 0; k <= lastIndex; k++) {
    const tMin = k * step;
    const rise = scrubberOn
      ? Math.min(scrubber.co2RiseMmhgPerMin * Math.max(0, tMin - state.scenarioStartMin), scrubber.co2RiseCapMmhg)
      : 0;
    const sample: Co2Sample = { tMin, co2Mmhg: cleanFloat(rows[k % rows.length].co2Mmhg + module.co2OffsetMmhg + rise) };

    window.push(sample);
    while (window[0].tMin < tMin - V.demoSettings.forecastWindowMin) window.shift();
    forecast = co2Forecast(window, 0);
    level = co2Level(sample.co2Mmhg, forecast);
    if (level === "low") alertStartMin = null;
    else if (alertStartMin === null) alertStartMin = tMin;

    if (k > 0 && sample.co2Mmhg > V.limits.co2TargetMmhg) minutesAboveLimit += step;
    maxCo2Mmhg = Math.max(maxCo2Mmhg, sample.co2Mmhg);
    if (tMin >= nowMin - V.demoSettings.historyWindowMin) history.push(sample);
  }

  const elapsedInScenario = Math.max(0, nowMin - state.scenarioStartMin);
  const noise = V.demoSettings.sensorNoise;
  const round = (v: number) => Number(v.toFixed(FORMAT.storeDecimals));

  let o2Mmhg = module.o2Mmhg;
  const leak = V.demoScenarios.o2LeakLab;
  if (state.scenarioId === "o2-leak-lab" && module.id === leak.moduleId) {
    o2Mmhg -= (module.o2Mmhg - leak.o2FallsToMmhg) * Math.min(elapsedInScenario / leak.overMin, 1);
  }
  let noiseDba = module.noiseDba;
  const noisy = V.demoScenarios.noisyGalley;
  if (state.scenarioId === "noisy-galley" && module.id === noisy.moduleId) {
    noiseDba += (noisy.noiseRisesToDba - module.noiseDba) * Math.min(elapsedInScenario / noisy.overMin, 1);
  }

  const cabinNow = rows[lastIndex % rows.length];
  return {
    history,
    forecast,
    level,
    ledger: { minutesAboveLimit, maxCo2Mmhg },
    alertStartMin,
    reading: {
      co2Mmhg: history[history.length - 1].co2Mmhg,
      o2Mmhg: round(o2Mmhg + noise.o2Mmhg * jitter(moduleIndex, lastIndex, 1)),
      pressurePsia: round(module.pressurePsia + noise.pressurePsia * jitter(moduleIndex, lastIndex, 2)),
      noiseDba: round(noiseDba + noise.noiseDba * jitter(moduleIndex, lastIndex, 3)),
      temperatureC: cabinNow.temperatureC,
      humidityPct: cabinNow.humidityPct,
    },
  };
}

function buildProjection(nowMin: number, co2Mmhg: number, forecast: Co2Forecast): Co2Sample[] {
  if (forecast.state !== "ready") return [];
  const points: Co2Sample[] = [];
  for (let dt = 0; dt <= V.demoSettings.forecastHorizonMin; dt += V.demoSettings.projectionStepMin) {
    points.push({
      tMin: nowMin + dt,
      co2Mmhg: Math.max(0, cleanFloat(co2Mmhg + forecast.slopeMmhgPerMin * dt)),
    });
  }
  return points;
}

function buildAlert(
  module: ModuleConfig,
  run: ModuleRun,
  lowestOther: ModuleConfig | undefined
): ModuleAlert | null {
  if (run.level === "low" || run.alertStartMin === null) return null;
  const severity: AlertSeverity = run.level === "high" ? "critical" : "warning";
  const values = { Module: module.name, Lowest: lowestOther?.name ?? module.name };
  const id = `${module.id}@${run.alertStartMin}`;
  const minutesToLimit = run.forecast.state === "ready" ? run.forecast.minutesToLimit : null;
  return {
    id,
    ackKey: `${id}:${severity}`,
    moduleId: module.id,
    moduleName: module.name,
    severity,
    title:
      severity === "critical"
        ? `${module.name}: CO₂ above ${V.limits.co2TargetMmhg} mmHg`
        : `${module.name}: CO₂ approaching ${V.limits.co2TargetMmhg} mmHg`,
    startedAtMin: run.alertStartMin,
    etaMin: severity === "critical" || minutesToLimit === null ? 0 : Math.round(minutesToLimit),
    actions: V.alertActions[severity].map((text) => fill(text, values)),
  };
}

export function simulateEnvironment(state: EnvironmentState): EnvironmentModel {
  const step = V.demoSettings.replayStepMin;
  const lastIndex = Math.floor(Math.max(0, Math.min(state.elapsedMin, V.demoSettings.maxSimulatedMin)) / step);
  const runs = V.modules.map((module, i) => runModule(module, i, state, lastIndex));
  const nowMin = runs[0].history[runs[0].history.length - 1]?.tMin ?? lastIndex * step;

  let lowestIndex = 0;
  runs.forEach((run, i) => {
    if (run.reading.co2Mmhg < runs[lowestIndex].reading.co2Mmhg) lowestIndex = i;
  });
  const lowestOtherThan = (index: number): ModuleConfig | undefined => {
    let best = -1;
    for (let i = 0; i < runs.length; i++) {
      if (i !== index && (best < 0 || runs[i].reading.co2Mmhg < runs[best].reading.co2Mmhg)) best = i;
    }
    return best < 0 ? undefined : V.modules[best];
  };

  const modules: ModuleModel[] = V.modules.map((module, i) => {
    const run = runs[i];
    const co2 = run.reading.co2Mmhg;
    const isChaosLive = state.scenarioId === "chaos" && (state.moduleSamples[module.id]?.length ?? 0) >= 2;
    const co2Tag: DataTag = isChaosLive ? "SIM" : state.cabin.tag;
    const co2TagNote =
      co2Tag === "REAL" && module.co2OffsetMmhg !== 0 ? "NASA EDA cabin CO₂ + module offset" : undefined;
    const multiplier = co2RiskMultiplier(co2);
    const weeklyRisk = illustrativeWeeklyRisk(co2);
    const infoMetrics: InfoMetric[] = [];
    if (run.reading.temperatureC !== null) {
      infoMetrics.push({ key: "temperature", label: "Temp", value: run.reading.temperatureC, unit: "°C", tag: state.cabin.tag });
    }
    if (run.reading.humidityPct !== null) {
      infoMetrics.push({ key: "humidity", label: "Humidity", value: run.reading.humidityPct, unit: "%RH", tag: state.cabin.tag });
    }
    return {
      moduleId: module.id,
      moduleName: module.name,
      reading: run.reading,
      air: evaluateModuleAir(run.reading, run.forecast, co2Tag, co2TagNote),
      infoMetrics,
      history: run.history,
      projection: buildProjection(nowMin, co2, run.forecast),
      forecast: run.forecast,
      level: run.level,
      multiplier,
      multiplierText: `x${fmt(multiplier, FORMAT.co2Decimals)} vs target`,
      weeklyRisk,
      weeklyRiskText: `${(weeklyRisk * 100).toFixed(1)}% weekly risk (illustrative)`,
      message: co2Message(run.level, run.forecast),
      alert: buildAlert(module, run, lowestOtherThan(i)),
      ledger: run.ledger,
    };
  });

  const statuses = modules.map((m) => m.air.status);
  const alerts = modules
    .map((m) => m.alert)
    .filter((a): a is ModuleAlert => a !== null)
    .sort((a, b) => (a.severity === b.severity ? a.etaMin - b.etaMin : a.severity === "critical" ? -1 : 1));

  return {
    nowMin,
    scenarioId: state.scenarioId,
    scenarioLabel: V.demoScenarios.labels[state.scenarioId] ?? state.scenarioId,
    dataTag: state.cabin.tag,
    modules,
    counts: countStatuses(statuses),
    banner: formatBanner(statuses),
    alerts,
    lowestCo2ModuleId: V.modules[lowestIndex].id,
  };
}

export function buildEnvironmentModel(src: EnvironmentStateSource): EnvironmentModel {
  return simulateEnvironment(readEnvironmentState(src));
}

export function getAirLayer(source: EnvironmentStateSource | EnvironmentModel = {}): AirLayerEntry[] {
  const model = "modules" in source ? source : buildEnvironmentModel(source);
  return model.modules.map((m) => ({ moduleId: m.moduleId, status: m.air.status, worstMetric: m.air.worstMetric }));
}

// ---------------------------------------------------------------------------
// evaluate()
// ---------------------------------------------------------------------------

function buildSolutions(model: EnvironmentModel, maxSolutions: number): string[] {
  const allRed = model.modules.length > 0 && model.modules.every((m) => m.air.status === "red");
  if (allRed) {
    const byCo2Desc = [...model.modules].sort((a, b) => b.reading.co2Mmhg - a.reading.co2Mmhg);
    const worst = byCo2Desc[0];
    const lowest = byCo2Desc[byCo2Desc.length - 1];
    return [
      fill(V.otherActions.inspectScrubber, { Module: worst.moduleName }),
      `Stage crew in ${lowest.moduleName} (${fmt(lowest.reading.co2Mmhg, FORMAT.co2Decimals)} mmHg CO₂).`,
    ].slice(0, maxSolutions);
  }

  const problems: { rank: number; actions: string[] }[] = [];
  for (const a of model.alerts) {
    problems.push({ rank: a.severity === "critical" ? 0 : 2, actions: a.actions });
  }
  for (const m of model.modules) {
    for (const metric of m.air.metrics) {
      if (metric.metric === "co2" || metric.status === "green") continue;
      const tpl = metric.metric === "o2" ? V.otherActions.o2 : V.otherActions.isolate;
      problems.push({ rank: metric.status === "red" ? 1 : 3, actions: [fill(tpl, { Module: m.moduleName })] });
    }
  }
  problems.sort((a, b) => a.rank - b.rank);

  const actions: string[] = [];
  for (const p of problems) {
    for (const a of p.actions) {
      if (!actions.includes(a)) actions.push(a);
    }
  }
  return actions.slice(0, maxSolutions);
}

function chartFor(m: ModuleModel, scenarioId: string): HazardChartSpec {
  const thresholds: HazardChartThreshold[] = [
    { label: V.chart.limitLabel, value: V.limits.co2TargetMmhg, color: V.chart.limitColor },
  ];
  const projPts =
    scenarioId === "chaos"
      ? []
      : m.projection.slice(1).map((p, idx) => ({
          label: `+${(idx + 1) * V.demoSettings.projectionStepMin}m`,
          value: Number(p.co2Mmhg.toFixed(FORMAT.co2Decimals)),
        }));
  return {
    id: `co2-${m.moduleId}`,
    title: `${m.moduleName} CO₂ (NASA target ${V.limits.co2TargetMmhg} mmHg)`,
    unit: "mmHg",
    series: m.history.map((s) => ({ label: `${s.tMin} min`, value: s.co2Mmhg })),
    projectionSeries: projPts.length > 0 ? projPts : undefined,
    thresholds,
  };
}

export function evaluateEnvironmentHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { actor } = input;
  const maxSolutions = 2;
  const model = buildEnvironmentModel(input);

  const status: HazardEvaluationResult["status"] =
    model.counts.red > 0 ? "CRITICAL" : model.counts.yellow > 0 ? "ELEVATED" : "NOMINAL";

  const immediateLines: string[] = [];
  const criticalAlerts = model.alerts.filter((a) => a.severity === "critical");
  if (criticalAlerts.length > 0) {
    const listed = criticalAlerts
      .map((a) => {
        const mod = model.modules.find((m) => m.moduleId === a.moduleId);
        return `${a.moduleName} (${fmt(mod?.reading.co2Mmhg ?? 0, FORMAT.co2Decimals)} mmHg)`;
      })
      .join(", ");
    immediateLines.push(`${listed}: ${V.messages.high}`);
  }
  for (const a of model.alerts.filter((x) => x.severity === "warning")) {
    immediateLines.push(`${a.moduleName}: reaches ${V.limits.co2TargetMmhg} mmHg in ~${a.etaMin} min`);
  }
  for (const m of model.modules) {
    for (const metric of m.air.metrics) {
      if (metric.metric !== "co2" && metric.status !== "green") {
        immediateLines.push(`${m.moduleName}: ${metric.text}`);
      }
    }
  }

  const peakModule = model.modules.reduce((best, curr) =>
    curr.reading.co2Mmhg > best.reading.co2Mmhg ? curr : best
  );
  const exposedModules = model.modules.filter((m) => m.ledger.minutesAboveLimit > 0);
  const exposureSummary =
    exposedModules.length > 0
      ? `${exposedModules.length}/4 modules > ${V.limits.co2TargetMmhg} mmHg`
      : `0/4 modules over ${V.limits.co2TargetMmhg} mmHg limit`;

  const prolongedHorizon = `Peak CO₂: ${fmt(peakModule.reading.co2Mmhg, FORMAT.co2Decimals)} mmHg (${peakModule.moduleName}, ${peakModule.weeklyRiskText}) · ${exposureSummary}`;

  const warningNearest = model.alerts
    .filter((a) => a.severity === "warning")
    .sort((a, b) => a.etaMin - b.etaMin)[0];
  const fallbackEta =
    criticalAlerts.length > 0
      ? `Target exceeded in ${criticalAlerts.map((a) => a.moduleName).join(", ")}`
      : warningNearest
      ? `${warningNearest.moduleName}: ~${warningNearest.etaMin} min to ${V.limits.co2TargetMmhg} mmHg`
      : status === "ELEVATED"
      ? "Elevated CO₂ / O₂ trend"
      : "Nominal habitat air";
  const eta = actor.metrics.etaSlot.toLowerCase().includes("add your info")
    ? fallbackEta
    : criticalAlerts.length > 0 || warningNearest
    ? fallbackEta
    : actor.metrics.etaSlot;

  return {
    status,
    scenarioStatusSlot: `${model.banner} · ${model.scenarioLabel}`,
    immediateHorizon: immediateLines.length > 0 ? immediateLines.slice(0, 3).join(" · ") : "All 4 habitat modules nominal.",
    prolongedHorizon,
    eta,
    solutions: buildSolutions(model, maxSolutions),
    charts: model.modules.map((m) => chartFor(m, model.scenarioId)),
  };
}

// [SECTION 3: HAZARD 5 UI METADATA, INPUT STREAMS & ALARMS]
export const environmentHazard: HazardSpec = {
  slug: "environment",
  number: 5,
  title: "Hostile/Closed Environments",
  shortTitle: "Environment",
  ownerSlot: "src/lib/hazards/05-environment.ts",
  sourceDoc: "docs/hazards/05-hostile-closed-environments.md",
  nasaReferences: [
    "NASA HRP Hostile/Closed Environments",
    "NASA OCHMO CO₂ Technical Brief",
    "NASA OCHMO Habitable Atmosphere Technical Brief",
    "NASA OCHMO Acoustics Technical Brief",
    "NASA OSDR Environmental Data App (EDA)",
  ],
  overviewSlot:
    "Closed-ecosystem habitat telemetry for cabin CO₂, O₂, pressure, acoustics, and crew relocation.",
  inputSlots: [
    {
      streamName: V.streams.cabinCo2,
      inputPrompt: "ISS / cabin CO₂ telemetry points (ppm, %, or mmHg) with optional temp & humidity",
      sourceRef: "NASA OSDR Environmental Data App (EDA)",
    },
    ...V.modules.map((m) => ({
      streamName: m.streamName,
      inputPrompt: `${m.name} CO₂ (<= 4 mmHg), O₂ (>= 122 mmHg), pressure (5.0–15.0 psia), noise (< 85 dBA)`,
      sourceRef: "OCHMO CO₂ / Habitable Atmosphere / Acoustics",
    })),
    {
      streamName: V.streams.demoScenario,
      inputPrompt: "Scenario id (none, co2-scrubber-failure, o2-leak-lab, noisy-galley, chaos)",
      sourceRef: "05-hostile-closed-environments.md §4 Demo Scenarios",
    },
    {
      streamName: V.streams.simulatedMinutes,
      inputPrompt: "Elapsed simulated minutes (0+) for replay",
      sourceRef: "05-hostile-closed-environments.md §4 Shared Simulation",
      fieldType: "number",
      unit: "min",
    },
  ],
  outputSlots: {
    immediateHorizon: "Acute hypoxia, pressure-change, or noise alarms and module evacuation.",
    prolongedHorizon: "CO₂ headache risk forecast, module map, and sleep-environment report.",
    etaSlot: "Projected time until CO₂ or O₂ crosses NASA OCHMO operational limit.",
    solutionsSlot: "Module relocation or ECLSS inspection actions.",
  },
  leadView: {
    summary: "Module weather map, CO₂ headache forecast, and crew relocation orders.",
    privacyRule: "Module telemetry is crew-wide; contact tracing is disabled.",
    modules: [
      {
        title: "Module Weather Map & Replay Control",
        detail: "Live or replayed green/yellow/red status per module for CO₂, O₂, pressure, and noise.",
        actionSlot: "Module telemetry override or replay",
      },
      {
        title: "Crew Headache Forecast & Relocation",
        detail: "Cross-crew headache odds alert and module reassignment plan.",
        actionSlot: "Crew module reassignment",
      },
    ],
  },
  memberView: {
    summary: "Module relocation guidance and morning Sleep & Environment summary.",
    privacyRule: "Personal symptom logs remain private while shared module alerts warn the crew.",
    modules: [
      {
        title: "Where-to-Go & Sleep Report",
        detail: "Morning briefing and module relocation guidance.",
        actionSlot: "Morning symptom check",
      },
      {
        title: "Module Safety Limits",
        detail: "NASA OCHMO bounds: CO₂ <= 4 mmHg, O₂ >= 122 mmHg, 5–15 psia, < 85 dBA / NC-40.",
        actionSlot: "Handheld sensor check",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=environment", purpose: "Fetch persisted environment records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert cabin atmosphere or acoustics telemetry into Supabase" },
  ],
  alarmPreset: {
    title: "CLOSED HABITAT ATMOSPHERE BREACH — CO₂ / O₂ / PRESSURE ALERT",
    severity: "CRITICAL",
    etaLabel: "Estimated Time of Action before O₂ floor or CO₂ threshold",
    descriptionSlot:
      "Module atmospheric telemetry breached operational bounds. Crew at risk of shared environmental debuff.",
    leadActions: [
      "1. Move non-essential crew to lowest-CO₂ green-status compartment.",
      "2. Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop.",
    ],
    memberActions: [
      "1. Relocate to the lowest-CO₂ module shown on the Habitat Map.",
      "2. Report any acute headache, dizziness, or ear-ringing symptom.",
    ],
  },
  evaluate: evaluateEnvironmentHazard,
};
