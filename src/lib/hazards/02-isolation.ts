import {
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

/**
 * ============================================================================
 * HAZARD 2: ISOLATION & CONFINEMENT
 * Owner: Teammate 2 — Edit ONLY this file (src/lib/hazards/02-isolation.ts)
 * and the registered Hazard 02 PVT-B widget component.
 * ============================================================================
 */

// [SECTION 1: HAZARD 2 VALUES & THRESHOLD SLOTS]
// Grounded in NASA-STD-3001 Vol. 2, Barger et al. (2014), Basner & Dinges PVT-B,
// Mars500 520-Day Confinement Study, CHAPEA, and NASA OSDR Standard Measures.
export const ISOLATION_PIPELINE_VALUES = {
  supportedStreams: [
    "Wearable / Actigraphy",
    "Habitat Acoustics & Lighting",
    "60-Second Self-Check (Private)",
    "CONNECT & Countermeasure Log",
  ] as const,

  // Sleep & Fatigue Benchmarks (Barger et al., 2014; NASA Fatigue Countermeasures Lab)
  scheduledSleepHours: 8.5,
  issHistoricalMeanSleepHours: 6.09,
  safeSleepFloorHours: 7.0,
  elevatedSleepHours: 6.5,
  criticalSleepHours: 5.5,
  sleepEfficiencyWarnPct: 80,
  sleepEfficiencyCritPct: 75,
  rollingDebtWindowSamples: 3,
  rollingDebtElevHours: 2.0,
  rollingDebtCritHours: 4.5,

  // NASA Cognition / PVT-B Vigilance Benchmarks (Basner & Dinges)
  pvtLapseThresholdMs: 355, // Validated 3-min PVT-B lapse threshold (vs 500 ms on 10-min PVT)
  pvtDefaultBaselineMeanMs: 245,
  pvtDefaultBaselineSdMs: 25,
  pvtMinSdMs: 10,
  pvtZScoreElev: 1.5,
  pvtZScoreCrit: 2.0,
  pvtLapsesElev: 3,
  pvtLapsesCrit: 5,
  subjectiveFatigueElev: 4,
  workloadStrainElev: 4,

  // Circadian & Lighting Standards (CHAPEA Martian Sol + NASA-STD-3001 [V2 8055])
  martianSolDriftMinPerDay: 39, // 24h 39m sol vs 24h Earth day
  circadianPhaseElevMin: 39,
  circadianMisalignCritMin: 180,
  luxComplianceFloorPct: 70,

  // Habitability & Acoustics (NASA-STD-3001 Vol. 2 [V2 6079])
  sleepQuarterNoiseLimitNc40Dba: 49, // NC-40 continuous sleep-quarter limit (>30 day missions)
  workAreaNoiseLimitNc50Dba: 58, // NC-50 continuous work-area limit
  impulseNoiseSleepElevCount: 2,

  // Mars500 / HERA Confinement & Hypokinesis
  thirdQuarterStartPct: 50,
  thirdQuarterEndPct: 75,
  hypokinesisDropElevPct: -15,
  hrvDropElevPct: -15,

  // Cross-Hazard & Autonomy Context (CHAPEA / SIRIUS + Hazard 05 Environment)
  highCommsDelayMin: 10,
  co2SharedDebuffMmHg: 4.0,
};

const STREAM_WEARABLE = "Wearable / Actigraphy";
const STREAM_HABITAT = "Habitat Acoustics & Lighting";
const STREAM_SELF_CHECK = "60-Second Self-Check (Private)";
const STREAM_CONNECT = "CONNECT & Countermeasure Log";

// [SECTION 2: HAZARD 2 FORMULAS & EVALUATION PIPELINE]
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const match = trimmed.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function toBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") return true;
    if (lower === "false" || lower === "no" || lower === "0") return false;
  }
  return null;
}

function readRecordField(
  records: readonly HazardDataRecord[],
  streamName: string,
  keys: string[]
): number | null {
  const rec = records.find((r) => r.streamName === streamName);
  if (!rec) return null;
  for (const key of keys) {
    const val = toFiniteNumber(rec.payload?.[key]);
    if (val !== null) return val;
  }
  return null;
}

function readRecordBool(
  records: readonly HazardDataRecord[],
  streamName: string,
  keys: string[]
): boolean | null {
  const rec = records.find((r) => r.streamName === streamName);
  if (!rec) return null;
  for (const key of keys) {
    const val = toBooleanFlag(rec.payload?.[key]);
    if (val !== null) return val;
  }
  return null;
}

function extractSampleNumber(sample: HazardSampleRecord, keys: string[], fallbackToNumeric = false): number | null {
  for (const key of keys) {
    const val = toFiniteNumber(sample.samplePayload?.[key]);
    if (val !== null) return val;
  }
  return fallbackToNumeric && sample.numericValue !== null && Number.isFinite(sample.numericValue)
    ? sample.numericValue
    : null;
}

