import type { ResearchInfoEntry } from "@/components/ResearchInfoModal";
import { HazardChartSpec, HazardEvaluationInput, HazardEvaluationResult, HazardSpec } from "./types";

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
      "Tracks rising module ppCO₂ trends and cumulative time above NASA's 4 mmHg target, replaying real ISS cabin telemetry from NASA OSDR alongside module offsets.",
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
// Every value below carries a tag:
//   [2] [4] [5]   NASA source number (docs/hazards/05-hostile-closed-environments.md, Sources)
//   [REAL]        real NASA data (only the ISS cabin CO2 from the OSDR Environmental Data App, once the CSV exists)
//   [DEMO]        a demo input or demo setting, not data and not a research claim
//   [ARITHMETIC]  plain math, not a research claim
// Nothing here is invented: each number comes from the Hazard 5 spec or from the demo values you approved.
export const ENVIRONMENT_PIPELINE_VALUES = {
  supportedStreams: [
    "Lab Air Readings",
    "Habitat Air Readings",
    "Galley Air Readings",
    "Airlock Air Readings",
    "Demo Scenario",
    "Simulated Minutes Elapsed",
  ],

  // --- Input stream names (one per module, plus the two demo inputs) ---
  streams: {
    demoScenario: "Demo Scenario",
    simulatedMinutes: "Simulated Minutes Elapsed",
  },

  // --- NASA limits (research) ---
  limits: {
    co2TargetMmhg: 4, // [2] CO2 at or below 4 mmHg is within the target
    o2YellowBelowMmhg: 130, // [4] below 130 mmHg supplemental O2 may not maintain tissue oxygenation
    o2RedBelowMmhg: 122, // [4] absolute lower limit, 1-hour time-weighted average
    pressureMinPsia: 5.0, // [4] total pressure for indefinite crew exposure
    pressureMaxPsia: 15.0, // [4]
    noiseHazardDba: 85, // [5] hazardous noise: below 85 dBA regardless of duration
    noiseReferenceText: "work areas NC-50, sleep areas NC-40", // [5] information only, no status is computed from it
  },

  // --- Unit conversion and trend band ---
  arithmetic: {
    co2PpmToMmhg: 0.00076, // [ARITHMETIC] mmHg = ppm * 0.00076 (1 mmHg = 1/760 atm)
    co2PercentToMmhg: 7.6, // [ARITHMETIC] mmHg = percent * 7.6
    trendSlopeBandMmhgPerMin: 0.001, // [ARITHMETIC] above +0.001 rising, below -0.001 falling, in between stable
  },

  // --- Demo settings ---
  demoSettings: {
    trendWindowMin: 30, // [DEMO] trend uses the last 30 simulated minutes
    trendAlertHorizonMin: 120, // [DEMO] trend alert when the target is reached within 120 minutes
    historyWindowMin: 120, // [DEMO] charts and history: the last 2 simulated hours
  },

  // --- Modules and their DEMO defaults ---
  // co2OffsetMmhg is added to the cabin CO2. Everything else is a fixed demo input (no noise added).
  modules: [
    { id: "lab", name: "Lab", streamName: "Lab Air Readings", co2OffsetMmhg: 0, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 62 },
    { id: "habitat", name: "Habitat", streamName: "Habitat Air Readings", co2OffsetMmhg: 0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 45 },
    { id: "galley", name: "Galley", streamName: "Galley Air Readings", co2OffsetMmhg: 0.2, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 58 },
    { id: "airlock", name: "Airlock", streamName: "Airlock Air Readings", co2OffsetMmhg: -0.4, o2Mmhg: 149, pressurePsia: 14.7, noiseDba: 52 },
  ],

  // --- Demo scenarios (the "demo buttons", entered through the "Demo Scenario" input) ---
  // [DEMO] values from the approved demo set. Ramps are applied in a straight line over the stated time.
  demoScenarios: {
    ids: ["none", "co2-scrubber-failure", "o2-leak-lab", "noisy-galley", "chaos"], // "none" = Clear
    co2ScrubberFailure: { co2RiseMmhgPerMin: 0.04, co2RiseCapMmhg: 3, appliesTo: "all modules" },
    o2LeakLab: { moduleId: "lab", o2FallsToMmhg: 118, overMin: 20 },
    noisyGalley: { moduleId: "galley", noiseRisesToDba: 90, overMin: 10 },
  },

  // --- Fake CO2 series, used only when there is no data ---
  // [DEMO] a straight ramp from 3.0 mmHg that crosses the 4 mmHg target. NOT NASA DATA.
  // To be replaced with real CSV values (cabin CO2 from the OSDR Environmental Data App).
  // Rule: +0.1 mmHg every 10 simulated minutes (0.01 mmHg per minute); 19 points, minute 0 to minute 180.
  demoCo2Series: [
    { tMin: 0, co2Mmhg: 3.0 },
    { tMin: 10, co2Mmhg: 3.1 },
    { tMin: 20, co2Mmhg: 3.2 },
    { tMin: 30, co2Mmhg: 3.3 },
    { tMin: 40, co2Mmhg: 3.4 },
    { tMin: 50, co2Mmhg: 3.5 },
    { tMin: 60, co2Mmhg: 3.6 },
    { tMin: 70, co2Mmhg: 3.7 },
    { tMin: 80, co2Mmhg: 3.8 },
    { tMin: 90, co2Mmhg: 3.9 },
    { tMin: 100, co2Mmhg: 4.0 },
    { tMin: 110, co2Mmhg: 4.1 },
    { tMin: 120, co2Mmhg: 4.2 },
    { tMin: 130, co2Mmhg: 4.3 },
    { tMin: 140, co2Mmhg: 4.4 },
    { tMin: 150, co2Mmhg: 4.5 },
    { tMin: 160, co2Mmhg: 4.6 },
    { tMin: 170, co2Mmhg: 4.7 },
    { tMin: 180, co2Mmhg: 4.8 },
  ],
  demoDataBadge: "SIMULATED DATA - NOT NASA",

  // --- Fixed texts (verbatim from the spec) ---
  messages: {
    withinTarget: "CO2 is within the NASA target of 4 mmHg.",
    overTarget: "CO2 is above the NASA target of 4 mmHg. Each +1 mmHg doubles the odds of a headache.",
    collecting: "Collecting data...",
  },
  // [2] study facts, not computed
  studyFactsText:
    "Weekly headache risk was about 3.3% without a CO2 cap and about 1.6% with CO2 at or below 4 mmHg. Below 1% would need CO2 under 2 mmHg.",
  limitsTooltipLines: [
    "Only the cabin CO2 is real data. Everything else is a demo input.",
    "The doubling rule is a statistical finding from ISS crews, not an exact law.",
    "The trend and time to target are plain arithmetic, not research.",
  ],
  chartTitleNote: "NASA target 4 mmHg", // goes into the CO2 chart title (no reference-line field on this branch)
};

