import { CrewSlot, MissionProfile } from "@/lib/domain";

export type HazardSlug = "radiation" | "isolation" | "distance" | "gravity" | "environment";

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

export interface HazardChartSpec {
  id: string;
  title: string;
  unit: string;
  series: HazardChartPoint[];
}

export interface HazardInputSubfield {
  key: string;
  label: string;
  fieldType?: "text" | "number";
  unit?: string;
  prompt: string;
}

export interface HazardInputSlot {
  streamName: string;
  inputPrompt: string;
  sourceRef: string;
  fieldType?: "text" | "number";
  unit?: string;
  recordSample?: boolean;
  subfields?: HazardInputSubfield[];
}

export interface HazardEvaluationInput {
  mission: MissionProfile;
  actor: CrewSlot;
  actorInputs: Record<string, string>;
  hazardRecords: HazardDataRecord[];
  hazardSamples: HazardSampleRecord[];
  linkOnline: boolean;
  reentryMode: boolean;
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
