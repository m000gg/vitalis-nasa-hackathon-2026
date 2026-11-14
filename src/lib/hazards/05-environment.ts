import {
  HazardChartSpec,
  HazardChartThreshold,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

/**
 * ============================================================================
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS
 * Owner: Teammate 5 — Edit ONLY this file (src/lib/hazards/05-environment.ts).
 * Spec: docs/hazards/05-hostile-closed-environments.md §4 (Shared simulation, Feature 1 Habitat Map,
 * Feature 2 Air Risk Forecast).
 * ============================================================================
 */

// [SECTION 1: HAZARD 5 VALUES & THRESHOLD SLOTS]
// Every value below carries a tag:
//   [2] [4] [5]   NASA source number (docs/hazards/05-hostile-closed-environments.md, Sources)
//   [REAL]        real NASA data (only the ISS cabin CO2 from the OSDR Environmental Data App)
//   [DEMO]        a demo input or demo setting, not data and not a research claim
//   [ARITHMETIC]  plain math, not a research claim
export const ENVIRONMENT_PIPELINE_VALUES = {
  supportedStreams: ["Cabin CO2 Replay", "Demo Scenario", "Simulated Minutes Elapsed"],

  // --- Input stream names (DB-driven: written by the EDA seeder / simulation clock, never by astronauts) ---
  streams: {
    // [REAL] one sample per EDA CSV row: numericValue = CO2, samplePayload { unit, temperatureC, humidityPct, rowIndex }
    cabinCo2: "Cabin CO2 Replay",
    // [DEMO] rawValue = demo scenario id, payload { startedAtMin } = simulated minute the demo button was pressed
    demoScenario: "Demo Scenario",
    // [DEMO] rawValue = simulated minutes since replay start (advanced by the 1x / 60x / 600x clock, 0 = reset)
    simulatedMinutes: "Simulated Minutes Elapsed",
  },

  // --- NASA limits (research) ---
  limits: {
    co2TargetMmhg: 4, // [2] NASA target: CO2 at or below 4 mmHg
    o2GreenFromMmhg: 130, // [4] green at 130 mmHg or more, yellow from 122 to 130
    o2RedBelowMmhg: 122, // [4] absolute lower limit, 1-hour time-weighted average
    pressureMinPsia: 5.0, // [4] total pressure for indefinite crew exposure
    pressureMaxPsia: 15.0, // [4]
    noiseHazardDba: 85, // [5] hazardous noise: below 85 dBA regardless of duration
    noiseReferenceText: "sleep areas on missions over 30 days: NC-40", // [5] information only, no status is computed from it
  },

  // --- Headache odds [2] ---
  risk: {
    oddsFactorPerMmhg: 2, // [2] each +1 mmHg of CO2 doubles the odds of a headache
    weeklyOddsAtTarget: 0.0163, // [2] anchors the illustrative weekly risk at 1.6% for 4 mmHg
  },

  // --- Unit conversion and forecast arithmetic ---
  arithmetic: {
    co2PpmToMmhg: 0.00076, // [ARITHMETIC] mmHg = ppm * 0.00076 (1 mmHg = 1/760 atm)
    co2PercentToMmhg: 7.6, // [ARITHMETIC] mmHg = percent * 7.6
    ppmFromValue: 100, // [ARITHMETIC] a CO2 value without a unit of 100 or more can only be ppm (100 mmHg = 13% CO2)
    slopeThresholdMmhgPerMin: 0.001, // [ARITHMETIC] above +0.001 rising, below -0.001 falling, in between stable
  },

  // --- Demo settings ---
  demoSettings: {
    forecastWindowMin: 30, // [DEMO] the line is fitted to the last 30 simulated minutes
    forecastHorizonMin: 120, // [DEMO] yellow / elevated when the 4 mmHg limit is reached within 2 h
    historyWindowMin: 120, // [DEMO] charts show the last 2 simulated hours
    projectionStepMin: 30, // [DEMO] spacing of the dashed projection points
    replayStepMin: 10, // [DEMO] one CSV row (or demo point) = 10 simulated minutes
    replaySpeeds: [1, 60, 600], // [DEMO] simulated minutes per real minute (1x / 60x / 600x)
    maxSimulatedMin: 1_000_000, // [DEMO] safety cap on the simulated clock (about 1.9 simulated years)
    // [DEMO] amplitude of the "small noise" on simulated values (deterministic, see jitter())
    sensorNoise: { o2Mmhg: 0.5, pressurePsia: 0.05, noiseDba: 1 },
  },

  // --- Modules (shared map config: other layers key on these ids) ---
  // co2OffsetMmhg is added to the cabin CO2 [DEMO]. O2, pressure and noise are simulated baselines [DEMO].
  modules: [
    { id: "lab", name: "Lab", co2OffsetMmhg: 0, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 62 },
    { id: "habitat", name: "Habitat", co2OffsetMmhg: 0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 45 },
    { id: "galley", name: "Galley", co2OffsetMmhg: 0.2, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 58 },
    { id: "airlock", name: "Airlock", co2OffsetMmhg: -0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 52 },
  ],

  // --- Demo scenarios (the spec's demo buttons, entered through the "Demo Scenario" stream) ---
  demoScenarios: {
    ids: ["none", "co2-scrubber-failure", "o2-leak-lab", "noisy-galley"],
    labels: {
      none: "Clear",
      "co2-scrubber-failure": "CO2 scrubber failure",
      "o2-leak-lab": "O2 leak in Lab",
      "noisy-galley": "Noisy equipment in Galley",
    } as Record<string, string>,
    co2ScrubberFailure: { co2RiseMmhgPerMin: 0.04, co2RiseCapMmhg: 3 }, // [DEMO] all modules
    o2LeakLab: { moduleId: "lab", o2FallsToMmhg: 118, overMin: 20 }, // [DEMO]
    noisyGalley: { moduleId: "galley", noiseRisesToDba: 90, overMin: 10 }, // [DEMO]
  },

  // --- Fake cabin CO2, used only when no EDA samples are in the DB ---
  // [DEMO] a straight ramp from 3.0 mmHg that crosses the 4 mmHg target. NOT NASA DATA.
  // +0.1 mmHg per row (one row = 10 simulated minutes), 19 rows, loops at the end like the CSV replay.
  demoCo2SeriesMmhg: [3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8],
  demoDataBadge: "SIMULATED DATA - NOT NASA",

  // --- Fixed texts (verbatim from the spec) ---
  messages: {
    low: "CO2 is within the NASA target.",
    elevated: "At this rate CO2 reaches the 4 mmHg limit in about {n} min.",
    high: "CO2 is above the NASA limit of 4 mmHg. Each extra 1 mmHg doubles headache odds.",
    collecting: "Collecting data...",
  },
  // [DEMO] alert actions are demo placeholders, not NASA procedures
  alertActions: {
    warning: ["Check the CO2 scrubber for {Module}", "Limit time in {Module} until CO2 stabilizes"],
    critical: ["Check the CO2 scrubber for {Module} now", "Move non-essential work out of {Module}. Lowest CO2 now: {Lowest}"],
  },
  // [DEMO] the team's existing wording for non-CO2 problems (O2, pressure, noise), module level
  otherActions: {
    o2: "Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop ({Module})",
    isolate: "Evacuate/isolate affected module ({Module})",
  },
  // [2] study facts, not computed
  studyFactsText:
    "Weekly headache risk was about 3.3% without a CO2 cap and about 1.6% with CO2 at or below 4 mmHg. Below 1% would need CO2 under 2 mmHg.",
  limitsTooltipLines: [
    "Only the cabin CO2 is real data. Per-module differences, O2, pressure and noise are simulated around NASA limits.",
    "The doubling rule is an estimate from ISS crew data, not an exact law. The weekly percent is illustrative.",
    "Alert actions are demo placeholders.",
  ],
  chart: {
    limitLabel: "NASA limit",
    limitColor: "#ef4444",
    projectionLabel: "Projected +2 h",
    projectionColor: "#f59e0b",
  },
};

// [SECTION 2: HAZARD 5 FORMULAS & EVALUATION PIPELINE]
// Pure functions: the same input always gives the same output. No hidden state, no clock, no Math.random.
// Time is "simulated minutes". Tags: [2] [4] [5] NASA sources, [DEMO] demo input, [ARITHMETIC] plain math.
const V = ENVIRONMENT_PIPELINE_VALUES;

// Presentation only: how many decimals are printed. Not data and not a research claim.
const FORMAT = { co2Decimals: 2, otherDecimals: 1, slopeDecimals: 3, storeDecimals: 2, floatGuardDecimals: 6 };

export type AirStatus = "green" | "yellow" | "red";
export type AirMetric = "co2" | "o2" | "pressure" | "noise";
export type Co2Unit = "ppm" | "percent" | "mmHg";
export type TrendLabel = "rising" | "stable" | "falling";
export type Co2Level = "low" | "elevated" | "high";
export type AlertSeverity = "warning" | "critical";
/** REAL = NASA OSDR EDA data, SIM = simulated around NASA limits. */
export type DataTag = "REAL" | "SIM";

/** One module reading at one moment. */
export interface ModuleReading {
  co2Mmhg: number;
  o2Mmhg: number;
  pressurePsia: number;
  noiseDba: number;
  /** From the EDA CSV if present. Information only (no NASA health limit). */
  temperatureC: number | null;
  /** From the EDA CSV if present. Information only (no NASA health limit). */
  humidityPct: number | null;
}

/** One CO2 reading. `tMin` = simulated minutes since the start. */
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
  /** For example "O2 118 mmHg". */
  text: string;
  /** Extra provenance, e.g. "cabin CO2 REAL, module offset SIM". */
  tagNote?: string;
}

