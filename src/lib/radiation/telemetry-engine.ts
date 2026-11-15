import type { Compartment } from "@/lib/spacecraft/types";

export type TelemetryMode = "DEMO" | "LIVE";
export type TelemetrySeverity = "NORMAL" | "WARNING" | "CRITICAL" | "OFFLINE";
export type DemoRadiationProfile = "QUIET" | "ELEVATED" | "CRITICAL";

export interface TelemetryThresholds {
  warningMsvPerHour: number;
  criticalMsvPerHour: number;
}

export interface TelemetryPoint {
  simulationSecond: number;
  value: number;
}

export interface CompartmentTelemetry {
  id: string;
  compartmentId: string;
  compartmentName: string;
  compartmentType: string;
  doseRateMsvPerHour: number | null;
  status: TelemetrySeverity;
  online: boolean;
  history: TelemetryPoint[];
}

export interface CrewExposureTelemetry {
  id: string;
  callsign: string;
  compartmentId: string;
  currentDoseRateMsvPerHour: number;
  cumulativeDoseMsv: number;
  status: Exclude<TelemetrySeverity, "OFFLINE">;
  history: TelemetryPoint[];
}

export interface TelemetryAlert {
  id: string;
  simulationSecond: number;
  severity: Exclude<TelemetrySeverity, "OFFLINE">;
  reason: string;
  acknowledgedAtSecond: number | null;
}

export interface RadiationTelemetryState {
  seed: string;
  profile: DemoRadiationProfile;
  simulationSecond: number;
  overallStatus: Exclude<TelemetrySeverity, "OFFLINE">;
  ambientDoseRateMsvPerHour: number;
  sensors: CompartmentTelemetry[];
  crew: CrewExposureTelemetry[];
  alerts: TelemetryAlert[];
}

export interface ForecastPoint {
  minute: number;
  doseRateMsvPerHour: number;
  lowerMsvPerHour: number;
  upperMsvPerHour: number;
}

export interface ImmediateForecast {
  generatedAtSecond: number;
  points: ForecastPoint[];
  horizons: Array<{
    minutes: 15 | 60 | 360;
    projectedDoseRateMsvPerHour: number;
    additionalDoseMsv: number;
    uncertaintyPercent: number;
  }>;
  assumption: string;
}

export interface ProlongedForecast {
  generatedAtSecond: number;
  horizons: Array<{
    hours: 24 | 168 | 720;
    constantRateDoseMsv: number;
    decayingEventDoseMsv: number;
    persistentEventDoseMsv: number;
  }>;
  assumption: string;
}

const HISTORY_LIMIT = 120;
const FIXED_START_MS = Date.UTC(2026, 10, 15, 0, 0, 0);

function round(value: number, places = 6): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicNoise(seed: string, tick: number, channel: number): number {
  let value = hashText(`${seed}:${tick}:${channel}`) || 1;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

export function validateTelemetryThresholds(thresholds: TelemetryThresholds): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(thresholds.warningMsvPerHour) || thresholds.warningMsvPerHour < 0) {
    errors.push("Warning threshold must be zero or greater.");
  }
  if (!Number.isFinite(thresholds.criticalMsvPerHour) || thresholds.criticalMsvPerHour <= 0) {
    errors.push("Critical threshold must be greater than zero.");
  }
  if (thresholds.criticalMsvPerHour <= thresholds.warningMsvPerHour) {
    errors.push("Critical threshold must be higher than warning threshold.");
  }
  return errors;
}

export function classifyDoseRate(
  doseRateMsvPerHour: number,
  thresholds: TelemetryThresholds,
): Exclude<TelemetrySeverity, "OFFLINE"> {
  if (doseRateMsvPerHour >= thresholds.criticalMsvPerHour) return "CRITICAL";
  if (doseRateMsvPerHour >= thresholds.warningMsvPerHour) return "WARNING";
  return "NORMAL";
}

function compartmentMultiplier(compartment: Pick<Compartment, "type">): number {
  switch (compartment.type) {
    case "RADIATION_SHELTER": return 0.36;
    case "MEDICAL_BAY": return 0.76;
    case "STORAGE": return 0.68;
    case "AIRLOCK": return 1.28;
    case "POWER_SECTION": return 1.12;
    case "ENGINEERING_BAY": return 1.08;
    default: return 0.92;
  }
}