// [SECTION 2: HAZARD 5 FORMULAS & EVALUATION PIPELINE]
// Pure functions: the same input always gives the same output. No hidden state, no clock, no randomness.
// Time is "simulated minutes". Tags: [2] [4] [5] NASA sources, [DEMO] demo input, [ARITHMETIC] plain math.
const V = ENVIRONMENT_PIPELINE_VALUES;

// Presentation only: how many decimals are printed. Not data and not a research claim.
const FORMAT = { co2Decimals: 2, otherDecimals: 1, slopeDecimals: 3, floatGuardDecimals: 6 };

// Action texts: the team's existing wording in this file, with the sleep, relocation and
// crew-redistribution parts removed. Module level only.
const ACTION_TEXTS = {
  inspectScrubber: "Inspect CO₂ scrubber / ECLSS ventilation loop",
  inspectO2Supply: "Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop",
  isolateModule: "Evacuate/isolate affected module",
};

export type AirStatus = "green" | "yellow" | "red";
export type AirMetric = "co2" | "o2" | "pressure" | "noise";
export type Co2Unit = "ppm" | "percent" | "mmHg";
export type TrendLabel = "rising" | "stable" | "falling";

/** One module reading at one moment. Temperature and humidity are not used (no NASA health limit). */
export interface ModuleReading {
  co2Mmhg: number;
  o2Mmhg: number;
  pressurePsia: number;
  noiseDba: number;
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
  /** For example "O2 118 mmHg". */
  text: string;
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

export type Co2Trend =
  | { state: "collecting" }
  | { state: "ready"; slopeMmhgPerMin: number; label: TrendLabel };

export interface ModuleLedger {
  /** [ARITHMETIC] simulated minutes spent above the 4 mmHg target. */
  minutesAboveTarget: number;
  /** [ARITHMETIC] maximum CO2 seen. */
  maxCo2Mmhg: number;
}

export interface ModuleSimulation {
  moduleId: string;
  moduleName: string;
  history: Co2Sample[];
  reading: ModuleReading;
}

type ModuleConfig = (typeof ENVIRONMENT_PIPELINE_VALUES.modules)[number];

const STATUS_SEVERITY: Record<AirStatus, number> = { green: 0, yellow: 1, red: 2 };

function fmt(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

/** Removes floating-point noise such as 3.9000000000000004. */
function cleanFloat(value: number): number {
  return Number(value.toFixed(FORMAT.floatGuardDecimals));
}

// ---------------------------------------------------------------------------
// Unit conversion [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * CSV CO2 value to mmHg.
 *   ppm:     mmHg = ppm * 0.00076   e.g. 5000 ppm -> 3.8 mmHg
 *   percent: mmHg = percent * 7.6   e.g. 0.5 %    -> 3.8 mmHg
 *   mmHg:    unchanged
 */
export function co2ToMmhg(value: number, unit: Co2Unit): number {
  if (unit === "ppm") return value * V.arithmetic.co2PpmToMmhg;
  if (unit === "percent") return value * V.arithmetic.co2PercentToMmhg;
  return value;
}

// ---------------------------------------------------------------------------
// Statuses from NASA limits only
// ---------------------------------------------------------------------------

/** [2] CO2: green at 4 mmHg or less, red above. No yellow.   3.9 -> green, 4.0 -> green, 4.1 -> red */
export function co2Status(co2Mmhg: number): AirStatus {
  return co2Mmhg > V.limits.co2TargetMmhg ? "red" : "green";
}

/** [4] O2: green at 130 or more, yellow from 122 to below 130, red below 122.   149 -> green, 125 -> yellow, 118 -> red */
export function o2Status(o2Mmhg: number): AirStatus {
  if (o2Mmhg < V.limits.o2RedBelowMmhg) return "red";
  if (o2Mmhg < V.limits.o2YellowBelowMmhg) return "yellow";
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
 *   { co2 4.4, o2 118, pressure 14.7, noise 62 } -> red, worst "CO2 4.4 mmHg"
 *   { co2 3.2, o2 125, pressure 14.7, noise 62 } -> yellow, worst "O2 125 mmHg"
 */
export function evaluateModuleAir(reading: ModuleReading): ModuleAirStatus {
  const metrics: MetricStatus[] = [
    { metric: "co2", value: reading.co2Mmhg, unit: "mmHg", status: co2Status(reading.co2Mmhg), text: formatMetric("co2", reading.co2Mmhg) },
    { metric: "o2", value: reading.o2Mmhg, unit: "mmHg", status: o2Status(reading.o2Mmhg), text: formatMetric("o2", reading.o2Mmhg) },
    { metric: "pressure", value: reading.pressurePsia, unit: "psia", status: pressureStatus(reading.pressurePsia), text: formatMetric("pressure", reading.pressurePsia) },
    { metric: "noise", value: reading.noiseDba, unit: "dBA", status: noiseStatus(reading.noiseDba), text: formatMetric("noise", reading.noiseDba) },
  ];
  let worst = metrics[0];
  for (const m of metrics) {
    if (STATUS_SEVERITY[m.status] > STATUS_SEVERITY[worst.status]) worst = m;
  }
  return { status: worst.status, worstMetric: worst, metrics };
}

/** "Modules: N green, N yellow, N red". */
export function formatBanner(statuses: AirStatus[]): string {
  const count = (s: AirStatus) => statuses.filter((x) => x === s).length;
  return `Modules: ${count("green")} green, ${count("yellow")} yellow, ${count("red")} red`;
}

// ---------------------------------------------------------------------------
// CO2 and headache odds [2]
// ---------------------------------------------------------------------------

/**
 * Headache odds multiplier vs 4 mmHg = 2 ^ (CO2 - 4), only when CO2 is above 4 mmHg [2].
 * No percentage is computed.   5 -> 2,  6 -> 4,  4.5 -> 1.414...,  4 -> null,  3 -> null
 */
export function headacheOddsMultiplier(co2Mmhg: number): number | null {
  if (co2Mmhg <= V.limits.co2TargetMmhg) return null;
  return Math.pow(2, co2Mmhg - V.limits.co2TargetMmhg);
}

/** "headache odds x{2 ^ (CO2 - 4)} compared to 4 mmHg", only above the target.   5 -> "headache odds x2 compared to 4 mmHg" */
export function headacheOddsText(co2Mmhg: number): string | null {
  const m = headacheOddsMultiplier(co2Mmhg);
  if (m === null) return null;
  return `headache odds x${fmt(m, FORMAT.co2Decimals)} compared to ${V.limits.co2TargetMmhg} mmHg`;
}

// ---------------------------------------------------------------------------
// Trend, time to target, ledger [ARITHMETIC]
// ---------------------------------------------------------------------------

/**
 * Least-squares slope (mmHg per minute) through the samples of the last 30 simulated minutes.
 * Needs at least 30 simulated minutes of history, otherwise "collecting" ("Collecting data...").
 * Label uses the 0.001 mmHg/min band in both directions.
 *   t 0,10,20,30 with CO2 3.0,3.1,3.2,3.3 -> slope 0.01, rising
 *   t 0,10,20 only                         -> collecting
 *   flat CO2 for 40 min                    -> slope 0, stable
 */
export function co2Trend(history: Co2Sample[]): Co2Trend {
  if (history.length < 2) return { state: "collecting" };
  const latest = history[history.length - 1];
  if (latest.tMin - history[0].tMin < V.demoSettings.trendWindowMin) return { state: "collecting" };

  const win = history.filter((s) => s.tMin >= latest.tMin - V.demoSettings.trendWindowMin);
  if (win.length < 2) return { state: "collecting" };

  const meanT = win.reduce((sum, s) => sum + s.tMin, 0) / win.length;
  const meanY = win.reduce((sum, s) => sum + s.co2Mmhg, 0) / win.length;
  let num = 0;
  let den = 0;
  for (const s of win) {
    num += (s.tMin - meanT) * (s.co2Mmhg - meanY);
    den += (s.tMin - meanT) * (s.tMin - meanT);
  }
  if (den === 0) return { state: "collecting" };

  const slope = num / den;
  const band = V.arithmetic.trendSlopeBandMmhgPerMin;
  const label: TrendLabel = slope > band ? "rising" : slope < -band ? "falling" : "stable";
  return { state: "ready", slopeMmhgPerMin: slope, label };
}

/**
 * Minutes to the 4 mmHg target, only when rising (slope above 0.001) and CO2 is below 4:
 * (4 - CO2) / slope.   co2 3.0, slope 0.01 -> 100;  co2 3.0, slope 0.001 -> null;  co2 4.0 -> null
 */
export function minutesToTarget(co2Mmhg: number, slopeMmhgPerMin: number): number | null {
  if (slopeMmhgPerMin > V.arithmetic.trendSlopeBandMmhgPerMin && co2Mmhg < V.limits.co2TargetMmhg) {
    return (V.limits.co2TargetMmhg - co2Mmhg) / slopeMmhgPerMin;
  }
  return null;
}

/** "If the current trend continues, CO2 reaches 4 mmHg in about {n} min (trend estimate)."   100.4 -> "... about 100 min ..." */
export function trendMessage(minutes: number): string {
  return `If the current trend continues, CO2 reaches ${V.limits.co2TargetMmhg} mmHg in about ${Math.round(minutes)} min (trend estimate).`;
}

/**
 * Ledger per module: simulated minutes above 4 mmHg and the maximum CO2.
 * A sample above the target counts the minutes since the previous sample.
 *   t 0,10,20,30 with CO2 3.9,4.1,4.2,3.8 -> 20 min above (t=10 and t=20), max 4.2
 */
export function buildLedger(history: Co2Sample[]): ModuleLedger {
  let minutes = 0;
  let max = history.length > 0 ? history[0].co2Mmhg : 0;
  for (let i = 1; i < history.length; i++) {
    max = Math.max(max, history[i].co2Mmhg);
    if (co2Status(history[i].co2Mmhg) === "red") minutes += history[i].tMin - history[i - 1].tMin;
  }
  return { minutesAboveTarget: minutes, maxCo2Mmhg: max };
}

// ---------------------------------------------------------------------------
// Deterministic demo simulation [DEMO]
// ---------------------------------------------------------------------------

/**
 * Builds one module's CO2 history and its current reading from:
 *   the demo series (loops at the end), the module offset, the elapsed simulated minutes
 *   and the active demo scenario. Nothing is stored between calls.
 *
 * Samples sit on the series step (10 min). Elapsed minutes are rounded down to that step.
 * A scenario is treated as active from simulated minute 0.
 *   - co2-scrubber-failure: CO2 + min(0.04 * t, 3) in every module
 *   - o2-leak-lab: Lab O2 falls in a straight line from its default to 118 mmHg over 20 min
 *   - noisy-galley: Galley noise rises in a straight line from its default to 90 dBA over 10 min
 * Example (Lab, no scenario, elapsed 30): samples t 0,10,20,30 = 3.0, 3.1, 3.2, 3.3
 * Example (Habitat, offset +0.4, elapsed 20): 3.4, 3.5, 3.6
 */
export function buildModuleSimulation(module: ModuleConfig, elapsedMin: number, scenarioId: string): ModuleSimulation {
  if (scenarioId === "chaos") {
    const modIndex = Math.max(
      0,
      V.modules.findIndex((m) => m.id === module.id)
    );
    const stepMin = 10;
    const lastIndex = Math.max(11, Math.floor(Math.max(0, elapsedMin) / stepMin));
    const history: Co2Sample[] = [];
    for (let k = 0; k <= lastIndex; k++) {
      const tMin = k * stepMin;
      const swing = Math.sin((k + 1) * 1.85 + modIndex * 1.4) * 3.4;
      const spike = (k + modIndex) % 2 === 0 ? 2.2 : -1.4;
      const co2Mmhg = cleanFloat(Math.max(1.2, 4.9 + swing + spike));
      history.push({ tMin, co2Mmhg });
    }
    const lastSample = history[history.length - 1];
    const phase = lastSample.tMin / 10 + modIndex;
    return {
      moduleId: module.id,
      moduleName: module.name,
      history,
      reading: {
        co2Mmhg: lastSample.co2Mmhg,
        o2Mmhg: cleanFloat(132 + Math.cos(phase * 2.1) * 24),
        pressurePsia: cleanFloat(10.2 + Math.sin(phase * 1.7) * 5.6),
        noiseDba: cleanFloat(76 + Math.sin(phase * 2.5) * 26),
      },
    };
  }

  const series = V.demoCo2Series;
  const stepMin = series[1].tMin - series[0].tMin;
  const lastIndex = Math.floor(Math.max(0, elapsedMin) / stepMin);

  const history: Co2Sample[] = [];
  for (let k = 0; k <= lastIndex; k++) {
    const tMin = k * stepMin;
    const cabinCo2 = series[k % series.length].co2Mmhg;
    const scrubberRise =
      scenarioId === "co2-scrubber-failure"
        ? Math.min(V.demoScenarios.co2ScrubberFailure.co2RiseMmhgPerMin * tMin, V.demoScenarios.co2ScrubberFailure.co2RiseCapMmhg)
        : 0;
    history.push({ tMin, co2Mmhg: cleanFloat(cabinCo2 + module.co2OffsetMmhg + scrubberRise) });
  }

  const nowMin = history[history.length - 1].tMin;
  let o2Mmhg = module.o2Mmhg;
  if (scenarioId === "o2-leak-lab" && module.id === V.demoScenarios.o2LeakLab.moduleId) {
    const done = Math.min(nowMin / V.demoScenarios.o2LeakLab.overMin, 1);
    o2Mmhg = cleanFloat(module.o2Mmhg - (module.o2Mmhg - V.demoScenarios.o2LeakLab.o2FallsToMmhg) * done);
  }
  let noiseDba = module.noiseDba;
  if (scenarioId === "noisy-galley" && module.id === V.demoScenarios.noisyGalley.moduleId) {
    const done = Math.min(nowMin / V.demoScenarios.noisyGalley.overMin, 1);
    noiseDba = cleanFloat(module.noiseDba + (V.demoScenarios.noisyGalley.noiseRisesToDba - module.noiseDba) * done);
  }

  return {
    moduleId: module.id,
    moduleName: module.name,
    history,
    reading: {
      co2Mmhg: history[history.length - 1].co2Mmhg,
      o2Mmhg,
      pressurePsia: module.pressurePsia,
      noiseDba,
    },
  };
}

/** Keeps only known scenario ids ("none" = Clear). */
function normalizeScenario(raw: string): string {
  const id = raw.trim();
  return V.demoScenarios.ids.includes(id) ? id : "none";
}

/** Elapsed minutes from the input: a number of 0 or more, otherwise 0. */
function parseElapsed(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * getAirLayer(): `{ moduleId, status, worstMetric }` per module, so other layers can plug into the same map.
 * Pure: pass the simulated minutes and the scenario id (defaults: minute 0, no scenario).
 */
export function getAirLayer(simulatedMinutes = 0, scenarioId = "none"): AirLayerEntry[] {
  const scenario = normalizeScenario(scenarioId);
  return V.modules.map((module) => {
    const sim = buildModuleSimulation(module, simulatedMinutes, scenario);
    const { status, worstMetric } = evaluateModuleAir(sim.reading);
    return { moduleId: module.id, status, worstMetric };
  });
}

// ---------------------------------------------------------------------------
// evaluate()
// ---------------------------------------------------------------------------

interface ModuleAnalysis {
  sim: ModuleSimulation;
  air: ModuleAirStatus;
  trend: Co2Trend;
  minutesToTarget: number | null;
  ledger: ModuleLedger;
}

function analyzeModule(sim: ModuleSimulation): ModuleAnalysis {
  const trend = co2Trend(sim.history);
  return {
    sim,
    air: evaluateModuleAir(sim.reading),
    trend,
    minutesToTarget: trend.state === "ready" ? minutesToTarget(sim.reading.co2Mmhg, trend.slopeMmhgPerMin) : null,
    ledger: buildLedger(sim.history),
  };
}

/** A trend warning: the trend estimate reaches the target within 120 minutes (CO2 still within the target). */
function hasTrendWarning(a: ModuleAnalysis): boolean {
  return a.minutesToTarget !== null && a.minutesToTarget <= V.demoSettings.trendAlertHorizonMin;
}

/** One action per problem, module level. Priority: red modules, yellow modules, trend warnings. */
function buildSolutions(analyses: ModuleAnalysis[], maxSolutions: number): string[] {
  const rank = (a: ModuleAnalysis) => (a.air.status === "red" ? 0 : a.air.status === "yellow" ? 1 : 2);
  const problems = analyses.filter((a) => a.air.status !== "green" || hasTrendWarning(a)).sort((a, b) => rank(a) - rank(b));

  const actions: string[] = [];
  const add = (text: string, moduleName: string) => {
    const line = `${text} (${moduleName})`;
    if (!actions.includes(line)) actions.push(line);
  };

  if (analyses.length > 0 && analyses.every((a) => a.air.status === "red")) {
    const byCo2Desc = [...analyses].sort((a, b) => b.sim.reading.co2Mmhg - a.sim.reading.co2Mmhg);
    const worst = byCo2Desc[0];
    const lowest = byCo2Desc[byCo2Desc.length - 1];
    const worstMetric = worst.air.worstMetric.metric;
    add(
      worstMetric === "o2" ? ACTION_TEXTS.inspectO2Supply : ACTION_TEXTS.inspectScrubber,
      worst.sim.moduleName
    );
    actions.push(
      `Stage non-essential work in lowest-CO₂ module (${lowest.sim.moduleName}: ${formatMetric("co2", lowest.sim.reading.co2Mmhg)})`
    );
    return actions.slice(0, maxSolutions);
  }

  for (const a of problems) {
    const metric = a.air.status === "green" ? "co2" : a.air.worstMetric.metric;
    add(metric === "o2" ? ACTION_TEXTS.inspectO2Supply : metric === "co2" ? ACTION_TEXTS.inspectScrubber : ACTION_TEXTS.isolateModule, a.sim.moduleName);
    if (a.air.status === "red") add(ACTION_TEXTS.isolateModule, a.sim.moduleName);
  }
  return actions.slice(0, maxSolutions);
}

export function evaluateEnvironmentHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const {
    actor,
    actorInputs,
    hazardRecords,
    scenarioHazardRecords = [],
    scenarioHazardSamples = [],
  } = input;
  const maxSolutions = 2;

  const readStream = (streamName: string) =>
    actorInputs[streamName] ||
    hazardRecords.find((r) => r.streamName === streamName)?.rawValue ||
    scenarioHazardRecords.find((r) => r.hazardSlug === "environment" && r.streamName === streamName)?.rawValue ||
    "";
  const scenarioId = normalizeScenario(readStream(V.streams.demoScenario));
  const elapsedMin = parseElapsed(readStream(V.streams.simulatedMinutes));

  const analyses = V.modules.map((module) => {
    if (scenarioId === "chaos") {
      const modSamples = scenarioHazardSamples
        .filter((s) => s.hazardSlug === "environment" && s.streamName === module.streamName && s.numericValue !== null)
        .slice(-16);
      if (modSamples.length >= 2) {
        const t0 = Date.parse(modSamples[0].recordedAt) || 0;
        const history: Co2Sample[] = modSamples.map((s, idx) => {
          const ts = Date.parse(s.recordedAt) || t0 + idx * 10 * 60_000;
          const tMin = Math.max(0, Math.round((ts - t0) / 60_000));
          return { tMin, co2Mmhg: cleanFloat(s.numericValue as number) };
        });
        const latestRec =
          scenarioHazardRecords.find((r) => r.hazardSlug === "environment" && r.streamName === module.streamName)
            ?.payload ?? modSamples[modSamples.length - 1].samplePayload;
        const n = (k: string, fb: number) => {
          const v = Number(latestRec?.[k]);
          return Number.isFinite(v) ? v : fb;
        };
        const sim: ModuleSimulation = {
          moduleId: module.id,
          moduleName: module.name,
          history,
          reading: {
            co2Mmhg: history[history.length - 1].co2Mmhg,
            o2Mmhg: cleanFloat(n("o2MmHg", module.o2Mmhg)),
            pressurePsia: cleanFloat(n("pressurePsia", module.pressurePsia)),
            noiseDba: cleanFloat(n("noiseDba", module.noiseDba)),
          },
        };
        return analyzeModule(sim);
      }
    }
    return analyzeModule(buildModuleSimulation(module, elapsedMin, scenarioId));
  });
  const statuses = analyses.map((a) => a.air.status);
  const nowMin = analyses[0].sim.history[analyses[0].sim.history.length - 1].tMin;

  const airStatus: HazardEvaluationResult["status"] = statuses.includes("red")
    ? "CRITICAL"
    : statuses.includes("yellow")
    ? "ELEVATED"
    : "NOMINAL";
  const status = airStatus;

  // Immediate: critical alerts (CO2 above target), trend warnings, then affected modules.
  const immediateLines: string[] = [];
  const overTargetModules = analyses.filter((a) => co2Status(a.sim.reading.co2Mmhg) === "red");
  if (overTargetModules.length > 0) {
    const listed = overTargetModules
      .map((a) => `${a.sim.moduleName} (${formatMetric("co2", a.sim.reading.co2Mmhg)})`)
      .join(", ");
    immediateLines.push(`${listed}: ${V.messages.overTarget}`);
  }
  for (const a of analyses) {
    if (hasTrendWarning(a) && a.minutesToTarget !== null) {
      immediateLines.push(`${a.sim.moduleName}: ${trendMessage(a.minutesToTarget)}`);
    }
  }
  for (const a of analyses) {
    if (a.air.status !== "green" && co2Status(a.sim.reading.co2Mmhg) !== "red") {
      immediateLines.push(`${a.sim.moduleName}: ${a.air.worstMetric.text}`);
    }
  }

  // Prolonged: concise peak CO2 & exposure summary + NASA headache benchmark.
  const peakModule = analyses.reduce((best, curr) =>
    curr.sim.reading.co2Mmhg > best.sim.reading.co2Mmhg ? curr : best
  );
  const exposedModules = analyses.filter((a) => a.ledger.minutesAboveTarget > 0);
  const exposureSummary =
    exposedModules.length > 0
      ? exposedModules
          .map(
            (a) =>
              `${a.sim.moduleName} (${fmt(a.ledger.minutesAboveTarget, FORMAT.otherDecimals)} min > ${V.limits.co2TargetMmhg} mmHg, max ${fmt(a.ledger.maxCo2Mmhg, FORMAT.co2Decimals)} mmHg)`
          )
          .join(", ")
      : `All 4 modules remain within ${V.limits.co2TargetMmhg} mmHg CO₂ target (0 min over target)`;

  const prolongedHorizon = `Peak CO₂: ${fmt(peakModule.sim.reading.co2Mmhg, FORMAT.co2Decimals)} mmHg in ${peakModule.sim.moduleName}. ${exposureSummary}. ${V.studyFactsText}`;

  // ETA: nearest time to target among rising modules, otherwise factual status summary.
  const trendEta = analyses
    .filter((a) => a.minutesToTarget !== null)
    .sort((a, b) => (a.minutesToTarget as number) - (b.minutesToTarget as number))
    .map((a) => `${a.sim.moduleName}: ${trendMessage(a.minutesToTarget as number)}`)[0];
  const fallbackEta =
    status === "CRITICAL"
      ? "Target exceeded — active scrubber remediation required"
      : status === "ELEVATED"
      ? "Elevated telemetry — monitor CO₂ / O₂ trend"
      : "Nominal — all modules within NASA atmosphere limits";
  const eta = trendEta ?? (actor.metrics.etaSlot.toLowerCase().includes("add your info") ? fallbackEta : actor.metrics.etaSlot);

  const charts: HazardChartSpec[] = analyses.map((a) => {
    const trendSlope = a.trend.state === "ready" ? a.trend.slopeMmhgPerMin : null;
    const projectionSeries =
      trendSlope !== null
        ? [30, 60, 90, 120].map((stepMin) => ({
            label: `+${stepMin}m`,
            value: Math.max(
              0,
              Number((a.sim.reading.co2Mmhg + trendSlope * stepMin).toFixed(FORMAT.co2Decimals))
            ),
          }))
        : undefined;
    return {
      id: `co2-${a.sim.moduleId}`,
      title: `${a.sim.moduleName} CO₂ (${V.chartTitleNote})`,
      unit: "mmHg",
      series: a.sim.history
        .filter((s) => s.tMin >= nowMin - V.demoSettings.historyWindowMin)
        .map((s) => ({ label: `${s.tMin} min`, value: s.co2Mmhg })),
      projectionSeries,
      thresholds: [
        { label: "NASA target", value: V.limits.co2TargetMmhg, color: "#ef4444" },
      ],
    };
  });

  return {
    status,
    scenarioStatusSlot: `${formatBanner(statuses)} · ${scenarioId === "none" ? "Nominal Ops" : scenarioId}`,
    immediateHorizon: immediateLines.length > 0 ? immediateLines.join(" · ") : "All habitat modules nominal.",
    prolongedHorizon,
    eta,
    solutions: buildSolutions(analyses, maxSolutions),
    charts,
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
    ...V.modules.map((m) => ({
      streamName: m.streamName,
      inputPrompt: `${m.name} CO₂ (<= 4 mmHg), O₂ (>= 122 mmHg), pressure (5.0–15.0 psia), noise (< 85 dBA)`,
      sourceRef: "OCHMO CO₂ / Habitable Atmosphere / Acoustics",
    })),
    {
      streamName: V.streams.demoScenario,
      inputPrompt: "Demo scenario id (none, co2-scrubber-failure, o2-leak-lab, noisy-galley)",
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
      "Module A atmospheric telemetry breached operational bounds. Crew at risk of shared environmental debuff.",
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