/** Temperature / humidity rows of the module table (no status). */
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

/** Shape returned by getAirLayer(), so other layers can plug into the same map. */
export interface AirLayerEntry {
  moduleId: string;
  status: AirStatus;
  worstMetric: MetricStatus;
}

export type Co2Forecast =
  | { state: "collecting" }
  | {
      state: "ready";
      /** [ARITHMETIC] least-squares slope over the last 30 simulated minutes. */
      slopeMmhgPerMin: number;
      trend: TrendLabel;
      /** [ARITHMETIC] (4 - CO2) / slope, only when rising and not above 4 mmHg. */
      minutesToLimit: number | null;
      /** [ARITHMETIC] CO2 + slope * 120. */
      projectedCo2Mmhg: number;
    };

export interface ModuleLedger {
  /** [ARITHMETIC] simulated minutes spent above the 4 mmHg limit since the replay start. */
  minutesAboveLimit: number;
  /** [ARITHMETIC] maximum CO2 seen since the replay start. */
  maxCo2Mmhg: number;
}

export interface ModuleAlert {
  /** Stable while the alert lasts: `${moduleId}@${startedAtMin}`. */
  id: string;
  /** Changes when a warning escalates to critical, so the screen asks for a new Acknowledge. */
  ackKey: string;
  moduleId: string;
  moduleName: string;
  severity: AlertSeverity;
  title: string;
  startedAtMin: number;
  /** Minutes until CO2 reaches 4 mmHg (warning) or 0 (critical: already above). */
  etaMin: number;
  /** 1-2 demo placeholder actions. */
  actions: string[];
}

