import type { ResearchInfoEntry } from "@/components/ResearchInfoModal";
import type { CrewSlot, MissionProfile, UserRole } from "../domain";
import {
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

export const GRAVITY_RESEARCH_METADATA: Record<string, ResearchInfoEntry> = {
  eva_readiness_gate: {
    id: "eva_readiness_gate",
    title: "Autonomous Pre-EVA Readiness Gate & Condition Guard",
    explanation:
      "Replaces real-time Flight Surgeon clearance during ~22-minute deep-space delays by validating pre-test confounders (fasting, caffeine, heavy exercise, vasoactive meds) and EVA test windows.",
    benchmark:
      "MEDB 6.1 (health exam <=48h pre-EVA, <=24h post-EVA), MEDB 6.3 (arm ergometry >=24h post heavy workout, >=8h no caffeine, >=2h post-meal), MR087L (VO₂ +-10% at 75%), MR090L (ISLE prerequisite).",
    links: [
      {
        label: "NASA LSAH / JSC28913 MRID & MEDB Repository",
        url: "https://nlsp.nasa.gov/resources/lsah",
      },
    ],
  },
  handgrip_dynamometry: {
    id: "handgrip_dynamometry",
    title: "Handgrip Strength & Endurance (MR081L)",
    explanation:
      "Monitors 3×5s maximal contractions, static endurance (50% max), and dynamic endurance (75% max) to detect forearm fatigue before pressurized-glove EVA operations.",
    benchmark:
      "MR081L schedule: FD14, every 30 days, and EVA -14d to -10d (+-2d flexibility); blocked within <24h of suit donning. 15% decline cutoff is mission-configured.",
    links: [
      {
        label: "NASA LSAH — MR081L Handgrip Dynamometry",
        url: "https://nlsp.nasa.gov/resources/lsah",
      },
    ],
  },
  calf_atrophy_bone: {
    id: "calf_atrophy_bone",
    title: "Calf Volume Atrophy & Bone-Shield Proxy (MEDB 5.4 / 1.11 / 1.13)",
    explanation:
      "Tracks low-N OLS calf volume trend paired with morning body mass against each astronaut's L+14 baseline, plus daily resistance loading as an in-flight bone-shield proxy.",
    benchmark:
      "MEDB 5.4 + MEDB 1.13 measured L+14 then every 14d (morning after sleep, before breakfast). MEDB 1.11 DXA bone density (~1–1.5%/mo microgravity loss) is pre/post-flight only.",
    links: [
      {
        label: "NASA LSAH — MEDB 5.4, MEDB 1.13 & MEDB 1.11",
        url: "https://nlsp.nasa.gov/resources/lsah",
      },
    ],
  },
  exercise_timing_reconditioning: {
    id: "exercise_timing_reconditioning",
    title: "Exercise Adherence, Timing Guard & Postflight (MEDB 5.2 / MR026L)",
    explanation:
      "Tracks daily aerobic and resistance duration, prescribed vs. dialled resistance load, meal/sleep buffer compliance, and post-landing reconditioning cadence.",
    benchmark:
      "MEDB 5.2 targets ~2.5 h/day (60m aerobic + 90m resistance), start >=90m post-meal and finish >=2h pre-sleep. MR026L postflight reconditioning requires 120 min/d for R+0..R+45.",
    links: [
      {
        label: "NASA LSAH — MEDB 5.2 & MR026L Reconditioning",
        url: "https://nlsp.nasa.gov/resources/lsah",
      },
    ],
  },
};

/**
 * ============================================================================
 * HAZARD 4: GRAVITY FIELDS
 * Owner: Teammate 4 — Edit ONLY src/lib/hazards/04-gravity.ts and
 *   src/components/hazards/04-gravity.tsx.
 *
 * Implements deterministic, NASA-grounded physiological engines (zero ML):
 *   1. Pre-Test Validity Condition Guard (MEDB 6.3, MR087L, MEDB 5.4)
 *   2. Microgravity Atrophy, Proxy Bone-Shield & Exercise Adherence Engine
 *      (MEDB 5.2, MEDB 5.4, MEDB 1.13, MR081L, MEDB 1.11, MR026L)
 * ============================================================================
 */

// [SECTION 1: HAZARD 4 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Gravity Fields only.
export const GRAVITY_PIPELINE_VALUES = {
  supportedStreams: [
    "Pre-Test Conditions",
    "Handgrip & Calf Volume",
    "Daily Exercise Log",
  ] as const,

  // NASA MRID/MEDB documented schedule & operational rules (what/when/how)
  schedule: {
    gripFirstFlightDay: 14, // MR081L: FD14, then every 30 days
    gripCadenceDays: 30,

    calfFirstLaunchPlusDays: 14, // MEDB 5.4: L+14, then every 14 days
    calfCadenceDays: 14,

    dailyAerobicTargetMin: 60, // MEDB 5.2: ~2.5h daily (1h aerobic + 1.5h resistance)
    dailyResistanceTargetMin: 90,
    dailyTotalTargetMin: 150,
    exerciseMinHoursAfterMeal: 1.5, // MEDB 5.2: start >= 90 min after a meal
    exerciseMinHoursBeforeSleep: 2.0, // MEDB 5.2: finish >= 2h before sleep

    reconditioningDurationDays: 45, // MR026L: R+0 to R+45
    reconditioningDailyTargetMin: 120, // MR026L: 120 min/day
    boneRecoveryCriterionPct: 2, // MEDB 1.11: within ~2% of preflight baseline
  },

  // Documented pre-test condition windows per test (MR081L, MEDB 6.3, MR087L, MEDB 5.4)
  preTestConditions: {
    armErgometry: {
      minHoursNoStrenuousExercise: 24,
      minHoursNoMeal: 2,
      minHoursNoAlcoholOrVasoactiveMeds: 24,
      minHoursNoCaffeine: 8,
      minHoursFromNblSession: 48,
    },
    cyclePrebreathe: {
      minHoursNoMaxExercise: 24,
      minHoursNoRegularExercise: 8,
      minHoursLimitedFood: 2,
      minHoursNoAlcoholOrVasoactive: 8,
      minHoursLimitedCaffeine: 8,
    },
  },

  // Team-set numeric thresholds — NOT in NASA MRID/MEDB docs (explicitly labelled ASSUMPTION)
  assumptions: {
    calfAtrophyAlertPct: -10, // ASSUMPTION: -10% from personal L+14 baseline
    gripDeclineAlertPct: -15, // ASSUMPTION: -15% from personal FD14 baseline
    weeklyAdherenceAlertPct: 80, // ASSUMPTION: <80% weekly volume/resistance target
    loadRatioAlertPct: 80, // ASSUMPTION: <80% actual vs prescribed resistance load
    rollingAdherenceWindowDays: 7, // ASSUMPTION: 7-day rolling exercise window
    minPointsForRegression: 2,
    minPointsForConfidenceInterval: 3,
    minRegressionResidualPct: 0.5, // ASSUMPTION: minimum +/-0.5% noise floor so collinear N=3 never emits 0-0d CI
  },
} as const;

// [SECTION 2: HAZARD 4 FORMULAS & EVALUATION PIPELINE]

type PayloadMap = Record<string, unknown>;

export interface PreTestConditionInput {
  hoursSinceMeal: number | null;
  hoursSinceCaffeine: number | null;
  hoursSinceStrenuousExercise: number | null;
  hoursSinceAlcoholOrMeds: number | null;
  hoursSinceNblSession: number | null;
  calfMorningFastedPaired: boolean | null;
}

interface AnthropometricSample {
  flightDay: number;
  recordedAt: string;
  maxGripKg: number | null;
  gripStaticEnduranceSec: number | null;
  gripDynamicEnduranceReps: number | null;
  calfVolumeValue: number | null;
  bodyMassKg: number | null;
  conditionsMet: boolean;
}

export interface ExerciseEntry {
  flightDay: number | null;
  recordedAt: string;
  aerobicMinutes: number | null;
  resistanceMinutes: number | null;
  prescribedLoadKg: number | null;
  actualLoadKg: number | null;
  hoursAfterMeal: number | null;
  hoursBeforeSleep: number | null;
  reconditioningDayRPlus: number | null;
}

export interface LinearTrendResult {
  sampleSize: number;
  baselineValue: number;
  latestValue: number;
  latestFlightDay: number;
  latestPctChange: number;
  slopePctPerDay: number;
  projectedCrossFlightDay: number | null;
  projectedPctAtCurrentDay: number | null;
  isThresholdProjectedCrossed: boolean;
  daysSinceLastMeasurement: number | null;
  etaDaysToThreshold: number | null;
  etaMinDays: number | null;
  etaMaxDays: number | null;
  ciHasResidualFloor: boolean;
  series: Array<{ label: string; value: number }>;
}

export interface PreTestConditionCheckItem {
  id: string;
  label: string;
  requirement: string;
  status: "VALID" | "VIOLATED" | "UNLOGGED";
  detail: string;
}

export type ConditioningStatusLabel = "ON_TRACK" | "WATCH" | "ALERT" | "UNLOGGED";

export interface AtrophyEvaluation {
  hasAnyAnthropometric: boolean;
  hasAnyExercise: boolean;
  calfTrend: LinearTrendResult | null;
  gripTrend: LinearTrendResult | null;
  calfDaysOverdue: number | null;
  gripDaysOverdue: number | null;
  invalidCalfSamplesCount: number;
  adherenceSummary: {
    sessionsCount: number;
    avgTotalMinutes: number;
    aerobicPct: number;
    resistancePct: number;
    overallPct: number;
    loadRatioPct: number | null;
    mealViolations: number;
    sleepViolations: number;
    reconditioningDayRPlus: number | null;
    reconditioningPct: number | null;
  } | null;
  alerts: string[];
  actions: string[];
  etaLabel: string;
  etaDays: number | null;
}

export interface GravityActorDiagnostics {
  role: UserRole;
  status: HazardEvaluationResult["status"];
  currentFlightDay: number | null;
  condInput: PreTestConditionInput;
  conditionChecks: PreTestConditionCheckItem[];
  conditionViolations: string[];
  atrophy: AtrophyEvaluation;
  exerciseEntries: ExerciseEntry[];
  conditioningStatus: ConditioningStatusLabel;
  sleepCrossNote: string;
}

export interface GravityCrewMemberSummary {
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  status: HazardEvaluationResult["status"];
  blockerCategories: string[];
  conditionFlagCount: number;
  etaLabel: string;
  adherencePct: number | null;
  conditioningStatus: ConditioningStatusLabel;
  reconditioningDayRPlus: number | null;
}

export interface GravityCrewOverview {
  onTrackCount: number;
  watchCount: number;
  alertCount: number;
  teamExerciseDisciplinePct: number | null;
  teamExerciseBuffActive: boolean;
  disciplinedCrewCount: number;
  loggedExerciseCrewCount: number;
  members: GravityCrewMemberSummary[];
}

function readNum(payload: PayloadMap | undefined, key: string): number | null {
  if (!payload) return null;
  const val = payload[key];
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBoolChoice(payload: PayloadMap | undefined, key: string): boolean | null {
  if (!payload) return null;
  const val = payload[key];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const norm = val.trim().toLowerCase();
    if (["yes", "true", "1", "y", "pass", "passed", "done", "ok"].includes(norm)) return true;
    if (["no", "false", "0", "n", "fail", "failed", "pending"].includes(norm)) return false;
  }
  return null;
}

function parseRawKeyValues(raw: string | undefined): PayloadMap {
  if (!raw) return {};
  const map: PayloadMap = {};
  const segments = raw.split(/[,;\n]+/);
  for (const seg of segments) {
    const idx = seg.indexOf(":");
    const eqIdx = seg.indexOf("=");
    const splitAt = idx !== -1 && (eqIdx === -1 || idx < eqIdx) ? idx : eqIdx;
    if (splitAt > 0) {
      const k = seg.slice(0, splitAt).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const v = seg.slice(splitAt + 1).trim();
      if (k && v) map[k] = v;
    }
  }
  return map;
}

function resolveStreamPayload(
  streamName: string,
  records: HazardDataRecord[],
  actorInputs: Record<string, string>
): PayloadMap {
  const rec = records.find((r) => r.streamName === streamName);
  const rawFallback = actorInputs[streamName] || rec?.rawValue || "";
  const parsedRaw = parseRawKeyValues(rawFallback);
  return { ...parsedRaw, ...(rec?.payload ?? {}) };
}

function resolveCurrentFlightDay(
  records: HazardDataRecord[],
  actorInputs: Record<string, string>
): number | null {
  const preTestPayload = resolveStreamPayload("Pre-Test Conditions", records, actorInputs);
  const anthroPayload = resolveStreamPayload("Handgrip & Calf Volume", records, actorInputs);
  const exPayload = resolveStreamPayload("Daily Exercise Log", records, actorInputs);

  return (
    readNum(preTestPayload, "currentFlightDay") ??
    readNum(preTestPayload, "flightDay") ??
    readNum(anthroPayload, "measurementFlightDay") ??
    readNum(anthroPayload, "flightDay") ??
    readNum(exPayload, "flightDay")
  );
}

function parsePreTestConditions(
  records: HazardDataRecord[],
  actorInputs: Record<string, string>
): PreTestConditionInput {
  const p = resolveStreamPayload("Pre-Test Conditions", records, actorInputs);
  return {
    hoursSinceMeal: readNum(p, "hoursSinceMeal") ?? readNum(p, "hours_since_meal"),
    hoursSinceCaffeine:
      readNum(p, "hoursSinceCaffeine") ?? readNum(p, "hours_since_caffeine"),
    hoursSinceStrenuousExercise:
      readNum(p, "hoursSinceStrenuousExercise") ?? readNum(p, "hours_since_exercise"),
    hoursSinceAlcoholOrMeds:
      readNum(p, "hoursSinceAlcoholOrMeds") ?? readNum(p, "hours_since_alcohol_meds"),
    hoursSinceNblSession:
      readNum(p, "hoursSinceNblSession") ?? readNum(p, "hours_since_nbl"),
    calfMorningFastedPaired:
      readBoolChoice(p, "calfMorningFastedPaired") ?? readBoolChoice(p, "calf_morning_fasted"),
  };
}

/**
 * Evaluates Pre-Test Condition Guard validity windows (MEDB 6.3 / MR087L / MEDB 5.4).
 */
function evaluateConditionGuard(cond: PreTestConditionInput): {
  conditionViolations: string[];
  conditionChecks: PreTestConditionCheckItem[];
} {
  const C = GRAVITY_PIPELINE_VALUES.preTestConditions;

  const conditionViolations: string[] = [];
  if (cond.hoursSinceMeal !== null && cond.hoursSinceMeal < C.armErgometry.minHoursNoMeal) {
    conditionViolations.push(`Meal ${cond.hoursSinceMeal}h ago (requires >=${C.armErgometry.minHoursNoMeal}h fast for ergometry/cycle)`);
  }
  if (
    cond.hoursSinceCaffeine !== null &&
    cond.hoursSinceCaffeine < C.armErgometry.minHoursNoCaffeine
  ) {
    conditionViolations.push(
      `Caffeine ${cond.hoursSinceCaffeine}h ago (requires >=${C.armErgometry.minHoursNoCaffeine}h)`
    );
  }
  if (
    cond.hoursSinceStrenuousExercise !== null &&
    cond.hoursSinceStrenuousExercise < C.armErgometry.minHoursNoStrenuousExercise
  ) {
    conditionViolations.push(
      `Strenuous exercise ${cond.hoursSinceStrenuousExercise}h ago (requires >=${C.armErgometry.minHoursNoStrenuousExercise}h)`
    );
  }
  if (
    cond.hoursSinceAlcoholOrMeds !== null &&
    cond.hoursSinceAlcoholOrMeds < C.armErgometry.minHoursNoAlcoholOrVasoactiveMeds
  ) {
    conditionViolations.push(
      `Alcohol/vasoactive meds ${cond.hoursSinceAlcoholOrMeds}h ago (requires >=${C.armErgometry.minHoursNoAlcoholOrVasoactiveMeds}h for arm ergometry; >=8h cycle)`
    );
  }
  if (
    cond.hoursSinceNblSession !== null &&
    cond.hoursSinceNblSession < C.armErgometry.minHoursFromNblSession
  ) {
    conditionViolations.push(
      `NBL session ${cond.hoursSinceNblSession}h ago (requires >=${C.armErgometry.minHoursFromNblSession}h before arm ergometry)`
    );
  }

  const conditionChecks: PreTestConditionCheckItem[] = [
    {
      id: "meal",
      label: "Pre-Test Fast",
      requirement: `>= ${C.armErgometry.minHoursNoMeal}h since meal`,
      status:
        cond.hoursSinceMeal === null
          ? "UNLOGGED"
          : cond.hoursSinceMeal < C.armErgometry.minHoursNoMeal
          ? "VIOLATED"
          : "VALID",
      detail:
        cond.hoursSinceMeal === null
          ? "No meal timing logged"
          : `${cond.hoursSinceMeal}h ago`,
    },
    {
      id: "caffeine",
      label: "Caffeine Abstinence",
      requirement: `>= ${C.armErgometry.minHoursNoCaffeine}h prior`,
      status:
        cond.hoursSinceCaffeine === null
          ? "UNLOGGED"
          : cond.hoursSinceCaffeine < C.armErgometry.minHoursNoCaffeine
          ? "VIOLATED"
          : "VALID",
      detail:
        cond.hoursSinceCaffeine === null
          ? "No caffeine timing logged"
          : `${cond.hoursSinceCaffeine}h ago`,
    },
    {
      id: "strenuous-exercise",
      label: "Strenuous Exercise Buffer",
      requirement: `>= ${C.armErgometry.minHoursNoStrenuousExercise}h prior`,
      status:
        cond.hoursSinceStrenuousExercise === null
          ? "UNLOGGED"
          : cond.hoursSinceStrenuousExercise < C.armErgometry.minHoursNoStrenuousExercise
          ? "VIOLATED"
          : "VALID",
      detail:
        cond.hoursSinceStrenuousExercise === null
          ? "No workout gap logged"
          : `${cond.hoursSinceStrenuousExercise}h ago`,
    },
    {
      id: "alcohol-meds",
      label: "Alcohol & Vasoactive Meds",
      requirement: `>= ${C.armErgometry.minHoursNoAlcoholOrVasoactiveMeds}h arm / >= 8h cycle`,
      status:
        cond.hoursSinceAlcoholOrMeds === null
          ? "UNLOGGED"
          : cond.hoursSinceAlcoholOrMeds < C.armErgometry.minHoursNoAlcoholOrVasoactiveMeds
          ? "VIOLATED"
          : "VALID",
      detail:
        cond.hoursSinceAlcoholOrMeds === null
          ? "Not logged"
          : `${cond.hoursSinceAlcoholOrMeds}h ago`,
    },
    {
      id: "nbl",
      label: "No NBL Dive Run",
      requirement: `>= ${C.armErgometry.minHoursFromNblSession}h prior (MEDB 6.3)`,
      status:
        cond.hoursSinceNblSession === null
          ? "UNLOGGED"
          : cond.hoursSinceNblSession < C.armErgometry.minHoursFromNblSession
          ? "VIOLATED"
          : "VALID",
      detail:
        cond.hoursSinceNblSession === null
          ? "Not logged"
          : `${cond.hoursSinceNblSession}h ago`,
    },
    {
      id: "calf-morning",
      label: "Morning Fasted Calf + Mass",
      requirement: "Pre-breakfast paired w/ MEDB 1.13",
      status:
        cond.calfMorningFastedPaired === null
          ? "UNLOGGED"
          : cond.calfMorningFastedPaired
          ? "VALID"
          : "VIOLATED",
      detail:
        cond.calfMorningFastedPaired === null
          ? "Protocol compliance unlogged"
          : cond.calfMorningFastedPaired
          ? "Verified morning fasted + paired mass"
          : "Invalid sampling timing flagged",
    },
  ];

  return { conditionViolations, conditionChecks };
}

function parseAnthropometricSamples(
  records: HazardDataRecord[],
  samples: HazardSampleRecord[],
  actorInputs: Record<string, string>,
  cond: PreTestConditionInput
): {
  validCalfPoints: Array<{ day: number; value: number; label: string }>;
  validGripPoints: Array<{ day: number; value: number; label: string }>;
  invalidCalfSamplesCount: number;
  latestSnapshot: AnthropometricSample | null;
} {
  const stream = "Handgrip & Calf Volume";
  const streamSamples = samples.filter((s) => s.streamName === stream);
  const currentPayload = resolveStreamPayload(stream, records, actorInputs);

  const parsedSamples: AnthropometricSample[] = streamSamples.map((s, idx) => {
    const sp = s.samplePayload ?? {};
    const flightDay =
      readNum(sp, "measurementFlightDay") ??
      readNum(sp, "flightDay") ??
      (idx + 1) * GRAVITY_PIPELINE_VALUES.schedule.calfCadenceDays;
    const explicitGrip = readNum(sp, "maxGripKg");
    const calfVolumeValue = readNum(sp, "calfVolumeValue");
    const maxGripKg =
      explicitGrip !== null
        ? explicitGrip
        : calfVolumeValue === null
        ? (s.numericValue ?? null)
        : null;
    const bodyMassKg = readNum(sp, "bodyMassKg");
    const explicitCond = readBoolChoice(sp, "calfMorningFastedPaired");
    const conditionsMet = explicitCond !== null ? explicitCond : cond.calfMorningFastedPaired !== false;

    return {
      flightDay,
      recordedAt: s.recordedAt,
      maxGripKg,
      gripStaticEnduranceSec: readNum(sp, "gripStaticEnduranceSec"),
      gripDynamicEnduranceReps: readNum(sp, "gripDynamicEnduranceReps"),
      calfVolumeValue,
      bodyMassKg,
      conditionsMet,
    };
  });

  // Include current snapshot if not yet in samples or if user just entered it
  const snapDay = readNum(currentPayload, "measurementFlightDay") ?? readNum(currentPayload, "flightDay");
  const snapGrip = readNum(currentPayload, "maxGripKg");
  const snapCalf = readNum(currentPayload, "calfVolumeValue");
  const snapMass = readNum(currentPayload, "bodyMassKg");
  const hasSnap = snapGrip !== null || snapCalf !== null;

  const latestSnapshot: AnthropometricSample | null = hasSnap
    ? {
        flightDay: snapDay ?? (parsedSamples.length > 0 ? parsedSamples[parsedSamples.length - 1].flightDay : 14),
        recordedAt: records.find((r) => r.streamName === stream)?.updatedAt ?? new Date().toISOString(),
        maxGripKg: snapGrip,
        gripStaticEnduranceSec: readNum(currentPayload, "gripStaticEnduranceSec"),
        gripDynamicEnduranceReps: readNum(currentPayload, "gripDynamicEnduranceReps"),
        calfVolumeValue: snapCalf,
        bodyMassKg: snapMass,
        conditionsMet: cond.calfMorningFastedPaired !== false,
      }
    : parsedSamples.length > 0
    ? parsedSamples[parsedSamples.length - 1]
    : null;

  if (
    latestSnapshot &&
    parsedSamples.length === 0 &&
    (latestSnapshot.calfVolumeValue !== null || latestSnapshot.maxGripKg !== null)
  ) {
    parsedSamples.push(latestSnapshot);
  }

  let invalidCalfSamplesCount = 0;
  const validCalfPoints: Array<{ day: number; value: number; label: string }> = [];
  const validGripPoints: Array<{ day: number; value: number; label: string }> = [];

  for (const pt of parsedSamples) {
    if (pt.calfVolumeValue !== null) {
      if (pt.conditionsMet) {
        validCalfPoints.push({ day: pt.flightDay, value: pt.calfVolumeValue, label: `FD${pt.flightDay}` });
      } else {
        invalidCalfSamplesCount += 1;
      }
    }
    if (pt.maxGripKg !== null) {
      validGripPoints.push({ day: pt.flightDay, value: pt.maxGripKg, label: `FD${pt.flightDay}` });
    }
  }

  validCalfPoints.sort((a, b) => a.day - b.day);
  validGripPoints.sort((a, b) => a.day - b.day);

  return { validCalfPoints, validGripPoints, invalidCalfSamplesCount, latestSnapshot };
}

// Two-sided 90% Student's t critical values (t_{0.95, df}) for small-N slope uncertainty
const STUDENT_T_90_TABLE = [
  6.314, // df = 1 (N = 3)
  2.920, // df = 2 (N = 4)
  2.353, // df = 3 (N = 5)
  2.132, // df = 4 (N = 6)
  2.015, // df = 5 (N = 7)
  1.943, // df = 6 (N = 8)
  1.895, // df = 7 (N = 9)
  1.860, // df = 8 (N = 10)
  1.833, // df = 9 (N = 11)
  1.812, // df = 10 (N = 12)
] as const;

function getStudentT90(df: number): number {
  if (df <= 0) return STUDENT_T_90_TABLE[0];
  const idx = Math.min(df - 1, STUDENT_T_90_TABLE.length - 1);
  return STUDENT_T_90_TABLE[idx];
}

/**
 * Computes transparent OLS linear fit over % change from personal first-valid baseline.
 * Never presented as ML; explicitly exposes sampleSize N, Student's t uncertainty, and
 * non-clamped crossing days when projection already passed threshold on stale telemetry.
 */
function computeLinearBaselineTrend(
  points: Array<{ day: number; value: number; label: string }>,
  thresholdPct: number,
  currentFlightDay: number
): LinearTrendResult | null {
  if (points.length === 0) return null;
  const baselineValue = points[0].value;
  if (baselineValue <= 0) return null;

  const pctPoints = points.map((p) => ({
    x: p.day,
    y: ((p.value - baselineValue) / baselineValue) * 100,
    label: p.label,
  }));

  const latest = pctPoints[pctPoints.length - 1];
  const n = pctPoints.length;
  const daysSinceLastMeasurement = Math.max(0, Math.round(currentFlightDay - latest.x));

  if (n < GRAVITY_PIPELINE_VALUES.assumptions.minPointsForRegression) {
    return {
      sampleSize: n,
      baselineValue,
      latestValue: points[n - 1].value,
      latestFlightDay: latest.x,
      latestPctChange: latest.y,
      slopePctPerDay: 0,
      projectedCrossFlightDay: null,
      projectedPctAtCurrentDay: null,
      isThresholdProjectedCrossed: false,
      daysSinceLastMeasurement,
      etaDaysToThreshold: null,
      etaMinDays: null,
      etaMaxDays: null,
      ciHasResidualFloor: false,
      series: pctPoints.map((p) => ({ label: p.label, value: Number(p.y.toFixed(2)) })),
    };
  }

  const meanX = pctPoints.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = pctPoints.reduce((acc, p) => acc + p.y, 0) / n;
  const sxx = pctPoints.reduce((acc, p) => acc + (p.x - meanX) ** 2, 0);
  const sxy = pctPoints.reduce((acc, p) => acc + (p.x - meanX) * (p.y - meanY), 0);

  if (sxx === 0) {
    return {
      sampleSize: n,
      baselineValue,
      latestValue: points[n - 1].value,
      latestFlightDay: latest.x,
      latestPctChange: latest.y,
      slopePctPerDay: 0,
      projectedCrossFlightDay: null,
      projectedPctAtCurrentDay: null,
      isThresholdProjectedCrossed: false,
      daysSinceLastMeasurement,
      etaDaysToThreshold: null,
      etaMinDays: null,
      etaMaxDays: null,
      ciHasResidualFloor: false,
      series: pctPoints.map((p) => ({ label: p.label, value: Number(p.y.toFixed(2)) })),
    };
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let projectedCrossFlightDay: number | null = null;
  let projectedPctAtCurrentDay: number | null = null;
  let isThresholdProjectedCrossed = false;
  let etaDaysToThreshold: number | null = null;
  let etaMinDays: number | null = null;
  let etaMaxDays: number | null = null;
  let ciHasResidualFloor = false;

  if (slope < -0.001) {
    projectedCrossFlightDay = (thresholdPct - intercept) / slope;
    projectedPctAtCurrentDay = slope * currentFlightDay + intercept;
    etaDaysToThreshold = Math.round(projectedCrossFlightDay - currentFlightDay);
    isThresholdProjectedCrossed =
      projectedCrossFlightDay <= currentFlightDay || latest.y <= thresholdPct;

    if (n >= GRAVITY_PIPELINE_VALUES.assumptions.minPointsForConfidenceInterval) {
      const df = n - 2;
      const sse = pctPoints.reduce((acc, p) => {
        const pred = slope * p.x + intercept;
        return acc + (p.y - pred) ** 2;
      }, 0);
      const rawRmse = Math.sqrt(sse / df);
      const minFloor = GRAVITY_PIPELINE_VALUES.assumptions.minRegressionResidualPct;
      ciHasResidualFloor = rawRmse < minFloor;
      const effectiveRmse = Math.max(rawRmse, minFloor);
      const tCrit = getStudentT90(df);
      const slopeHalfWidth = tCrit * (effectiveRmse / Math.sqrt(sxx));

      const steeperSlope = slope - slopeHalfWidth;
      const shallowerSlope = slope + slopeHalfWidth;

      if (steeperSlope < -0.001) {
        etaMinDays = Math.round((thresholdPct - intercept) / steeperSlope - currentFlightDay);
      }
      if (shallowerSlope < -0.001) {
        etaMaxDays = Math.round((thresholdPct - intercept) / shallowerSlope - currentFlightDay);
      }
      if (etaMinDays !== null && etaMaxDays !== null && etaMinDays > etaMaxDays) {
        [etaMinDays, etaMaxDays] = [etaMaxDays, etaMinDays];
      }
    }
  }

  return {
    sampleSize: n,
    baselineValue,
    latestValue: points[n - 1].value,
    latestFlightDay: latest.x,
    latestPctChange: latest.y,
    slopePctPerDay: slope,
    projectedCrossFlightDay,
    projectedPctAtCurrentDay,
    isThresholdProjectedCrossed,
    daysSinceLastMeasurement,
    etaDaysToThreshold,
    etaMinDays,
    etaMaxDays,
    ciHasResidualFloor,
    series: pctPoints.map((p) => ({ label: p.label, value: Number(p.y.toFixed(2)) })),
  };
}

function parseExerciseEntries(
  records: HazardDataRecord[],
  samples: HazardSampleRecord[],
  actorInputs: Record<string, string>
): ExerciseEntry[] {
  const stream = "Daily Exercise Log";
  const entries: ExerciseEntry[] = samples
    .filter((s) => s.streamName === stream)
    .map((s) => {
      const sp = s.samplePayload ?? {};
      return {
        flightDay: readNum(sp, "flightDay"),
        recordedAt: s.recordedAt,
        aerobicMinutes: readNum(sp, "aerobicMinutes"),
        resistanceMinutes: readNum(sp, "resistanceMinutes"),
        prescribedLoadKg: readNum(sp, "prescribedLoadKg"),
        actualLoadKg: readNum(sp, "actualLoadKg"),
        hoursAfterMeal: readNum(sp, "hoursAfterMeal"),
        hoursBeforeSleep: readNum(sp, "hoursBeforeSleep"),
        reconditioningDayRPlus: readNum(sp, "reconditioningDayRPlus"),
      };
    });

  if (entries.length === 0) {
    const p = resolveStreamPayload(stream, records, actorInputs);
    const aerobicMinutes = readNum(p, "aerobicMinutes") ?? readNum(p, "aerobic_min");
    const resistanceMinutes = readNum(p, "resistanceMinutes") ?? readNum(p, "resistance_min");
    const reconditioningDayRPlus = readNum(p, "reconditioningDayRPlus");
    if (aerobicMinutes !== null || resistanceMinutes !== null || reconditioningDayRPlus !== null) {
      entries.push({
        flightDay: readNum(p, "flightDay"),
        recordedAt: records.find((r) => r.streamName === stream)?.updatedAt ?? new Date().toISOString(),
        aerobicMinutes,
        resistanceMinutes,
        prescribedLoadKg: readNum(p, "prescribedLoadKg"),
        actualLoadKg: readNum(p, "actualLoadKg"),
        hoursAfterMeal: readNum(p, "hoursAfterMeal"),
        hoursBeforeSleep: readNum(p, "hoursBeforeSleep"),
        reconditioningDayRPlus,
      });
    }
  }

  return entries;
}

export function formatTrendCiRange(trend: LinearTrendResult): string {
  if (trend.etaMinDays === null && trend.etaMaxDays === null) return "";
  if (trend.etaMinDays !== null && trend.etaMaxDays !== null) {
    const min = Math.max(0, trend.etaMinDays);
    const max = Math.max(min, trend.etaMaxDays);
    return ` (${min}–${max}d range)`;
  }
  if (trend.etaMinDays !== null) {
    return ` (>= ${Math.max(0, trend.etaMinDays)}d)`;
  }
  return "";
}

function formatTrendProjectionAlert(
  metricLabel: string,
  baselineLabel: string,
  thresholdPct: number,
  trend: LinearTrendResult,
  _currentFlightDay: number,
  daysOverdue: number | null
): string | null {
  if (trend.latestPctChange <= thresholdPct) {
    return `${metricLabel} ${trend.latestPctChange.toFixed(1)}% vs ${baselineLabel} (crossed ${thresholdPct}% limit).`;
  }
  if (trend.isThresholdProjectedCrossed && trend.projectedCrossFlightDay !== null) {
    const crossFd = Math.round(trend.projectedCrossFlightDay);
    const overdueStr =
      daysOverdue !== null && daysOverdue > 0 ? ` · check overdue ${daysOverdue}d` : "";
    return `${metricLabel} projected to cross ${thresholdPct}% (~FD${crossFd})${overdueStr}.`;
  }
  if (trend.etaDaysToThreshold !== null) {
    return `${metricLabel} ${(trend.slopePctPerDay * 7).toFixed(1)}%/wk (~${trend.etaDaysToThreshold}d to ${thresholdPct}%).`;
  }
  return null;
}

function isMissionReconditioningPhase(missionContext: string): boolean {
  return /postflight|reconditioning|return|reentry/i.test(missionContext);
}

/**
 * Evaluates Feature 2: Microgravity Atrophy, Proxy Bone-Shield & Exercise Adherence Engine.
 */
function evaluateAtrophyAndConditioning(
  currentFlightDay: number | null,
  cond: PreTestConditionInput,
  records: HazardDataRecord[],
  samples: HazardSampleRecord[],
  actorInputs: Record<string, string>,
  missionContext: string
): AtrophyEvaluation {
  const S = GRAVITY_PIPELINE_VALUES.schedule;
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
  const isReconditioningPhase = isMissionReconditioningPhase(missionContext);

  const { validCalfPoints, validGripPoints, invalidCalfSamplesCount } = parseAnthropometricSamples(
    records,
    samples,
    actorInputs,
    cond
  );

  const inferredFlightDay =
    currentFlightDay ??
    (validCalfPoints.length > 0
      ? validCalfPoints[validCalfPoints.length - 1].day
      : validGripPoints.length > 0
      ? validGripPoints[validGripPoints.length - 1].day
      : S.calfFirstLaunchPlusDays);

  const calfTrend = computeLinearBaselineTrend(
    validCalfPoints,
    A.calfAtrophyAlertPct,
    inferredFlightDay
  );
  const gripTrend = computeLinearBaselineTrend(
    validGripPoints,
    A.gripDeclineAlertPct,
    inferredFlightDay
  );

  const calfDaysOverdue =
    currentFlightDay !== null && validCalfPoints.length > 0
      ? Math.max(0, currentFlightDay - (validCalfPoints[validCalfPoints.length - 1].day + S.calfCadenceDays))
      : null;

  const gripDaysOverdue =
    currentFlightDay !== null && validGripPoints.length > 0
      ? Math.max(0, currentFlightDay - (validGripPoints[validGripPoints.length - 1].day + S.gripCadenceDays))
      : null;

  const exerciseEntries = parseExerciseEntries(records, samples, actorInputs);
  const recentWindow = exerciseEntries.slice(-A.rollingAdherenceWindowDays);

  let adherenceSummary: AtrophyEvaluation["adherenceSummary"] = null;
  if (recentWindow.length > 0) {
    const aeroAvg =
      recentWindow.reduce((sum, e) => sum + (e.aerobicMinutes ?? 0), 0) / recentWindow.length;
    const resAvg =
      recentWindow.reduce((sum, e) => sum + (e.resistanceMinutes ?? 0), 0) / recentWindow.length;
    const totalAvg = aeroAvg + resAvg;

    const loadPairs = recentWindow.filter(
      (e) => e.prescribedLoadKg !== null && e.prescribedLoadKg > 0 && e.actualLoadKg !== null
    );
    const loadRatioPct =
      loadPairs.length > 0
        ? (loadPairs.reduce((s, e) => s + (e.actualLoadKg as number) / (e.prescribedLoadKg as number), 0) /
            loadPairs.length) *
          100
        : null;

    const mealViolations = recentWindow.filter(
      (e) => e.hoursAfterMeal !== null && e.hoursAfterMeal < S.exerciseMinHoursAfterMeal
    ).length;
    const sleepViolations = recentWindow.filter(
      (e) => e.hoursBeforeSleep !== null && e.hoursBeforeSleep < S.exerciseMinHoursBeforeSleep
    ).length;

    const latestRecond = [...recentWindow].reverse().find((e) => e.reconditioningDayRPlus !== null);
    const recondDay = isReconditioningPhase
      ? (latestRecond?.reconditioningDayRPlus ?? 0)
      : null;
    const recondPct = isReconditioningPhase
      ? (totalAvg / S.reconditioningDailyTargetMin) * 100
      : null;

    adherenceSummary = {
      sessionsCount: recentWindow.length,
      avgTotalMinutes: Math.round(totalAvg),
      aerobicPct: Math.round((aeroAvg / S.dailyAerobicTargetMin) * 100),
      resistancePct: Math.round((resAvg / S.dailyResistanceTargetMin) * 100),
      overallPct: Math.round((totalAvg / S.dailyTotalTargetMin) * 100),
      loadRatioPct: loadRatioPct !== null ? Math.round(loadRatioPct) : null,
      mealViolations,
      sleepViolations,
      reconditioningDayRPlus: recondDay,
      reconditioningPct: recondPct !== null ? Math.round(recondPct) : null,
    };
  }

  const alerts: string[] = [];
  const actions: string[] = [];

  if (invalidCalfSamplesCount > 0) {
    alerts.push(
      `${invalidCalfSamplesCount} calf sample(s) excluded from trend (MEDB 5.4 requires morning after sleep, before breakfast, paired with body mass)`
    );
    actions.push(
      "Log next EZOG calf volume (MEDB 5.4) + body mass (MEDB 1.13) tomorrow immediately after waking before breakfast."
    );
  }

  if (calfDaysOverdue !== null && calfDaysOverdue > 0) {
    alerts.push(`Calf volume measurement (MEDB 5.4) overdue by ${calfDaysOverdue} day(s)`);
    actions.push("Take overdue EZOG calf measurement tomorrow morning before breakfast with body mass.");
  }

  if (gripDaysOverdue !== null && gripDaysOverdue > 0) {
    alerts.push(`Monthly handgrip check (MR081L) overdue by ${gripDaysOverdue} day(s)`);
  }

  if (calfTrend) {
    const calfMsg = formatTrendProjectionAlert(
      "Calf volume",
      "L+14 baseline",
      A.calfAtrophyAlertPct,
      calfTrend,
      inferredFlightDay,
      calfDaysOverdue
    );
    if (calfMsg) alerts.push(calfMsg);
  }

  if (gripTrend) {
    const gripMsg = formatTrendProjectionAlert(
      "Handgrip",
      "FD14 baseline",
      A.gripDeclineAlertPct,
      gripTrend,
      inferredFlightDay,
      gripDaysOverdue
    );
    if (gripMsg) alerts.push(gripMsg);
  }

  if (adherenceSummary) {
    if (isReconditioningPhase) {
      const rDay = adherenceSummary.reconditioningDayRPlus ?? 0;
      const pct = adherenceSummary.reconditioningPct ?? adherenceSummary.overallPct;
      if (rDay <= S.reconditioningDurationDays && pct < A.weeklyAdherenceAlertPct) {
        alerts.push(
          `Return-to-gravity R+${rDay}/${S.reconditioningDurationDays} reconditioning at ${pct}% of 120 min/day target (MR026L)`
        );
        actions.push("Complete 120 min/d postflight MR026L reconditioning.");
      }
    } else if (
      adherenceSummary.overallPct < A.weeklyAdherenceAlertPct ||
      adherenceSummary.resistancePct < A.weeklyAdherenceAlertPct
    ) {
      alerts.push(
        `Exercise adherence ${adherenceSummary.overallPct}% (resistance ${adherenceSummary.resistancePct}% < ${A.weeklyAdherenceAlertPct}% target).`
      );
      actions.push("Complete today's 90-min resistance + 60-min aerobic workout.");
    }

    if (adherenceSummary.sleepViolations > 0) {
      alerts.push(
        `Exercise ended <2h before sleep (${adherenceSummary.sleepViolations}x).`
      );
      actions.push("Finish workouts ≥2 h before sleep, ≥90 min post-meal.");
    } else if (adherenceSummary.mealViolations > 0) {
      alerts.push(
        `Exercise started <90 min after meal (${adherenceSummary.mealViolations}x).`
      );
    }
  }

  const etaDays = calfTrend?.etaDaysToThreshold ?? gripTrend?.etaDaysToThreshold ?? null;
  let etaLabel = "Log >=2 baseline readings (L+14 / FD14) for trend";
  if (calfDaysOverdue !== null && calfDaysOverdue > 0 && etaDays !== null && etaDays <= 0) {
    etaLabel = `Threshold crossed ~${Math.abs(etaDays)}d ago · calf overdue ${calfDaysOverdue}d`;
  } else if (calfDaysOverdue !== null && calfDaysOverdue > 0) {
    etaLabel = `Calf check overdue ${calfDaysOverdue}d (morning fasted)`;
  } else if (etaDays !== null && etaDays <= 0) {
    etaLabel = `Conditioning limit crossed ~${Math.abs(etaDays)}d ago`;
  } else if (etaDays !== null) {
    etaLabel = `~${etaDays}d to conditioning limit`;
  } else if (adherenceSummary) {
    etaLabel = isReconditioningPhase
      ? `Reconditioning ${adherenceSummary.reconditioningPct ?? adherenceSummary.overallPct}% (120 min/d)`
      : `Weekly adherence ${adherenceSummary.overallPct}% (150 min/d target)`;
  }

  return {
    hasAnyAnthropometric: validCalfPoints.length > 0 || validGripPoints.length > 0 || invalidCalfSamplesCount > 0,
    hasAnyExercise: exerciseEntries.length > 0,
    calfTrend,
    gripTrend,
    calfDaysOverdue,
    gripDaysOverdue,
    invalidCalfSamplesCount,
    adherenceSummary,
    alerts,
    actions,
    etaLabel,
    etaDays,
  };
}

function buildGravityCharts(
  atrophy: AtrophyEvaluation,
  records: HazardDataRecord[],
  samples: HazardSampleRecord[],
  actorInputs: Record<string, string>,
  isReconditioningPhase: boolean
): HazardChartSpec[] {
  const charts: HazardChartSpec[] = [];
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
  const S = GRAVITY_PIPELINE_VALUES.schedule;

  if (atrophy.calfTrend && atrophy.calfTrend.series.length > 0) {
    charts.push({
      id: "gravity-calf-baseline-pct",
      title: `Calf Volume vs. L+14 Baseline (MEDB 5.4, N=${atrophy.calfTrend.sampleSize})`,
      unit: "%",
      series: atrophy.calfTrend.series,
      thresholds: [
        {
          label: "Atrophy Alert",
          value: A.calfAtrophyAlertPct,
          color: "#ef4444",
        },
        {
          label: "L+14 Baseline",
          value: 0,
          color: "#94a3b8",
        },
      ],
    });
  }

  if (atrophy.gripTrend && atrophy.gripTrend.series.length > 0) {
    charts.push({
      id: "gravity-grip-baseline-pct",
      title: `Max Handgrip vs. FD14 Baseline (MR081L, N=${atrophy.gripTrend.sampleSize})`,
      unit: "%",
      series: atrophy.gripTrend.series,
      thresholds: [
        {
          label: "Decline Alert",
          value: A.gripDeclineAlertPct,
          color: "#ef4444",
        },
        {
          label: "FD14 Baseline",
          value: 0,
          color: "#94a3b8",
        },
      ],
    });
  }

  const exEntries = parseExerciseEntries(records, samples, actorInputs);
  if (exEntries.length > 0) {
    const isReconditioning = isReconditioningPhase;
    charts.push({
      id: "gravity-exercise-daily-min",
      title: isReconditioning
        ? `Postflight Reconditioning Volume (MR026L R+${atrophy.adherenceSummary?.reconditioningDayRPlus ?? 0}, target ${S.reconditioningDailyTargetMin} min)`
        : `Daily Exercise Volume (MEDB 5.2, target ${S.dailyTotalTargetMin} min)`,
      unit: "min",
      series: exEntries.map((e, idx) => ({
        label: e.flightDay !== null ? `FD${e.flightDay}` : `Log ${idx + 1}`,
        value: (e.aerobicMinutes ?? 0) + (e.resistanceMinutes ?? 0),
      })),
      thresholds: isReconditioning
        ? [
            {
              label: "MR026L Target",
              value: S.reconditioningDailyTargetMin,
              color: "#10b981",
            },
          ]
        : [
            {
              label: "MEDB 5.2 Target",
              value: S.dailyTotalTargetMin,
              color: "#10b981",
            },
            {
              label: "80% Watch",
              value: Math.round((S.dailyTotalTargetMin * A.weeklyAdherenceAlertPct) / 100),
              color: "#f59e0b",
            },
          ],
    });
  }

  return charts;
}

function buildLeadGravityCharts(crewOverview: GravityCrewOverview): HazardChartSpec[] {
  const loggedMembers = crewOverview.members.filter((m) => m.adherencePct !== null);
  if (loggedMembers.length === 0) return [];

  return [
    {
      id: "gravity-crew-exercise-discipline",
      title: "Crew Exercise Adherence (MEDB 5.2 / MR026L)",
      unit: "%",
      chartType: "bar",
      series: loggedMembers.map((m) => ({
        label: m.callsign.split("—")[0]?.trim() || m.callsign,
        value: m.adherencePct ?? 0,
      })),
      thresholds: [
        {
          label: "Team Target",
          value: GRAVITY_PIPELINE_VALUES.assumptions.weeklyAdherenceAlertPct,
          color: "#10b981",
        },
      ],
    },
  ];
}

function hasThresholdCrossedCondition(atrophy: AtrophyEvaluation): boolean {
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
  const calfCrossed =
    atrophy.calfTrend !== null &&
    (atrophy.calfTrend.latestPctChange <= A.calfAtrophyAlertPct ||
      (atrophy.calfTrend.isThresholdProjectedCrossed && (atrophy.calfDaysOverdue ?? 0) > 0));
  const gripCrossed =
    atrophy.gripTrend !== null &&
    (atrophy.gripTrend.latestPctChange <= A.gripDeclineAlertPct ||
      (atrophy.gripTrend.isThresholdProjectedCrossed && (atrophy.gripDaysOverdue ?? 0) > 0));
  return calfCrossed || gripCrossed;
}

function computeConditioningStatus(
  atrophy: AtrophyEvaluation,
  status: HazardEvaluationResult["status"]
): ConditioningStatusLabel {
  if (!atrophy.hasAnyAnthropometric && !atrophy.hasAnyExercise) {
    return "UNLOGGED";
  }
  if (status === "CRITICAL" || hasThresholdCrossedCondition(atrophy)) {
    return "ALERT";
  }
  if (atrophy.alerts.length > 0) {
    return "WATCH";
  }
  return "ON_TRACK";
}

function computeGravityDiagnosticsCore(options: {
  actor: CrewSlot;
  role: UserRole;
  actorInputs: Record<string, string>;
  hazardRecords: readonly HazardDataRecord[];
  hazardSamples: readonly HazardSampleRecord[];
  allHazardRecords: readonly HazardDataRecord[];
  missionContext?: string;
}): GravityActorDiagnostics {
  const { actor, role, actorInputs, missionContext = "" } = options;
  const hazardRecords = [...options.hazardRecords];
  const hazardSamples = [...options.hazardSamples];
  const allHazardRecords = [...options.allHazardRecords];

  const currentFlightDay = resolveCurrentFlightDay(hazardRecords, actorInputs);
  const condInput = parsePreTestConditions(hazardRecords, actorInputs);
  const { conditionViolations, conditionChecks } = evaluateConditionGuard(condInput);
  const atrophy = evaluateAtrophyAndConditioning(
    currentFlightDay,
    condInput,
    hazardRecords,
    hazardSamples,
    actorInputs,
    missionContext
  );
  const exerciseEntries = parseExerciseEntries(hazardRecords, hazardSamples, actorInputs);

  // Read-only cross-hazard awareness (Hazard 2 sleep check when exercise ends <2h before sleep)
  const isolationSleepRec = allHazardRecords.find(
    (r) => r.characterId === actor.id && r.hazardSlug === "isolation" && r.streamName === "Wearable / Actigraphy"
  );
  const sleepCrossNote =
    atrophy.adherenceSummary && atrophy.adherenceSummary.sleepViolations > 0 && isolationSleepRec?.rawValue
      ? ` Cross-check with Isolation sleep telemetry ("${isolationSleepRec.rawValue}"): late workouts risk sleep fragmentation.`
      : "";

  let status: HazardEvaluationResult["status"] = "NOMINAL";
  if (hasThresholdCrossedCondition(atrophy)) {
    status = "CRITICAL";
  } else if (atrophy.alerts.length > 0 || conditionViolations.length > 0) {
    status = "ELEVATED";
  }

  const conditioningStatus = computeConditioningStatus(atrophy, status);

  return {
    role,
    status,
    currentFlightDay,
    condInput,
    conditionChecks,
    conditionViolations,
    atrophy,
    exerciseEntries,
    conditioningStatus,
    sleepCrossNote,
  };
}

/**
 * Shared diagnostic view-model for GravityHazardScreen (avoids duplicating math in UI).
 */
export function evaluateGravityDiagnostics(options: {
  actor: CrewSlot;
  role: UserRole;
  actorInputs?: Record<string, string>;
  hazardRecords: readonly HazardDataRecord[];
  hazardSamples: readonly HazardSampleRecord[];
  allHazardRecords?: readonly HazardDataRecord[];
  missionContext?: string;
}): GravityActorDiagnostics {
  return computeGravityDiagnosticsCore({
    actor: options.actor,
    role: options.role,
    actorInputs: options.actorInputs ?? {},
    hazardRecords: [...options.hazardRecords],
    hazardSamples: [...options.hazardSamples],
    allHazardRecords: [...(options.allHazardRecords ?? options.hazardRecords)],
    missionContext: options.missionContext ?? "",
  });
}

/**
 * Privacy-safe crew-wide conditioning & exercise discipline overview for Crew Lead.
 * Expects sanitized scenario records/samples (private notes & personal raw biomarkers omitted).
 */
export function evaluateGravityCrewOverview(
  mission: MissionProfile,
  scenarioRecords: readonly HazardDataRecord[],
  scenarioSamples: readonly HazardSampleRecord[]
): GravityCrewOverview {
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
  const missionContext = `${mission.name} ${mission.durationContext}`;
  const members: GravityCrewMemberSummary[] = mission.crew.map((member) => {
    const memberAllRecords = scenarioRecords.filter((r) => r.characterId === member.id);
    const memberGravityRecords = memberAllRecords.filter((r) => r.hazardSlug === "gravity");
    const memberGravitySamples = scenarioSamples.filter(
      (s) => s.characterId === member.id && s.hazardSlug === "gravity"
    );

    const diag = computeGravityDiagnosticsCore({
      actor: member,
      role: "lead",
      actorInputs: {},
      hazardRecords: memberGravityRecords,
      hazardSamples: memberGravitySamples,
      allHazardRecords: memberAllRecords,
      missionContext,
    });

    const adherencePct = diag.atrophy.adherenceSummary
      ? (diag.atrophy.adherenceSummary.reconditioningPct ?? diag.atrophy.adherenceSummary.overallPct)
      : null;

    return {
      id: member.id,
      callsign: member.callsign,
      assignedRoleTitle: member.assignedRoleTitle,
      isLeadSlot: member.isLeadSlot,
      status: diag.status,
      blockerCategories: [...diag.atrophy.alerts, ...diag.conditionViolations],
      conditionFlagCount: diag.conditionViolations.length,
      etaLabel: diag.atrophy.etaLabel,
      adherencePct,
      conditioningStatus: diag.conditioningStatus,
      reconditioningDayRPlus: diag.atrophy.adherenceSummary?.reconditioningDayRPlus ?? null,
    };
  });

  const onTrackCount = members.filter((m) => m.conditioningStatus === "ON_TRACK").length;
  const watchCount = members.filter((m) => m.conditioningStatus === "WATCH").length;
  const alertCount = members.filter((m) => m.conditioningStatus === "ALERT").length;
  const loggedAdherences = members
    .map((m) => m.adherencePct)
    .filter((v): v is number => v !== null);
  const teamExerciseDisciplinePct =
    loggedAdherences.length > 0
      ? Math.round(loggedAdherences.reduce((sum, v) => sum + v, 0) / loggedAdherences.length)
      : null;
  const disciplinedCrewCount = loggedAdherences.filter(
    (v) => v >= A.weeklyAdherenceAlertPct
  ).length;

  return {
    onTrackCount,
    watchCount,
    alertCount,
    teamExerciseDisciplinePct,
    teamExerciseBuffActive:
      loggedAdherences.length > 0 && disciplinedCrewCount === loggedAdherences.length,
    disciplinedCrewCount,
    loggedExerciseCrewCount: loggedAdherences.length,
    members,
  };
}

/**
 * Pure, deterministic evaluation pipeline for Hazard 4 (Gravity Fields).
 */
export function evaluateGravityHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const {
    mission,
    actor,
    role,
    actorInputs,
    hazardRecords,
    hazardSamples,
    allHazardRecords,
    scenarioHazardRecords,
    scenarioHazardSamples,
  } = input;

  const effectiveRole: UserRole = role ?? (actor.isLeadSlot ? "lead" : "member");
  const missionContext = `${mission.name} ${mission.durationContext}`;
  const isReconditioningPhase = isMissionReconditioningPhase(missionContext);
  const diag = computeGravityDiagnosticsCore({
    actor,
    role: effectiveRole,
    actorInputs,
    hazardRecords,
    hazardSamples,
    allHazardRecords,
    missionContext,
  });
  const { conditionViolations, atrophy, status, conditioningStatus } = diag;

  const immediateItems: string[] = [];
  if (conditionViolations.length > 0) {
    immediateItems.push(`Pre-test hold: ${conditionViolations.join("; ")}`);
  }
  if (atrophy.calfDaysOverdue !== null && atrophy.calfDaysOverdue > 0) {
    immediateItems.push(`Calf check overdue ${atrophy.calfDaysOverdue}d`);
  }
  if (atrophy.gripDaysOverdue !== null && atrophy.gripDaysOverdue > 0) {
    immediateItems.push(`Handgrip overdue ${atrophy.gripDaysOverdue}d`);
  }

  const immediateHorizon =
    immediateItems.length > 0
      ? immediateItems.slice(0, 3).join(" · ")
      : atrophy.hasAnyAnthropometric || atrophy.hasAnyExercise
      ? `Pre-test conditions valid${
          atrophy.adherenceSummary ? ` · 7d exercise ${atrophy.adherenceSummary.overallPct}%` : ""
        }.`
      : gravityHazard.outputSlots.immediateHorizon;

  // Prolonged Horizon (Role-aware RBAC output, max 1 concise line)
  const prolongedParts: string[] = [];
  if (effectiveRole === "lead") {
    if (conditioningStatus !== "UNLOGGED") {
      prolongedParts.push(`Conditioning: ${conditioningStatus.replace("_", " ")}`);
    }
    if (atrophy.adherenceSummary) {
      prolongedParts.push(`Exercise: ${adherenceLabel(atrophy.adherenceSummary)}`);
    }
  } else {
    if (atrophy.calfTrend) {
      prolongedParts.push(
        `Calf ${atrophy.calfTrend.latestPctChange >= 0 ? "+" : ""}${atrophy.calfTrend.latestPctChange.toFixed(1)}% vs L+14`
      );
    }
    if (atrophy.gripTrend) {
      prolongedParts.push(
        `Handgrip ${atrophy.gripTrend.latestPctChange >= 0 ? "+" : ""}${atrophy.gripTrend.latestPctChange.toFixed(1)}% vs FD14`
      );
    }
    if (atrophy.adherenceSummary) {
      prolongedParts.push(`7d Exercise ${atrophy.adherenceSummary.overallPct}%`);
    }
  }

  const prolongedHorizon =
    prolongedParts.length > 0
      ? prolongedParts.slice(0, 3).join(" · ")
      : gravityHazard.outputSlots.prolongedHorizon;

  const eta =
    atrophy.hasAnyAnthropometric || atrophy.hasAnyExercise
      ? atrophy.etaLabel
      : actor.metrics.etaSlot;

  const fallbackSolutions = [
    "Complete daily 150 min workout and biweekly fasted calf check.",
    "Verify ≥2 h fast and ≥8 h no caffeine before testing.",
  ];

  const solutions = (atrophy.actions.length > 0 ? atrophy.actions : fallbackSolutions).slice(0, 2);

  const charts =
    effectiveRole === "lead"
      ? buildLeadGravityCharts(
          evaluateGravityCrewOverview(
            mission,
            scenarioHazardRecords ?? allHazardRecords,
            scenarioHazardSamples ?? []
          )
        )
      : buildGravityCharts(atrophy, hazardRecords, hazardSamples, actorInputs, isReconditioningPhase);

  return {
    status,
    scenarioStatusSlot: mission.environment.gravityStatusSlot,
    immediateHorizon,
    prolongedHorizon,
    eta,
    solutions,
    charts,
  };
}

function adherenceLabel(summary: NonNullable<AtrophyEvaluation["adherenceSummary"]>): string {
  if (summary.reconditioningDayRPlus !== null) {
    return `${summary.avgTotalMinutes} min/d (${summary.reconditioningPct ?? summary.overallPct}% of 120m MR026L R+${summary.reconditioningDayRPlus})`;
  }
  return `${summary.overallPct}% total (Aerobic ${summary.aerobicPct}%, Resistance ${summary.resistancePct}%${
    summary.loadRatioPct !== null ? `, Load ${summary.loadRatioPct}%` : ""
  })`;
}

// [SECTION 3: HAZARD 4 UI METADATA, INPUT STREAMS & ALARMS]
export const gravityHazard: HazardSpec = {
  slug: "gravity",
  number: 4,
  title: "Gravity Fields",
  shortTitle: "Gravity",
  ownerSlot: "src/lib/hazards/04-gravity.ts",
  sourceDoc: "docs/hazards/04-gravity-fields-enviroments.md",
  nasaReferences: [
    "MR081L (Handgrip / Pinch Dynamometry)",
    "MEDB 5.4 (Calf Volume EZOG) + MEDB 1.13 (Body Mass)",
    "MEDB 5.2 (Daily Exercise 2.5h: 1h Aerobic + 1.5h Resistance)",
    "MEDB 6.3 / MR087L (Pre-Test Conditions)",
    "MEDB 1.11 (Pre/Post DXA Context) & MR026L (R+0..R+45 Reconditioning)",
  ],
  overviewSlot:
    "Deterministic low-N muscle/bone conditioning tracker and pre-test validity condition guard (MEDB 5.2, 5.4, MR081L, MR026L).",
  inputSlots: [
    {
      streamName: "Pre-Test Conditions",
      inputPrompt: "Pre-test fasting, caffeine, workout & med hours",
      sourceRef: "MEDB 6.3 / MR087L / MEDB 5.4",
      subfields: [
        {
          key: "hoursSinceMeal",
          label: "Hours Since Meal",
          fieldType: "number",
          unit: "h",
          prompt: "Hours since last meal (>= 2 h required)",
        },
        {
          key: "hoursSinceCaffeine",
          label: "Hours Since Caffeine",
          fieldType: "number",
          unit: "h",
          prompt: "Hours since caffeine (>= 8 h required)",
        },
        {
          key: "hoursSinceStrenuousExercise",
          label: "Hours Since Strenuous Exercise",
          fieldType: "number",
          unit: "h",
          prompt: "Hours since strenuous workout (>= 24 h required)",
        },
        {
          key: "hoursSinceAlcoholOrMeds",
          label: "Hours Since Alcohol / Cold Meds",
          fieldType: "number",
          unit: "h",
          prompt: "Hours since alcohol or vasoactive meds (>= 24 h)",
        },
        {
          key: "hoursSinceNblSession",
          label: "Hours Since NBL Session",
          fieldType: "number",
          unit: "h",
          prompt: "Hours since NBL session (>= 48 h)",
        },
        {
          key: "calfMorningFastedPaired",
          label: "Calf Morning Fasted + Mass",
          fieldType: "boolean",
          prompt: "Morning after sleep, before breakfast (yes/no)",
        },
      ],
    },
    {
      streamName: "Handgrip & Calf Volume",
      inputPrompt: "grip_strength, calf_volume, body_mass, flight_day",
      sourceRef: "MR081L / MEDB 5.4 / MEDB 1.13",
      recordSample: true,
      unit: "kg",
      subfields: [
        {
          key: "maxGripKg",
          label: "Max Handgrip (3x5s)",
          fieldType: "number",
          unit: "kg",
          prompt: "Maximal handgrip contraction (kg)",
        },
        {
          key: "gripStaticEnduranceSec",
          label: "Static Endurance (to 50%)",
          fieldType: "number",
          unit: "s",
          prompt: "Non-dominant hold time to 50% max (s)",
        },
        {
          key: "gripDynamicEnduranceReps",
          label: "Dynamic Endurance (to 75%)",
          fieldType: "number",
          unit: "reps",
          prompt: "Dominant reps until < 75% max",
        },
        {
          key: "calfVolumeValue",
          label: "EZOG Calf Volume",
          fieldType: "number",
          unit: "mL",
          prompt: "EZOG stocking reading (mL)",
        },
        {
          key: "bodyMassKg",
          label: "Paired Body Mass (MEDB 1.13)",
          fieldType: "number",
          unit: "kg",
          prompt: "Morning body mass paired with calf (kg)",
        },
        {
          key: "measurementFlightDay",
          label: "Measurement Flight Day",
          fieldType: "number",
          unit: "FD",
          prompt: "Flight day of reading (e.g., 14, 28)",
        },
      ],
    },
    {
      streamName: "Daily Exercise Log",
      inputPrompt: "aerobic_min, resistance_min, prescribed vs dialled load",
      sourceRef: "MEDB 5.2 / MR026L",
      recordSample: true,
      unit: "min",
      subfields: [
        {
          key: "aerobicMinutes",
          label: "Aerobic Duration (target 60)",
          fieldType: "number",
          unit: "min",
          prompt: "Aerobic session minutes today",
        },
        {
          key: "resistanceMinutes",
          label: "Resistance Duration (target 90)",
          fieldType: "number",
          unit: "min",
          prompt: "Resistance session minutes today",
        },
        {
          key: "prescribedLoadKg",
          label: "Prescribed Resistance Load",
          fieldType: "number",
          unit: "kg",
          prompt: "Prescribed target load (kg)",
        },
        {
          key: "actualLoadKg",
          label: "Actual Dialled Load",
          fieldType: "number",
          unit: "kg",
          prompt: "Actual dialled load (kg)",
        },
        {
          key: "hoursAfterMeal",
          label: "Hours After Meal (>=1.5h)",
          fieldType: "number",
          unit: "h",
          prompt: "Hours after meal at workout start",
        },
        {
          key: "hoursBeforeSleep",
          label: "Hours Before Sleep (>=2h)",
          fieldType: "number",
          unit: "h",
          prompt: "Hours before sleep at workout end",
        },
        {
          key: "reconditioningDayRPlus",
          label: "Postflight Day (Optional R+0..45)",
          fieldType: "number",
          unit: "R+d",
          prompt: "R+ day for 120 min/d reconditioning",
        },
        {
          key: "flightDay",
          label: "Session Flight Day",
          fieldType: "number",
          unit: "FD",
          prompt: "Flight day of session",
        },
      ],
    },
  ],
  outputSlots: {
    immediateHorizon: "Pre-test validity condition guard and active conditioning/cadence flags.",
    prolongedHorizon: "Low-N personal-baseline calf/grip trend, proxy bone-shield resistance adherence (DXA pre/post only), and meal/sleep timing.",
    etaSlot: "Projected days to ASSUMPTION conditioning threshold or overdue measurement cadence.",
    solutionsSlot: "1–2 deterministic conditioning actions (e.g., Complete morning calf check before breakfast).",
  },
  leadView: {
    summary: "Per-crew conditioning status (ON_TRACK / WATCH / ALERT), blocker categories, and team exercise discipline buff.",
    privacyRule: "Lead sees conditioning band and category flags only — no raw personal metrics or private notes.",
    modules: [
      {
        title: "Crew Conditioning & Atrophy Matrix",
        detail: "Summary conditioning band & adherence categories per crew member without exposing private raw values.",
        actionSlot: "Exercise & cadence tracking",
      },
      {
        title: "Team Exercise Discipline Buff",
        detail: "Aggregates anonymized 7d aerobic + resistance adherence across the crew.",
        actionSlot: "MEDB 5.2 150 min/d compliance",
      },
    ],
  },
  memberView: {
    summary: "Pre-test condition guard (caffeine/meal/strenuous exercise windows), personal low-N calf & grip baseline trend, and R+0..R+45 reconditioning card.",
    privacyRule: "All personal measurements and trends remain private to the crew member.",
    modules: [
      {
        title: "Pre-Test Condition Guard",
        detail: "Verifies pre-test fasting, caffeine abstinence, exercise buffers, and morning fasted calf sampling.",
        actionSlot: "MEDB 6.3 / MEDB 5.4 validity windows",
      },
      {
        title: "Atrophy, Proxy Bone-Shield & Return-to-Gravity Card",
        detail: "Daily 2.5h exercise adherence + postflight 120 min/day reconditioning card (in-flight bone loss is estimated via resistance loading; DXA is pre/post only).",
        actionSlot: "Daily aerobic/resistance session & morning fasted calf log",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=gravity", purpose: "Fetch persisted gravity records for scenario + character" },
    { method: "GET", path: "/api/hazard-samples?hazardSlug=gravity", purpose: "Fetch historical calf/grip/exercise time-series samples for linear trend projection" },
  ],
  alarmPreset: {
    title: "GRAVITY CONDITIONING ALERT — ATROPHY / ADHERENCE FLAG",
    severity: "WARNING",
    etaLabel: "Projected days to ASSUMPTION conditioning cutoff",
    descriptionSlot:
      "Calf atrophy, grip decline, or exercise resistance deficit crossed configured ASSUMPTION alert thresholds.",
    leadActions: [
      "1. Review crew exercise adherence compliance and overdue measurement flags.",
      "2. Adjust workload to protect daily 150 min MEDB 5.2 aerobic + resistance block.",
    ],
    memberActions: [
      "1. Complete overdue morning fasted calf volume + body mass measurement.",
      "2. Prioritize full 90-min resistance session >=2h before sleep.",
    ],
  },
  evaluate: evaluateGravityHazard,
};
