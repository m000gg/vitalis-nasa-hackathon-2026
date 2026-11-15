import {
  HazardChartSpec,
  HazardChartThreshold,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

/**
 * ============================================================================
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS
 * Owner: Teammate 5 — Edit ONLY this file (src/lib/hazards/05-environment.ts).
 * Spec: docs/hazards/05-hostile-closed-environments.md §4 (Feature 1 Habitat Map, Feature 2 CO2 forecast).
 * Module values come only from database samples (public.character_hazard_samples). No internal simulation.
 * ============================================================================
 */

// [SECTION 1: HAZARD 5 VALUES & THRESHOLD SLOTS]
// Every value below carries a tag:
//   [2] [4] [5]   NASA source number (docs/hazards/05-hostile-closed-environments.md, Sources)
//   [DEMO]        a demo setting, not data and not a research claim
//   [ARITHMETIC]  plain math, not a research claim
export const ENVIRONMENT_PIPELINE_VALUES = {
  supportedStreams: ["Lab Air Readings", "Habitat Air Readings", "Galley Air Readings", "Airlock Air Readings"],

  // --- Input: one sample time series per module (stream name = module streamName) ---
  //   numericValue            CO2 (mmHg by default; ppm or percent with samplePayload.co2Unit)
  //   samplePayload.o2Mmhg, pressurePsia, noiseDba, temperatureC, humidityPct (all optional)
  //   samplePayload.tMin      optional minutes since the start of the record; used when every sample has it,
  //                           otherwise recordedAt is the time axis
  //   samplePayload.provenanceKind  "real" -> CO2, temperature, humidity are REAL; any other value (e.g. "simulated") is SIM
  //   samplePayload.source    without provenanceKind: "nasa-osdr-eda" -> REAL; anything else is SIM
  //   Payload keys are matched case-insensitively (co2MmHg = co2Mmhg).
  sampleKeys: {
    co2Mmhg: "co2Mmhg",
    co2Unit: "co2Unit",
    o2Mmhg: "o2Mmhg",
    pressurePsia: "pressurePsia",
    noiseDba: "noiseDba",
    temperatureC: "temperatureC",
    humidityPct: "humidityPct",
    tMin: "tMin",
    source: "source",
    provenanceKind: "provenanceKind",
  },
  realSourceId: "nasa-osdr-eda",
  realProvenanceKind: "real",

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
  headacheOdds: {
    factorPerMmhg: 2, // [2] each +1 mmHg of CO2 doubles the odds of a headache
  },

  // --- Unit conversion and trend arithmetic ---
  arithmetic: {
    co2PpmToMmhg: 0.00076, // [ARITHMETIC] mmHg = ppm * 0.00076 (1 mmHg = 1/760 atm)
    co2PercentToMmhg: 7.6, // [ARITHMETIC] mmHg = percent * 7.6
    ppmFromValue: 100, // [ARITHMETIC] a CO2 value without a unit of 100 or more can only be ppm (100 mmHg is far above any cabin value)
    slopeThresholdMmhgPerMin: 0.001, // [ARITHMETIC] above +0.001 rising, below -0.001 falling, in between stable
  },

  // --- Trend settings ---
  trendSettings: {
    windowMin: 30, // [DEMO] the trend line is fitted to the last 30 minutes of samples
    historyWindowMin: 120, // [DEMO] charts show the last 2 h of samples; the dashed line runs the same 2 h ahead
    trendLineStepMin: 30, // [DEMO] spacing of the dashed trend line points
  },

  // --- CO2 early warning (yellow). Not NASA limits. ---
  // CO2 status: red above 4 mmHg [2]. Yellow when CO2 is at or below 4 mmHg and EITHER
  //   (a) CO2 is at or above co2EarlyWarningMmhg                       -> "Approaching target"
  //   (b) the trend is rising (slope above +0.001 mmHg/min) and the trend estimate (4 - CO2) / slope
  //       [ARITHMETIC] reaches 4 mmHg within trendAlertHorizonMin      -> "Rapid rise (trend estimate)"
  // Green otherwise. The warning alert uses the same rule, so the module color and the alert always agree.
  co2Warning: {
    co2EarlyWarningMmhg: 3.8, // [DEMO] early-warning margin, 5% below the NASA target, not a NASA limit
    trendAlertHorizonMin: 60, // [DEMO] horizon of the "Rapid rise" rule and of the warning alert, not a NASA limit
  },

  // --- Modules (shared map config: other layers key on these ids) ---
  modules: [
    { id: "lab", name: "Lab", streamName: "Lab Air Readings" },
    { id: "habitat", name: "Habitat", streamName: "Habitat Air Readings" },
    { id: "galley", name: "Galley", streamName: "Galley Air Readings" },
    { id: "airlock", name: "Airlock", streamName: "Airlock Air Readings" },
  ],

  simulatedDataBadge: "SIMULATED DATA - NOT NASA",

  // --- Fixed texts ---
  messages: {
    withinTarget: "CO2 is within the NASA target of 4 mmHg.",
    aboveLimit: "CO2 is above the NASA limit of 4 mmHg. Each extra 1 mmHg doubles headache odds.",
    minutesToLimit: "At this rate CO2 reaches the 4 mmHg limit in about {n} min (trend estimate).",
    collecting: "Collecting data...",
    noSamples: "No samples in the database yet.",
    temperatureHumidity: "Temperature and humidity: information only, no NASA health limit.",
  },
  // CO2 status labels and yellow reasons (module table, map, forecast card, chart, alert)
  co2StatusLabels: {
    withinTarget: "Within target",
    approaching: "Approaching target",
    rapidRise: "Rapid rise (trend estimate)",
    overTarget: "Over target",
  },
  co2WarningReasons: {
    approaching: "within {margin} mmHg of the target",
    rapidRise: "trend estimate: about {n} min to {target} mmHg",
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
    "Only samples marked as real NASA OSDR EDA data are tagged REAL (CO2, temperature, humidity). O2, pressure and noise are simulated around NASA limits.",
    "The doubling rule is an estimate from ISS crew data, not an exact law.",
    "The trend and time to target are a straight-line trend estimate, not a research claim.",
    "Yellow for CO2 is our early-warning margin (3.8 mmHg) or a trend estimate, not a NASA limit.",
    "Alert actions are demo placeholders.",
  ],
  chart: {
    limitLabel: "NASA limit",
    limitColor: "#ef4444",
    // Second reference line at co2EarlyWarningMmhg: our setting [DEMO], not a NASA limit
    earlyWarningLabel: "Early warning",
    earlyWarningLegend: "Early warning, our setting",
    earlyWarningColor: "#fbbf24",
  },
};

// [SECTION 2: HAZARD 5 FORMULAS & EVALUATION PIPELINE]
// Pure functions: the same input always gives the same output. No hidden state, no clock, no Math.random.
// Time is in minutes (samplePayload.tMin, or recordedAt / 60000).
const V = ENVIRONMENT_PIPELINE_VALUES;

// Presentation only: how many decimals are printed. Not data and not a research claim.
const FORMAT = { co2Decimals: 2, otherDecimals: 1, slopeDecimals: 4, oddsDecimals: 2, floatGuardDecimals: 6 };

export type AirStatus = "green" | "yellow" | "red";
export type AirMetric = "co2" | "o2" | "pressure" | "noise";
export type Co2Unit = "ppm" | "percent" | "mmHg";
export type TrendLabel = "rising" | "stable" | "falling";
export type Co2Level = "low" | "elevated" | "high";
export type Co2WarningKind = "approaching" | "rapid-rise";
export type AlertSeverity = "warning" | "critical";
/** REAL = sample marked as NASA OSDR EDA data, SIM = anything else. */
export type DataTag = "REAL" | "SIM";
export type TimeBasis = "tMin" | "recordedAt";
type HazardStatus = HazardEvaluationResult["status"];
type ReadinessState = HazardEvaluationInput["actor"]["readinessState"];

/** Latest value of every field across a module's samples (null when no sample carries it). */
export interface ModuleReading {
  co2Mmhg: number | null;
  co2Tag: DataTag;
  o2Mmhg: number | null;
  pressurePsia: number | null;
  noiseDba: number | null;
  /** Information only (no NASA health limit). */
  temperatureC: number | null;
  /** Information only (no NASA health limit). */
  humidityPct: number | null;
  infoTag: DataTag;
}

/** One CO2 reading. `tMin` = minutes on the module's time axis. */
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
  /** CO2 only: "Within target", "Approaching target", "Rapid rise (trend estimate)" or "Over target". */
  statusLabel?: string;
  /** CO2 yellow only: why it is yellow, e.g. "within 0.2 mmHg of the target". */
  statusReason?: string;
}