export interface ModuleModel {
  moduleId: string;
  moduleName: string;
  reading: ModuleReading;
  /** Feature 1: module status = worst metric status (CO2 uses the forecast for yellow). */
  air: ModuleAirStatus;
  infoMetrics: InfoMetric[];
  /** CO2 samples of the last 2 simulated hours. */
  history: Co2Sample[];
  /** Dashed projection for the next 2 hours (empty while collecting data). */
  projection: Co2Sample[];
  forecast: Co2Forecast;
  level: Co2Level;
  /** [2] 2 ^ (CO2 - 4). */
  multiplier: number;
  /** "x2.0 vs target" */
  multiplierText: string;
  /** [2] illustrative weekly headache risk (0..1). */
  weeklyRisk: number;
  /** "1.6% weekly headache risk (illustrative)" */
  weeklyRiskText: string;
  message: string;
  alert: ModuleAlert | null;
  ledger: ModuleLedger;
}

export interface EnvironmentModel {
  nowMin: number;
  scenarioId: string;
  scenarioLabel: string;
  /** Tag of the cabin CO2 source. */
  dataTag: DataTag;
  /** "SIMULATED DATA - NOT NASA" when no EDA samples exist, otherwise null. */
  dataBadge: string | null;
  modules: ModuleModel[];
  counts: Record<AirStatus, number>;
  /** "Modules: N green, N yellow, N red" */
  banner: string;
  /** Active alerts, critical first. */
  alerts: ModuleAlert[];
  lowestCo2ModuleId: string;
}

/** One cabin row (EDA CSV row or demo point). */
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
  /** Simulated minute the demo scenario started. */
  scenarioStartMin: number;
  cabin: CabinCo2Source;
}

/** Anything that carries the DB-synced Hazard 5 streams (HazardEvaluationInput or the screen props). */
export interface EnvironmentStateSource {
  actorInputs?: Record<string, string>;
  hazardRecords?: readonly HazardDataRecord[];
  hazardSamples?: readonly HazardSampleRecord[];
  scenarioHazardRecords?: readonly HazardDataRecord[];
  scenarioHazardSamples?: readonly HazardSampleRecord[];
}

type ModuleConfig = (typeof ENVIRONMENT_PIPELINE_VALUES.modules)[number];

const STATUS_SEVERITY: Record<AirStatus, number> = { green: 0, yellow: 1, red: 2 };
const HAZARD_SEVERITY: Record<HazardEvaluationResult["status"], number> = { NOMINAL: 0, ELEVATED: 1, CRITICAL: 2 };
const LEVEL_TO_STATUS: Record<Co2Level, AirStatus> = { low: "green", elevated: "yellow", high: "red" };