function profileBase(profile: DemoRadiationProfile, second: number): number {
  if (profile === "QUIET") return 0.075 + 0.008 * Math.sin(second / 23);
  if (profile === "ELEVATED") return 0.72 + 0.16 * Math.sin(second / 31);
  return 1.82 + 0.48 * Math.sin(second / 21);
}

function appendPoint(history: TelemetryPoint[], point: TelemetryPoint): TelemetryPoint[] {
  return [...history, point].slice(-HISTORY_LIMIT);
}

export function createDemoTelemetryState(input: {
  seed: string;
  compartments: readonly Compartment[];
  crew: ReadonlyArray<{ id: string; callsign: string }>;
  thresholds: TelemetryThresholds;
  profile?: DemoRadiationProfile;
}): RadiationTelemetryState {
  const profile = input.profile ?? "QUIET";
  const availableCompartments = input.compartments.slice(0, 10);
  const ambient = round(profileBase(profile, 0));
  const sensors = availableCompartments.map((compartment, index) => {
    const value = round(Math.max(0, ambient * compartmentMultiplier(compartment) + deterministicNoise(input.seed, 0, index) * 0.006));
    return {
      id: `RAD-${compartment.id}`,
      compartmentId: compartment.id,
      compartmentName: compartment.name,
      compartmentType: compartment.type,
      doseRateMsvPerHour: value,
      status: classifyDoseRate(value, input.thresholds),
      online: true,
      history: [{ simulationSecond: 0, value }],
    } satisfies CompartmentTelemetry;
  });
  const crew = input.crew.map((member, index) => {
    const sensor = sensors[index % Math.max(1, sensors.length)];
    const value = sensor?.doseRateMsvPerHour ?? ambient;
    return {
      id: member.id,
      callsign: member.callsign,
      compartmentId: sensor?.compartmentId ?? "unassigned",
      currentDoseRateMsvPerHour: value,
      cumulativeDoseMsv: 0,
      status: classifyDoseRate(value, input.thresholds),
      history: [{ simulationSecond: 0, value: 0 }],
    };
  });
  const overallStatus = classifyDoseRate(Math.max(ambient, ...sensors.map((sensor) => sensor.doseRateMsvPerHour ?? 0)), input.thresholds);
  return {
    seed: input.seed,
    profile,
    simulationSecond: 0,
    overallStatus,
    ambientDoseRateMsvPerHour: ambient,
    sensors,
    crew,
    alerts: [],
  };
}

export function advanceDemoTelemetry(
  state: RadiationTelemetryState,
  elapsedSeconds: number,
  thresholds: TelemetryThresholds,
): RadiationTelemetryState {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return state;
  if (validateTelemetryThresholds(thresholds).length > 0) return state;
  const nextSecond = state.simulationSecond + elapsedSeconds;
  const ambient = round(Math.max(0, profileBase(state.profile, nextSecond) + deterministicNoise(state.seed, nextSecond, 1000) * 0.025));
  const sensors = state.sensors.map((sensor, index) => {
    if (!sensor.online) return { ...sensor, doseRateMsvPerHour: null, status: "OFFLINE" as const };
    const pseudoCompartment = { type: sensor.compartmentType as Compartment["type"] };
    const value = round(Math.max(0, ambient * compartmentMultiplier(pseudoCompartment) + deterministicNoise(state.seed, nextSecond, index) * 0.018));
    return {
      ...sensor,
      doseRateMsvPerHour: value,
      status: classifyDoseRate(value, thresholds),
      history: appendPoint(sensor.history, { simulationSecond: nextSecond, value }),
    };
  });
  const onlineRates = sensors.flatMap((sensor) => sensor.doseRateMsvPerHour === null ? [] : [sensor.doseRateMsvPerHour]);
  const crew = state.crew.map((member) => {
    const assigned = sensors.find((sensor) => sensor.compartmentId === member.compartmentId && sensor.online);
    const currentRate = assigned?.doseRateMsvPerHour ?? ambient;
    const cumulative = round(member.cumulativeDoseMsv + currentRate * elapsedSeconds / 3600);
    return {
      ...member,
      currentDoseRateMsvPerHour: currentRate,
      cumulativeDoseMsv: cumulative,
      status: classifyDoseRate(currentRate, thresholds),
      history: appendPoint(member.history, { simulationSecond: nextSecond, value: cumulative }),
    };
  });
  const maxRate = Math.max(ambient, ...onlineRates);
  const overallStatus = classifyDoseRate(maxRate, thresholds);
  let alerts = state.alerts;
  if (overallStatus !== state.overallStatus) {
    const reason = overallStatus === "NORMAL"
      ? `Dose rate returned below ${thresholds.warningMsvPerHour} mSv/h.`
      : `${overallStatus === "CRITICAL" ? "Critical" : "Warning"} demo threshold crossed at ${round(maxRate, 3)} mSv/h.`;
    alerts = [{
      id: `TEL-${state.seed}-${nextSecond}-${overallStatus}`,
      simulationSecond: nextSecond,
      severity: overallStatus,
      reason,
      acknowledgedAtSecond: null,
    }, ...alerts].slice(0, 50);
  }
  return { ...state, simulationSecond: nextSecond, ambientDoseRateMsvPerHour: ambient, overallStatus, sensors, crew, alerts };
}