/** The one CO2 status result. Card, chart, table, map, banner and alert all read it. */
export interface Co2Assessment {
  level: Co2Level;
  status: AirStatus;
  label: string;
  /** Which yellow rule applies (rapid rise wins when both apply); null when green or red. */
  warningKind: Co2WarningKind | null;
  /** Yellow only: "within 0.2 mmHg of the target" and/or "trend estimate: about N min to 4 mmHg". */
  reason: string | null;
  /** Rapid rise only: trend estimate of the minutes until 4 mmHg. */
  minutesToTarget: number | null;
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

/** Shape returned by getAirLayer(), so other layers can plug into the same map. Null status = no samples. */
export interface AirLayerEntry {
  moduleId: string;
  status: AirStatus | null;
  worstMetric: MetricStatus | null;
}

export type Co2Forecast =
  | { state: "collecting" }
  | {
      state: "ready";
      /** [ARITHMETIC] least-squares slope over the last 30 minutes. */
      slopeMmhgPerMin: number;
      trend: TrendLabel;
      /** [ARITHMETIC] trend estimate (4 - CO2) / slope, only when rising and not above 4 mmHg. */
      minutesToLimit: number | null;
    };

export interface ModuleLedger {
  /** [ARITHMETIC] minutes spent above the 4 mmHg limit since the first sample. */
  minutesAboveLimit: number;
  /** [ARITHMETIC] maximum CO2 seen since the first sample. */
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
  startedAtLabel: string;
  /** Warning only: why the module is yellow (same text as on the module card). */
  reason: string | null;
  /** 0 when critical (already above); trend estimate in minutes for a rapid rise; null for "Approaching target". */
  etaMin: number | null;
  /** 1-2 demo placeholder actions. */
  actions: string[];
}

export interface ModuleModel {
  moduleId: string;
  moduleName: string;
  streamName: string;
  /** False when the database holds no usable sample for this module. */
  hasData: boolean;
  reading: ModuleReading | null;
  /** Feature 1: module status = worst metric status. Null without data. */
  air: ModuleAirStatus | null;
  /** CO2 status from assessCo2() (null without a CO2 sample). */
  co2: Co2Assessment | null;
  infoMetrics: InfoMetric[];
  /** CO2 samples of the last 2 h before the latest sample. */
  history: Co2Sample[];
  /** Dashed line for the next 2 h: the trend slope, or flat when the trend is stable or not ready yet. */
  trendLine: Co2Sample[];
  forecast: Co2Forecast;
  level: Co2Level;
  /** [2] 2 ^ (CO2 - 4), only when CO2 is above 4 mmHg. */
  headacheOddsMultiplier: number | null;
  /** "x1.41 vs 4 mmHg", only when CO2 is above 4 mmHg. */
  headacheOddsText: string | null;
  /** Above-limit text, within-target text, or the no-samples text. */
  message: string;
  alert: ModuleAlert | null;
  ledger: ModuleLedger | null;
  latestMin: number | null;
  latestLabel: string | null;
}

export interface EnvironmentModel {
  timeBasis: TimeBasis;
  hasData: boolean;
  /** Label of the newest sample across modules. */
  latestLabel: string | null;
  /** REAL only when every module CO2 in use is NASA OSDR EDA data; null without data. */
  dataTag: DataTag | null;
  /** "SIMULATED DATA - NOT NASA" when any CO2 in use is SIM data, otherwise null (also null without data). */
  dataBadge: string | null;
  modules: ModuleModel[];
  counts: Record<AirStatus, number> & { noData: number };
  /** "Modules: N green, N yellow, N red" (+ ", N no data") */
  banner: string;
  /** Active alerts, critical first. */
  alerts: ModuleAlert[];
  lowestCo2ModuleId: string | null;
}

/** Anything that carries the DB-synced Hazard 5 samples (HazardEvaluationInput or the screen props). */
export interface EnvironmentStateSource {
  hazardSamples?: readonly HazardSampleRecord[];
  scenarioHazardSamples?: readonly HazardSampleRecord[];
}

export interface EnvironmentStatusBreakdown {
  /** Worse of airStatus and readinessStatus. */
  status: HazardStatus;
  airStatus: HazardStatus;
  readinessState: ReadinessState;
  readinessStatus: HazardStatus;
  /** True when the readiness state, not the module air, sets the hazard status. */
  raisedByReadiness: boolean;
}

type ModuleConfig = (typeof ENVIRONMENT_PIPELINE_VALUES.modules)[number];

const STATUS_SEVERITY: Record<AirStatus, number> = { green: 0, yellow: 1, red: 2 };
const HAZARD_SEVERITY: Record<HazardStatus, number> = { NOMINAL: 0, ELEVATED: 1, CRITICAL: 2 };

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

/** Same id the shared evaluator uses for its fallback sample charts, so no duplicate chart appears. */
function sampleChartId(streamName: string): string {
  return `sample-${streamName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** "minute 40" (tMin axis) or "2026-11-15 10:20 UTC" (recordedAt axis). */
export function formatTimeLabel(tMin: number, basis: TimeBasis): string {
  if (basis === "tMin") return `minute ${fmt(tMin, FORMAT.otherDecimals)}`;
  return `${new Date(tMin * 60000).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

// ---------------------------------------------------------------------------
// Unit conversion [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * CO2 value to mmHg (internal unit).
 *   ppm:     mmHg = ppm * 0.00076   e.g. 5000 ppm -> 3.8 mmHg
 *   percent: mmHg = percent * 7.6   e.g. 0.5      -> 3.8 mmHg
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
  if (unit === "percent") return "percent";
  if (unit === "mmhg") return "mmHg";
  return value >= V.arithmetic.ppmFromValue ? "ppm" : "mmHg";
}

// ---------------------------------------------------------------------------
// Feature 2: headache odds [2]
// ---------------------------------------------------------------------------

/** [2] Headache odds vs 4 mmHg = 2 ^ (CO2 - 4), only when CO2 is above 4 mmHg.   5 -> 2,  4.5 -> 1.41,  4 -> null */
export function headacheOddsMultiplier(co2Mmhg: number): number | null {
  if (co2Mmhg <= V.limits.co2TargetMmhg) return null;
  return Math.pow(V.headacheOdds.factorPerMmhg, co2Mmhg - V.limits.co2TargetMmhg);
}

/** "x{2 ^ (CO2 - 4)} vs 4 mmHg", only above the target.   5 -> "x2 vs 4 mmHg" */
export function headacheOddsText(co2Mmhg: number): string | null {
  const m = headacheOddsMultiplier(co2Mmhg);
  return m === null ? null : `x${fmt(m, FORMAT.oddsDecimals)} vs ${V.limits.co2TargetMmhg} mmHg`;
}

// ---------------------------------------------------------------------------
// Feature 2: trend estimate and level [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * Fits a straight line to the samples of the last 30 minutes.
 * Needs 30 minutes of history since `historyStartMin`, otherwise "collecting".
 *   t 0,10,20,30 with CO2 3.0,3.1,3.2,3.3 -> slope 0.01, rising, minutesToLimit 70
 *   t 0,10,20 only                         -> collecting
 */
export function co2Forecast(history: readonly Co2Sample[], historyStartMin = history[0]?.tMin ?? 0): Co2Forecast {
  if (history.length < 2) return { state: "collecting" };
  const latest = history[history.length - 1];
  if (latest.tMin - historyStartMin < V.trendSettings.windowMin) return { state: "collecting" };

  const fromMin = latest.tMin - V.trendSettings.windowMin;
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
  };
}

/** "+0.0003", "-0.0120", "0.0000": the trend slope as printed everywhere (mmHg/min). */
export function formatSlope(slopeMmhgPerMin: number): string {
  const text = slopeMmhgPerMin.toFixed(FORMAT.slopeDecimals);
  if (Number(text) === 0) return (0).toFixed(FORMAT.slopeDecimals);
  return slopeMmhgPerMin > 0 ? `+${text}` : text;
}

/**
 * The single CO2 status function (see the rule in Section 1, co2Warning):
 *   red    CO2 above 4 mmHg [2]                                                    "Over target"
 *   yellow CO2 at or below 4 and (a) at or above 3.8 mmHg [DEMO]                   "Approaching target"
 *                            or (b) rising and the trend estimate reaches 4 within
 *                                   60 min [DEMO horizon, ARITHMETIC estimate]     "Rapid rise (trend estimate)"
 *   green  otherwise                                                               "Within target"
 * When (a) and (b) both apply the label is "Rapid rise (trend estimate)" and the reason lists both.
 *   3.97 flat -> yellow, "within 0.2 mmHg of the target"
 *   3.5 rising 0.01/min -> yellow, "trend estimate: about 50 min to 4 mmHg"
 *   3.5 flat -> green;   4.1 -> red
 */
export function assessCo2(co2Mmhg: number, forecast: Co2Forecast = { state: "collecting" }): Co2Assessment {
  const target = V.limits.co2TargetMmhg;
  if (co2Mmhg > target) {
    return { level: "high", status: "red", label: V.co2StatusLabels.overTarget, warningKind: null, reason: null, minutesToTarget: null };
  }

  const approaching = co2Mmhg >= V.co2Warning.co2EarlyWarningMmhg;
  const minutes =
    forecast.state === "ready" &&
    forecast.trend === "rising" &&
    forecast.minutesToLimit !== null &&
    forecast.minutesToLimit <= V.co2Warning.trendAlertHorizonMin
      ? forecast.minutesToLimit
      : null;
  if (!approaching && minutes === null) {
    return { level: "low", status: "green", label: V.co2StatusLabels.withinTarget, warningKind: null, reason: null, minutesToTarget: null };
  }

  const reasons: string[] = [];
  if (approaching) {
    reasons.push(fill(V.co2WarningReasons.approaching, { margin: fmt(target - V.co2Warning.co2EarlyWarningMmhg, FORMAT.co2Decimals) }));
  }
  if (minutes !== null) {
    reasons.push(fill(V.co2WarningReasons.rapidRise, { n: String(Math.round(minutes)), target: String(target) }));
  }
  return {
    level: "elevated",
    status: "yellow",
    label: minutes !== null ? V.co2StatusLabels.rapidRise : V.co2StatusLabels.approaching,
    warningKind: minutes !== null ? "rapid-rise" : "approaching",
    reason: reasons.join("; "),
    minutesToTarget: minutes,
  };
}

/** high / elevated / low from assessCo2(). */
export function co2Level(co2Mmhg: number, forecast: Co2Forecast): Co2Level {
  return assessCo2(co2Mmhg, forecast).level;
}

/** Above 4 mmHg: the above-limit text. At or below 4: only the within-target text. */
export function co2Message(co2Mmhg: number): string {
  return co2Mmhg > V.limits.co2TargetMmhg ? V.messages.aboveLimit : V.messages.withinTarget;
}

// ---------------------------------------------------------------------------
// Feature 1: statuses from NASA limits
// ---------------------------------------------------------------------------

/** CO2 color from assessCo2(): red above 4 mmHg [2], yellow per the early-warning rule [DEMO], otherwise green. */
export function co2Status(co2Mmhg: number, forecast: Co2Forecast = { state: "collecting" }): AirStatus {
  return assessCo2(co2Mmhg, forecast).status;
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
 * Status of every metric that has a value, and the module status = the worst one.
 * O2, pressure and noise are always tagged SIM (spec: no NASA data source for them).
 * On equal severity the first in this order wins: CO2, O2, pressure, noise. Null when no metric has a value.
 *   { co2 4.4, o2 118, ... }                -> red, worst "CO2 4.4 mmHg"
 *   { co2 3.2 (no trend), o2 125, ... }     -> yellow, worst "O2 125 mmHg"
 */
export function evaluateModuleAir(reading: ModuleReading, forecast: Co2Forecast = { state: "collecting" }): ModuleAirStatus | null {
  const metrics: MetricStatus[] = [];
  const add = (metric: AirMetric, value: number | null, unit: string, status: (v: number) => AirStatus, tag: DataTag) => {
    if (value !== null) metrics.push({ metric, value, unit, status: status(value), tag, text: formatMetric(metric, value) });
  };
  const co2 = reading.co2Mmhg === null ? null : assessCo2(reading.co2Mmhg, forecast);
  add("co2", reading.co2Mmhg, "mmHg", () => (co2 as Co2Assessment).status, reading.co2Tag);
  add("o2", reading.o2Mmhg, "mmHg", o2Status, "SIM");
  add("pressure", reading.pressurePsia, "psia", pressureStatus, "SIM");
  add("noise", reading.noiseDba, "dBA", noiseStatus, "SIM");
  if (metrics.length === 0) return null;
  if (co2) {
    metrics[0].statusLabel = co2.label;
    if (co2.reason) metrics[0].statusReason = co2.reason;
  }

  let worst = metrics[0];
  for (const m of metrics) {
    if (STATUS_SEVERITY[m.status] > STATUS_SEVERITY[worst.status]) worst = m;
  }
  return { status: worst.status, worstMetric: worst, metrics };
}

/** "Modules: N green, N yellow, N red" (+ ", N no data" when a module has no samples). */
export function formatBanner(counts: Record<AirStatus, number> & { noData: number }): string {
  const base = `Modules: ${counts.green} green, ${counts.yellow} yellow, ${counts.red} red`;
  return counts.noData > 0 ? `${base}, ${counts.noData} no data` : base;
}

// ---------------------------------------------------------------------------
// Database samples -> module time series
// ---------------------------------------------------------------------------

interface ParsedSample {
  id: string;
  tMin: number;
  co2Mmhg: number | null;
  o2Mmhg: number | null;
  pressurePsia: number | null;
  noiseDba: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  tag: DataTag;
}

function isEnvironmentSample(s: HazardSampleRecord, streamName: string): boolean {
  return s.hazardSlug === "environment" && s.streamName === streamName;
}

/** The character's own samples of the stream; otherwise the scenario-wide samples of one character (no interleaved copies). */
function pickModuleSamples(src: EnvironmentStateSource, streamName: string): HazardSampleRecord[] {
  const own = (src.hazardSamples ?? []).filter((s) => isEnvironmentSample(s, streamName));
  if (own.length > 0) return own;

  const byCharacter = new Map<string, HazardSampleRecord[]>();
  for (const s of src.scenarioHazardSamples ?? []) {
    if (!isEnvironmentSample(s, streamName)) continue;
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

/** Payload value by key, matched case-insensitively (seeders write co2MmHg / o2MmHg). */
function payloadValue(payload: Record<string, unknown>, key: string): unknown {
  if (key in payload) return payload[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(payload)) if (k.toLowerCase() === lower) return payload[k];
  return undefined;
}

/** REAL only when provenanceKind says "real", or (without provenanceKind) when source is "nasa-osdr-eda". */
function sampleTag(payload: Record<string, unknown>): DataTag {
  const kind = payloadValue(payload, V.sampleKeys.provenanceKind);
  if (typeof kind === "string" && kind.trim() !== "") return kind.trim().toLowerCase() === V.realProvenanceKind ? "REAL" : "SIM";
  return payloadValue(payload, V.sampleKeys.source) === V.realSourceId ? "REAL" : "SIM";
}

function parseSample(s: HazardSampleRecord, basis: TimeBasis): ParsedSample | null {
  const payload = s.samplePayload ?? {};
  const k = V.sampleKeys;
  const num = (key: string) => toFiniteNumber(payloadValue(payload, key));
  const tMin = basis === "tMin" ? num(k.tMin) : Date.parse(s.recordedAt) / 60000;
  if (tMin === null || !Number.isFinite(tMin)) return null;

  const rawCo2 = s.numericValue ?? num(k.co2Mmhg);
  const co2Mmhg =
    rawCo2 !== null && Number.isFinite(rawCo2) && rawCo2 >= 0
      ? cleanFloat(co2ToMmhg(rawCo2, resolveCo2Unit(rawCo2, payloadValue(payload, k.co2Unit))))
      : null;
  return {
    id: s.id,
    tMin,
    co2Mmhg,
    o2Mmhg: num(k.o2Mmhg),
    pressurePsia: num(k.pressurePsia),
    noiseDba: num(k.noiseDba),
    temperatureC: num(k.temperatureC),
    humidityPct: num(k.humidityPct),
    tag: sampleTag(payload),
  };
}

/** tMin when every Hazard 5 module sample carries samplePayload.tMin, otherwise recordedAt. */
function resolveTimeBasis(samplesByModule: readonly HazardSampleRecord[][]): TimeBasis {
  const all = samplesByModule.flat();
  if (all.length === 0) return "recordedAt";
  return all.every((s) => toFiniteNumber(payloadValue(s.samplePayload ?? {}, V.sampleKeys.tMin)) !== null) ? "tMin" : "recordedAt";
}

interface ModuleRun {
  parsed: ParsedSample[];
  co2: Co2Sample[];
  history: Co2Sample[];
  forecast: Co2Forecast;
  /** assessCo2() of the latest CO2 sample (null without CO2 samples). */
  assessment: Co2Assessment | null;
  ledger: ModuleLedger | null;
  /** Start of the current non-low episode, null when level is low. */
  alertStartMin: number | null;
  reading: ModuleReading | null;
  latestMin: number | null;
}

/** Latest value of one field (samples are sorted oldest first). */
function latestOf<K extends keyof ParsedSample>(parsed: readonly ParsedSample[], key: K): ParsedSample | null {
  for (let i = parsed.length - 1; i >= 0; i--) if (parsed[i][key] !== null) return parsed[i];
  return null;
}

/**
 * Walks one module's CO2 samples oldest -> newest and on the way updates the 30-min trend window, the alert
 * episode (created on low -> elevated/high, kept while it lasts, resolved when low again) and the ledger
 * (a sample above the limit counts the minutes since the previous sample). Keeps the last 2 h for the chart.
 */
function runModule(samples: readonly HazardSampleRecord[], basis: TimeBasis): ModuleRun {
  const parsed = samples
    .map((s) => parseSample(s, basis))
    .filter((p): p is ParsedSample => p !== null)
    .sort((a, b) => a.tMin - b.tMin || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const co2: Co2Sample[] = parsed
    .filter((p) => p.co2Mmhg !== null)
    .map((p) => ({ tMin: p.tMin, co2Mmhg: p.co2Mmhg as number }));

  let forecast: Co2Forecast = { state: "collecting" };
  let assessment: Co2Assessment | null = null;
  let alertStartMin: number | null = null;
  let ledger: ModuleLedger | null = null;
  const window: Co2Sample[] = [];

  for (let k = 0; k < co2.length; k++) {
    const sample = co2[k];
    window.push(sample);
    while (window[0].tMin < sample.tMin - V.trendSettings.windowMin) window.shift();
    forecast = co2Forecast(window, co2[0].tMin);
    assessment = assessCo2(sample.co2Mmhg, forecast);
    if (assessment.level === "low") alertStartMin = null;
    else if (alertStartMin === null) alertStartMin = sample.tMin;

    const prev: ModuleLedger = ledger ?? { minutesAboveLimit: 0, maxCo2Mmhg: sample.co2Mmhg };
    ledger = {
      minutesAboveLimit:
        prev.minutesAboveLimit + (k > 0 && sample.co2Mmhg > V.limits.co2TargetMmhg ? cleanFloat(sample.tMin - co2[k - 1].tMin) : 0),
      maxCo2Mmhg: Math.max(prev.maxCo2Mmhg, sample.co2Mmhg),
    };
  }

  const lastCo2 = co2[co2.length - 1];
  const history = lastCo2 ? co2.filter((s) => s.tMin >= lastCo2.tMin - V.trendSettings.historyWindowMin) : [];
  const co2Src = latestOf(parsed, "co2Mmhg");
  const infoSrc = latestOf(parsed, "temperatureC") ?? latestOf(parsed, "humidityPct");
  const reading: ModuleReading | null =
    parsed.length === 0
      ? null
      : {
          co2Mmhg: co2Src?.co2Mmhg ?? null,
          co2Tag: co2Src?.tag ?? "SIM",
          o2Mmhg: latestOf(parsed, "o2Mmhg")?.o2Mmhg ?? null,
          pressurePsia: latestOf(parsed, "pressurePsia")?.pressurePsia ?? null,
          noiseDba: latestOf(parsed, "noiseDba")?.noiseDba ?? null,
          temperatureC: latestOf(parsed, "temperatureC")?.temperatureC ?? null,
          humidityPct: latestOf(parsed, "humidityPct")?.humidityPct ?? null,
          infoTag: infoSrc?.tag ?? "SIM",
        };

  return {
    parsed,
    co2,
    history,
    forecast,
    assessment,
    ledger,
    alertStartMin,
    reading,
    latestMin: parsed.length > 0 ? parsed[parsed.length - 1].tMin : null,
  };
}

/**
 * Dashed line from the latest sample over the next 2 h, always drawn when there is a CO2 sample.
 * Uses the same slope and trend label as the status: rising / falling -> the fitted slope;
 * stable or not enough data yet -> flat at the latest value (never tilted toward the 4 mmHg line).
 */
function buildTrendLine(last: Co2Sample | undefined, forecast: Co2Forecast): Co2Sample[] {
  if (!last) return [];
  const slope = forecast.state === "ready" && forecast.trend !== "stable" ? forecast.slopeMmhgPerMin : 0;
  const points: Co2Sample[] = [];
  for (let dt = 0; dt <= V.trendSettings.historyWindowMin; dt += V.trendSettings.trendLineStepMin) {
    points.push({ tMin: last.tMin + dt, co2Mmhg: cleanFloat(last.co2Mmhg + slope * dt) });
  }
  return points;
}

/** Warning while CO2 is yellow, critical while red: the same assessCo2() result that colors the module. */
function buildAlert(module: ModuleConfig, run: ModuleRun, lowestOther: ModuleConfig | undefined, basis: TimeBasis): ModuleAlert | null {
  const a = run.assessment;
  if (!a || a.level === "low" || run.alertStartMin === null) return null;
  const severity: AlertSeverity = a.level === "high" ? "critical" : "warning";
  const values = { Module: module.name, Lowest: lowestOther?.name ?? module.name };
  const id = `${module.id}@${run.alertStartMin}`;
  return {
    id,
    ackKey: `${id}:${severity}`,
    moduleId: module.id,
    moduleName: module.name,
    severity,
    title:
      severity === "critical"
        ? `${module.name}: CO2 above the NASA limit of ${V.limits.co2TargetMmhg} mmHg`
        : `${module.name}: CO2 ${a.label.charAt(0).toLowerCase()}${a.label.slice(1)}`,
    startedAtMin: run.alertStartMin,
    startedAtLabel: formatTimeLabel(run.alertStartMin, basis),
    reason: severity === "warning" ? a.reason : null,
    etaMin: severity === "critical" ? 0 : a.minutesToTarget === null ? null : Math.round(a.minutesToTarget),
    actions: V.alertActions[severity].map((text) => fill(text, values)),
  };
}

/** Builds the model behind Feature 1 (Habitat Map) and Feature 2 (CO2 forecast) from database samples only. */
export function buildEnvironmentModel(src: EnvironmentStateSource): EnvironmentModel {
  const samplesByModule = V.modules.map((m) => pickModuleSamples(src, m.streamName));
  const basis = resolveTimeBasis(samplesByModule);
  const runs = samplesByModule.map((samples) => runModule(samples, basis));

  const co2Now = (i: number) => runs[i].reading?.co2Mmhg ?? null;
  const lowestOtherThan = (index: number): ModuleConfig | undefined => {
    let best = -1;
    for (let i = 0; i < runs.length; i++) {
      const v = co2Now(i);
      if (i === index || v === null) continue;
      if (best < 0 || v < (co2Now(best) as number)) best = i;
    }
    return best < 0 ? undefined : V.modules[best];
  };
  let lowestIndex = -1;
  runs.forEach((_, i) => {
    const v = co2Now(i);
    if (v !== null && (lowestIndex < 0 || v < (co2Now(lowestIndex) as number))) lowestIndex = i;
  });

  const modules: ModuleModel[] = V.modules.map((module, i) => {
    const run = runs[i];
    const reading = run.reading;
    const air = reading ? evaluateModuleAir(reading, run.forecast) : null;
    const co2 = reading?.co2Mmhg ?? null;
    const infoMetrics: InfoMetric[] = [];
    if (reading?.temperatureC != null) {
      infoMetrics.push({ key: "temperature", label: "Temperature", value: reading.temperatureC, unit: "°C", tag: reading.infoTag });
    }
    if (reading?.humidityPct != null) {
      infoMetrics.push({ key: "humidity", label: "Humidity", value: reading.humidityPct, unit: "%RH", tag: reading.infoTag });
    }
    const hasData = air !== null || infoMetrics.length > 0;
    return {
      moduleId: module.id,
      moduleName: module.name,
      streamName: module.streamName,
      hasData,
      reading,
      air,
      co2: run.assessment,
      infoMetrics,
      history: run.history,
      trendLine: buildTrendLine(run.co2[run.co2.length - 1], run.forecast),
      forecast: run.forecast,
      level: run.assessment?.level ?? "low",
      headacheOddsMultiplier: co2 === null ? null : headacheOddsMultiplier(co2),
      headacheOddsText: co2 === null ? null : headacheOddsText(co2),
      message: co2 === null ? V.messages.noSamples : co2Message(co2),
      alert: buildAlert(module, run, lowestOtherThan(i), basis),
      ledger: run.ledger,
      latestMin: run.latestMin,
      latestLabel: run.latestMin === null ? null : formatTimeLabel(run.latestMin, basis),
    };
  });

  const counts = { green: 0, yellow: 0, red: 0, noData: 0 };
  for (const m of modules) {
    if (m.air) counts[m.air.status]++;
    else counts.noData++;
  }
  const alerts = modules
    .map((m) => m.alert)
    .filter((a): a is ModuleAlert => a !== null)
    // Critical first; then warnings with a trend estimate (nearest first); "Approaching target" warnings last.
    .sort((a, b) => (a.severity === b.severity ? (a.etaMin ?? Infinity) - (b.etaMin ?? Infinity) : a.severity === "critical" ? -1 : 1));

  const co2Tags = modules.flatMap((m) => (m.reading && m.reading.co2Mmhg !== null ? [m.reading.co2Tag] : []));
  const dataTag: DataTag | null = co2Tags.length === 0 ? null : co2Tags.every((t) => t === "REAL") ? "REAL" : "SIM";
  const latestMins = modules.flatMap((m) => (m.latestMin === null ? [] : [m.latestMin]));
  const hasData = modules.some((m) => m.hasData);

  return {
    timeBasis: basis,
    hasData,
    latestLabel: latestMins.length > 0 ? formatTimeLabel(Math.max(...latestMins), basis) : null,
    dataTag,
    dataBadge: dataTag === "SIM" ? V.simulatedDataBadge : null,
    modules,
    counts,
    banner: formatBanner(counts),
    alerts,
    lowestCo2ModuleId: lowestIndex < 0 ? null : V.modules[lowestIndex].id,
  };
}

/**
 * getAirLayer(): `{ moduleId, status, worstMetric }` per module, so other layers can plug into the same map.
 * Pass the DB-synced samples (same shape as the hazard screen props) or an already built model.
 * A module without samples has status null.
 */
export function getAirLayer(source: EnvironmentStateSource | EnvironmentModel = {}): AirLayerEntry[] {
  const model = "modules" in source ? source : buildEnvironmentModel(source);
  return model.modules.map((m) => ({ moduleId: m.moduleId, status: m.air?.status ?? null, worstMetric: m.air?.worstMetric ?? null }));
}

/**
 * Hazard status = the worse of the module air status and the actor readiness:
 *   air:       any red module -> CRITICAL, any yellow module (incl. CO2 "Approaching target" / "Rapid rise")
 *              -> ELEVATED, otherwise NOMINAL (also without data)
 *   readiness: HOLD -> CRITICAL, CONDITIONAL -> ELEVATED, GO -> NOMINAL
 */
export function environmentStatus(model: EnvironmentModel, readinessState: ReadinessState): EnvironmentStatusBreakdown {
  const airStatus: HazardStatus = model.counts.red > 0 ? "CRITICAL" : model.counts.yellow > 0 ? "ELEVATED" : "NOMINAL";
  const readinessStatus: HazardStatus = readinessState === "HOLD" ? "CRITICAL" : readinessState === "CONDITIONAL" ? "ELEVATED" : "NOMINAL";
  const raisedByReadiness = HAZARD_SEVERITY[readinessStatus] > HAZARD_SEVERITY[airStatus];
  return { status: raisedByReadiness ? readinessStatus : airStatus, airStatus, readinessState, readinessStatus, raisedByReadiness };
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
    for (const metric of m.air?.metrics ?? []) {
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

function chartFor(m: ModuleModel, basis: TimeBasis): HazardChartSpec {
  // The shared chart prints each label as "<label> (<value> mmHg)".
  const thresholds: HazardChartThreshold[] = [
    { label: V.chart.limitLabel, value: V.limits.co2TargetMmhg, color: V.chart.limitColor },
    { label: V.chart.earlyWarningLabel, value: V.co2Warning.co2EarlyWarningMmhg, color: V.chart.earlyWarningColor },
  ];
  const tag = m.reading?.co2Tag ?? "SIM";
  return {
    id: sampleChartId(m.streamName),
    title: `${m.moduleName} CO2 — last 2 h [${tag}]`,
    unit: "mmHg",
    series: m.history.map((s) => ({ label: formatTimeLabel(s.tMin, basis), value: s.co2Mmhg })),
    thresholds,
  };
}

export function evaluateEnvironmentHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { actor, reentryMode } = input;
  const model = buildEnvironmentModel(input);
  const breakdown = environmentStatus(model, actor.readinessState);
  const readinessText = `readiness: ${actor.readinessState}${breakdown.raisedByReadiness ? " (sets the status)" : ""}`;

  if (!model.hasData) {
    return {
      status: breakdown.status,
      scenarioStatusSlot: `No Hazard 5 samples in the database yet | ${readinessText}`,
      immediateHorizon: V.messages.noSamples,
      prolongedHorizon: `${V.studyFactsText} [2]`,
      eta: actor.metrics.etaSlot,
      solutions: [],
      charts: [],
    };
  }

  // Immediate: CO2 alerts (critical first), then non-CO2 metrics that are not green.
  const immediateLines: string[] = model.alerts.map((a) => {
    const m = model.modules.find((x) => x.moduleId === a.moduleId) as ModuleModel;
    const co2Text = m.air?.metrics.find((x) => x.metric === "co2")?.text ?? "";
    const why = a.severity === "critical" ? "ETA now" : a.reason ?? "";
    return `${a.severity.toUpperCase()} ${a.title} (${co2Text} [${m.reading?.co2Tag ?? "SIM"}], ${why}): ${a.actions.join("; ")} [DEMO actions]`;
  });
  for (const m of model.modules) {
    for (const metric of m.air?.metrics ?? []) {
      if (metric.metric !== "co2" && metric.status !== "green") {
        immediateLines.push(`${m.moduleName}: ${metric.status} - ${metric.text} [${metric.tag}]`);
      }
    }
  }

  // Prolonged: per-module CO2 picture, then the ledger, then the fixed study facts.
  const moduleLines = model.modules.map((m) => {
    const co2Metric = m.air?.metrics.find((x) => x.metric === "co2");
    if (!co2Metric) return `${m.moduleName}: ${V.messages.noSamples}`;
    const parts = [`${m.moduleName}: ${co2Metric.text} [${co2Metric.tag}]`, m.message];
    if (m.co2?.reason) parts.push(`${m.co2.label}: ${m.co2.reason} [DEMO]`);
    if (m.headacheOddsText) parts.push(`headache odds ${m.headacheOddsText} [2]`);
    parts.push(
      m.forecast.state === "ready"
        ? `trend ${m.forecast.trend} (${formatSlope(m.forecast.slopeMmhgPerMin)} mmHg/min) [ARITHMETIC]`
        : V.messages.collecting
    );
    return parts.join("; ");
  });
  const ledgerLines = model.modules.map((m) =>
    m.ledger
      ? `${m.moduleName}: ${fmt(m.ledger.minutesAboveLimit, FORMAT.otherDecimals)} min above ${V.limits.co2TargetMmhg} mmHg, max CO2 ${fmt(m.ledger.maxCo2Mmhg, FORMAT.co2Decimals)} mmHg`
      : `${m.moduleName}: —`
  );

  // ETA: critical modules act now; otherwise the nearest "Rapid rise" trend estimate; otherwise the actor slot.
  const critical = model.alerts.filter((a) => a.severity === "critical");
  const nearest = model.modules
    .map((m) => ({ name: m.moduleName, min: m.co2?.minutesToTarget ?? null }))
    .filter((x): x is { name: string; min: number } => x.min !== null)
    .sort((a, b) => a.min - b.min)[0];
  const eta =
    critical.length > 0
      ? `Now: CO2 above ${V.limits.co2TargetMmhg} mmHg in ${critical.map((a) => a.moduleName).join(", ")}`
      : nearest
      ? `${nearest.name}: ${fill(V.messages.minutesToLimit, { n: String(Math.round(nearest.min)) })}`
      : actor.metrics.etaSlot;

  const badge = model.dataBadge ? ` ${model.dataBadge}` : "";
  return {
    status: breakdown.status,
    scenarioStatusSlot: `${model.banner} | CO2 data [${model.dataTag ?? "SIM"}]${badge} | latest sample: ${model.latestLabel ?? "—"} | ${readinessText}`,
    immediateHorizon: immediateLines.length > 0 ? immediateLines.join(" | ") : "No alerts.",
    prolongedHorizon: `${moduleLines.join(" | ")} | Ledger: ${ledgerLines.join(" | ")} | ${V.studyFactsText} [2] | ${V.limitsTooltipLines.join(" ")}`,
    eta,
    solutions: buildSolutions(model, reentryMode ? 1 : 2),
    charts: model.modules.filter((m) => m.history.length > 0).map((m) => chartFor(m, model.timeBasis)),
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
    "Closed-habitat module air: CO₂, O₂, total pressure and noise against NASA limits, with a CO₂ trend estimate and headache odds above 4 mmHg.",
  // Crew-wide module telemetry: no stream is private. Written by devices or seeders, not by astronauts.
  inputSlots: V.modules.map((m) => ({
    streamName: m.streamName,
    inputPrompt: `${m.name} air sample: CO₂ as the numeric value, with O₂, pressure, noise, temperature and humidity in the payload.`,
    sourceRef: "NASA limits [2][4][5]; OSDR EDA [6][7] when source is nasa-osdr-eda",
    fieldType: "number" as const,
    unit: "mmHg",
    recordSample: true,
    isPrivate: false,
    subfields: [
      { key: V.sampleKeys.co2Unit, label: "CO₂ unit", fieldType: "text" as const, prompt: "CO₂ unit: mmHg (default), ppm or percent." },
      { key: V.sampleKeys.o2Mmhg, label: "O₂", fieldType: "number" as const, unit: "mmHg", prompt: "O₂ partial pressure." },
      { key: V.sampleKeys.pressurePsia, label: "Total pressure", fieldType: "number" as const, unit: "psia", prompt: "Total cabin pressure." },
      { key: V.sampleKeys.noiseDba, label: "Noise", fieldType: "number" as const, unit: "dBA", prompt: "Noise level." },
      { key: V.sampleKeys.temperatureC, label: "Temperature", fieldType: "number" as const, unit: "°C", prompt: "Temperature (information only)." },
      { key: V.sampleKeys.humidityPct, label: "Humidity", fieldType: "number" as const, unit: "%RH", prompt: "Relative humidity (information only)." },
      { key: V.sampleKeys.tMin, label: "Time", fieldType: "number" as const, unit: "min", prompt: "Optional minutes since the start of the record." },
      { key: V.sampleKeys.source, label: "Source", fieldType: "text" as const, prompt: "Data source, e.g. nasa-osdr-eda." },
      { key: V.sampleKeys.provenanceKind, label: "Provenance", fieldType: "text" as const, prompt: "real for measured NASA data; any other value is shown as SIM." },
    ],
  })),
  outputSlots: {
    immediateHorizon: "CO₂ alerts per module (warning or critical, ETA, 1–2 demo actions) and red or yellow O₂, pressure or noise readings.",
    prolongedHorizon: "Per-module CO₂ status, headache odds above 4 mmHg, trend estimate and minutes above the limit.",
    etaSlot: "Trend estimate of the time until module CO₂ reaches the 4 mmHg NASA limit.",
    solutionsSlot: "1–2 demo actions, for example: Check the CO2 scrubber for Habitat.",
  },
  leadView: {
    summary: "Habitat map (green, yellow or red per module), CO₂ alerts and trend estimates for every module, and the minutes-above-limit ledger.",
    privacyRule: "Environmental module telemetry is crew-wide; contact tracing / contagion views are flagged as future work with limited public data.",
    modules: [
      {
        title: "Habitat Map",
        detail: "Module status from the worst of CO₂, O₂, pressure and noise against NASA limits.",
        actionSlot: "Read-only: values come from module samples in the database.",
      },
      {
        title: "CO₂ Alerts & Trend",
        detail: "Warning when the trend estimate reaches 4 mmHg within 2 h; critical above 4 mmHg.",
        actionSlot: "Acknowledge alerts on the Hazard 5 screen.",
      },
    ],
  },
  memberView: {
    summary: "The same crew-wide habitat map, CO₂ alerts and NASA limits reference.",
    privacyRule: "Personal symptom logs remain private while shared module alerts warn the whole crew early.",
    modules: [
      {
        title: "Habitat Map & CO₂ Alerts",
        detail: "Module status and CO₂ alerts shared with the whole crew.",
        actionSlot: "Read-only: values come from module samples in the database.",
      },
      {
        title: "Module Safety Limits Reference",
        detail: "NASA limits: CO₂ at or below 4 mmHg, O₂ at or above 122 mmHg (1-hour average), 5.0–15.0 psia, below 85 dBA; NC-40 for sleep areas on missions over 30 days.",
        actionSlot: "Reference only.",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-samples?hazardSlug=environment", purpose: "Fetch module air samples for the scenario" },
    { method: "POST", path: "/api/hazard-samples", purpose: "Append module air samples (Lab / Habitat / Galley / Airlock Air Readings)" },
  ],
  alarmPreset: {
    title: "CLOSED HABITAT ATMOSPHERE BREACH — CO₂ / O₂ / PRESSURE ALERT",
    severity: "CRITICAL",
    etaLabel: "Trend estimate of the time until module CO₂ crosses the 4 mmHg NASA limit, or now when it is already above.",
    descriptionSlot:
      "Module air readings crossed a NASA limit (CO₂, O₂, pressure or noise). Shared module air affects every crew member in that module.",
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
