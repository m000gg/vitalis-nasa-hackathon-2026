export type UserRole = "lead" | "member";

export interface CharacterMetrics {
  etaSlot: string;
  doseSlot: string;
  sleepSlot: string;
  fatigueSlot: string;
  exerciseAdherenceSlot: string;
  blockers: string[];
  actions: string[];
}

export interface CrewSlot {
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  publicStatusSummary: string;
  privateMemberNotesSlot: string;
  metrics: CharacterMetrics;
}

export interface ScenarioEnvironment {
  commsDelaySlot: string;
  radiationStatusSlot: string;
  atmosphereStatusSlot: string;
  acousticsStatusSlot: string;
  isolationStatusSlot: string;
  gravityStatusSlot: string;
}

export interface MissionProfile {
  id: string;
  name: string;
  durationContext: string;
  commsDelayLabel: string;
  activeHazardsHighlight: string[];
  scenarioDescriptionSlot: string;
  environment: ScenarioEnvironment;
  crew: CrewSlot[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  targetCallsign: string;
  reason: string;
  action: string;
}
