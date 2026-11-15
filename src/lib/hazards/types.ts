import type { CrewSlot, MissionProfile, UserRole } from "../domain";

export type HazardSlug = "radiation" | "isolation" | "distance" | "gravity" | "environment";

export type HazardFieldType = "text" | "number" | "textarea" | "boolean";

export interface HazardDataRecord {
  id: string;
  scenarioId: string;
  characterId: string;
  hazardSlug: HazardSlug;
  streamName: string;
  rawValue: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface HazardSampleRecord {
  id: string;
  scenarioId: string;
  characterId: string;
  hazardSlug: HazardSlug;
  streamName: string;
  numericValue: number | null;
  samplePayload: Record<string, unknown>;
  recordedAt: string;
}

export interface HazardChartPoint {
  label: string;
  value: number;
}

export interface HazardChartThreshold {
  label: string;
  value: number;
  color?: string;
}

export interface HazardChartSpec {
  id: string;
  title: string;
  unit: string;
  chartType?: "line" | "bar";
  series: HazardChartPoint[];
  projectionSeries?: HazardChartPoint[];
  thresholds?: HazardChartThreshold[];
}

export interface HazardInputSubfield {
  key: string;
  label: string;
  fieldType?: HazardFieldType;
  unit?: string;
  prompt: string;
  isPrivate?: boolean;
}

export interface HazardInputSlot {
  streamName: string;
  inputPrompt: string;
  sourceRef: string;
  fieldType?: HazardFieldType;
  unit?: string;
  recordSample?: boolean;
  isPrivate?: boolean;
  subfields?: HazardInputSubfield[];
}

export interface HazardEvaluationInput {
  mission: MissionProfile;
  actor: CrewSlot;
  /** Active viewer role ("lead" | "member") so evaluate() can tailor outputs and enforce privacy rules. */
  role?: UserRole;
  actorInputs: Record<string, string>;
  hazardRecords: HazardDataRecord[];
  hazardSamples: HazardSampleRecord[];
  /** Read-only snapshots across ALL 5 hazards for this scenario/character (e.g. reading sleep from `isolation` inside `radiation`). */
  allHazardRecords: readonly HazardDataRecord[];
  /** Read-only time-series samples across ALL 5 hazards for this scenario/character. */
  allHazardSamples: readonly HazardSampleRecord[];
  /** Read-only snapshots across ALL crew in the active scenario (privacy-sanitized when role === "lead"). */
  scenarioHazardRecords?: readonly HazardDataRecord[];
  /** Read-only time-series samples across ALL crew in the active scenario (privacy-sanitized when role === "lead"). */
  scenarioHazardSamples?: readonly HazardSampleRecord[];
}

export interface HazardEvaluationResult {
  status: "NOMINAL" | "ELEVATED" | "CRITICAL";
  scenarioStatusSlot: string;
  immediateHorizon: string;
  prolongedHorizon: string;
  eta: string;
  solutions: string[];
  charts?: HazardChartSpec[];
}

export interface HazardSpec {
  slug: HazardSlug;
  number: number;
  title: string;
  shortTitle: string;
  ownerSlot: string;
  sourceDoc: string;
  nasaReferences: string[];
  overviewSlot: string;
  inputSlots: HazardInputSlot[];
  outputSlots: {
    immediateHorizon: string;
    prolongedHorizon: string;
    etaSlot: string;
    solutionsSlot: string;
  };
  leadView: {
    summary: string;
    privacyRule: string;
    modules: { title: string; detail: string; actionSlot: string }[];
  };
  memberView: {
    summary: string;
    privacyRule: string;
    modules: { title: string; detail: string; actionSlot: string }[];
  };
  proposedEndpoints: { method: string; path: string; purpose: string }[];
  alarmPreset: {
    title: string;
    severity: "CRITICAL" | "WARNING";
    etaLabel: string;
    descriptionSlot: string;
    leadActions: string[];
    memberActions: string[];
  };
  evaluate: (input: HazardEvaluationInput) => HazardEvaluationResult;
}