export function setDemoProfile(state: RadiationTelemetryState, profile: DemoRadiationProfile): RadiationTelemetryState {
  return { ...state, profile };
}

export function setSensorOnline(state: RadiationTelemetryState, sensorId: string, online: boolean): RadiationTelemetryState {
  return {
    ...state,
    sensors: state.sensors.map((sensor) => sensor.id === sensorId
      ? { ...sensor, online, status: online ? "NORMAL" : "OFFLINE", doseRateMsvPerHour: online ? state.ambientDoseRateMsvPerHour : null }
      : sensor),
  };
}

export function acknowledgeTelemetryAlert(state: RadiationTelemetryState, alertId: string): RadiationTelemetryState {
  return {
    ...state,
    alerts: state.alerts.map((alert) => alert.id === alertId && alert.acknowledgedAtSecond === null
      ? { ...alert, acknowledgedAtSecond: state.simulationSecond }
      : alert),
  };
}

function recentTrend(state: RadiationTelemetryState): number {
  const sensor = state.sensors.find((item) => item.online && item.history.length >= 2);
  if (!sensor) return 0;
  const points = sensor.history.slice(-8);
  const first = points[0];
  const last = points[points.length - 1];
  const minutes = Math.max((last.simulationSecond - first.simulationSecond) / 60, 1 / 60);
  return (last.value - first.value) / minutes;
}

export function computeImmediateForecast(state: RadiationTelemetryState): ImmediateForecast {
  const trendPerMinute = recentTrend(state);
  const current = state.ambientDoseRateMsvPerHour;
  const points: ForecastPoint[] = [];
  for (let minute = 0; minute <= 360; minute += 15) {
    const damping = Math.exp(-minute / 120);
    const predicted = Math.max(0, current + trendPerMinute * minute * damping);
    const uncertainty = Math.min(0.55, 0.08 + minute / 900);
    points.push({
      minute,
      doseRateMsvPerHour: round(predicted),
      lowerMsvPerHour: round(Math.max(0, predicted * (1 - uncertainty))),
      upperMsvPerHour: round(predicted * (1 + uncertainty)),
    });
  }
  const horizons = ([15, 60, 360] as const).map((minutes) => {
    const point = points.find((item) => item.minute === minutes) ?? points[points.length - 1];
    const averageRate = (current + point.doseRateMsvPerHour) / 2;
    return {
      minutes,
      projectedDoseRateMsvPerHour: point.doseRateMsvPerHour,
      additionalDoseMsv: round(averageRate * minutes / 60),
      uncertaintyPercent: Math.round(Math.min(55, 8 + minutes / 9)),
    };
  });
  return {
    generatedAtSecond: state.simulationSecond,
    points,
    horizons,
    assumption: "Trend from recent onboard samples with exponential damping; uncertainty expands with horizon.",
  };
}

export function computeProlongedForecast(state: RadiationTelemetryState): ProlongedForecast {
  const rate = state.ambientDoseRateMsvPerHour;
  return {
    generatedAtSecond: state.simulationSecond,
    horizons: ([24, 168, 720] as const).map((hours) => ({
      hours,
      constantRateDoseMsv: round(rate * hours),
      decayingEventDoseMsv: round(rate * 0.55 * 12 * (1 - Math.exp(-hours / 12))),
      persistentEventDoseMsv: round(rate * 1.25 * hours),
    })),
    assumption: "Conditional mathematical extrapolation only; it is not a medical or operational safety forecast.",
  };
}

export function telemetryTimestamp(simulationSecond: number): string {
  return new Date(FIXED_START_MS + simulationSecond * 1000).toISOString();
}