function formatSampleLabel(iso: string, idx: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `#${idx + 1}`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mean(nums: number[]): number {
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
}

function sampleStdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const variance = nums.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function buildChartSeries(
  samples: readonly HazardSampleRecord[],
  keys: string[],
  fallbackToNumeric = false
) {
  const points: Array<{ label: string; value: number }> = [];
  samples.forEach((s, idx) => {
    const val = extractSampleNumber(s, keys, fallbackToNumeric);
    if (val !== null) {
      points.push({
        label: formatSampleLabel(s.recordedAt, idx),
        value: Number(val.toFixed(2)),
      });
    }
  });
  return points;
}

function buildRollingDebtSeries(sleepSeries: Array<{ label: string; value: number }>) {
  const V = ISOLATION_PIPELINE_VALUES;
  const windowSize = V.rollingDebtWindowSamples;
  return sleepSeries.map((pt, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const windowSlice = sleepSeries.slice(start, idx + 1);
    const debt = windowSlice.reduce((sum, item) => sum + Math.max(0, V.safeSleepFloorHours - item.value), 0);
    return { label: pt.label, value: Number(debt.toFixed(2)) };
  });
}

function detectCrossHazardHabitatStress(
  allRecords: readonly HazardDataRecord[],
  missionDelayLabel: string
): { sharedEnvCause: string | null; commsDelayMin: number | null } {
  const envAtmos = allRecords.find(
    (r) => r.hazardSlug === "environment" && r.streamName === "Cabin Atmosphere & Pressure"
  );
  const envAcoustics = allRecords.find(
    (r) => r.hazardSlug === "environment" && r.streamName === "Module Acoustics & Thermal"
  );

  const co2Val =
    toFiniteNumber(envAtmos?.payload?.co2MmHg) ??
    toFiniteNumber(envAtmos?.payload?.co2) ??
    toFiniteNumber(envAtmos?.rawValue);
  const moduleNoiseVal =
    toFiniteNumber(envAcoustics?.payload?.noiseDba) ??
    toFiniteNumber(envAcoustics?.payload?.dba) ??
    toFiniteNumber(envAcoustics?.rawValue);

  const causes: string[] = [];
  if (co2Val !== null && co2Val > ISOLATION_PIPELINE_VALUES.co2SharedDebuffMmHg) {
    causes.push(`Hazard 05 Cabin CO₂ ${co2Val} mmHg (> ${ISOLATION_PIPELINE_VALUES.co2SharedDebuffMmHg} mmHg)`);
  }
  if (moduleNoiseVal !== null && moduleNoiseVal > ISOLATION_PIPELINE_VALUES.sleepQuarterNoiseLimitNc40Dba) {
    causes.push(
      `Hazard 05 Module Noise ${moduleNoiseVal} dBA (> ${ISOLATION_PIPELINE_VALUES.sleepQuarterNoiseLimitNc40Dba} dBA NC-40)`
    );
  }

  const distRec = allRecords.find((r) => r.hazardSlug === "distance");
  const commsDelayMin =
    toFiniteNumber(distRec?.payload?.commsDelayMin) ??
    toFiniteNumber(distRec?.payload?.rttMin) ??
    toFiniteNumber(missionDelayLabel);

  return {
    sharedEnvCause: causes.length > 0 ? causes.join(" & ") : null,
    commsDelayMin,
  };
}

export function evaluateIsolationHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const V = ISOLATION_PIPELINE_VALUES;
  const {
    mission,
    actor,
    role = actor.isLeadSlot ? "lead" : "member",
    actorInputs,
    hazardRecords,
    hazardSamples,
    allHazardRecords,
    scenarioHazardRecords = [],
    linkOnline,
    reentryMode,
  } = input;

  const maxSolutions = reentryMode ? 1 : 2;
  const isMarsSurface =
    mission.phase.toUpperCase().includes("SURFACE") ||
    mission.name.toLowerCase().includes("chapea") ||
    mission.name.toLowerCase().includes("mars");

  // 1. Parse actor-level numeric inputs (structured payload -> crew check-in fallback -> raw text override)
  const wearableSamples = hazardSamples.filter((s) => s.streamName === STREAM_WEARABLE);
  const habitatSamples = hazardSamples.filter((s) => s.streamName === STREAM_HABITAT);
  const selfCheckSamples = hazardSamples.filter((s) => s.streamName === STREAM_SELF_CHECK);

  const sleepDurationH =
    readRecordField(hazardRecords, STREAM_WEARABLE, ["sleep_duration_h"]) ??
    readRecordField(hazardRecords, STREAM_SELF_CHECK, ["sleepHours", "sleepHoursInput"]) ??
    toFiniteNumber(actorInputs[STREAM_WEARABLE]);

  const sleepEfficiencyPct = readRecordField(hazardRecords, STREAM_WEARABLE, ["sleep_efficiency_pct"]);
  const circadianShiftMin = readRecordField(hazardRecords, STREAM_WEARABLE, ["circadian_phase_shift_min"]);
  const daytimeActivity = readRecordField(hazardRecords, STREAM_WEARABLE, ["daytime_activity_counts"]);
  const restingHrv = readRecordField(hazardRecords, STREAM_WEARABLE, ["resting_hrv_rmssd"]);

  const sleepNoiseDba =
    readRecordField(hazardRecords, STREAM_HABITAT, ["sleep_quarter_noise_dba"]) ??
    toFiniteNumber(actorInputs[STREAM_HABITAT]);
  const impulseNoiseCount = readRecordField(hazardRecords, STREAM_HABITAT, ["impulse_noise_events_sleep"]);
  const luxCompliancePct = readRecordField(hazardRecords, STREAM_HABITAT, ["ambient_lux_schedule_match"]);
  const missionDayPct = readRecordField(hazardRecords, STREAM_HABITAT, ["mission_day_pct"]);

  const pvtMedianRtMs = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["pvt_median_rt_ms"]);
  const pvtLapsesCount = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["pvt_lapses_count"]);
  const subjectiveFatigue =
    readRecordField(hazardRecords, STREAM_SELF_CHECK, ["subjective_fatigue_1_5", "fatigueScore"]) ??
    toFiniteNumber(actorInputs[STREAM_SELF_CHECK]);
  const workloadStrain = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["team_workload_strain_1_5"]);

  const veggieCareDone = readRecordBool(hazardRecords, STREAM_CONNECT, ["veggie_plant_care_done"]);
  const socialCheckinDone = readRecordBool(hazardRecords, STREAM_CONNECT, ["crew_social_checkin_done"]);

  // 2. Formula A: Rolling Cumulative Sleep Debt (Barger 2014 + Two-Process)
  const sleepHistory = buildChartSeries(wearableSamples, ["sleep_duration_h"], true);
  if (sleepDurationH !== null && sleepHistory.length === 0) {
    sleepHistory.push({ label: "Latest", value: sleepDurationH });
  }
  const recentSleepWindow = sleepHistory.slice(-V.rollingDebtWindowSamples).map((p) => p.value);
  const rollingMeanSleep = recentSleepWindow.length > 0 ? mean(recentSleepWindow) : sleepDurationH;
  const rollingSleepDebt =
    recentSleepWindow.length > 0
      ? recentSleepWindow.reduce((sum, h) => sum + Math.max(0, V.safeSleepFloorHours - h), 0)
      : sleepDurationH !== null
      ? Math.max(0, V.safeSleepFloorHours - sleepDurationH)
      : 0;

  const sleepCritical =
    (sleepDurationH !== null && sleepDurationH < V.criticalSleepHours) ||
    rollingSleepDebt >= V.rollingDebtCritHours ||
    (sleepEfficiencyPct !== null && sleepEfficiencyPct < V.sleepEfficiencyCritPct);
  const sleepElevated =
    !sleepCritical &&
    ((rollingMeanSleep !== null && rollingMeanSleep < V.elevatedSleepHours) ||
      rollingSleepDebt >= V.rollingDebtElevHours ||
      (sleepEfficiencyPct !== null && sleepEfficiencyPct < V.sleepEfficiencyWarnPct));

  // 3. Formula B: PVT-B Cognitive Vigilance Z-Score (Basner & Dinges, 355 ms lapse floor)
  const pvtRtHistory = buildChartSeries(selfCheckSamples, ["pvt_median_rt_ms"], false);
  const priorPvtPts = pvtRtHistory.length > 1 ? pvtRtHistory.slice(0, -1).map((p) => p.value) : [];
  const pvtBaseMean = priorPvtPts.length >= 3 ? mean(priorPvtPts) : V.pvtDefaultBaselineMeanMs;
  const pvtBaseSd =
    priorPvtPts.length >= 3 ? Math.max(V.pvtMinSdMs, sampleStdDev(priorPvtPts)) : V.pvtDefaultBaselineSdMs;
  const pvtZScore = pvtMedianRtMs !== null ? (pvtMedianRtMs - pvtBaseMean) / pvtBaseSd : null;

  const pvtCritical =
    (pvtZScore !== null && pvtZScore >= V.pvtZScoreCrit) ||
    (pvtLapsesCount !== null && pvtLapsesCount >= V.pvtLapsesCrit);
  const pvtElevated =
    !pvtCritical &&
    ((pvtZScore !== null && pvtZScore >= V.pvtZScoreElev) ||
      (pvtLapsesCount !== null && pvtLapsesCount >= V.pvtLapsesElev) ||
      (subjectiveFatigue !== null && subjectiveFatigue >= V.subjectiveFatigueElev));

  // 4. Formula C: Martian Sol Circadian Drift & NASA-STD-3001 [V2 8055] Lighting
  const luxPct = luxCompliancePct ?? 100;
  const effectiveDriftRate =
    V.martianSolDriftMinPerDay * (1 - 0.7 * clamp(luxPct / 100, 0, 1));
  const circadianElevated =
    (circadianShiftMin !== null && Math.abs(circadianShiftMin) >= V.circadianPhaseElevMin) ||
    (luxCompliancePct !== null && luxCompliancePct < V.luxComplianceFloorPct);
  const solsToSevereDesync =
    circadianShiftMin !== null && circadianElevated
      ? Math.max(
          0,
          (V.circadianMisalignCritMin - Math.abs(circadianShiftMin)) / Math.max(5, effectiveDriftRate)
        )
      : null;

  // 5. Formula D: NASA-STD-3001 [V2 6079] Acoustics + Cross-Hazard Attribution
  const acousticExcessDba =
    sleepNoiseDba !== null ? Math.max(0, sleepNoiseDba - V.sleepQuarterNoiseLimitNc40Dba) : 0;
  const acousticElevated =
    acousticExcessDba > 0 || (impulseNoiseCount !== null && impulseNoiseCount >= V.impulseNoiseSleepElevCount);

  const { sharedEnvCause, commsDelayMin } = detectCrossHazardHabitatStress(
    allHazardRecords,
    mission.commsDelayLabel
  );

  // 6. Formula E: Mars500 Third-Quarter Monotony & Hypokinesis Slope
  const activityHistory = buildChartSeries(wearableSamples, ["daytime_activity_counts"], false);
  let activityChangePct: number | null = null;
  if (activityHistory.length >= 4) {
    const recentAct = mean(activityHistory.slice(-2).map((p) => p.value));
    const baseAct = mean(activityHistory.slice(0, -2).map((p) => p.value));
    if (baseAct > 0) {
      activityChangePct = ((recentAct - baseAct) / baseAct) * 100;
    }
  } else if (daytimeActivity !== null && activityHistory.length >= 2) {
    const baseAct = mean(activityHistory.slice(0, -1).map((p) => p.value));
    if (baseAct > 0) {
      activityChangePct = ((daytimeActivity - baseAct) / baseAct) * 100;
    }
  }

  const hrvHistory = buildChartSeries(wearableSamples, ["resting_hrv_rmssd"], false);
  let hrvChangePct: number | null = null;
  if (restingHrv !== null && hrvHistory.length >= 3) {
    const baseHrv = mean(hrvHistory.slice(0, -1).map((p) => p.value));
    if (baseHrv > 0) {
      hrvChangePct = ((restingHrv - baseHrv) / baseHrv) * 100;
    }
  }

  const inThirdQuarter =
    missionDayPct !== null &&
    missionDayPct >= V.thirdQuarterStartPct &&
    missionDayPct <= V.thirdQuarterEndPct;
  const hypokinesisTriggered =
    (activityChangePct !== null && activityChangePct <= V.hypokinesisDropElevPct) ||
    (hrvChangePct !== null && hrvChangePct <= V.hrvDropElevPct);
  const monotonyElevated =
    (inThirdQuarter && (hypokinesisTriggered || (subjectiveFatigue !== null && subjectiveFatigue >= 3.5))) ||
    hypokinesisTriggered;

  // 7. Scenario-Wide Crew Aggregation (strictly privacy-sanitized)
  const crewIsolationRecords = scenarioHazardRecords.filter((r) => r.hazardSlug === "isolation");
  const crewSleepValues = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_WEARABLE)
    .map((r) => ({
      characterId: r.characterId,
      sleepH: toFiniteNumber(r.payload?.sleep_duration_h),
    }))
    .filter((item): item is { characterId: string; sleepH: number } => item.sleepH !== null);

  const crewLowSleepCount = crewSleepValues.filter((item) => item.sleepH < V.elevatedSleepHours).length;
  const crewGoodSleepCount = crewSleepValues.filter((item) => item.sleepH >= V.safeSleepFloorHours).length;
  const crewNoiseBreachCount = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_HABITAT)
    .filter((r) => {
      const dba = toFiniteNumber(r.payload?.sleep_quarter_noise_dba);
      return dba !== null && dba > V.sleepQuarterNoiseLimitNc40Dba;
    }).length;
  const crewVeggieCount = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_CONNECT)
    .filter((r) => toBooleanFlag(r.payload?.veggie_plant_care_done) === true).length;

  const sharedAcousticDebuff = crewNoiseBreachCount >= 2;
  const teamSleepBuffActive =
    crewSleepValues.length >= 2 && crewGoodSleepCount / crewSleepValues.length >= 0.75;

  // 8. Composite Readiness Score (1–9 single-digit per OUTLINE.md) & Overall Status
  const pSleep = sleepCritical ? 3 : sleepElevated ? 2 : 0;
  const pPvt = pvtCritical ? 3 : pvtElevated ? 2 : 0;
  const pCirc = circadianElevated ? 1.5 : 0;
  const pHab = (acousticElevated ? 1.5 : 0) + (monotonyElevated ? 1 : 0);
  const readinessIndex = Math.round(clamp(9 - pSleep - pPvt - pCirc - pHab, 1, 9));

  const hasCriticalTelemetry = sleepCritical || pvtCritical;
  const hasElevatedTelemetry =
    sleepElevated ||
    pvtElevated ||
    circadianElevated ||
    acousticElevated ||
    monotonyElevated ||
    sharedAcousticDebuff ||
    (workloadStrain !== null && workloadStrain >= V.workloadStrainElev);

  const status: HazardEvaluationResult["status"] =
    hasCriticalTelemetry || actor.readinessState === "HOLD"
      ? "CRITICAL"
      : hasElevatedTelemetry || actor.readinessState === "CONDITIONAL"
      ? "ELEVATED"
      : "NOMINAL";

  // 9. Compute Auditable ETA & Horizon Summaries
  let eta = actor.metrics.etaSlot;
  if (hasCriticalTelemetry) {
    eta = "Immediate (2–6 h pre-EVA / precision-task safety gate)";
  } else if (sleepElevated && rollingMeanSleep !== null) {
    const daysToCrit = Math.max(
      1,
      Math.ceil((V.rollingDebtCritHours - rollingSleepDebt) / Math.max(0.25, V.safeSleepFloorHours - rollingMeanSleep))
    );
    eta = `${daysToCrit} day${daysToCrit === 1 ? "" : "s"} to cumulative sleep-debt hold (${rollingSleepDebt.toFixed(1)}h / ${V.rollingDebtCritHours}h limit)`;
  } else if (solsToSevereDesync !== null) {
    const solsRounded = Math.max(1, Math.round(solsToSevereDesync));
    eta = `~${solsRounded} sol${solsRounded === 1 ? "" : "s"} to severe circadian misalignment (${V.circadianMisalignCritMin} min threshold)`;
  } else if (monotonyElevated) {
    eta = "7–14 days to entrenched Third-Quarter motivation & vigilance slump";
  } else if (acousticElevated) {
    eta = "24–48 h (cumulative sleep fragmentation if NC-40 breach persists)";
  } else if (sleepDurationH !== null || pvtMedianRtMs !== null) {
    eta = `Nominal — Isolation Readiness Index ${readinessIndex}/9`;
  }

  const immediateFindings: string[] = [];
  if (sleepCritical || sleepElevated) {
    immediateFindings.push(
      `Sleep ${sleepDurationH !== null ? `${sleepDurationH}h` : `${rollingMeanSleep?.toFixed(1)}h avg`} (3-sample debt: ${rollingSleepDebt.toFixed(1)}h vs. NASA ${V.scheduledSleepHours}h target / ${V.issHistoricalMeanSleepHours}h ISS mean)`
    );
  }
  if (pvtCritical || pvtElevated) {
    const zLabel = pvtZScore !== null ? ` (${pvtZScore >= 0 ? "+" : ""}${pvtZScore.toFixed(1)} SD)` : "";
    immediateFindings.push(
      `PVT-B ${pvtMedianRtMs ?? "—"} ms${zLabel}, ${pvtLapsesCount ?? 0} lapses > ${V.pvtLapseThresholdMs} ms`
    );
  }
  if (acousticElevated) {
    immediateFindings.push(
      `Sleep-quarter noise ${sleepNoiseDba ?? "—"} dBA (exceeds NASA-STD-3001 NC-40 limit of ${V.sleepQuarterNoiseLimitNc40Dba} dBA)`
    );
  }
  if (sharedEnvCause) {
    immediateFindings.push(`Cross-Hazard Link: ${sharedEnvCause}`);
  }

  const immediateHorizon =
    immediateFindings.length > 0
      ? `[Readiness ${readinessIndex}/9] ${immediateFindings.join(" · ")}`
      : isolationHazard.outputSlots.immediateHorizon;

  const prolongedFindings: string[] = [];
  if (circadianElevated) {
    prolongedFindings.push(
      `Circadian phase shift ${circadianShiftMin ?? 0} min${isMarsSurface ? ` (24h 39m Martian sol drift)` : ""}, lighting match ${luxCompliancePct ?? "—"}%`
    );
  }
  if (inThirdQuarter || monotonyElevated) {
    prolongedFindings.push(
      `Third-Quarter window (${missionDayPct ?? "50–75"}%)${activityChangePct !== null ? `, daytime activity ${activityChangePct.toFixed(0)}% vs baseline` : ""}`
    );
  }
  if (commsDelayMin !== null && commsDelayMin >= V.highCommsDelayMin) {
    prolongedFindings.push(`High Earth-comms autonomy lag (${commsDelayMin} min delay${linkOnline ? "" : ", offline"})`);
  }
  if (role === "lead" && crewSleepValues.length > 0) {
    prolongedFindings.push(
      `Crew Sleep Aggregate (Anonymized): ${crewLowSleepCount}/${crewSleepValues.length} below ${V.elevatedSleepHours}h` +
        (sharedAcousticDebuff ? ` · SHARED NC-40 DEBUFF (${crewNoiseBreachCount} quarters)` : "") +
        (teamSleepBuffActive ? " · Synchronized Sleep Buff ACTIVE" : "") +
        (crewVeggieCount > 0 ? ` · Biophilia Buff (${crewVeggieCount} logged)` : "")
    );
  }

  const prolongedHorizon =
    prolongedFindings.length > 0
      ? prolongedFindings.join(" | ")
      : isolationHazard.outputSlots.prolongedHorizon;

  // 10. Actionable 1–2 Solutions (CONNECT + Veggie + NASA-STD-3001; capped to 1 in reentryMode)
  const rankedSolutions: string[] = [];
  if (acousticElevated || sharedAcousticDebuff || sharedEnvCause) {
    rankedSolutions.push(
      "Immediate (15 min): Inspect ECLSS fan muffler in affected quarters & issue foam earplugs/ANC headsets from Med Kit Bay 2 (In Stock); cross-check Hazard 05 cabin CO₂/acoustics."
    );
  }
  if (sleepCritical || pvtCritical) {
    rankedSolutions.push(
      "Pre-EVA Safety Gate: Defer precision EVA/rover tasks; protect an 8.0–8.5h recovery sleep window and re-run 60s PVT-B check (>355 ms lapse check) before duty."
    );
  } else if (sleepElevated || pvtElevated) {
    rankedSolutions.push(
      "Needs / Recovery: Shift non-critical maintenance by 60 min tonight to reclaim >= 7.5h sleep and cut rolling sleep debt below 2.0h."
    );
  }
  if (circadianElevated) {
    rankedSolutions.push(
      `Circadian Entrainment (V2 8055): Apply high-melanopic blue-enriched light on wake and dim red-shifted lighting 2h pre-sleep to counter ${isMarsSurface ? "+39 min/sol Martian drift" : "phase shift"}.`
    );
  }
  if (monotonyElevated || veggieCareDone === false) {
    rankedSolutions.push(
      "CONNECT + Biophilia (10 min): Complete ISS Veggie plant-module care/misting for sensory enrichment and pair a 30-min aerobic/resistance session with a crewmate."
    );
  }
  if (commsDelayMin !== null && commsDelayMin >= V.highCommsDelayMin && socialCheckinDone !== true) {
    rankedSolutions.push(
      "CONNECT Networking: Log a shared crew briefing/meal and queue an async family video message (offline-ready) to buffer Earth-link isolation."
    );
  }
  if (rankedSolutions.length === 0) {
    rankedSolutions.push(
      reentryMode
        ? "Re-Entry Pacing: Keep routine stable with one low-stimulus break today; non-critical alerts remain throttled to prevent sensory/decision fatigue."
        : "Maintain Baseline: Complete today's 60-second PVT-B check and keep sleep-quarter noise <= 49 dBA (NC-40)."
    );
    if (!reentryMode) {
      rankedSolutions.push(
        "Proactive Buff: Rotate 10-min Veggie plant care or shared crew check-in to sustain CONNECT cohesion."
      );
    }
  }

  const solutions = rankedSolutions.slice(0, maxSolutions);

  // 11. Build Thresholded Telemetry Charts (rendered by <HazardTelemetryChart />)
  // Match evaluator.ts autoId (`sample-<slugified-streamName>`) for primary stream charts
  // so evaluator.ts does not append duplicate un-thresholded fallback graphs.
  const charts: HazardChartSpec[] = [];

  if (sleepHistory.length > 0) {
    charts.push({
      id: "sample-wearable-actigraphy",
      title: "Sleep Duration vs. NASA Benchmarks",
      unit: "h",
      series: sleepHistory,
      thresholds: [
        { label: "Scheduled Target", value: V.scheduledSleepHours, color: "#10b981" },
        { label: "Alert Floor", value: V.elevatedSleepHours, color: "#f59e0b" },
        { label: "Pre-EVA Hold", value: V.criticalSleepHours, color: "#ef4444" },
      ],
    });

    charts.push({
      id: "isolation-sleep-debt",
      title: `Rolling ${V.rollingDebtWindowSamples}-Sample Operational Sleep Debt`,
      unit: "h",
      series: buildRollingDebtSeries(sleepHistory),
      thresholds: [
        { label: "Elevated Debt", value: V.rollingDebtElevHours, color: "#f59e0b" },
        { label: "Critical Hold", value: V.rollingDebtCritHours, color: "#ef4444" },
      ],
    });
  }

  if (pvtRtHistory.length > 0) {
    charts.push({
      id: "sample-60-second-self-check-private-",
      title: "PVT-B Median Reaction Time (Cognition)",
      unit: "ms",
      series: pvtRtHistory,
      thresholds: [
        { label: "PVT-B Lapse", value: V.pvtLapseThresholdMs, color: "#ef4444" },
        {
          label: "+2 SD Baseline",
          value: Math.round(pvtBaseMean + 2 * pvtBaseSd),
          color: "#f59e0b",
        },
      ],
    });
  }

  const noiseSeries = buildChartSeries(habitatSamples, ["sleep_quarter_noise_dba"], true);
  if (noiseSeries.length > 0) {
    charts.push({
      id: "sample-habitat-acoustics-lighting",
      title: "Sleep-Quarter Noise vs. NASA-STD-3001 NC-40",
      unit: "dBA",
      series: noiseSeries,
      thresholds: [
        { label: "NC-40 Sleep Limit", value: V.sleepQuarterNoiseLimitNc40Dba, color: "#ef4444" },
        { label: "NC-50 Work Limit", value: V.workAreaNoiseLimitNc50Dba, color: "#f59e0b" },
      ],
    });
  }

  if (activityHistory.length > 0) {
    charts.push({
      id: "isolation-hypokinesis-activity",
      title: "Daytime Activity (Mars500 Hypokinesis Monitor)",
      unit: "counts",
      series: activityHistory,
    });
  }

  const scenarioStatusSlot =
    role === "lead"
      ? `${mission.environment.isolationStatusSlot} · Readiness Index ${readinessIndex}/9 (${crewSleepValues.length} crew actigraphy stream(s) loaded, private notes masked)`
      : `${mission.environment.isolationStatusSlot} · Personal Isolation Readiness ${readinessIndex}/9`;

  return {
    status,
    scenarioStatusSlot,
    immediateHorizon,
    prolongedHorizon,
    eta,
    solutions,
    charts,
  };
}