function fmt(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

/** Removes floating-point noise such as 3.9000000000000004. */
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

/**
 * Deterministic "small noise" in [-1, 1] from integer seeds (keeps evaluate() pure: no Math.random).
 * Same module, same sample index, same metric -> same value on every evaluation.
 */
function jitter(a: number, b: number, c: number): number {
  let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(c + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

// ---------------------------------------------------------------------------
// Unit conversion [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * CSV CO2 value to mmHg (internal unit).
 *   ppm:     mmHg = ppm * 0.00076   e.g. 5000 ppm -> 3.8 mmHg
 *   percent: mmHg = percent * 7.6   e.g. 0.5 %    -> 3.8 mmHg
 *   mmHg:    unchanged
 */
export function co2ToMmhg(value: number, unit: Co2Unit): number {
  if (unit === "ppm") return value * V.arithmetic.co2PpmToMmhg;
  if (unit === "percent") return value * V.arithmetic.co2PercentToMmhg;
  return value;
}

/** Unit from the sample payload; without one, 100 or more can only be ppm, otherwise mmHg. */
function resolveCo2Unit(value: number, rawUnit: unknown): Co2Unit {
  const unit = typeof rawUnit === "string" ? rawUnit.trim().toLowerCase() : "";
  if (unit === "ppm") return "ppm";
  if (unit === "percent" || unit === "%") return "percent";
  if (unit === "mmhg") return "mmHg";
  return value >= V.arithmetic.ppmFromValue ? "ppm" : "mmHg";
}

// ---------------------------------------------------------------------------
// Feature 2: headache odds [2]
// ---------------------------------------------------------------------------

/** [2] Risk multiplier vs the target = 2 ^ (CO2 - 4).   4 -> 1.0,  5 -> 2.0,  3 -> 0.5 */
export function co2RiskMultiplier(co2Mmhg: number): number {
  return Math.pow(V.risk.oddsFactorPerMmhg, co2Mmhg - V.limits.co2TargetMmhg);
}

/**
 * [2] Illustrative weekly headache risk: odds = 0.0163 * 2 ^ (CO2 - 4), risk = odds / (1 + odds).
 * Anchored at 1.6% for 4 mmHg. Always label it "illustrative".   4 -> 0.0160,  5 -> 0.0316
 */
export function illustrativeWeeklyRisk(co2Mmhg: number): number {
  const odds = V.risk.weeklyOddsAtTarget * co2RiskMultiplier(co2Mmhg);
  return odds / (1 + odds);
}

// ---------------------------------------------------------------------------
// Feature 2: forecast and level [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * Fits a straight line to the samples of the last 30 simulated minutes.
 * Needs 30 simulated minutes of history since `historyStartMin`, otherwise "collecting".
 *   t 0,10,20,30 with CO2 3.0,3.1,3.2,3.3 -> slope 0.01, rising, minutesToLimit 70, projected 4.5
 *   t 0,10,20 only                         -> collecting
 */
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
    // At exactly 4 mmHg and rising the limit is reached now (0 min), so the alert does not flicker off for one sample.
    minutesToLimit: slope > threshold && co2 <= V.limits.co2TargetMmhg ? (V.limits.co2TargetMmhg - co2) / slope : null,
    projectedCo2Mmhg: co2 + slope * V.demoSettings.forecastHorizonMin,
  };
}

/** high if CO2 is above 4; elevated if minutesToLimit is 120 or less; otherwise low. */
export function co2Level(co2Mmhg: number, forecast: Co2Forecast): Co2Level {
  if (co2Mmhg > V.limits.co2TargetMmhg) return "high";
  if (forecast.state === "ready" && forecast.minutesToLimit !== null && forecast.minutesToLimit <= V.demoSettings.forecastHorizonMin) {
    return "elevated";
  }
  return "low";
}

/** Per-module message (spec texts). */
export function co2Message(level: Co2Level, forecast: Co2Forecast): string {
  if (level === "high") return V.messages.high;
  if (level === "elevated" && forecast.state === "ready" && forecast.minutesToLimit !== null) {
    return fill(V.messages.elevated, { n: String(Math.round(forecast.minutesToLimit)) });
  }
  if (forecast.state === "collecting") return V.messages.collecting;
  return V.messages.low;
}

// ---------------------------------------------------------------------------
// Feature 1: statuses from NASA limits
// ---------------------------------------------------------------------------

/** CO2: red above 4 mmHg [2], yellow when the forecast reaches 4 mmHg within 2 h, otherwise green. */
export function co2Status(co2Mmhg: number, forecast: Co2Forecast = { state: "collecting" }): AirStatus {
  return LEVEL_TO_STATUS[co2Level(co2Mmhg, forecast)];
}

/** [4] O2: green at 130 or more, yellow from 122 to below 130, red below 122.   149 -> green, 125 -> yellow, 118 -> red */
export function o2Status(o2Mmhg: number): AirStatus {
  if (o2Mmhg < V.limits.o2RedBelowMmhg) return "red";
  if (o2Mmhg < V.limits.o2GreenFromMmhg) return "yellow";
  return "green";
}

/** [4] Pressure: green from 5.0 to 15.0 psia, red outside. No yellow.   14.7 -> green, 4.9 -> red */
export function pressureStatus(psia: number): AirStatus {
  return psia >= V.limits.pressureMinPsia && psia <= V.limits.pressureMaxPsia ? "green" : "red";
}

/** [5] Noise: green below 85 dBA, red at 85 or more. No yellow.   62 -> green, 85 -> red */
export function noiseStatus(dba: number): AirStatus {
  return dba >= V.limits.noiseHazardDba ? "red" : "green";
}

function formatMetric(metric: AirMetric, value: number): string {
  if (metric === "co2") return `CO2 ${fmt(value, FORMAT.co2Decimals)} mmHg`;
  if (metric === "o2") return `O2 ${fmt(value, FORMAT.otherDecimals)} mmHg`;
  if (metric === "pressure") return `Pressure ${fmt(value, FORMAT.otherDecimals)} psia`;
  return `Noise ${fmt(value, FORMAT.otherDecimals)} dBA`;
}

/**
 * Status of every metric, and the module status = the worst one.
 * On equal severity the first in this order wins: CO2, O2, pressure, noise.
 * When everything is green the first metric (CO2) is reported as the worst one.
 *   { co2 4.4, o2 118, ... }                -> red, worst "CO2 4.4 mmHg"
 *   { co2 3.2 (no forecast), o2 125, ... }  -> yellow, worst "O2 125 mmHg"
 */
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

/** "Modules: N green, N yellow, N red". */
export function formatBanner(statuses: readonly AirStatus[]): string {
  const c = countStatuses(statuses);
  return `Modules: ${c.green} green, ${c.yellow} yellow, ${c.red} red`;
}

// ---------------------------------------------------------------------------
// Shared simulation: reading the DB streams [DEMO] / [REAL]
// ---------------------------------------------------------------------------

/** Clock helper for the seeder / replay controls: play at 1x, 60x or 600x; pause = speed 0; reset = 0. */
export function advanceSimulatedMinutes(currentMin: number, realSecondsElapsed: number, speed: number): number {
  const next = currentMin + (Math.max(0, realSecondsElapsed) / 60) * Math.max(0, speed);
  return Math.min(Math.max(0, next), V.demoSettings.maxSimulatedMin);
}

/** The fake cabin CO2 (badge "SIMULATED DATA - NOT NASA"). */
export function demoCabinSource(): CabinCo2Source {
  return { tag: "SIM", rows: V.demoCo2SeriesMmhg.map((co2Mmhg) => ({ co2Mmhg, temperatureC: null, humidityPct: null })) };
}

/**
 * EDA CSV rows ingested as "Cabin CO2 Replay" samples -> cabin source in mmHg, ordered by
 * samplePayload.rowIndex when every sample has one, otherwise by recordedAt. Null when no usable rows.
 */
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

/** Accepts a scenario id or its button label ("Clear", "O2 leak in Lab", ...). Unknown -> "none". */
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

/** The character's own cabin samples; otherwise the scenario-wide samples of one character (no interleaved copies). */
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

/**
 * Reads the shared simulation inputs from the DB-synced streams (actorInputs first, then the newest record
 * of this character or of the scenario). Missing EDA samples -> demo cabin CO2 (SIM).
 */
export function readEnvironmentState(src: EnvironmentStateSource): EnvironmentState {
  const records = [...(src.hazardRecords ?? []), ...(src.scenarioHazardRecords ?? [])];
  const read = (streamName: string) => {
    const record = latestRecord(records, streamName);
    const direct = src.actorInputs?.[streamName]?.trim();
    return { raw: direct || record?.rawValue || "", payload: record?.payload ?? {} };
  };

  const scenario = read(V.streams.demoScenario);
  const elapsed = toFiniteNumber(read(V.streams.simulatedMinutes).raw);
  const start = toFiniteNumber(scenario.payload.startedAtMin);

  return {
    elapsedMin: elapsed !== null && elapsed > 0 ? Math.min(elapsed, V.demoSettings.maxSimulatedMin) : 0,
    scenarioId: normalizeScenario(scenario.raw),
    scenarioStartMin: start !== null && start > 0 ? start : 0,
    cabin: cabinSourceFromSamples(pickCabinSamples(src)) ?? demoCabinSource(),
  };
}

// ---------------------------------------------------------------------------
// Shared simulation: per-module replay (one pass, constant memory per module)
// ---------------------------------------------------------------------------

interface ModuleRun {
  history: Co2Sample[];
  forecast: Co2Forecast;
  level: Co2Level;
  ledger: ModuleLedger;
  /** Start of the current non-low episode, null when level is low. */
  alertStartMin: number | null;
  reading: ModuleReading;
}

/**
 * Replays the cabin rows (looping at the end) for one module from minute 0 to now:
 *   CO2 = cabin + module offset (+ min(0.04 * minutes since the scrubber failure, 3))
 * and on the way updates the 30-min forecast window, the alert episode (created on low -> elevated/high,
 * kept while it lasts, resolved when low again) and the ledger. Only the last 2 h are kept for the chart.
 * O2 / pressure / noise for "now": baseline + demo ramp + deterministic small noise.
 */
function runModule(module: ModuleConfig, moduleIndex: number, state: EnvironmentState, lastIndex: number): ModuleRun {
  const step = V.demoSettings.replayStepMin;
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
    const rise = scrubberOn ? Math.min(scrubber.co2RiseMmhgPerMin * Math.max(0, tMin - state.scenarioStartMin), scrubber.co2RiseCapMmhg) : 0;
    const sample: Co2Sample = { tMin, co2Mmhg: cleanFloat(rows[k % rows.length].co2Mmhg + module.co2OffsetMmhg + rise) };

    window.push(sample);
    while (window[0].tMin < tMin - V.demoSettings.forecastWindowMin) window.shift();
    forecast = co2Forecast(window, 0);
    level = co2Level(sample.co2Mmhg, forecast);
    if (level === "low") alertStartMin = null;
    else if (alertStartMin === null) alertStartMin = tMin;

    // A sample above the limit counts the minutes since the previous sample.
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
    points.push({ tMin: nowMin + dt, co2Mmhg: cleanFloat(co2Mmhg + forecast.slopeMmhgPerMin * dt) });
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
        ? `${module.name}: CO2 above the NASA limit of ${V.limits.co2TargetMmhg} mmHg`
        : `${module.name}: CO2 will reach the ${V.limits.co2TargetMmhg} mmHg limit`,
    startedAtMin: run.alertStartMin,
    etaMin: severity === "critical" || minutesToLimit === null ? 0 : Math.round(minutesToLimit),
    actions: V.alertActions[severity].map((text) => fill(text, values)),
  };
}

