import type {
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

/**
 * ============================================================================
 * HAZARD 1: SPACE RADIATION
 * Owner: Teammate 1 — edit only this file for Hazard 1 calculations/schema.
 *
 * Scientific boundary:
 * - Sv-family and Gy-family values are never combined or converted.
 * - DONKI events are space-weather context, never crew dose measurements.
 * - Thresholds come from a mission-policy DB record; no universal NASA limit is
 *   invented here.
 * ============================================================================
 */

export type RadiationProvenanceKind =
  | "measured"
  | "modeled"
  | "simulated"
  | "experimental";

export type RadiationDoseFamily = "equivalent" | "absorbed";

export interface NormalizedDoseRate {
  family: RadiationDoseFamily;
  value: number;
  unit: "mSv/h" | "mGy/h";
}

export interface NormalizedDose {
  family: RadiationDoseFamily;
  value: number;
  unit: "mSv" | "mGy";
}

export interface DoseRatePoint extends NormalizedDoseRate {
  timestamp: string;
  uncertaintyPercent: number | null;
  qualityFlag: string;
  provenanceKind: RadiationProvenanceKind;
}

export interface DoseIntegrationResult {
  supported: boolean;
  family: RadiationDoseFamily | null;
  value: number | null;
  unit: "mSv" | "mGy" | null;
  hoursCovered: number;
  intervalsUsed: number;
  skippedIntervals: number;
  duplicateTimestamps: number;
  outOfOrderInput: boolean;
  reason?: string;
}

export interface ExposureForecastResult {
  supported: boolean;
  family: RadiationDoseFamily | null;
  projectedValue: number | null;
  lowerValue: number | null;
  upperValue: number | null;
  unit: "mSv" | "mGy" | null;
  remainingHours: number | null;
  assumptions: string[];
  reason?: string;
}

export interface SensorDisagreementResult {
  supported: boolean;
  disagreement: boolean;
  relativeSpreadPercent: number | null;
  thresholdPercent: number | null;
  reason?: string;
}

interface PersonalDosimeterReading {
  rate: NormalizedDoseRate | null;
  cumulativeDose: NormalizedDose | null;
  uncertaintyPercent: number | null;
  measuredAt: string | null;
  provenanceKind: RadiationProvenanceKind;
  qualityFlag: string;
  instrument: string;
  source: string;
}

interface RadiationMissionPolicy {
  label: string;
  mode: "approved" | "simulation";
  family: RadiationDoseFamily;
  elevatedRate: NormalizedDoseRate | null;
  criticalRate: NormalizedDoseRate | null;
  cumulativeBudget: NormalizedDose | null;
  remainingHours: number | null;
  forecastUncertaintyPercent: number | null;
  sensorDisagreementPercent: number | null;
  maxIntegrationGapHours: number | null;
  acknowledgementWindowMinutes: number | null;
}

type UnknownPayload = Record<string, unknown>;

// [SECTION 1: HAZARD 1 VALUES & THRESHOLD SLOTS]
// These are unit-conversion constants, not medical or operational limits.
export const RADIATION_PIPELINE_VALUES = {
  schemaVersion: "radiation.v1",
  streams: {
    personalDosimeter: "Personal Dosimeter",
    compartmentSensors: "Compartment Sensors",
    spaceWeather: "Space Weather (DONKI)",
    missionPolicy: "Radiation Mission Policy",
    researchLab: "Shielding & BioShield Lab (Experimental)",
    emergencyState: "Radiation Emergency State",
    emergencyAudit: "Radiation Emergency Audit",
  },
  supportedProvenanceKinds: [
    "measured",
    "modeled",
    "simulated",
    "experimental",
  ] as const,
  equivalentDoseRateUnits: ["nSv/h", "µSv/h", "uSv/h", "mSv/h", "Sv/h"] as const,
  absorbedDoseRateUnits: ["nGy/h", "µGy/h", "uGy/h", "mGy/h", "Gy/h"] as const,
  equivalentDoseUnits: ["nSv", "µSv", "uSv", "mSv", "Sv"] as const,
  absorbedDoseUnits: ["nGy", "µGy", "uGy", "mGy", "Gy"] as const,
};

const RATE_UNIT_MAP: Record<
  string,
  { family: RadiationDoseFamily; factorToBase: number; unit: "mSv/h" | "mGy/h" }
> = {
  "nsv/h": { family: "equivalent", factorToBase: 0.000001, unit: "mSv/h" },
  "µsv/h": { family: "equivalent", factorToBase: 0.001, unit: "mSv/h" },
  "usv/h": { family: "equivalent", factorToBase: 0.001, unit: "mSv/h" },
  "msv/h": { family: "equivalent", factorToBase: 1, unit: "mSv/h" },
  "sv/h": { family: "equivalent", factorToBase: 1000, unit: "mSv/h" },
  "ngy/h": { family: "absorbed", factorToBase: 0.000001, unit: "mGy/h" },
  "µgy/h": { family: "absorbed", factorToBase: 0.001, unit: "mGy/h" },
  "ugy/h": { family: "absorbed", factorToBase: 0.001, unit: "mGy/h" },
  "mgy/h": { family: "absorbed", factorToBase: 1, unit: "mGy/h" },
  "gy/h": { family: "absorbed", factorToBase: 1000, unit: "mGy/h" },
};

const DOSE_UNIT_MAP: Record<
  string,
  { family: RadiationDoseFamily; factorToBase: number; unit: "mSv" | "mGy" }
> = {
  nsv: { family: "equivalent", factorToBase: 0.000001, unit: "mSv" },
  "µsv": { family: "equivalent", factorToBase: 0.001, unit: "mSv" },
  usv: { family: "equivalent", factorToBase: 0.001, unit: "mSv" },
  msv: { family: "equivalent", factorToBase: 1, unit: "mSv" },
  sv: { family: "equivalent", factorToBase: 1000, unit: "mSv" },
  ngy: { family: "absorbed", factorToBase: 0.000001, unit: "mGy" },
  "µgy": { family: "absorbed", factorToBase: 0.001, unit: "mGy" },
  ugy: { family: "absorbed", factorToBase: 0.001, unit: "mGy" },
  mgy: { family: "absorbed", factorToBase: 1, unit: "mGy" },
  gy: { family: "absorbed", factorToBase: 1000, unit: "mGy" },
};

function canonicalUnit(unit: unknown): string {
  if (typeof unit !== "string") return "";
  return unit.trim().replace(/μ/g, "µ").replace(/\s+/g, "").toLowerCase();
}

function finiteNonNegative(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function finitePositive(value: unknown): number | null {
  const parsed = finiteNonNegative(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function readString(payload: UnknownPayload, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function validIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function provenanceKind(value: unknown): RadiationProvenanceKind {
  return RADIATION_PIPELINE_VALUES.supportedProvenanceKinds.includes(
    value as RadiationProvenanceKind
  )
    ? (value as RadiationProvenanceKind)
    : "simulated";
}

function round4(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

export function normalizeDoseRate(value: unknown, unit: unknown): NormalizedDoseRate | null {
  const numeric = finiteNonNegative(value);
  const definition = RATE_UNIT_MAP[canonicalUnit(unit)];
  if (numeric === null || !definition) return null;
  return {
    family: definition.family,
    value: round4(numeric * definition.factorToBase),
    unit: definition.unit,
  };
}

export function normalizeDose(value: unknown, unit: unknown): NormalizedDose | null {
  const numeric = finiteNonNegative(value);
  const definition = DOSE_UNIT_MAP[canonicalUnit(unit)];
  if (numeric === null || !definition) return null;
  return {
    family: definition.family,
    value: round4(numeric * definition.factorToBase),
    unit: definition.unit,
  };
}

/**
 * Boundary validation for the radiation-specific ingestion endpoint. The
 * generic /api/hazard-data route remains intentionally schema-flexible for all
 * hazards; external devices that want radiation validation should use
 * /api/radiation/telemetry instead.
 */
export function validateRadiationTelemetryPayload(input: {
  streamName: string;
  payload: UnknownPayload;
  numericValue?: number | null;
}): { valid: true } | { valid: false; error: string } {
  const { streamName, payload } = input;
  if (!Object.values(RADIATION_PIPELINE_VALUES.streams).includes(streamName)) {
    return { valid: false, error: `Unsupported radiation stream '${streamName}'.` };
  }

  if (streamName === RADIATION_PIPELINE_VALUES.streams.personalDosimeter) {
    const rate = normalizeDoseRate(payload.doseRateValue ?? input.numericValue, payload.doseRateUnit ?? payload.unit);
    if (!rate) return { valid: false, error: "Personal dosimeter requires a non-negative supported doseRateValue and doseRateUnit." };
    if (payload.cumulativeDoseValue !== undefined && !normalizeDose(payload.cumulativeDoseValue, payload.cumulativeDoseUnit)) {
      return { valid: false, error: "cumulativeDoseValue requires a non-negative supported cumulativeDoseUnit." };
    }
    if (payload.measuredAt !== undefined && !validIsoTimestamp(payload.measuredAt)) {
      return { valid: false, error: "measuredAt must be an ISO-8601 timestamp." };
    }
  }

  if (streamName === RADIATION_PIPELINE_VALUES.streams.compartmentSensors) {
    const rate = normalizeDoseRate(payload.doseRateValue ?? input.numericValue, payload.doseRateUnit ?? payload.unit);
    if (!rate) return { valid: false, error: "Compartment sensor requires a non-negative supported doseRateValue and doseRateUnit." };
    if (!readString(payload, "compartmentId") && !readString(payload, "compartment")) {
      return { valid: false, error: "Compartment sensor requires compartmentId or compartment." };
    }
  }

  if (streamName === RADIATION_PIPELINE_VALUES.streams.missionPolicy) {
    if (!parseMissionPolicy({
      id: "validation",
      scenarioId: "validation",
      characterId: "validation",
      hazardSlug: "radiation",
      streamName,
      rawValue: "validation",
      payload,
      updatedAt: new Date(0).toISOString(),
    })) {
      return { valid: false, error: "Mission policy requires quantityFamily 'equivalent' or 'absorbed' and compatible units for supplied thresholds." };
    }
  }

  if (streamName === RADIATION_PIPELINE_VALUES.streams.spaceWeather) {
    if (!readString(payload, "eventId") || !readString(payload, "eventType")) {
      return { valid: false, error: "Space-weather event requires eventId and eventType." };
    }
  }

  return { valid: true };
}

export function integrateDoseRateSamples(
  inputPoints: readonly DoseRatePoint[],
  options: { maxGapHours?: number | null } = {}
): DoseIntegrationResult {
  if (inputPoints.length < 2) {
    return {
      supported: false,
      family: inputPoints[0]?.family ?? null,
      value: null,
      unit: inputPoints[0]?.family === "absorbed" ? "mGy" : inputPoints[0] ? "mSv" : null,
      hoursCovered: 0,
      intervalsUsed: 0,
      skippedIntervals: 0,
      duplicateTimestamps: 0,
      outOfOrderInput: false,
      reason: "At least two compatible time-stamped dose-rate samples are required.",
    };
  }

  const family = inputPoints[0].family;
  if (inputPoints.some((point) => point.family !== family)) {
    return {
      supported: false,
      family: null,
      value: null,
      unit: null,
      hoursCovered: 0,
      intervalsUsed: 0,
      skippedIntervals: 0,
      duplicateTimestamps: 0,
      outOfOrderInput: false,
      reason: "Gy-family and Sv-family dose-rate samples cannot be integrated together.",
    };
  }

  const originalTimes = inputPoints.map((point) => new Date(point.timestamp).getTime());
  if (originalTimes.some((value) => !Number.isFinite(value))) {
    return {
      supported: false,
      family,
      value: null,
      unit: family === "absorbed" ? "mGy" : "mSv",
      hoursCovered: 0,
      intervalsUsed: 0,
      skippedIntervals: 0,
      duplicateTimestamps: 0,
      outOfOrderInput: false,
      reason: "Every sample must have a valid timestamp.",
    };
  }

  const outOfOrderInput = originalTimes.some(
    (time, index) => index > 0 && time < originalTimes[index - 1]
  );
  const sorted = inputPoints
    .map((point, index) => ({ point, time: originalTimes[index], index }))
    .sort((a, b) => a.time - b.time || a.index - b.index);

  const deduplicated: Array<{ point: DoseRatePoint; time: number }> = [];
  let duplicateTimestamps = 0;
  for (const item of sorted) {
    const last = deduplicated[deduplicated.length - 1];
    if (last && last.time === item.time) {
      deduplicated[deduplicated.length - 1] = item;
      duplicateTimestamps += 1;
    } else {
      deduplicated.push(item);
    }
  }

  let value = 0;
  let hoursCovered = 0;
  let intervalsUsed = 0;
  let skippedIntervals = 0;
  const maxGapHours = finitePositive(options.maxGapHours);

  for (let index = 1; index < deduplicated.length; index += 1) {
    const previous = deduplicated[index - 1];
    const current = deduplicated[index];
    const durationHours = (current.time - previous.time) / 3_600_000;
    if (durationHours <= 0 || (maxGapHours !== null && durationHours > maxGapHours)) {
      skippedIntervals += 1;
      continue;
    }

    value += ((previous.point.value + current.point.value) / 2) * durationHours;
    hoursCovered += durationHours;
    intervalsUsed += 1;
  }

  if (intervalsUsed === 0) {
    return {
      supported: false,
      family,
      value: null,
      unit: family === "absorbed" ? "mGy" : "mSv",
      hoursCovered,
      intervalsUsed,
      skippedIntervals,
      duplicateTimestamps,
      outOfOrderInput,
      reason: "No usable time interval remains after timestamp and gap validation.",
    };
  }

  return {
    supported: true,
    family,
    value: round4(value),
    unit: family === "absorbed" ? "mGy" : "mSv",
    hoursCovered: round4(hoursCovered),
    intervalsUsed,
    skippedIntervals,
    duplicateTimestamps,
    outOfOrderInput,
  };
}

export function buildExposureForecast(input: {
  currentDose: NormalizedDose;
  baselineRate: NormalizedDoseRate;
  remainingHours: number;
  uncertaintyPercent?: number | null;
}): ExposureForecastResult {
  if (input.currentDose.family !== input.baselineRate.family) {
    return {
      supported: false,
      family: null,
      projectedValue: null,
      lowerValue: null,
      upperValue: null,
      unit: null,
      remainingHours: null,
      assumptions: [],
      reason: "Current dose and dose rate belong to incompatible Gy/Sv quantity families.",
    };
  }

  const remainingHours = finiteNonNegative(input.remainingHours);
  if (remainingHours === null) {
    return {
      supported: false,
      family: input.currentDose.family,
      projectedValue: null,
      lowerValue: null,
      upperValue: null,
      unit: input.currentDose.unit,
      remainingHours: null,
      assumptions: [],
      reason: "A finite non-negative mission duration is required.",
    };
  }

  const addedDose = input.baselineRate.value * remainingHours;
  const projectedValue = input.currentDose.value + addedDose;
  const uncertaintyPercent = finiteNonNegative(input.uncertaintyPercent);
  const uncertaintyFraction = uncertaintyPercent === null ? null : uncertaintyPercent / 100;

  return {
    supported: true,
    family: input.currentDose.family,
    projectedValue: round4(projectedValue),
    lowerValue:
      uncertaintyFraction === null
        ? null
        : round4(input.currentDose.value + addedDose * Math.max(0, 1 - uncertaintyFraction)),
    upperValue:
      uncertaintyFraction === null
        ? null
        : round4(input.currentDose.value + addedDose * (1 + uncertaintyFraction)),
    unit: input.currentDose.unit,
    remainingHours: round4(remainingHours),
    assumptions: [
      "The latest compatible dose rate is held constant for the remaining mission time.",
      uncertaintyFraction === null
        ? "No uncertainty interval is shown because no uncertainty input was supplied."
        : `The supplied forecast uncertainty is ${uncertaintyPercent}% of projected added dose.`,
    ],
  };
}

export function detectSensorDisagreement(
  rates: readonly NormalizedDoseRate[],
  thresholdPercent: number | null
): SensorDisagreementResult {
  if (rates.length < 2) {
    return {
      supported: false,
      disagreement: false,
      relativeSpreadPercent: null,
      thresholdPercent: null,
      reason: "At least two sensors are required.",
    };
  }

  const family = rates[0].family;
  if (rates.some((rate) => rate.family !== family)) {
    return {
      supported: false,
      disagreement: false,
      relativeSpreadPercent: null,
      thresholdPercent: null,
      reason: "Sensor disagreement cannot compare Gy-family with Sv-family measurements.",
    };
  }

  const threshold = finiteNonNegative(thresholdPercent);
  if (threshold === null) {
    return {
      supported: false,
      disagreement: false,
      relativeSpreadPercent: null,
      thresholdPercent: null,
      reason: "No mission-policy disagreement threshold was supplied.",
    };
  }

  const values = rates.map((rate) => rate.value).sort((a, b) => a - b);
  const midpoint = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? (values[midpoint - 1] + values[midpoint]) / 2
      : values[midpoint];
  const max = values[values.length - 1];
  const min = values[0];
  const relativeSpreadPercent =
    median === 0 ? (max === 0 ? 0 : Number.POSITIVE_INFINITY) : ((max - min) / median) * 100;

  return {
    supported: true,
    disagreement: relativeSpreadPercent > threshold,
    relativeSpreadPercent: round4(relativeSpreadPercent),
    thresholdPercent: threshold,
  };
}

function parseDosimeterPayload(
  payload: UnknownPayload,
  fallbackTimestamp?: string,
  fallbackNumericValue?: number | null
): PersonalDosimeterReading {
  const rateValue = payload.doseRateValue ?? fallbackNumericValue;
  const rate = normalizeDoseRate(rateValue, payload.doseRateUnit ?? payload.unit);
  const cumulativeDose = normalizeDose(
    payload.cumulativeDoseValue,
    payload.cumulativeDoseUnit
  );

  return {
    rate,
    cumulativeDose,
    uncertaintyPercent: finiteNonNegative(payload.uncertaintyPercent),
    measuredAt:
      validIsoTimestamp(payload.measuredAt) ??
      validIsoTimestamp(payload.timestampUtc) ??
      validIsoTimestamp(fallbackTimestamp),
    provenanceKind: provenanceKind(payload.provenanceKind),
    qualityFlag: readString(payload, "qualityFlag") || "unknown",
    instrument: readString(payload, "instrument"),
    source: readString(payload, "source") || readString(payload, "datasetId"),
  };
}

function sampleToRatePoint(sample: HazardSampleRecord): DoseRatePoint | null {
  const reading = parseDosimeterPayload(
    sample.samplePayload ?? {},
    sample.recordedAt,
    sample.numericValue
  );
  if (!reading.rate || !reading.measuredAt) return null;
  return {
    ...reading.rate,
    timestamp: reading.measuredAt,
    uncertaintyPercent: reading.uncertaintyPercent,
    qualityFlag: reading.qualityFlag,
    provenanceKind: reading.provenanceKind,
  };
}

function parseMissionPolicy(record: HazardDataRecord | undefined): RadiationMissionPolicy | null {
  if (!record) return null;
  const payload = record.payload ?? {};
  const familyValue = readString(payload, "quantityFamily");
  if (familyValue !== "equivalent" && familyValue !== "absorbed") return null;

  const family = familyValue as RadiationDoseFamily;
  const elevatedRate = normalizeDoseRate(payload.elevatedRateValue, payload.rateUnit);
  const criticalRate = normalizeDoseRate(payload.criticalRateValue, payload.rateUnit);
  const cumulativeBudget = normalizeDose(payload.cumulativeBudgetValue, payload.doseUnit);

  return {
    label: readString(payload, "policyLabel") || "Unnamed mission radiation policy",
    mode: readString(payload, "policyMode") === "approved" ? "approved" : "simulation",
    family,
    elevatedRate: elevatedRate?.family === family ? elevatedRate : null,
    criticalRate: criticalRate?.family === family ? criticalRate : null,
    cumulativeBudget: cumulativeBudget?.family === family ? cumulativeBudget : null,
    remainingHours: finiteNonNegative(payload.remainingMissionHours),
    forecastUncertaintyPercent: finiteNonNegative(payload.forecastUncertaintyPercent),
    sensorDisagreementPercent: finiteNonNegative(payload.sensorDisagreementPercent),
    maxIntegrationGapHours: finitePositive(payload.maxIntegrationGapHours),
    acknowledgementWindowMinutes: finitePositive(payload.acknowledgementWindowMinutes),
  };
}

function isActiveSpaceWeatherEvent(record: HazardDataRecord | undefined): boolean {
  if (!record) return false;
  const active = record.payload?.active;
  return active === true || active === "true" || readString(record.payload ?? {}, "status") === "active";
}

function formatNumber(value: number, digits = 4): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number(value.toFixed(digits)));
}

function latestRate(points: readonly DoseRatePoint[]): DoseRatePoint | null {
  return (
    points
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null
  );
}

function latestRecordForStream(
  records: readonly HazardDataRecord[],
  streamName: string,
  characterId?: string
): HazardDataRecord | undefined {
  return records
    .filter(
      (record) =>
        record.hazardSlug === "radiation" &&
        record.streamName === streamName &&
        (!characterId || record.characterId === characterId)
    )
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

function buildRateAndCumulativeCharts(
  points: readonly DoseRatePoint[],
  policy: RadiationMissionPolicy | null
): HazardChartSpec[] {
  const charts: HazardChartSpec[] = [];
  let hasPrimaryRateChart = false;
  for (const family of ["equivalent", "absorbed"] as const) {
    const familyPoints = points
      .filter((point) => point.family === family)
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (familyPoints.length === 0) continue;

    const rateUnit = family === "equivalent" ? "mSv/h" : "mGy/h";
    const thresholds = [];
    if (policy?.family === family && policy.elevatedRate) {
      thresholds.push({ label: `${policy.mode.toUpperCase()} elevated`, value: policy.elevatedRate.value, color: "#D97706" });
    }
    if (policy?.family === family && policy.criticalRate) {
      thresholds.push({ label: `${policy.mode.toUpperCase()} critical`, value: policy.criticalRate.value, color: "#DC2626" });
    }

    charts.push({
      // The first chart intentionally uses evaluator.ts's auto-chart id so its
      // raw fallback cannot duplicate/mix this normalized stream.
      id: hasPrimaryRateChart
        ? `radiation-personal-dose-rate-${family}`
        : `sample-${RADIATION_PIPELINE_VALUES.streams.personalDosimeter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: family === "equivalent" ? "Equivalent dose-rate history" : "Absorbed dose-rate history",
      unit: rateUnit,
      series: familyPoints.map((point) => ({
        label: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: round4(point.value),
      })),
      thresholds,
    });
    hasPrimaryRateChart = true;

    if (familyPoints.length >= 2) {
      const cumulativeSeries: Array<{ label: string; value: number }> = [];
      let running = 0;
      cumulativeSeries.push({
        label: new Date(familyPoints[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: 0,
      });
      for (let index = 1; index < familyPoints.length; index += 1) {
        const previous = familyPoints[index - 1];
        const current = familyPoints[index];
        const durationHours =
          (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) /
          3_600_000;
        const maxGap = policy?.maxIntegrationGapHours ?? null;
        if (durationHours > 0 && (maxGap === null || durationHours <= maxGap)) {
          running += ((previous.value + current.value) / 2) * durationHours;
        }
        cumulativeSeries.push({
          label: new Date(current.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          value: round4(running),
        });
      }
      charts.push({
        id: `radiation-integrated-${family}`,
        title: `Integrated ${family} dose from available samples`,
        unit: family === "equivalent" ? "mSv" : "mGy",
        series: cumulativeSeries,
        thresholds:
          policy?.family === family && policy.cumulativeBudget
            ? [
                {
                  label: `${policy.mode.toUpperCase()} budget`,
                  value: policy.cumulativeBudget.value,
                  color: "#DC2626",
                },
              ]
            : [],
      });
    }
  }
  return charts;
}

function buildCrewComparisonChart(
  input: HazardEvaluationInput,
  preferredFamily: RadiationDoseFamily | null
): HazardChartSpec | null {
  const scenarioRecords = input.scenarioHazardRecords ?? [];
  const series: Array<{ label: string; value: number }> = [];
  let selectedFamily = preferredFamily;

  for (const crewMember of input.mission.crew) {
    const record = latestRecordForStream(
      scenarioRecords,
      RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
      crewMember.id
    );
    if (!record) continue;
    const reading = parseDosimeterPayload(record.payload ?? {}, record.updatedAt);
    if (!reading.cumulativeDose) continue;
    if (selectedFamily === null) selectedFamily = reading.cumulativeDose.family;
    if (reading.cumulativeDose.family !== selectedFamily) continue;
    series.push({ label: crewMember.callsign, value: reading.cumulativeDose.value });
  }

  if (!selectedFamily || series.length === 0) return null;
  return {
    id: `radiation-crew-comparison-${selectedFamily}`,
    title: `Crew cumulative ${selectedFamily} dose comparison`,
    unit: selectedFamily === "equivalent" ? "mSv" : "mGy",
    series,
  };
}

function buildCompartmentChart(input: HazardEvaluationInput): HazardChartSpec[] {
  const records = (input.scenarioHazardRecords ?? []).filter(
    (record) =>
      record.hazardSlug === "radiation" &&
      record.streamName === RADIATION_PIPELINE_VALUES.streams.compartmentSensors
  );
  const latestByCompartment = new Map<string, { updatedAt: number; rate: NormalizedDoseRate }>();

  for (const record of records) {
    const payload = record.payload ?? {};
    const compartment = readString(payload, "compartmentId") || readString(payload, "compartment");
    const rate = normalizeDoseRate(payload.doseRateValue, payload.doseRateUnit ?? payload.unit);
    if (!compartment || !rate) continue;
    const updatedAt = new Date(record.updatedAt).getTime();
    const current = latestByCompartment.get(compartment);
    if (!current || updatedAt >= current.updatedAt) {
      latestByCompartment.set(compartment, { updatedAt, rate });
    }
  }

  return (["equivalent", "absorbed"] as const).flatMap((family) => {
    const series = [...latestByCompartment.entries()]
      .filter(([, value]) => value.rate.family === family)
      .map(([label, value]) => ({ label, value: value.rate.value }));
    return series.length === 0
      ? []
      : [
          {
            id: `radiation-compartments-${family}`,
            title: `Latest compartment ${family} dose rates`,
            unit: family === "equivalent" ? "mSv/h" : "mGy/h",
            series,
          },
        ];
  });
}

// [SECTION 2: HAZARD 1 FORMULAS & EVALUATION PIPELINE]
export function evaluateRadiationHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const { actor, hazardRecords, hazardSamples } = input;
  const maxSolutions = 2;
  const policyRecord = latestRecordForStream(
    input.scenarioHazardRecords ?? hazardRecords,
    RADIATION_PIPELINE_VALUES.streams.missionPolicy
  );
  const policy = parseMissionPolicy(policyRecord);
  const actorDosimeterRecord = latestRecordForStream(
    hazardRecords,
    RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
    actor.id
  );
  const snapshotReading = actorDosimeterRecord
    ? parseDosimeterPayload(actorDosimeterRecord.payload ?? {}, actorDosimeterRecord.updatedAt)
    : null;

  const ratePoints = hazardSamples
    .filter((sample) => sample.streamName === RADIATION_PIPELINE_VALUES.streams.personalDosimeter)
    .map(sampleToRatePoint)
    .filter((point): point is DoseRatePoint => point !== null);
  const latest = latestRate(ratePoints) ??
    (snapshotReading?.rate && snapshotReading.measuredAt
      ? {
          ...snapshotReading.rate,
          timestamp: snapshotReading.measuredAt,
          uncertaintyPercent: snapshotReading.uncertaintyPercent,
          qualityFlag: snapshotReading.qualityFlag,
          provenanceKind: snapshotReading.provenanceKind,
        }
      : null);

  const matchingPoints = latest
    ? ratePoints.filter((point) => point.family === latest.family)
    : ratePoints;
  const integrated = integrateDoseRateSamples(matchingPoints, {
    maxGapHours: policy?.maxIntegrationGapHours,
  });
  const currentDose =
    snapshotReading?.cumulativeDose &&
    (!latest || snapshotReading.cumulativeDose.family === latest.family)
      ? snapshotReading.cumulativeDose
      : integrated.supported && integrated.family && integrated.value !== null && integrated.unit
      ? {
          family: integrated.family,
          value: integrated.value,
          unit: integrated.unit,
        }
      : null;

  const forecast =
    currentDose && latest && policy?.remainingHours !== null && policy?.remainingHours !== undefined
      ? buildExposureForecast({
          currentDose,
          baselineRate: latest,
          remainingHours: policy.remainingHours,
          uncertaintyPercent:
            policy.forecastUncertaintyPercent ?? latest.uncertaintyPercent,
        })
      : null;

  const compartmentRates = (input.scenarioHazardRecords ?? [])
    .filter(
      (record) =>
        record.hazardSlug === "radiation" &&
        record.streamName === RADIATION_PIPELINE_VALUES.streams.compartmentSensors
    )
    .map((record) =>
      normalizeDoseRate(record.payload?.doseRateValue, record.payload?.doseRateUnit ?? record.payload?.unit)
    )
    .filter((rate): rate is NormalizedDoseRate => rate !== null);
  const comparableCompartmentRates = latest
    ? compartmentRates.filter((rate) => rate.family === latest.family)
    : compartmentRates;
  const disagreement = detectSensorDisagreement(
    comparableCompartmentRates,
    policy?.sensorDisagreementPercent ?? null
  );

  const spaceWeatherRecord = latestRecordForStream(
    input.scenarioHazardRecords ?? hazardRecords,
    RADIATION_PIPELINE_VALUES.streams.spaceWeather
  );
  const activeSpaceWeatherEvent = isActiveSpaceWeatherEvent(spaceWeatherRecord);

  let status: HazardEvaluationResult["status"] = "NOMINAL";
  const reasons: string[] = [];

  if (!latest) {
    status = "ELEVATED";
    reasons.push("No valid personal dosimeter dose-rate telemetry is available.");
  } else {
    const quality = latest.qualityFlag.toLowerCase();
    if (["fault", "invalid", "suspect", "offline"].includes(quality)) {
      status = "ELEVATED";
      reasons.push(`Dosimeter quality flag is ${latest.qualityFlag}.`);
    }

    if (policy?.family === latest.family) {
      if (policy.criticalRate && latest.value >= policy.criticalRate.value) {
        status = "CRITICAL";
        reasons.push(`Dose rate reached the ${policy.mode} mission-policy critical threshold.`);
      } else if (policy.elevatedRate && latest.value >= policy.elevatedRate.value) {
        status = "ELEVATED";
        reasons.push(`Dose rate reached the ${policy.mode} mission-policy elevated threshold.`);
      }

      if (
        forecast?.supported &&
        forecast.projectedValue !== null &&
        policy.cumulativeBudget &&
        forecast.projectedValue >= policy.cumulativeBudget.value
      ) {
        status = status === "CRITICAL" ? status : "ELEVATED";
        reasons.push(`Modeled mission-end dose reaches the ${policy.mode} radiation budget.`);
      }
    } else if (!policy) {
      reasons.push("No mission radiation policy is configured; no dose threshold was inferred.");
    }
  }

  if (disagreement.supported && disagreement.disagreement && status !== "CRITICAL") {
    status = "ELEVATED";
    reasons.push("Compartment sensors exceed the mission-policy disagreement threshold.");
  }
  if (activeSpaceWeatherEvent && status !== "CRITICAL") {
    status = "ELEVATED";
    reasons.push("An active DONKI/replayed space-weather event requires onboard verification; it is not a dose reading.");
  }

  const rateSummary = latest
    ? `${formatNumber(latest.value)} ${latest.unit} (${latest.provenanceKind}, quality: ${latest.qualityFlag})`
    : "no compatible reading";
  const policySummary = policy
    ? `${policy.label} [${policy.mode.toUpperCase()}${policy.mode === "simulation" ? " — NOT A UNIVERSAL NASA LIMIT" : ""}]`
    : "no configured mission policy";
  const immediateHorizon = `${status} — ${reasons.join(" ") || "Compatible radiation telemetry is below configured mission-policy triggers."} Latest rate: ${rateSummary}. Policy: ${policySummary}.`;

  let prolongedHorizon = "Mission-end exposure forecast is unavailable until compatible cumulative dose, rate, and remaining mission duration are supplied.";
  if (forecast?.supported && forecast.projectedValue !== null && forecast.unit) {
    const interval =
      forecast.lowerValue !== null && forecast.upperValue !== null
        ? `; uncertainty interval ${formatNumber(forecast.lowerValue)}–${formatNumber(forecast.upperValue)} ${forecast.unit}`
        : "; uncertainty interval unavailable";
    prolongedHorizon = `Modeled mission-end dose: ${formatNumber(forecast.projectedValue)} ${forecast.unit}${interval} (assumes latest compatible rate remains constant).`;
  } else if (currentDose) {
    prolongedHorizon = `Current compatible cumulative dose: ${formatNumber(currentDose.value)} ${currentDose.unit}; forecast unavailable without remaining duration and compatible rate.`;
  }

  let eta = "Estimated Time of Action unavailable without a compatible mission policy and dose budget.";
  if (
    currentDose &&
    latest &&
    policy?.cumulativeBudget &&
    currentDose.family === latest.family &&
    policy.cumulativeBudget.family === latest.family &&
    latest.value > 0
  ) {
    const remainingDose = policy.cumulativeBudget.value - currentDose.value;
    const hours = Math.max(0, remainingDose / latest.value);
    eta = `Modeled time to ${policy.mode} radiation budget at constant latest rate: ${formatNumber(hours, 2)} h.`;
  } else if (status === "CRITICAL") {
    eta = `Immediate action required under ${policy?.label ?? "the active mission procedure"}.`;
  }

  const solutions: string[] = [];
  if (status === "CRITICAL" || activeSpaceWeatherEvent) {
    solutions.push("Follow the approved radiation-protection flight rule and verify onboard dosimeters; DONKI events alone are not crew dose.");
  } else if (status === "ELEVATED") {
    solutions.push("Verify sensor health, provenance, units, timestamps, and a second compatible detector before escalation.");
  } else {
    solutions.push("Continue mission-policy monitoring and preserve dose-rate samples with provenance and uncertainty.");
  }
  if (disagreement.supported && disagreement.disagreement) {
    solutions.push("Isolate the suspect detector and compare compartment readings without silently discarding the highest value.");
  } else {
    solutions.push("Reassess planned higher-exposure tasks against the configured crew radiation budget.");
  }

  const charts = buildRateAndCumulativeCharts(ratePoints, policy);
  const crewChart = buildCrewComparisonChart(input, latest?.family ?? currentDose?.family ?? null);
  if (crewChart) charts.push(crewChart);
  charts.push(...buildCompartmentChart(input));

  return {
    status,
    scenarioStatusSlot: `${input.mission.environment.radiationStatusSlot} | ${policySummary}`,
    immediateHorizon,
    prolongedHorizon,
    eta,
    solutions: solutions.slice(0, maxSolutions),
    charts,
  };
}

// [SECTION 3: HAZARD 1 UI METADATA, INPUT STREAMS & ALARMS]
export const radiationHazard: HazardSpec = {
  slug: "radiation",
  number: 1,
  title: "Space Radiation",
  shortTitle: "Radiation",
  ownerSlot: "src/lib/hazards/01-radiation.ts",
  sourceDoc: "docs/hazards/01-space-radiation.md",
  nasaReferences: [
    "NASA HRP Space Radiation",
    "NASA DONKI (SEP / FLR / RBE)",
    "Mars RAD / PDS",
    "Artemis I Orion Measurements",
    "NASA OLTARIS & OSDR / BioSentinel",
  ],
  overviewSlot:
    "DB-driven personal and crew radiation monitoring with unit-safe Gy/Sv separation, exposure forecasting, NASA DONKI context, shelter workflow, and explicit provenance.",
  inputSlots: [
    {
      streamName: RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
      inputPrompt: "DB/API telemetry only: personal dose rate, cumulative dose, instrument, uncertainty, provenance, quality and UTC timestamp",
      sourceRef: "01-space-radiation.md §3C — personal dosimeter",
      fieldType: "number",
      recordSample: true,
      subfields: [
        { key: "doseRateValue", label: "Dose-rate value", fieldType: "number", prompt: "Non-negative numeric value" },
        { key: "doseRateUnit", label: "Dose-rate unit", prompt: "nSv/h, µSv/h, mSv/h, Sv/h or Gy-family equivalent" },
        { key: "cumulativeDoseValue", label: "Cumulative dose", fieldType: "number", prompt: "Optional non-negative numeric value" },
        { key: "cumulativeDoseUnit", label: "Cumulative unit", prompt: "nSv, µSv, mSv, Sv or Gy-family equivalent" },
        { key: "uncertaintyPercent", label: "Uncertainty", fieldType: "number", unit: "%", prompt: "Optional measurement uncertainty" },
        { key: "instrument", label: "Instrument", prompt: "Detector identifier/type" },
        { key: "qualityFlag", label: "Quality", prompt: "valid, suspect, fault, offline or mission vocabulary" },
        { key: "provenanceKind", label: "Provenance", prompt: "measured, modeled, simulated or experimental" },
        { key: "measuredAt", label: "Measured at", prompt: "UTC ISO-8601 timestamp" },
        { key: "source", label: "Source", prompt: "Instrument, dataset or replay identifier" },
      ],
    },
    {
      streamName: RADIATION_PIPELINE_VALUES.streams.compartmentSensors,
      inputPrompt: "DB/API telemetry only: compartment dose rate, detector status, position, uncertainty and provenance",
      sourceRef: "01-space-radiation.md §3C — compartment sensors / Artemis I context",
      fieldType: "number",
      recordSample: true,
      subfields: [
        { key: "compartmentId", label: "Compartment", prompt: "Stable compartment identifier" },
        { key: "doseRateValue", label: "Dose-rate value", fieldType: "number", prompt: "Non-negative numeric value" },
        { key: "doseRateUnit", label: "Dose-rate unit", prompt: "Explicit supported unit" },
        { key: "detectorStatus", label: "Detector status", prompt: "online, suspect, fault or offline" },
        { key: "position", label: "Position", prompt: "Detector location/orientation" },
        { key: "uncertaintyPercent", label: "Uncertainty", fieldType: "number", unit: "%", prompt: "Optional uncertainty" },
        { key: "provenanceKind", label: "Provenance", prompt: "measured, modeled or simulated" },
        { key: "measuredAt", label: "Measured at", prompt: "UTC ISO-8601 timestamp" },
      ],
    },
    {
      streamName: RADIATION_PIPELINE_VALUES.streams.spaceWeather,
      inputPrompt: "DB/API event context only: DONKI event metadata; never store it as crew dose",
      sourceRef: "NASA DONKI API — event timeline, not spacecraft dosimetry",
      subfields: [
        { key: "eventId", label: "Event ID", prompt: "NASA/replay event identifier" },
        { key: "eventType", label: "Event type", prompt: "SEP, FLR or RBE" },
        { key: "startTime", label: "Start", prompt: "UTC ISO-8601 timestamp" },
        { key: "endTime", label: "End", prompt: "Optional UTC ISO-8601 timestamp" },
        { key: "active", label: "Active", fieldType: "boolean", prompt: "Active event context" },
        { key: "provenanceKind", label: "Provenance", prompt: "measured archive or simulated replay" },
        { key: "source", label: "Source", prompt: "NASA DONKI URL/identifier" },
      ],
    },
    {
      streamName: RADIATION_PIPELINE_VALUES.streams.missionPolicy,
      inputPrompt: "Mission-approved or explicitly simulated policy; never a hard-coded universal NASA limit",
      sourceRef: "Mission flight rules / approved procedure or SIMULATION POLICY fixture",
      subfields: [
        { key: "policyLabel", label: "Policy label", prompt: "Document or simulation fixture name" },
        { key: "policyMode", label: "Policy mode", prompt: "approved or simulation" },
        { key: "quantityFamily", label: "Quantity family", prompt: "equivalent or absorbed" },
        { key: "rateUnit", label: "Rate unit", prompt: "Supported explicit dose-rate unit" },
        { key: "elevatedRateValue", label: "Elevated rate", fieldType: "number", prompt: "Optional mission-policy value" },
        { key: "criticalRateValue", label: "Critical rate", fieldType: "number", prompt: "Optional mission-policy value" },
        { key: "doseUnit", label: "Budget unit", prompt: "Supported explicit dose unit" },
        { key: "cumulativeBudgetValue", label: "Cumulative budget", fieldType: "number", prompt: "Optional mission-policy value" },
        { key: "remainingMissionHours", label: "Remaining mission time", fieldType: "number", unit: "h", prompt: "Non-negative duration" },
        { key: "forecastUncertaintyPercent", label: "Forecast uncertainty", fieldType: "number", unit: "%", prompt: "Optional modeled uncertainty" },
        { key: "sensorDisagreementPercent", label: "Sensor disagreement", fieldType: "number", unit: "%", prompt: "Optional policy threshold" },
        { key: "maxIntegrationGapHours", label: "Maximum integration gap", fieldType: "number", unit: "h", prompt: "Optional positive gap ceiling" },
        { key: "acknowledgementWindowMinutes", label: "Acknowledgement window", fieldType: "number", unit: "min", prompt: "Procedure-defined or simulation value" },
      ],
    },
    {
      streamName: RADIATION_PIPELINE_VALUES.streams.researchLab,
      inputPrompt: "Experimental research records only; never an operational protection claim",
      sourceRef: "OLTARIS / ISS Cladosporium study / OSDR / BioSentinel",
      subfields: [
        { key: "experimentId", label: "Experiment ID", prompt: "Stable experiment identifier" },
        { key: "materialOrSpecimen", label: "Material/specimen", prompt: "Material, fungus/control or biological sentinel" },
        { key: "controlGroup", label: "Control group", fieldType: "boolean", prompt: "Paired control indicator" },
        { key: "resultValue", label: "Result", fieldType: "number", prompt: "Measured/model output when defined" },
        { key: "resultUnit", label: "Result unit", prompt: "Explicit unit" },
        { key: "uncertaintyPercent", label: "Uncertainty", fieldType: "number", unit: "%", prompt: "Optional uncertainty" },
        { key: "provenanceKind", label: "Provenance", prompt: "experimental" },
      ],
    },
  ],
  outputSlots: {
    immediateHorizon: "Immediate onboard dose-rate and data-quality status with separate space-weather context.",
    prolongedHorizon: "Mission-end exposure forecast with explicit assumptions and uncertainty when compatible data exist.",
    etaSlot: "Modeled time to configured mission-policy budget; unavailable when required data are missing.",
    solutionsSlot: "1–2 mission-policy actions; never autonomous medication, maneuver, or hardware deployment.",
  },
  leadView: {
    summary: "Crew operational comparison, compartment rates, policy provenance, sensor spread, shelter readiness, and forecast — without private clinical markers.",
    privacyRule: "Mission-safety dosimetry is visible to Lead; personal clinical biomarkers remain outside this module unless separately authorized.",
    modules: [
      {
        title: "Crew Radiation Comparison & Budget",
        detail: "Compatible cumulative doses and modeled mission-end exposure across crew.",
        actionSlot: "DB-driven mission policy and crew telemetry",
      },
      {
        title: "Compartment Sensors & Shelter Context",
        detail: "Latest compatible rates by compartment plus sensor disagreement checks.",
        actionSlot: "DB-driven compartment telemetry",
      },
      {
        title: "Space Weather & Captain Procedure",
        detail: "DONKI/replay context remains separate from onboard dose; actions follow approved flight rules.",
        actionSlot: "Procedure-defined acknowledgement window",
      },
    ],
  },
  memberView: {
    summary: "Personal dose-rate history, cumulative exposure, modeled forecast, uncertainty, and at most two immediate actions.",
    privacyRule: "Crew members see their own telemetry; this module does not compute private diagnoses or cancer probability.",
    modules: [
      {
        title: "Personal Dosimeter",
        detail: "Unit-safe rate and cumulative history with provenance and quality flags.",
        actionSlot: "DB/API telemetry stream",
      },
      {
        title: "Mission Exposure Forecast",
        detail: "Constant-rate model with explicit duration and uncertainty assumptions.",
        actionSlot: "Configured mission policy",
      },
      {
        title: "What-If & Research Context",
        detail: "BioShield and rate-multiplier comparisons remain explicitly experimental or modeled.",
        actionSlot: "No operational protection claim",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?scenarioId={id}&hazardSlug=radiation", purpose: "Fetch DB radiation snapshots" },
    { method: "GET", path: "/api/hazard-samples?scenarioId={id}&hazardSlug=radiation", purpose: "Fetch radiation time-series" },
    { method: "POST", path: "/api/radiation/telemetry", purpose: "Validate and ingest radiation snapshot/sample payloads" },
    { method: "GET", path: "/api/radiation/donki?eventType=SEP&startDate=...&endDate=...", purpose: "Fetch NASA DONKI space-weather context" },
    { method: "POST", path: "/api/radiation/what-if", purpose: "Compare explicit rate-multiplier forecasts" },
    { method: "GET/POST", path: "/api/radiation/emergencies", purpose: "Read or trigger durable radiation emergencies" },
    { method: "GET", path: "/api/radiation/emergencies/{eventId}/report?scenarioId={id}", purpose: "Export JSON incident report" },
    { method: "GET/POST", path: "/api/radiation/scenarios", purpose: "List or run reproducible A–D simulation fixtures" },
  ],
  alarmPreset: {
    title: "RADIATION EVENT — VERIFY ONBOARD DOSE & FOLLOW FLIGHT RULES",
    severity: "CRITICAL",
    etaLabel: "Procedure-defined Estimated Time of Action from active mission policy.",
    descriptionSlot:
      "A compatible onboard radiation trigger was detected. Space-weather context is displayed separately and is not a crew dose measurement.",
    leadActions: [
      "1. Verify onboard dosimeters and apply the approved radiation-protection flight rule.",
      "2. Confirm crew shelter status and preserve incident telemetry and provenance.",
    ],
    memberActions: [
      "1. Follow the approved low-exposure compartment procedure.",
      "2. Confirm safe status and keep the personal dosimeter active.",
    ],
  },
  evaluate: evaluateRadiationHazard,
};
