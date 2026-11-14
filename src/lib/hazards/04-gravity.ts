import type { CrewSlot, MissionProfile, UserRole } from "../domain";
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
 * HAZARD 4: GRAVITY FIELDS
 * Owner: Teammate 4 — Edit ONLY src/lib/hazards/04-gravity.ts and
 *   src/components/hazards/04-gravity.tsx.
 *
 * Implements two deterministic, NASA-grounded engines (zero ML):
 *   1. Autonomous Pre-EVA Readiness Gate & Condition Guard
 *      (MR081L, MEDB 6.1/6.2, MEDB 6.3, MR087L, MR090L, MEDB 5.2 PFE)
 *   2. Microgravity Atrophy, Proxy Bone-Shield & Exercise Adherence Engine
 *      (MEDB 5.2, MEDB 5.4, MEDB 1.13, MR081L, MEDB 1.11, MR026L)
 * ============================================================================
 */

// [SECTION 1: HAZARD 4 VALUES & THRESHOLD SLOTS]
// Replace or extend constants here for Gravity Fields only.
export const GRAVITY_PIPELINE_VALUES = {
  supportedStreams: [
    "EVA Readiness Chain",
    "Pre-Test Conditions",
    "Handgrip & Calf Volume",
    "Daily Exercise Log",
  ] as const,

  // NASA MRID/MEDB documented schedule & operational rules (what/when/how)
  schedule: {
    gripFirstFlightDay: 14, // MR081L: FD14, then every 30 days
    gripCadenceDays: 30,
    gripPreEvaMinDays: 10, // MR081L: EVA minus 14d to 10d (+/-2d flexibility)
    gripPreEvaMaxDays: 14,
    gripPreEvaFlexDays: 2,
    gripLockoutHoursBeforeEva: 24, // MR081L: no handgrip test within 24h of EVA

    calfFirstLaunchPlusDays: 14, // MEDB 5.4: L+14, then every 14 days
    calfCadenceDays: 14,

    armErgometryAfterFlightDay: 21, // MEDB 6.3: required before EVA after FD21
    armErgometryRecencySkipDays: 14, // MEDB 6.3: not needed if prior EVA <= 14d ago

    preEvaHealthStatusMaxHours: 48, // MEDB 6.1: <= 48h before suit donning
    postEvaHealthStatusMaxHours: 24, // MEDB 6.1: <= 24h after suit doffing
    prebreathePracticeLeadDays: 7, // MR087L: ~1 week prior to EVA
    prebreatheVo2TolerancePct: 10, // MR087L: within +/-10% of target VO2

    // MR087L PFE timing rule has a documented ambiguity (14d/30d vs 2+/-1 weeks); configurable here
    pfeMaxAgeDaysDefault: 30,
    pfeMaxAgeDaysPreFd90: 14,

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
  },
} as const;

// [SECTION 2: HAZARD 4 FORMULAS & EVALUATION PIPELINE]

type PayloadMap = Record<string, unknown>;
export type EvaGateDecision = "GO" | "CONDITIONAL" | "NO-GO";

export interface EvaReadinessInput {
  currentFlightDay: number | null;
  hoursToPlannedEva: number | null;
  daysSinceLastEva: number | null;
  suitType: "EMU" | "ORLAN" | null;
  pfeDaysAgo: number | null;
  preEvaGripTaken: boolean | null;
  armErgometryCompleted: boolean | null;
  prebreatheVerifiedPct: number | null;
  preEvaHealthStatusHoursAgo: number | null;
  islePreflightCompleted: boolean | null;
  symptomNote: string;
}

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
  latestPctChange: number;
  slopePctPerDay: number;
  etaDaysToThreshold: number | null;
  etaMinDays: number | null;
  etaMaxDays: number | null;
  series: Array<{ label: string; value: number }>;
}

export interface EvaChainCheckItem {
  id: string;
  label: string;
  medbRef: string;
  status: "PASS" | "BLOCKER" | "LOCKOUT" | "PENDING" | "NA";
  detail: string;
}

export interface PreTestConditionCheckItem {
  id: string;
  label: string;
  requirement: string;
  status: "VALID" | "VIOLATED" | "UNLOGGED";
  detail: string;
}

export type ConditioningStatusLabel = "ON_TRACK" | "WATCH" | "ALERT" | "UNLOGGED";

export interface EvaGateEvaluation {
  decision: EvaGateDecision;
  hasAnyInput: boolean;
  blockers: string[];
  conditionViolations: string[];
  chainChecks: EvaChainCheckItem[];
  conditionChecks: PreTestConditionCheckItem[];
  nearestDeadlineHours: number | null;
  nearestDeadlineLabel: string;
  noteCategory: string | null;
  actions: string[];
}

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
  evaInput: EvaReadinessInput;
  condInput: PreTestConditionInput;
  evaGate: EvaGateEvaluation;
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
  readinessState: CrewSlot["readinessState"];
  evaDecision: EvaGateDecision;
  status: HazardEvaluationResult["status"];
  blockerCategories: string[];
  conditionFlagCount: number;
  nearestDeadlineLabel: string;
  adherencePct: number | null;
  conditioningStatus: ConditioningStatusLabel;
  reconditioningDayRPlus: number | null;
}