/** Builds the full shared model behind Feature 1 (Habitat Map) and Feature 2 (Air Risk Forecast). */
export function simulateEnvironment(state: EnvironmentState): EnvironmentModel {
  const step = V.demoSettings.replayStepMin;
  const lastIndex = Math.floor(Math.max(0, Math.min(state.elapsedMin, V.demoSettings.maxSimulatedMin)) / step);
  const nowMin = lastIndex * step;
  const runs = V.modules.map((module, i) => runModule(module, i, state, lastIndex));

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
    const co2TagNote =
      state.cabin.tag === "REAL" && module.co2OffsetMmhg !== 0 ? "cabin CO2 REAL, module offset SIM" : undefined;
    const multiplier = co2RiskMultiplier(co2);
    const weeklyRisk = illustrativeWeeklyRisk(co2);
    const infoMetrics: InfoMetric[] = [];
    if (run.reading.temperatureC !== null) {
      infoMetrics.push({ key: "temperature", label: "Temperature", value: run.reading.temperatureC, unit: "°C", tag: state.cabin.tag });
    }
    if (run.reading.humidityPct !== null) {
      infoMetrics.push({ key: "humidity", label: "Humidity", value: run.reading.humidityPct, unit: "%RH", tag: state.cabin.tag });
    }
    return {
      moduleId: module.id,
      moduleName: module.name,
      reading: run.reading,
      air: evaluateModuleAir(run.reading, run.forecast, state.cabin.tag, co2TagNote),
      infoMetrics,
      history: run.history,
      projection: buildProjection(nowMin, co2, run.forecast),
      forecast: run.forecast,
      level: run.level,
      multiplier,
      multiplierText: `x${multiplier.toFixed(1)} vs target`,
      weeklyRisk,
      weeklyRiskText: `${(weeklyRisk * 100).toFixed(1)}% weekly headache risk (illustrative)`,
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
    dataBadge: state.cabin.tag === "REAL" ? null : V.demoDataBadge,
    modules,
    counts: countStatuses(statuses),
    banner: formatBanner(statuses),
    alerts,
    lowestCo2ModuleId: V.modules[lowestIndex].id,
  };
}