// [SECTION 3: HAZARD 2 UI METADATA, INPUT STREAMS & ALARMS]
export const isolationHazard: HazardSpec = {
  slug: "isolation",
  number: 2,
  title: "Isolation & Confinement",
  shortTitle: "Isolation",
  ownerSlot: "src/lib/hazards/02-isolation.ts",
  sourceDoc: "docs/hazards/02-isolation-and-confinement.md",
  nasaReferences: [
    "NASA HRP Isolation & Confinement",
    "NASA-STD-3001 Vol. 2 (NC-40 / Lighting / Privacy)",
    "HERA, CHAPEA & Mars500 (520-Day)",
    "Cognition (PVT-B 355 ms) & CONNECT Framework",
    "ISS Veggie Space Gardening & OSDR Standard Measures",
  ],
  overviewSlot:
    "Here is: Sleep-debt & Martian sol circadian modeling, NASA-STD-3001 NC-40 acoustic habitability correlation, 60-second PVT-B vigilance self-checks, privacy-protected journaling, and CONNECT/biophilia countermeasures.",
  inputSlots: [
    {
      streamName: STREAM_WEARABLE,
      inputPrompt: "Add your info: Actigraphy sleep duration, efficiency, circadian drift, activity & HRV here",
      sourceRef: "ARCHeR / Mars500 / OSDR Standard Measures",
      fieldType: "number",
      unit: "h",
      recordSample: true,
      subfields: [
        {
          key: "sleep_duration_h",
          label: "Sleep Duration",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours slept (NASA target 8.5h, ISS mean 6.09h)",
        },
        {
          key: "sleep_efficiency_pct",
          label: "Sleep Efficiency",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Sleep efficiency % (warn < 80%)",
        },
        {
          key: "circadian_phase_shift_min",
          label: "Circadian Phase Shift",
          fieldType: "number",
          unit: "min",
          prompt: "Add your info: Phase drift min (Mars sol +39 min/day)",
        },
        {
          key: "daytime_activity_counts",
          label: "Daytime Activity",
          fieldType: "number",
          unit: "counts/day",
          prompt: "Add your info: Actigraphy daytime counts (hypokinesis check)",
        },
        {
          key: "resting_hrv_rmssd",
          label: "Resting HRV (RMSSD)",
          fieldType: "number",
          unit: "ms",
          prompt: "Add your info: Resting HRV RMSSD (ms)",
        },
      ],
    },
    {
      streamName: STREAM_HABITAT,
      inputPrompt: "Add your info: Sleep-quarter dBA vs NC-40, impulse spikes, circadian lighting & mission % here",
      sourceRef: "NASA-STD-3001 Vol. 2 [V2 6079 / V2 8055]",
      fieldType: "number",
      unit: "dBA",
      recordSample: true,
      subfields: [
        {
          key: "sleep_quarter_noise_dba",
          label: "Sleep-Quarter Noise",
          fieldType: "number",
          unit: "dBA",
          prompt: "Add your info: Continuous dBA (NC-40 limit = 49 dBA)",
        },
        {
          key: "impulse_noise_events_sleep",
          label: "Sleep Impulse Spikes",
          fieldType: "number",
          unit: "events",
          prompt: "Add your info: Spikes > +10 dB during sleep",
        },
        {
          key: "ambient_lux_schedule_match",
          label: "Circadian Lighting Match",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Wake/pre-sleep light schedule match %",
        },
        {
          key: "mission_day_pct",
          label: "Mission Elapsed",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Mission progress % (50–75% = Third Quarter)",
        },
      ],
    },
    {
      streamName: STREAM_SELF_CHECK,
      inputPrompt: "Add your info: PVT-B median RT, lapses >355 ms, subjective fatigue & private journal here",
      sourceRef: "NASA Cognition PVT-B / Journaling",
      fieldType: "number",
      unit: "ms",
      recordSample: true,
      subfields: [
        {
          key: "pvt_median_rt_ms",
          label: "PVT-B Median RT",
          fieldType: "number",
          unit: "ms",
          prompt: "Add your info: Median reaction time ms (lapse > 355 ms)",
        },
        {
          key: "pvt_lapses_count",
          label: "PVT-B Lapses (>355 ms)",
          fieldType: "number",
          unit: "lapses",
          prompt: "Add your info: Count of trials > 355 ms",
        },
        {
          key: "subjective_fatigue_1_5",
          label: "Subjective Fatigue (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: 1 (Rested) to 5 (Exhausted)",
        },
        {
          key: "team_workload_strain_1_5",
          label: "Workload Strain (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: 1 (Manageable) to 5 (Overloaded)",
        },
        {
          key: "mood_valence_private",
          label: "Private Mood Score (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: Private mood score (masked from Lead)",
          isPrivate: true,
        },
        {
          key: "private_journal_note",
          label: "Private Reflection Journal",
          fieldType: "textarea",
          prompt: "Add your info: Personal reflection note (strictly private, never shown to Lead)",
          isPrivate: true,
        },
      ],
    },
    {
      streamName: STREAM_CONNECT,
      inputPrompt: "Add your info: Veggie plant care, CONNECT social check-in, and private sleep-aid log here",
      sourceRef: "ISS Veggie / CONNECT Framework",
      recordSample: false,
      subfields: [
        {
          key: "veggie_plant_care_done",
          label: "Veggie Plant Care Completed",
          fieldType: "boolean",
          prompt: "10-min sensory plant-module care completed today",
        },
        {
          key: "crew_social_checkin_done",
          label: "CONNECT Crew / Async Check-In",
          fieldType: "boolean",
          prompt: "Shared crew meal/briefing or async family check-in logged",
        },
        {
          key: "sleep_med_used_private",
          label: "Sleep Aid Used (Private)",
          fieldType: "boolean",
          prompt: "Private sleep-medication tracking (masked from Lead)",
          isPrivate: true,
        },
      ],
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Pre-EVA / precision-task vigilance alert when sleep debt or PVT-B (>355 ms) lapses spike.",
    prolongedHorizon: "Here is: Martian sol (24h 39m) circadian drift, NC-40 acoustic sleep debt, or Third-Quarter monotony window.",
    etaSlot: "Here is: Estimated Time of Action before critical vigilance threshold or circadian desynchronization.",
    solutionsSlot: "Here is: 1–2 CONNECT / Veggie / acoustic-mitigation actions constrained by onboard kit & schedule.",
  },
  leadView: {
    summary:
      "Anonymized Crew-Wide Sleep Readiness Index, shared NC-40 acoustic/lighting debuffs, Third-Quarter banner, and Re-Entry UI throttling.",
    privacyRule:
      "STRICT PRIVACY FIREWALL: Raw journal entries, personal mood scores, and sleep-aid usage are masked and NEVER shown to Lead.",
    modules: [
      {
        title: "Crew-Wide Readiness Matrix (Anonymized)",
        detail:
          "Here is: Aggregate % below 6.5h sleep threshold & non-clinical 1–9 readiness without private clinical text.",
        actionSlot: "Add your info: Crew schedule adjustment or protected 8h sleep window here",
      },
      {
        title: "Shared Habitat Debuff Attribution",
        detail:
          "Here is: Distinguishes shared ECLSS fan noise (>49 dBA NC-40) or Hazard 05 CO₂ from individual insomnia.",
        actionSlot: "Add your info: Affected crew quarters / acoustic inspection note here",
      },
      {
        title: "Post-Isolation Re-Entry Mode Toggle",
        detail:
          "Here is: Reduces non-essential alerts & caps action cards to 1 step to prevent decision/sensory overload.",
        actionSlot: "Add your info: Mission phase toggle (Operational vs. Re-entry) here",
      },
    ],
  },
  memberView: {
    summary:
      "Interactive 60-second PVT-B reaction-time test, strictly private reflection/journal log, Martian sol circadian guidance, and Veggie plant-care sensory reset.",
    privacyRule:
      "PRIVATE TO YOU: Your journal text, mood score, and sleep-medication logs are masked from Lead and stay private.",
    modules: [
      {
        title: "60-Second Guided PVT-B & Private Journal",
        detail:
          "Here is: Run the interactive PVT-B reaction check (>355 ms lapse detection) + private reflection slot.",
        actionSlot: "Add your info: Complete 60s PVT-B check or log private reflection above",
      },
      {
        title: "CONNECT & Biophilia Countermeasures",
        detail:
          "Here is: 1–2 actions (e.g., 10-min Veggie plant-module care; scheduled aerobic/resistance session with crewmate).",
        actionSlot: "Add your info: Confirm completed countermeasure in CONNECT Log below",
      },
    ],
  },
  proposedEndpoints: [
    {
      method: "GET",
      path: "/api/hazard-data?scenarioId=...&hazardSlug=isolation",
      purpose: "Fetch persisted isolation/sleep records across character or scenario",
    },
    {
      method: "POST",
      path: "/api/hazard-data",
      purpose: "Upsert actigraphy, habitat acoustics, or PVT-B self-check into Supabase (recordSample logs graph history)",
    },
  ],
  alarmPreset: {
    title: "CIRCADIAN & VIGILANCE DEBUFF — PRE-TASK HOLD",
    severity: "WARNING",
    etaLabel: "Here is: Estimated Time of Action prior to scheduled precision task / EVA",
    descriptionSlot:
      "Here is: Critical sleep debt, PVT-B lapse spike (>355 ms), or shared sleep-quarter acoustic breach (>49 dBA NC-40) detected.",
    leadActions: [
      "1. Order ECLSS fan muffler inspection & issue ANC/earplugs from Med Kit Bay 2.",
      "2. Shift non-critical maintenance to restore protected 8.0–8.5h sleep window.",
    ],
    memberActions: [
      "1. Defer precision EVA tasks and complete 60s PVT-B check before duty.",
      "2. Use temporary acoustic mitigation and follow pre-sleep dim/red lighting schedule.",
    ],
  },
  evaluate: evaluateIsolationHazard,
};