export interface GravityCrewOverview {
  goCount: number;
  conditionalCount: number;
  noGoCount: number;
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

function readStr(payload: PayloadMap | undefined, key: string): string {
  if (!payload) return "";
  const val = payload[key];
  return typeof val === "string" ? val.trim() : typeof val === "number" ? String(val) : "";
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

function parseEvaReadinessInput(
  records: HazardDataRecord[],
  actorInputs: Record<string, string>
): EvaReadinessInput {
  const p = resolveStreamPayload("EVA Readiness Chain", records, actorInputs);
  const rawSuit = (readStr(p, "suitType") || readStr(p, "suit_type")).toUpperCase();
  const suitType: "EMU" | "ORLAN" | null =
    rawSuit === "EMU" ? "EMU" : rawSuit === "ORLAN" ? "ORLAN" : null;

  return {
    currentFlightDay: readNum(p, "currentFlightDay") ?? readNum(p, "current_flight_day"),
    hoursToPlannedEva: readNum(p, "hoursToPlannedEva") ?? readNum(p, "hours_to_eva"),
    daysSinceLastEva: readNum(p, "daysSinceLastEva") ?? readNum(p, "days_since_last_eva"),
    suitType,
    pfeDaysAgo: readNum(p, "pfeDaysAgo") ?? readNum(p, "pfe_days_ago"),
    preEvaGripTaken: readBoolChoice(p, "preEvaGripTaken") ?? readBoolChoice(p, "pre_eva_grip_taken"),
    armErgometryCompleted:
      readBoolChoice(p, "armErgometryCompleted") ?? readBoolChoice(p, "arm_ergometry"),
    prebreatheVerifiedPct:
      readNum(p, "prebreatheVerifiedPct") ?? readNum(p, "prebreathe_vo2_pct"),
    preEvaHealthStatusHoursAgo:
      readNum(p, "preEvaHealthStatusHoursAgo") ?? readNum(p, "health_status_hours_ago"),
    islePreflightCompleted:
      readBoolChoice(p, "islePreflightCompleted") ?? readBoolChoice(p, "isle_trained"),
    symptomNote:
      readStr(p, "symptomNote") ||
      readStr(p, "note") ||
      (Object.keys(p).length === 0 ? (actorInputs["EVA Readiness Chain"] ?? "") : ""),
  };
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
 * Deterministic keyword fallback classifier for free-text symptom notes
 * (per Section 6.6 of 04-gravity-fields-enviroments.md).
 */
function classifyPreEvaSymptomNote(note: string): string | null {
  const clean = note.trim().toLowerCase();
  if (!clean) return null;
  if (/(shoulder|arm|wrist|hand|joint|back|knee|muscle|pain|strain|ache|stiff)/.test(clean)) {
    return "Musculoskeletal / Joint Symptom (requires CMO/Flight Note review before suit donning, MEDB 6.1)";
  }
  if (/(dizzy|dizziness|vertigo|lightheaded|nausea|balance|orthostatic)/.test(clean)) {
    return "Vestibular / Orthostatic Symptom (hold EVA & escalate to CMO/ground when link restores)";
  }
  if (/(fatigue|exhaust|chest|shortness|breath|palpitation|tingling|numb)/.test(clean)) {
    return "Exertion / Decompression Review Needed (uncertain — escalate to CMO per MEDB 6.1)";
  }
  return "Unclassified Crew Note (escalate to CMO / ground Flight Surgeon when link is available)";
}

/**
 * Evaluates Feature 1: Pre-EVA Readiness Gate & Condition Guard.
 */
function evaluatePreEvaGate(
  eva: EvaReadinessInput,
  cond: PreTestConditionInput,
  actorEvaState: "GO" | "CONDITIONAL" | "NO-GO"
): EvaGateEvaluation {
  const S = GRAVITY_PIPELINE_VALUES.schedule;
  const C = GRAVITY_PIPELINE_VALUES.preTestConditions;

  const hasAnyInput =
    eva.currentFlightDay !== null ||
    eva.hoursToPlannedEva !== null ||
    eva.suitType !== null ||
    eva.pfeDaysAgo !== null ||
    eva.preEvaGripTaken !== null ||
    eva.armErgometryCompleted !== null ||
    eva.prebreatheVerifiedPct !== null ||
    eva.preEvaHealthStatusHoursAgo !== null ||
    eva.islePreflightCompleted !== null ||
    eva.symptomNote.length > 0;

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

  const noteCategory = classifyPreEvaSymptomNote(eva.symptomNote);

  const pfeLimitDays =
    eva.currentFlightDay !== null && eva.currentFlightDay <= 90
      ? S.pfeMaxAgeDaysPreFd90
      : S.pfeMaxAgeDaysDefault;
  const hoursToEva = eva.hoursToPlannedEva;
  const daysToEva = hoursToEva !== null ? hoursToEva / 24 : null;
  const armRequired =
    eva.currentFlightDay !== null &&
    eva.currentFlightDay > S.armErgometryAfterFlightDay &&
    (eva.daysSinceLastEva === null || eva.daysSinceLastEva > S.armErgometryRecencySkipDays);
  const prebreatheRequired = eva.suitType !== "ORLAN";

  const buildChainChecks = (opts: {
    armInvalidated: boolean;
    prebreatheInvalidated: boolean;
    prebreathePending7d: boolean;
    healthDueWithin48h: boolean;
  }): EvaChainCheckItem[] => [
    {
      id: "isle",
      label: "ISLE Preflight Training",
      medbRef: "MR090L",
      status:
        eva.islePreflightCompleted === false
          ? "BLOCKER"
          : eva.islePreflightCompleted === true
          ? "PASS"
          : "PENDING",
      detail:
        eva.islePreflightCompleted === true
          ? "Preflight ISLE completed"
          : eva.islePreflightCompleted === false
          ? "ISLE preflight prerequisite missing (Hard NO-GO)"
          : "Awaiting telemetry",
    },
    {
      id: "pfe",
      label: "Periodic Fitness Evaluation (PFE)",
      medbRef: "MEDB 5.2 / MR087L",
      status:
        eva.pfeDaysAgo === null
          ? "PENDING"
          : eva.pfeDaysAgo > pfeLimitDays
          ? "BLOCKER"
          : "PASS",
      detail:
        eva.pfeDaysAgo === null
          ? `Awaiting PFE recency (limit ${pfeLimitDays}d)`
          : `${eva.pfeDaysAgo}d ago (limit <= ${pfeLimitDays}d)`,
    },
    {
      id: "grip",
      label: "Pre-EVA Handgrip Window (EVA-14..10d)",
      medbRef: "MR081L",
      status:
        hoursToEva !== null && hoursToEva < S.gripLockoutHoursBeforeEva && eva.preEvaGripTaken === false
          ? "LOCKOUT"
          : eva.preEvaGripTaken === false
          ? "BLOCKER"
          : eva.preEvaGripTaken === true
          ? "PASS"
          : "PENDING",
      detail:
        hoursToEva !== null && hoursToEva < S.gripLockoutHoursBeforeEva && eva.preEvaGripTaken === false
          ? `Locked out inside <24h pre-EVA (${hoursToEva.toFixed(1)}h left)`
          : eva.preEvaGripTaken === true
          ? "Completed; <24h lockout preserved"
          : eva.preEvaGripTaken === false
          ? "Pending in EVA-14..10d (+/-2d) window"
          : "Awaiting telemetry",
    },
    {
      id: "arm",
      label: "Arm Ergometry (Post-FD21)",
      medbRef: "MEDB 6.3",
      status: !armRequired
        ? "NA"
        : eva.armErgometryCompleted === false || opts.armInvalidated
        ? "BLOCKER"
        : eva.armErgometryCompleted === true
        ? "PASS"
        : "PENDING",
      detail: !armRequired
        ? eva.currentFlightDay !== null && eva.currentFlightDay <= S.armErgometryAfterFlightDay
          ? `Not required until after FD${S.armErgometryAfterFlightDay}`
          : `Skipped (prior EVA <= ${S.armErgometryRecencySkipDays}d ago)`
        : opts.armInvalidated
        ? "Invalidated by pre-test condition violation"
        : eva.armErgometryCompleted === true
        ? `Valid (${eva.suitType === "ORLAN" ? "Protocol B 50W->150W" : "Protocol A 40W->80W"})`
        : "Pending completion",
    },
    {
      id: "prebreathe",
      label: "EVA Exercise Prebreathe VO2",
      medbRef: "MR087L",
      status: !prebreatheRequired
        ? "NA"
        : opts.prebreatheInvalidated
        ? "BLOCKER"
        : opts.prebreathePending7d
        ? "BLOCKER"
        : eva.prebreatheVerifiedPct !== null
        ? "PASS"
        : "PENDING",
      detail: !prebreatheRequired
        ? "Not required for ORLAN suit"
        : eva.prebreatheVerifiedPct !== null
        ? `${eva.prebreatheVerifiedPct}% of target (+/-${S.prebreatheVo2TolerancePct}% band)${opts.prebreatheInvalidated ? " — flagged" : ""}`
        : opts.prebreathePending7d
        ? "Pending inside ~7d pre-EVA window"
        : "Target +/-10% VO2 at 75% stage",
    },
    {
      id: "health",
      label: "Pre-EVA Health Status (ROS + Exam)",
      medbRef: "MEDB 6.1",
      status: opts.healthDueWithin48h
        ? "BLOCKER"
        : eva.preEvaHealthStatusHoursAgo !== null &&
          eva.preEvaHealthStatusHoursAgo <= S.preEvaHealthStatusMaxHours
        ? "PASS"
        : "PENDING",
      detail: opts.healthDueWithin48h
        ? `Due within <=${S.preEvaHealthStatusMaxHours}h of suit donning`
        : eva.preEvaHealthStatusHoursAgo !== null
        ? `Exam logged ${eva.preEvaHealthStatusHoursAgo}h ago`
        : "Due <=48h prior to suit donning",
    },
    {
      id: "flight-note",
      label: "Flight Note / Symptom Screen",
      medbRef: "MEDB 6.1",
      status: noteCategory ? "BLOCKER" : hasAnyInput ? "PASS" : "PENDING",
      detail: noteCategory ?? "No clinical symptom flag raised",
    },
  ];

  if (!hasAnyInput) {
    return {
      decision: actorEvaState,
      hasAnyInput: false,
      blockers: [],
      conditionViolations,
      chainChecks: buildChainChecks({
        armInvalidated: false,
        prebreatheInvalidated: false,
        prebreathePending7d: false,
        healthDueWithin48h: false,
      }),
      conditionChecks,
      nearestDeadlineHours: null,
      nearestDeadlineLabel: "Awaiting EVA plan & pre-EVA test telemetry",
      noteCategory,
      actions: [
        "Sync EVA schedule (hours to suit donning, flight day) and pre-test conditions to compute live EVA Gate.",
      ],
    };
  }

  const blockers: string[] = [];
  const pendingActions: Array<{ priorityHours: number; text: string }> = [];
  let hardNoGo = false;

  // 1. ISLE preflight prerequisite (MR090L)
  if (eva.islePreflightCompleted === false) {
    hardNoGo = true;
    blockers.push("ISLE preflight training incomplete (MR090L prerequisite)");
    pendingActions.push({
      priorityHours: 0,
      text: "Hold EVA assignment: ISLE preflight prerequisite (MR090L) is flagged incomplete.",
    });
  }

  // 2. PFE cycle test recency (MEDB 5.2 / MR087L — configurable window)
  if (eva.pfeDaysAgo !== null && eva.pfeDaysAgo > pfeLimitDays) {
    hardNoGo = true;
    blockers.push(`PFE cycle test expired (${eva.pfeDaysAgo}d ago > ${pfeLimitDays}d configurable limit)`);
    pendingActions.push({
      priorityHours: 6,
      text: `Complete Periodic Fitness Evaluation (PFE) cycle test before EVA (last done ${eva.pfeDaysAgo}d ago).`,
    });
  }

  // 3. Handgrip window & 24h lockout (MR081L)
  if (hoursToEva !== null && hoursToEva < S.gripLockoutHoursBeforeEva && eva.preEvaGripTaken === false) {
    hardNoGo = true;
    blockers.push("Handgrip test missing inside 24h pre-EVA lockout (MR081L prohibits testing <24h)");
    pendingActions.push({
      priorityHours: Math.max(0, hoursToEva),
      text: "DO NOT perform handgrip test within 24h of EVA (MR081L lockout); escalate missing test to Lead/CMO.",
    });
  } else if (eva.preEvaGripTaken === false) {
    const windowCloseDays = S.gripPreEvaMinDays - S.gripPreEvaFlexDays; // EVA - 8d
    const hoursLeftInWindow =
      daysToEva !== null ? Math.max(0, (daysToEva - windowCloseDays) * 24) : 24;
    if (daysToEva !== null && daysToEva < windowCloseDays) {
      blockers.push("Pre-EVA handgrip window (EVA-14..10d +/-2d) missed; >24h remaining allows recovery-safe test");
    } else {
      blockers.push("Pre-EVA handgrip test (MR081L) pending in EVA-14..10d (+/-2d) window");
    }
    pendingActions.push({
      priorityHours: hoursLeftInWindow,
      text: "Complete Handgrip Dynamometry (MR081L: 3x5s max contractions, 60s rest) at least 24h before EVA.",
    });
  }

  // 4. Arm ergometry applicability & conditions (MEDB 6.3)
  let armInvalidated = false;
  if (armRequired) {
    if (eva.armErgometryCompleted === false) {
      blockers.push("Arm ergometry required after FD21 (MEDB 6.3 — note: not a cardiac screening tool)");
      pendingActions.push({
        priorityHours: hoursToEva !== null ? Math.max(1, hoursToEva - 24) : 24,
        text: `Run Arm Ergometry (${eva.suitType === "ORLAN" ? "Protocol B: 50W->150W" : "Protocol A: 40W->80W"}, MEDB 6.3) once pre-test conditions are clean.`,
      });
    } else if (eva.armErgometryCompleted === true && conditionViolations.length > 0) {
      armInvalidated = true;
      blockers.push("Arm ergometry invalidated by pre-test condition violation (conditions_met = false)");
      pendingActions.push({
        priorityHours: 8,
        text: `Retake Arm Ergometry (MEDB 6.3) under clean conditions (${conditionViolations[0]}).`,
      });
    }
  }

  // 5. EVA Exercise Prebreathe verification (MR087L: within +/-10% of target VO2)
  let prebreatheInvalidated = false;
  let prebreathePending7d = false;
  if (prebreatheRequired && eva.prebreatheVerifiedPct !== null) {
    const dev = Math.abs(eva.prebreatheVerifiedPct - 100);
    if (dev > S.prebreatheVo2TolerancePct) {
      hardNoGo = true;
      prebreatheInvalidated = true;
      blockers.push(
        `Prebreathe VO2 (${eva.prebreatheVerifiedPct}% of target) outside +/-${S.prebreatheVo2TolerancePct}% verification band (MR087L)`
      );
      pendingActions.push({
        priorityHours: hoursToEva ?? 12,
        text: "Re-verify EVA prebreathe practice (MR087L) so last-2-min VO2 at 75% stage is within +/-10% of target.",
      });
    } else if (conditionViolations.length > 0) {
      prebreatheInvalidated = true;
      blockers.push("Prebreathe cycle test flagged with pre-test condition violation (MR087L)");
    }
  } else if (prebreatheRequired && hoursToEva !== null && hoursToEva <= S.prebreathePracticeLeadDays * 24 && eva.prebreatheVerifiedPct === null) {
    prebreathePending7d = true;
    blockers.push("Prebreathe practice verification pending (~7d pre-EVA target, MR087L)");
    pendingActions.push({
      priorityHours: Math.max(1, hoursToEva - 24),
      text: "Complete EMU prebreathe exercise verification (MR087L) under clean pre-test conditions.",
    });
  }

  // 6. Pre-EVA Health Status <= 48h before suit donning (MEDB 6.1)
  let healthDueWithin48h = false;
  if (hoursToEva !== null && hoursToEva <= S.preEvaHealthStatusMaxHours) {
    if (
      eva.preEvaHealthStatusHoursAgo === null ||
      eva.preEvaHealthStatusHoursAgo > S.preEvaHealthStatusMaxHours
    ) {
      healthDueWithin48h = true;
      if (hoursToEva <= 2) hardNoGo = true;
      blockers.push("Pre-EVA health status (ROS + brief skin/extremity exam) due within 48h of suit donning (MEDB 6.1)");
      pendingActions.push({
        priorityHours: Math.max(0, hoursToEva),
        text: `Complete MEDB 6.1 Pre-EVA Health Status check immediately (${hoursToEva.toFixed(1)}h left before suit donning).`,
      });
    }
  } else if (hoursToEva !== null) {
    pendingActions.push({
      priorityHours: hoursToEva - S.preEvaHealthStatusMaxHours,
      text: `Pre-EVA Health Status (MEDB 6.1) 48h window opens in ${(hoursToEva - S.preEvaHealthStatusMaxHours).toFixed(0)}h.`,
    });
  }

  if (noteCategory) {
    blockers.push(noteCategory);
    pendingActions.push({
      priorityHours: 1,
      text: `Flag symptom note for CMO / Flight Note review before suit donning (${noteCategory.split("(")[0].trim()}).`,
    });
  }

  // Determine nearest deadline & final decision
  let nearestDeadlineHours: number | null = null;
  let nearestDeadlineLabel = "No pending pre-EVA deadline";
  if (hoursToEva !== null) {
    if (healthDueWithin48h) {
      nearestDeadlineHours = Math.max(0, hoursToEva);
      nearestDeadlineLabel = `${nearestDeadlineHours.toFixed(1)}h until suit donning (MEDB 6.1 <=48h health check due)`;
    } else if (eva.preEvaGripTaken === false && hoursToEva > S.gripLockoutHoursBeforeEva) {
      const hoursToLockout = hoursToEva - S.gripLockoutHoursBeforeEva;
      nearestDeadlineHours = hoursToLockout;
      nearestDeadlineLabel = `${hoursToLockout.toFixed(1)}h until 24h Handgrip lockout (MR081L)`;
    } else {
      nearestDeadlineHours = Math.max(0, hoursToEva);
      nearestDeadlineLabel = `${nearestDeadlineHours.toFixed(1)}h to scheduled EVA suit donning`;
    }
  }

  const decision: EvaGateDecision = hardNoGo
    ? "NO-GO"
    : blockers.length > 0 || conditionViolations.length > 0
    ? "CONDITIONAL"
    : "GO";

  pendingActions.sort((a, b) => a.priorityHours - b.priorityHours);
  const actions = pendingActions.map((a) => a.text);

  return {
    decision,
    hasAnyInput: true,
    blockers,
    conditionViolations,
    chainChecks: buildChainChecks({
      armInvalidated,
      prebreatheInvalidated,
      prebreathePending7d,
      healthDueWithin48h,
    }),
    conditionChecks,
    nearestDeadlineHours,
    nearestDeadlineLabel,
    noteCategory,
    actions,
  };
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
    const maxGripKg = readNum(sp, "maxGripKg") ?? (s.numericValue ?? null);
    const calfVolumeValue = readNum(sp, "calfVolumeValue");
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

/**
 * Computes transparent OLS linear fit over % change from personal first-valid baseline.
 * Never presented as ML; explicitly exposes sampleSize N and confidence bounds.
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

  if (n < GRAVITY_PIPELINE_VALUES.assumptions.minPointsForRegression) {
    return {
      sampleSize: n,
      baselineValue,
      latestValue: points[n - 1].value,
      latestPctChange: latest.y,
      slopePctPerDay: 0,
      etaDaysToThreshold: null,
      etaMinDays: null,
      etaMaxDays: null,
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
      latestPctChange: latest.y,
      slopePctPerDay: 0,
      etaDaysToThreshold: null,
      etaMinDays: null,
      etaMaxDays: null,
      series: pctPoints.map((p) => ({ label: p.label, value: Number(p.y.toFixed(2)) })),
    };
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let etaDaysToThreshold: number | null = null;
  let etaMinDays: number | null = null;
  let etaMaxDays: number | null = null;

  if (slope < -0.001) {
    const crossDay = (thresholdPct - intercept) / slope;
    etaDaysToThreshold = Math.max(0, Math.round(crossDay - currentFlightDay));

    if (n >= GRAVITY_PIPELINE_VALUES.assumptions.minPointsForConfidenceInterval) {
      const sse = pctPoints.reduce((acc, p) => {
        const pred = slope * p.x + intercept;
        return acc + (p.y - pred) ** 2;
      }, 0);
      const slopeSe = Math.sqrt(sse / (n - 2) / sxx);
      const steeperSlope = slope - slopeSe;
      const shallowerSlope = slope + slopeSe;

      if (steeperSlope < -0.001) {
        etaMinDays = Math.max(0, Math.round((thresholdPct - intercept) / steeperSlope - currentFlightDay));
      }
      if (shallowerSlope < -0.001) {
        etaMaxDays = Math.max(0, Math.round((thresholdPct - intercept) / shallowerSlope - currentFlightDay));
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
    latestPctChange: latest.y,
    slopePctPerDay: slope,
    etaDaysToThreshold,
    etaMinDays,
    etaMaxDays,
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

/**
 * Evaluates Feature 2: Microgravity Atrophy, Proxy Bone-Shield & Exercise Adherence Engine.
 */
function evaluateAtrophyAndConditioning(
  eva: EvaReadinessInput,
  cond: PreTestConditionInput,
  records: HazardDataRecord[],
  samples: HazardSampleRecord[],
  actorInputs: Record<string, string>,
  reentryMode: boolean
): AtrophyEvaluation {
  const S = GRAVITY_PIPELINE_VALUES.schedule;
  const A = GRAVITY_PIPELINE_VALUES.assumptions;

  const { validCalfPoints, validGripPoints, invalidCalfSamplesCount } = parseAnthropometricSamples(
    records,
    samples,
    actorInputs,
    cond
  );

  const inferredFlightDay =
    eva.currentFlightDay ??
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
    eva.currentFlightDay !== null && validCalfPoints.length > 0
      ? Math.max(0, eva.currentFlightDay - (validCalfPoints[validCalfPoints.length - 1].day + S.calfCadenceDays))
      : null;

  const gripDaysOverdue =
    eva.currentFlightDay !== null && validGripPoints.length > 0
      ? Math.max(0, eva.currentFlightDay - (validGripPoints[validGripPoints.length - 1].day + S.gripCadenceDays))
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
    const recondDay = latestRecond?.reconditioningDayRPlus ?? null;
    const recondPct =
      recondDay !== null || reentryMode ? (totalAvg / S.reconditioningDailyTargetMin) * 100 : null;

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

  if (calfTrend && calfTrend.latestPctChange <= A.calfAtrophyAlertPct) {
    alerts.push(
      `Calf volume ${calfTrend.latestPctChange.toFixed(1)}% vs L+14 baseline (crossed ${A.calfAtrophyAlertPct}% [ASSUMPTION] across N=${calfTrend.sampleSize} pts)`
    );
  } else if (calfTrend?.etaDaysToThreshold !== null && calfTrend?.etaDaysToThreshold !== undefined) {
    const ci =
      calfTrend.etaMinDays !== null && calfTrend.etaMaxDays !== null
        ? ` [CI: ${calfTrend.etaMinDays}–${calfTrend.etaMaxDays}d]`
        : "";
    alerts.push(
      `Calf volume trending ${(calfTrend.slopePctPerDay * 7).toFixed(1)}%/wk; reaches ${A.calfAtrophyAlertPct}% [ASSUMPTION] in ~${calfTrend.etaDaysToThreshold}d${ci} (low-N fit, N=${calfTrend.sampleSize})`
    );
  }

  if (gripTrend && gripTrend.latestPctChange <= A.gripDeclineAlertPct) {
    alerts.push(
      `Handgrip ${gripTrend.latestPctChange.toFixed(1)}% vs FD14 baseline (crossed ${A.gripDeclineAlertPct}% [ASSUMPTION], N=${gripTrend.sampleSize} pts)`
    );
  }

  if (adherenceSummary) {
    if (adherenceSummary.reconditioningDayRPlus !== null || reentryMode) {
      const rDay = adherenceSummary.reconditioningDayRPlus ?? 0;
      const pct = adherenceSummary.reconditioningPct ?? adherenceSummary.overallPct;
      if (rDay <= S.reconditioningDurationDays && pct < A.weeklyAdherenceAlertPct) {
        alerts.push(
          `Return-to-gravity R+${rDay}/${S.reconditioningDurationDays} reconditioning at ${pct}% of 120 min/day target (MR026L)`
        );
        actions.push("Complete 120 min/day MR026L postflight reconditioning block (recovery benchmark: ~2% of baseline, MEDB 1.11).");
      }
    } else if (adherenceSummary.resistancePct < A.weeklyAdherenceAlertPct) {
      alerts.push(
        `Resistance loading adherence ${adherenceSummary.resistancePct}% (<${A.weeklyAdherenceAlertPct}% [ASSUMPTION]) — elevated estimated bone unloading risk (DXA pre/post only, MEDB 1.11)`
      );
      actions.push("Prioritize full 90-min resistance session today to protect bone loading (MEDB 5.2 / MEDB 1.11).");
    }

    if (adherenceSummary.sleepViolations > 0) {
      alerts.push(
        `Exercise ended <2h before sleep in ${adherenceSummary.sleepViolations} session(s) (MEDB 5.2 sleep protection rule)`
      );
      actions.push("Shift daily workout end time to >=2h prior to scheduled sleep and >=90m after meals (MEDB 5.2).");
    } else if (adherenceSummary.mealViolations > 0) {
      alerts.push(
        `Exercise started <90 min after meal in ${adherenceSummary.mealViolations} session(s) (MEDB 5.2)`
      );
    }
  }

  const etaDays = calfTrend?.etaDaysToThreshold ?? gripTrend?.etaDaysToThreshold ?? null;
  let etaLabel = "Log >=2 valid baseline measurements (L+14 / FD14) for trend projection";
  if (calfDaysOverdue !== null && calfDaysOverdue > 0) {
    etaLabel = `Calf measurement overdue by ${calfDaysOverdue}d (next valid window: morning pre-breakfast)`;
  } else if (etaDays !== null) {
    etaLabel = `~${etaDays} days until conditioning threshold [ASSUMPTION]`;
  } else if (adherenceSummary) {
    etaLabel = `Weekly adherence ${adherenceSummary.overallPct}% (target 150 min/d, MEDB 5.2)`;
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
  actorInputs: Record<string, string>
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
          label: "Atrophy Alert [ASSUMPTION]",
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
          label: "Decline Alert [ASSUMPTION]",
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
    const isReconditioning = atrophy.adherenceSummary?.reconditioningDayRPlus !== null &&
      atrophy.adherenceSummary?.reconditioningDayRPlus !== undefined;
    charts.push({
      id: "gravity-exercise-daily-min",
      title: isReconditioning
        ? `Postflight Reconditioning Volume (MR026L R+${atrophy.adherenceSummary?.reconditioningDayRPlus}, target ${S.reconditioningDailyTargetMin} min)`
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
              label: "80% Watch [ASSUMPTION]",
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
      title: "Crew Exercise Discipline Adherence (RBAC-Safe, MEDB 5.2 / MR026L)",
      unit: "%",
      series: loggedMembers.map((m) => ({
        label: m.callsign.split("—")[0]?.trim() || m.callsign,
        value: m.adherencePct ?? 0,
      })),
      thresholds: [
        {
          label: "Team Buff [ASSUMPTION]",
          value: GRAVITY_PIPELINE_VALUES.assumptions.weeklyAdherenceAlertPct,
          color: "#10b981",
        },
      ],
    },
  ];
}

function computeConditioningStatus(
  atrophy: AtrophyEvaluation,
  status: HazardEvaluationResult["status"]
): ConditioningStatusLabel {
  if (!atrophy.hasAnyAnthropometric && !atrophy.hasAnyExercise) {
    return "UNLOGGED";
  }
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
  if (
    status === "CRITICAL" ||
    (atrophy.calfTrend && atrophy.calfTrend.latestPctChange <= A.calfAtrophyAlertPct) ||
    (atrophy.gripTrend && atrophy.gripTrend.latestPctChange <= A.gripDeclineAlertPct)
  ) {
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
  reentryMode: boolean;
}): GravityActorDiagnostics {
  const { actor, role, actorInputs, reentryMode } = options;
  const hazardRecords = [...options.hazardRecords];
  const hazardSamples = [...options.hazardSamples];
  const allHazardRecords = [...options.allHazardRecords];

  const rawEvaInput = parseEvaReadinessInput(hazardRecords, actorInputs);
  const evaInput: EvaReadinessInput =
    role === "lead" ? { ...rawEvaInput, symptomNote: "" } : rawEvaInput;
  const condInput = parsePreTestConditions(hazardRecords, actorInputs);
  const evaGate = evaluatePreEvaGate(evaInput, condInput, actor.evaGateState);
  const atrophy = evaluateAtrophyAndConditioning(
    evaInput,
    condInput,
    hazardRecords,
    hazardSamples,
    actorInputs,
    reentryMode
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
  if (
    evaGate.decision === "NO-GO" ||
    actor.readinessState === "HOLD" ||
    (atrophy.calfTrend && atrophy.calfTrend.latestPctChange <= GRAVITY_PIPELINE_VALUES.assumptions.calfAtrophyAlertPct) ||
    (atrophy.gripTrend && atrophy.gripTrend.latestPctChange <= GRAVITY_PIPELINE_VALUES.assumptions.gripDeclineAlertPct)
  ) {
    status = "CRITICAL";
  } else if (
    evaGate.decision === "CONDITIONAL" ||
    atrophy.alerts.length > 0 ||
    actor.readinessState === "CONDITIONAL"
  ) {
    status = "ELEVATED";
  }

  const conditioningStatus = computeConditioningStatus(atrophy, status);

  return {
    role,
    status,
    evaInput,
    condInput,
    evaGate,
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
  reentryMode: boolean;
}): GravityActorDiagnostics {
  return computeGravityDiagnosticsCore({
    actor: options.actor,
    role: options.role,
    actorInputs: options.actorInputs ?? {},
    hazardRecords: [...options.hazardRecords],
    hazardSamples: [...options.hazardSamples],
    allHazardRecords: [...(options.allHazardRecords ?? options.hazardRecords)],
    reentryMode: options.reentryMode,
  });
}

/**
 * Privacy-safe crew-wide EVA Flight Note & Exercise Discipline overview for Crew Lead.
 * Expects sanitized scenario records/samples (private notes & personal raw biomarkers omitted).
 */
export function evaluateGravityCrewOverview(
  mission: MissionProfile,
  scenarioRecords: readonly HazardDataRecord[],
  scenarioSamples: readonly HazardSampleRecord[],
  reentryMode: boolean
): GravityCrewOverview {
  const A = GRAVITY_PIPELINE_VALUES.assumptions;
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
      reentryMode,
    });

    const adherencePct = diag.atrophy.adherenceSummary
      ? (diag.atrophy.adherenceSummary.reconditioningPct ?? diag.atrophy.adherenceSummary.overallPct)
      : null;

    return {
      id: member.id,
      callsign: member.callsign,
      assignedRoleTitle: member.assignedRoleTitle,
      isLeadSlot: member.isLeadSlot,
      readinessState: member.readinessState,
      evaDecision: diag.evaGate.decision,
      status: diag.status,
      blockerCategories: diag.evaGate.blockers,
      conditionFlagCount: diag.evaGate.conditionViolations.length,
      nearestDeadlineLabel: diag.evaGate.nearestDeadlineLabel,
      adherencePct,
      conditioningStatus: diag.conditioningStatus,
      reconditioningDayRPlus: diag.atrophy.adherenceSummary?.reconditioningDayRPlus ?? null,
    };
  });

  const goCount = members.filter((m) => m.evaDecision === "GO").length;
  const conditionalCount = members.filter((m) => m.evaDecision === "CONDITIONAL").length;
  const noGoCount = members.filter((m) => m.evaDecision === "NO-GO").length;
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
    goCount,
    conditionalCount,
    noGoCount,
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
    reentryMode,
  } = input;

  const effectiveRole: UserRole = role ?? (actor.isLeadSlot ? "lead" : "member");
  const diag = computeGravityDiagnosticsCore({
    actor,
    role: effectiveRole,
    actorInputs,
    hazardRecords,
    hazardSamples,
    allHazardRecords,
    reentryMode,
  });
  const { evaGate, atrophy, status, sleepCrossNote, conditioningStatus } = diag;

  // Immediate Horizon: Feature 1 (EVA Gate)
  const immediateHorizon = evaGate.hasAnyInput
    ? `EVA Gate: ${evaGate.decision} | ${
        evaGate.blockers.length > 0
          ? `Blockers (${evaGate.blockers.length}): ${evaGate.blockers.join("; ")}`
          : "All applicable pre-EVA chain checks satisfied"
      }${evaGate.conditionViolations.length > 0 ? ` | Pre-test condition flags: ${evaGate.conditionViolations.join("; ")}` : ""}`
    : `${gravityHazard.outputSlots.immediateHorizon} (Current character EVA state: ${actor.evaGateState})`;

  // Prolonged Horizon: Feature 2 (Role-aware RBAC output)
  const prolongedParts: string[] = [];
  if (effectiveRole === "lead") {
    if (conditioningStatus !== "UNLOGGED") {
      prolongedParts.push(`Conditioning Status: ${conditioningStatus} (RBAC masked raw anthropometrics)`);
    }
    if (atrophy.adherenceSummary) {
      prolongedParts.push(`Exercise Adherence: ${adherenceLabel(atrophy.adherenceSummary)}`);
    }
    if (atrophy.calfDaysOverdue !== null) {
      prolongedParts.push(`Category Flag: MEDB 5.4 calf check overdue (${atrophy.calfDaysOverdue}d)`);
    }
    if (atrophy.gripDaysOverdue !== null) {
      prolongedParts.push(`Category Flag: MR081L handgrip check overdue (${atrophy.gripDaysOverdue}d)`);
    }
  } else {
    if (atrophy.calfTrend) {
      prolongedParts.push(
        `Calf volume: ${atrophy.calfTrend.latestPctChange >= 0 ? "+" : ""}${atrophy.calfTrend.latestPctChange.toFixed(1)}% vs L+14 baseline (N=${atrophy.calfTrend.sampleSize}, MEDB 5.4)`
      );
    }
    if (atrophy.gripTrend) {
      prolongedParts.push(
        `Handgrip: ${atrophy.gripTrend.latestPctChange >= 0 ? "+" : ""}${atrophy.gripTrend.latestPctChange.toFixed(1)}% vs FD14 baseline (N=${atrophy.gripTrend.sampleSize}, MR081L)`
      );
    }
    if (atrophy.adherenceSummary) {
      prolongedParts.push(
        `7d Exercise: ${adherenceLabel(atrophy.adherenceSummary)} (bone loss estimated via resistance loading; DXA pre/post only, MEDB 1.11)`
      );
    }
    if (atrophy.alerts.length > 0) {
      prolongedParts.push(`Flags: ${atrophy.alerts.join("; ")}`);
    }
  }

  const prolongedHorizon =
    prolongedParts.length > 0
      ? `${prolongedParts.join(" | ")}${effectiveRole === "member" ? sleepCrossNote : ""}`
      : gravityHazard.outputSlots.prolongedHorizon;

  // Combined ETA (prioritize imminent EVA deadline if <= 7 days, else prolonged trend ETA)
  const eta =
    evaGate.hasAnyInput && evaGate.nearestDeadlineHours !== null
      ? `${evaGate.nearestDeadlineLabel}${atrophy.etaDays !== null ? ` | Conditioning threshold ETA: ~${atrophy.etaDays}d [ASSUMPTION]` : ""}`
      : atrophy.hasAnyAnthropometric || atrophy.hasAnyExercise
      ? atrophy.etaLabel
      : actor.metrics.etaSlot;

  // Prioritized 1-2 Actionable Solutions (capped to 1 in reentryMode per OUTLINE.md)
  const maxSolutions = reentryMode ? 1 : 2;
  const candidateSolutions = [...evaGate.actions, ...atrophy.actions];
  const fallbackSolutions = [
    actor.evaGateState === "GO"
      ? "EVA gate GO — preserve test validity and block handgrip testing within <24h of EVA (MR081L)."
      : "Complete pending pre-EVA verification (MEDB 6.1 48h health status / MR087L prebreathe / MEDB 6.3 arm ergometry) with clean pre-test conditions.",
    "Maintain daily 2.5h exercise (1h aerobic + 1.5h resistance, >=2h before sleep) and morning fasted EZOG calf volume every 14 days (MEDB 5.2 / 5.4).",
  ];

  const solutions = (candidateSolutions.length > 0 ? candidateSolutions : fallbackSolutions).slice(
    0,
    maxSolutions
  );

  const charts =
    effectiveRole === "lead"
      ? buildLeadGravityCharts(
          evaluateGravityCrewOverview(
            mission,
            scenarioHazardRecords ?? allHazardRecords,
            scenarioHazardSamples ?? [],
            reentryMode
          )
        )
      : buildGravityCharts(atrophy, hazardRecords, hazardSamples, actorInputs);

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
    "MEDB 6.1 / 6.2 / 6.3 & MR087L & MR090L (EVA Readiness Chain)",
    "MEDB 1.11 (Pre/Post DXA Context) & MR026L (R+0..R+45 Reconditioning)",
  ],
  overviewSlot:
    "Here is: On-board Pre-EVA Readiness Gate + Condition Guard (compensating for ~22 min delay where ground real-time EVA monitoring cannot run) and deterministic low-N muscle/bone conditioning tracker.",
  inputSlots: [
    {
      streamName: "EVA Readiness Chain",
      inputPrompt: "Add your info: EVA schedule & pre-EVA test chain parameters here",
      sourceRef: "MR081L / MEDB 6.1–6.3 / MR087L / MR090L",
      subfields: [
        {
          key: "currentFlightDay",
          label: "Current Flight Day",
          fieldType: "number",
          unit: "FD",
          prompt: "Add your info: Current mission flight day (e.g. 92) here",
        },
        {
          key: "hoursToPlannedEva",
          label: "Hours to EVA Suit Donning",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours remaining until planned EVA here",
        },
        {
          key: "daysSinceLastEva",
          label: "Days Since Prior EVA",
          fieldType: "number",
          unit: "days",
          prompt: "Add your info: Days since previous EVA (leave blank if none) here",
        },
        {
          key: "suitType",
          label: "Suit Type (EMU / ORLAN)",
          fieldType: "text",
          prompt: "Add your info: EMU or ORLAN here",
        },
        {
          key: "pfeDaysAgo",
          label: "Days Since Last PFE Test",
          fieldType: "number",
          unit: "days",
          prompt: "Add your info: Days since last Periodic Fitness Evaluation here",
        },
        {
          key: "preEvaGripTaken",
          label: "Pre-EVA Grip Test Done",
          fieldType: "boolean",
          prompt: "Add your info: yes or no (EVA-14..10d window) here",
        },
        {
          key: "armErgometryCompleted",
          label: "Arm Ergometry Done",
          fieldType: "boolean",
          prompt: "Add your info: yes or no (MEDB 6.3 after FD21) here",
        },
        {
          key: "prebreatheVerifiedPct",
          label: "Prebreathe VO2 % of Target",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Measured VO2 % of target (valid 90-110%) here",
        },
        {
          key: "preEvaHealthStatusHoursAgo",
          label: "Pre-EVA Health Check Age",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since MEDB 6.1 exam (<=48h) here",
        },
        {
          key: "islePreflightCompleted",
          label: "ISLE Preflight Trained",
          fieldType: "boolean",
          prompt: "Add your info: yes or no (MR090L prerequisite) here",
        },
        {
          key: "symptomNote",
          label: "Pre-EVA Note (Private)",
          fieldType: "text",
          isPrivate: true,
          prompt: "Add your info: Optional free-text note (e.g. shoulder stiffness) here",
        },
      ],
    },
    {
      streamName: "Pre-Test Conditions",
      inputPrompt: "Add your info: Pre-test fasting, caffeine, workout & med hours here",
      sourceRef: "MEDB 6.3 / MR087L / MEDB 5.4",
      subfields: [
        {
          key: "hoursSinceMeal",
          label: "Hours Since Meal",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since last meal (>=2h required) here",
        },
        {
          key: "hoursSinceCaffeine",
          label: "Hours Since Caffeine",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since caffeine (>=8h required) here",
        },
        {
          key: "hoursSinceStrenuousExercise",
          label: "Hours Since Strenuous Exercise",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since strenuous workout (>=24h required) here",
        },
        {
          key: "hoursSinceAlcoholOrMeds",
          label: "Hours Since Alcohol / Cold Meds",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since alcohol/vasoactive meds (>=24h arm) here",
        },
        {
          key: "hoursSinceNblSession",
          label: "Hours Since NBL Session",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours since NBL session (>=48h arm) here",
        },
        {
          key: "calfMorningFastedPaired",
          label: "Calf Morning Fasted + Mass",
          fieldType: "boolean",
          prompt: "Add your info: yes or no (morning after sleep, before breakfast) here",
        },
      ],
    },
    {
      streamName: "Handgrip & Calf Volume",
      inputPrompt: "Add your info: grip_strength, calf_volume, body_mass, flight_day here",
      sourceRef: "MR081L / MEDB 5.4 / MEDB 1.13",
      recordSample: true,
      unit: "kg",
      subfields: [
        {
          key: "maxGripKg",
          label: "Max Handgrip (3x5s)",
          fieldType: "number",
          unit: "kg",
          prompt: "Add your info: Maximal handgrip contraction here",
        },
        {
          key: "gripStaticEnduranceSec",
          label: "Static Endurance (to 50%)",
          fieldType: "number",
          unit: "s",
          prompt: "Add your info: Non-dominant hold time to 50% max here",
        },
        {
          key: "gripDynamicEnduranceReps",
          label: "Dynamic Endurance (to 75%)",
          fieldType: "number",
          unit: "reps",
          prompt: "Add your info: Dominant reps until <75% max here",
        },
        {
          key: "calfVolumeValue",
          label: "EZOG Calf Volume",
          fieldType: "number",
          unit: "mL",
          prompt: "Add your info: Manual EZOG stocking reading here",
        },
        {
          key: "bodyMassKg",
          label: "Paired Body Mass (MEDB 1.13)",
          fieldType: "number",
          unit: "kg",
          prompt: "Add your info: Morning body mass paired with calf here",
        },
        {
          key: "measurementFlightDay",
          label: "Measurement Flight Day",
          fieldType: "number",
          unit: "FD",
          prompt: "Add your info: Flight day of reading (e.g. 14, 28) here",
        },
      ],
    },
    {
      streamName: "Daily Exercise Log",
      inputPrompt: "Add your info: aerobic_min, resistance_min, prescribed vs dialled load here",
      sourceRef: "MEDB 5.2 / MR026L",
      recordSample: true,
      unit: "min",
      subfields: [
        {
          key: "aerobicMinutes",
          label: "Aerobic Duration (target 60)",
          fieldType: "number",
          unit: "min",
          prompt: "Add your info: Aerobic session minutes today here",
        },
        {
          key: "resistanceMinutes",
          label: "Resistance Duration (target 90)",
          fieldType: "number",
          unit: "min",
          prompt: "Add your info: Resistance session minutes today here",
        },
        {
          key: "prescribedLoadKg",
          label: "Prescribed Resistance Load",
          fieldType: "number",
          unit: "kg",
          prompt: "Add your info: Prescribed target load here",
        },
        {
          key: "actualLoadKg",
          label: "Actual Dialled Load",
          fieldType: "number",
          unit: "kg",
          prompt: "Add your info: Actual dialled load here",
        },
        {
          key: "hoursAfterMeal",
          label: "Hours After Meal (>=1.5h)",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours after meal at workout start here",
        },
        {
          key: "hoursBeforeSleep",
          label: "Hours Before Sleep (>=2h)",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours before sleep at workout end here",
        },
        {
          key: "reconditioningDayRPlus",
          label: "Postflight Day (Optional R+0..45)",
          fieldType: "number",
          unit: "R+d",
          prompt: "Add your info: R+ day for 120 min/d reconditioning here",
        },
        {
          key: "flightDay",
          label: "Session Flight Day",
          fieldType: "number",
          unit: "FD",
          prompt: "Add your info: Flight day of session here",
        },
      ],
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: EVA Gate output — GO / CONDITIONAL / NO-GO, active blockers, and pre-test condition flags.",
    prolongedHorizon: "Here is: Low-N personal-baseline calf/grip trend, proxy bone-shield resistance adherence (DXA pre/post only), and meal/sleep timing.",
    etaSlot: "Here is: Nearest EVA schedule deadline (48h health check / 24h grip lockout) or projected days to ASSUMPTION conditioning threshold.",
    solutionsSlot: "Here is: 1–2 deterministic actions (e.g., Complete morning calf check before breakfast; Defer grip test >24h before EVA).",
  },
  leadView: {
    summary: "Per-crew EVA Gate status (GO / CONDITIONAL / NO-GO), blocker categories, team exercise discipline buff, and audit-logged Emergency Medical Detail Unlock.",
    privacyRule: "RBAC: Lead sees gate status & blocker categories only (e.g., 'test overdue') — no raw values or private notes unless Emergency Unlock is triggered & logged.",
    modules: [
      {
        title: "Crew EVA Readiness Gate (Flight Note View)",
        detail: "Here is: Summary gate status (GO/CONDITIONAL/NO-GO) & blocker categories per astronaut (MEDB 6.1/6.2 Flight Note analogue).",
        actionSlot: "Add your info: Planned EVA date & suit type (EMU/ORLAN) here",
      },
      {
        title: "Emergency Detail Unlock (Audit-Logged)",
        detail: "Here is: Explicit emergency unlock revealing raw gravity/EVA metrics only with logged justification + automatic crew notification.",
        actionSlot: "Add your info: Emergency unlock reason & authorization here",
      },
    ],
  },
  memberView: {
    summary: "Personal EVA gate checklist, pre-test condition guard (caffeine/meal/strenuous exercise windows), personal low-N baseline trend, and R+0..R+45 reconditioning card.",
    privacyRule: "All own measurements, notes, and trends stay private unless an audit-logged emergency unlock occurs.",
    modules: [
      {
        title: "Personal EVA Readiness Chain & Pre-Test Conditions",
        detail: "Here is: Checklist covering PFE, Grip window (MR081L), Arm Ergometry (MEDB 6.3), Prebreathe verification (MR087L), ISLE training (MR090L), and 48h Health Status (MEDB 6.1).",
        actionSlot: "Add your info: Test completion & conditions_met verification here",
      },
      {
        title: "Atrophy, Proxy Bone-Shield & Return-to-Gravity Card",
        detail: "Here is: Daily 2.5h exercise adherence + postflight 120 min/day reconditioning card (in-flight bone loss is estimated via resistance loading; DXA is pre/post only).",
        actionSlot: "Add your info: Daily aerobic/resistance session & morning fasted calf log here",
      },
    ],
  },
  proposedEndpoints: [
    { method: "GET", path: "/api/hazard-data?hazardSlug=gravity", purpose: "Fetch persisted gravity/EVA records for scenario + character" },
    { method: "POST", path: "/api/hazard-data", purpose: "Upsert exercise, grip, calf, or EVA gate records into Supabase" },
    { method: "GET", path: "/api/hazard-samples?hazardSlug=gravity", purpose: "Fetch historical calf/grip/exercise time-series samples for linear trend projection" },
  ],
  alarmPreset: {
    title: "EVA READINESS GATE HOLD — SCHEDULE / PRE-TEST BLOCKER",
    severity: "WARNING",
    etaLabel: "Here is: Nearest EVA gate deadline (e.g., <= 48h Pre-EVA health status window or 24h grip lockout)",
    descriptionSlot:
      "Here is: EVA gate evaluated NO-GO/CONDITIONAL due to missing pre-EVA verification, pre-test condition violation, or conditioning threshold alert.",
    leadActions: [
      "1. Hold EVA suit donning for affected crew slot or rotate EVA assignment per Flight Note.",
      "2. Use Audit-Logged Emergency Unlock only if mission-critical medical review is needed.",
    ],
    memberActions: [
      "1. Complete missing pre-EVA health status / verification under valid pre-test conditions.",
      "2. Do not perform handgrip test within 24h prior to EVA (MR081L lockout).",
    ],
  },
  evaluate: evaluateGravityHazard,
};