/** Convenience for the screen: DB-synced props -> full model. */
export function buildEnvironmentModel(src: EnvironmentStateSource): EnvironmentModel {
  return simulateEnvironment(readEnvironmentState(src));
}

/**
 * getAirLayer(): `{ moduleId, status, worstMetric }` per module, so other layers can plug into the same map.
 * Pass the DB-synced streams (same shape as the hazard screen props) or an already built model.
 * Without arguments it returns minute 0 of the demo replay.
 */
export function getAirLayer(source: EnvironmentStateSource | EnvironmentModel = {}): AirLayerEntry[] {
  const model = "modules" in source ? source : buildEnvironmentModel(source);
  return model.modules.map((m) => ({ moduleId: m.moduleId, status: m.air.status, worstMetric: m.air.worstMetric }));
}

// ---------------------------------------------------------------------------
// evaluate()
// ---------------------------------------------------------------------------

/** One entry per problem: CO2 alerts use the spec actions, other red/yellow metrics use the team wording. */
function buildSolutions(model: EnvironmentModel, maxSolutions: number): string[] {
  const problems: { rank: number; actions: string[] }[] = [];
  // model.alerts is already ordered (critical first, then nearest ETA); the sort below is stable.
  for (const a of model.alerts) problems.push({ rank: a.severity === "critical" ? 0 : 2, actions: a.actions });
  for (const m of model.modules) {
    for (const metric of m.air.metrics) {
      if (metric.metric === "co2" || metric.status === "green") continue;
      const text = metric.metric === "o2" ? V.otherActions.o2 : V.otherActions.isolate;
      problems.push({ rank: metric.status === "red" ? 1 : 3, actions: [fill(text, { Module: m.moduleName })] });
    }
  }
  problems.sort((a, b) => a.rank - b.rank);

  const actions: string[] = [];
  for (const p of problems) {
    for (const a of p.actions) if (!actions.includes(a)) actions.push(a);
  }
  return actions.slice(0, maxSolutions);
}

function chartFor(m: ModuleModel, tag: DataTag): HazardChartSpec {
  const thresholds: HazardChartThreshold[] = [
    { label: V.chart.limitLabel, value: V.limits.co2TargetMmhg, color: V.chart.limitColor },
  ];
  if (m.forecast.state === "ready") {
    thresholds.push({
      label: V.chart.projectionLabel,
      value: Number(m.forecast.projectedCo2Mmhg.toFixed(FORMAT.co2Decimals)),
      color: V.chart.projectionColor,
    });
  }
  return {
    id: `co2-${m.moduleId}`,
    title: `${m.moduleName} CO2 — last 2 h [${tag}]`,
    unit: "mmHg",
    series: m.history.map((s) => ({ label: `${s.tMin} min`, value: s.co2Mmhg })),
    thresholds,
  };
}

export function evaluateEnvironmentHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { actor, reentryMode } = input;
  const model = buildEnvironmentModel(input);
  const tag = `[${model.dataTag}]`;

  // Hazard status = the worse of the module air statuses and the actor readiness (same way as 02).
  const airStatus: HazardEvaluationResult["status"] =
    model.counts.red > 0 ? "CRITICAL" : model.counts.yellow > 0 ? "ELEVATED" : "NOMINAL";
  const readinessStatus: HazardEvaluationResult["status"] =
    actor.readinessState === "HOLD" ? "CRITICAL" : actor.readinessState === "CONDITIONAL" ? "ELEVATED" : "NOMINAL";
  const status = HAZARD_SEVERITY[airStatus] >= HAZARD_SEVERITY[readinessStatus] ? airStatus : readinessStatus;

  // Immediate: CO2 alerts (critical first), then non-CO2 metrics that are not green.
  const immediateLines: string[] = model.alerts.map((a) => {
    const m = model.modules.find((x) => x.moduleId === a.moduleId) as ModuleModel;
    const eta = a.severity === "critical" ? "now" : `in about ${a.etaMin} min`;
    return `${a.severity.toUpperCase()} ${a.title} (${m.air.metrics[0].text} ${tag}, ETA ${eta}): ${a.actions.join("; ")} [DEMO actions]`;
  });
  for (const m of model.modules) {
    for (const metric of m.air.metrics) {
      if (metric.metric !== "co2" && metric.status !== "green") {
        immediateLines.push(`${m.moduleName}: ${metric.status} - ${metric.text} [${metric.tag}]`);
      }
    }
  }

  // Prolonged: per-module CO2 risk picture, then the ledger, then the fixed study facts.
  const moduleLines = model.modules.map((m) => {
    const parts = [
      `${m.moduleName}: ${m.level} - ${m.air.metrics[0].text} ${tag}`,
      `${m.multiplierText} [2]`,
      m.weeklyRiskText,
    ];
    if (m.forecast.state === "ready") {
      const sign = m.forecast.slopeMmhgPerMin > 0 ? "+" : "";
      parts.push(`trend ${m.forecast.trend} (${sign}${fmt(m.forecast.slopeMmhgPerMin, FORMAT.slopeDecimals)} mmHg/min) [ARITHMETIC]`);
      if (m.forecast.minutesToLimit !== null) parts.push(`${Math.round(m.forecast.minutesToLimit)} min to limit`);
    }
    parts.push(m.message);
    return parts.join("; ");
  });
  const ledgerLines = model.modules.map(
    (m) =>
      `${m.moduleName}: ${m.ledger.minutesAboveLimit} min above ${V.limits.co2TargetMmhg} mmHg, max CO2 ${fmt(m.ledger.maxCo2Mmhg, FORMAT.co2Decimals)} mmHg`
  );

  // ETA: critical modules act now; otherwise the nearest time to the limit; otherwise the actor slot.
  const critical = model.alerts.filter((a) => a.severity === "critical");
  const nearest = model.modules
    .map((m) => ({ name: m.moduleName, min: m.forecast.state === "ready" ? m.forecast.minutesToLimit : null }))
    .filter((x): x is { name: string; min: number } => x.min !== null)
    .sort((a, b) => a.min - b.min)[0];
  const eta =
    critical.length > 0
      ? `Now: CO2 above ${V.limits.co2TargetMmhg} mmHg in ${critical.map((a) => a.moduleName).join(", ")}`
      : nearest
      ? `${nearest.name}: ${fill(V.messages.elevated, { n: String(Math.round(nearest.min)) })} [ARITHMETIC]`
      : actor.metrics.etaSlot;

  const badge = model.dataBadge ? ` ${model.dataBadge}` : "";
  return {
    status,
    scenarioStatusSlot: `${model.banner} | cabin CO2 ${tag}${badge} | simulated minute ${model.nowMin} | demo: ${model.scenarioLabel}`,
    immediateHorizon: immediateLines.length > 0 ? immediateLines.join(" | ") : `No alerts. ${V.messages.low}`,
    prolongedHorizon: `${moduleLines.join(" | ")} | Ledger: ${ledgerLines.join(" | ")} | ${V.studyFactsText} [2] | ${V.limitsTooltipLines.join(" ")}`,
    eta,
    solutions: buildSolutions(model, reentryMode ? 1 : 2),
    charts: model.modules.map((m) => chartFor(m, model.dataTag)),
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
    "Here is: Closed-ecosystem habitat telemetry linking cabin CO₂, O₂, pressure, humidity, acoustics, and microbial contact context to early crew symptom prevention.",
  // Crew-wide module telemetry: no stream is private. Written by the EDA seeder / simulation clock, not by astronauts.
  inputSlots: [
    {
      streamName: "Cabin CO2 Replay",
      inputPrompt: "Add your info: ISS cabin CO₂ per OSDR EDA CSV row (ppm, percent or mmHg) here",
      sourceRef: "OSDR Environmental Data App (EDA) [6][7]",
      fieldType: "number",
      unit: "mmHg",
      recordSample: true,
      isPrivate: false,
      subfields: [
        { key: "unit", label: "CO₂ unit", fieldType: "text", prompt: "Add your info: CSV CO₂ unit (ppm / percent / mmHg) here" },
        { key: "rowIndex", label: "CSV row", fieldType: "number", prompt: "Add your info: CSV row number here" },
        { key: "temperatureC", label: "Temperature", fieldType: "number", unit: "°C", prompt: "Add your info: cabin temperature here" },
        { key: "humidityPct", label: "Humidity", fieldType: "number", unit: "%RH", prompt: "Add your info: cabin relative humidity here" },
      ],
    },
    {
      streamName: "Demo Scenario",
      inputPrompt: "Add your info: demo scenario (none, co2-scrubber-failure, o2-leak-lab, noisy-galley) here",
      sourceRef: "05-hostile-closed-environments.md §4 Shared simulation (demo buttons)",
      fieldType: "text",
      isPrivate: false,
      subfields: [
        { key: "startedAtMin", label: "Started at", fieldType: "number", unit: "min", prompt: "Add your info: simulated minute the demo started here" },
      ],
    },
    {
      streamName: "Simulated Minutes Elapsed",
      inputPrompt: "Add your info: simulated minutes since replay start (1x / 60x / 600x clock, 0 = reset) here",
      sourceRef: "05-hostile-closed-environments.md §4 Shared simulation (replay controls)",
      fieldType: "number",
      unit: "min",
      isPrivate: false,
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: CO₂ alerts per module (warning / critical, ETA, 1–2 demo actions) and red/yellow O₂, pressure or noise readings.",
    prolongedHorizon: "Here is: Per-module CO₂ level, headache odds multiplier, illustrative weekly risk, trend, and the minutes-above-limit ledger.",
    etaSlot: "Here is: Projected time until module CO₂ reaches the 4 mmHg NASA limit.",
    solutionsSlot: "Here is: 1–2 actions (e.g., Check the CO2 scrubber for Habitat; Limit time in Habitat until CO2 stabilizes).",
  },
  leadView: {
    summary: "Module Weather Map (green/yellow/red across all spacecraft modules), crew-wide CO₂ headache forecast, and sleep-relocation orders.",
    privacyRule: "Environmental module telemetry is crew-wide; contact tracing / contagion views are flagged as future work with limited public data.",
    modules: [
      {
        title: "Module Weather Map & Replay Control",
        detail: "Here is: Live or OSDR-EDA replayed green/yellow/red status per module for CO₂, O₂, pressure, temp, and noise.",
        actionSlot: "Add your info: Module telemetry override or EDA replay mission_id here",
      },
      {
        title: "Crew Headache Forecast & Relocation Orders",
        detail: "Here is: Cross-crew headache odds alert (e.g., CO₂ rising across shared sleeping bay) + relocation plan.",
        actionSlot: "Add your info: Crew module reassignment plan here",
      },
    ],
  },
  memberView: {
    summary: "Personal 'Where to go' relocation advice, morning Sleep & Environment report (linking sleep quality to night noise & CO₂), and personal local readings.",
    privacyRule: "Personal symptom logs remain private while shared module alerts warn the whole crew early.",
    modules: [
      {
        title: "Where-to-Go & Sleep Environment Report",
        detail: "Here is: Plain-language morning briefing & relocation advice (e.g., 'Module A CO₂ elevated — sleep in Module B tonight').",
        actionSlot: "Add your info: Morning symptom check (headache / dizziness / sleep) here",
      },
      {
        title: "Module Safety Limits Reference",
        detail: "Here is: Displays NASA OCHMO operational context (CO₂ <= 4 mmHg target, O₂ >= 122 mmHg floor, 5–15 psia, <85 dBA / NC-40).",
        actionSlot: "Add your info: Local handheld sensor check here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=environment", purpose: "Fetch persisted environment records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert demo scenario / simulated clock records into Supabase" },
    { method: "POST", path: "/api/hazard-samples", purpose: "Append OSDR EDA cabin CO₂ rows as 'Cabin CO2 Replay' samples" },
  ],
  alarmPreset: {
    title: "CLOSED HABITAT ATMOSPHERE BREACH — CO₂ / O₂ / PRESSURE ALERT",
    severity: "CRITICAL",
    etaLabel: "Here is: Estimated Time of Action before 1-hour TWA O₂ floor or CO₂ headache/hypercapnia threshold",
    descriptionSlot:
      "Here is: Module A atmospheric telemetry breached operational bounds. Multiple crew members at risk of shared environmental debuff.",
    leadActions: [
      "1. Evacuate/isolate affected module and redistribute crew to green-status compartments.",
      "2. Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop.",
    ],
    memberActions: [
      "1. Move immediately to designated green-status module per Where-to-Go guidance.",
      "2. Monitor for headache/dizziness/hypoxia symptoms and report via local check-in.",
    ],
  },
  evaluate: evaluateEnvironmentHazard,
};
