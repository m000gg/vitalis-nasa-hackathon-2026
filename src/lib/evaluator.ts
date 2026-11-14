import { CrewSlot, MissionProfile, ReadinessState } from "@/lib/domain";
import { HazardSpec } from "@/lib/hazards";

/**
 * Info-agnostic dashboard evaluation layer.
 *
 * Anyone on the team can replace or extend these generalized functions/formulas
 * without changing UI components or adding scenario-specific if/else branches.
 * Every UI page simply passes the selected (mission, actor, inputs) into these
 * functions and renders the returned generic view model.
 */

export interface CharacterDashboardModel {
  actorId: string;
  callsign: string;
  roleTitle: string;
  readinessState: ReadinessState;
  evaGateState: "GO" | "CONDITIONAL" | "NO-GO";
  shelterConfirmed: boolean;
  etaLabel: string;
  actions: string[];
  blockers: string[];
  metrics: {
    doseSlot: string;
    sleepSlot: string;
    fatigueSlot: string;
    exerciseAdherenceSlot: string;
  };
}

export interface LeaderDashboardModel {
  totalCrew: number;
  goCount: number;
  conditionalCount: number;
  holdCount: number;
  shelteredCount: number;
  crewMatrix: Array<{
    id: string;
    callsign: string;
    assignedRoleTitle: string;
    readinessState: ReadinessState;
    evaGateState: "GO" | "CONDITIONAL" | "NO-GO";
    shelterConfirmed: boolean;
    publicStatusSummary: string;
    blockerCount: number;
  }>;
  derivedTeamAlerts: string[];
}

export interface HazardActorSnapshot {
  hazardSlug: HazardSpec["slug"];
  actorStatusLabel: string;
  scenarioStatusSlot: string;
  actorInputOverrides: Record<string, string>;
}

/**
 * Computes a generalized, info-agnostic view model for any selected character
 * (Leader or Member) in any scenario.
 */
export function evaluateCharacterDashboard(
  actor: CrewSlot,
  options: {
    shelterConfirmed: boolean;
    reentryMode: boolean;
    customInputs?: Record<string, string>;
  }
): CharacterDashboardModel {
  const maxActions = options.reentryMode ? 1 : 2;
  const actions = actor.metrics.actions.slice(0, maxActions);

  // Teammates can plug generalized formulas here (e.g., recomputing readinessState
  // or ETA from actor.metrics and options.customInputs).
  return {
    actorId: actor.id,
    callsign: actor.callsign,
    roleTitle: actor.assignedRoleTitle,
    readinessState: actor.readinessState,
    evaGateState: actor.evaGateState,
    shelterConfirmed: options.shelterConfirmed,
    etaLabel: actor.metrics.etaSlot,
    actions,
    blockers: actor.metrics.blockers,
    metrics: {
      doseSlot: options.customInputs?.["Personal Dosimeter"] || actor.metrics.doseSlot,
      sleepSlot: options.customInputs?.["Wearable / Actigraphy"] || actor.metrics.sleepSlot,
      fatigueSlot: options.customInputs?.["60-Second Self-Check (Private)"] || actor.metrics.fatigueSlot,
      exerciseAdherenceSlot: options.customInputs?.["Daily Exercise Log"] || actor.metrics.exerciseAdherenceSlot,
    },
  };
}

/**
 * Computes a privacy-preserving, scenario-agnostic Commander/Lead overview
 * strictly from the scenario's crew list and shelter confirmations.
 */
export function evaluateLeaderDashboard(
  mission: MissionProfile,
  shelterConfirmations: Record<string, boolean>
): LeaderDashboardModel {
  const crewMatrix = mission.crew.map((member) => ({
    id: member.id,
    callsign: member.callsign,
    assignedRoleTitle: member.assignedRoleTitle,
    readinessState: member.readinessState,
    evaGateState: member.evaGateState,
    shelterConfirmed: !!shelterConfirmations[member.id],
    publicStatusSummary: member.publicStatusSummary,
    blockerCount: member.metrics.blockers.length,
  }));

  const goCount = crewMatrix.filter((c) => c.readinessState === "GO").length;
  const conditionalCount = crewMatrix.filter((c) => c.readinessState === "CONDITIONAL").length;
  const holdCount = crewMatrix.filter((c) => c.readinessState === "HOLD").length;
  const shelteredCount = crewMatrix.filter((c) => c.shelterConfirmed).length;

  const derivedTeamAlerts: string[] = [];
  if (holdCount > 0) {
    derivedTeamAlerts.push(`Here is: ${holdCount} crew slot(s) currently in HOLD readiness state.`);
  }
  if (shelteredCount < crewMatrix.length) {
    derivedTeamAlerts.push(
      `Here is: ${crewMatrix.length - shelteredCount} crew slot(s) with unconfirmed shelter status.`
    );
  }
  if (derivedTeamAlerts.length === 0) {
    derivedTeamAlerts.push("Here is: All crew slots currently GO and shelter-confirmed.");
  }

  return {
    totalCrew: crewMatrix.length,
    goCount,
    conditionalCount,
    holdCount,
    shelteredCount,
    crewMatrix,
    derivedTeamAlerts,
  };
}

/**
 * Maps any (mission, actor, hazard) tuple to generalized status & telemetry slots
 * without scenario-specific branching.
 */
export function evaluateHazardForActor(
  mission: MissionProfile,
  actor: CrewSlot,
  hazard: HazardSpec,
  customInputs: Record<string, string>
): HazardActorSnapshot {
  const scenarioMap: Record<HazardSpec["slug"], string> = {
    radiation: mission.environment.radiationStatusSlot,
    isolation: mission.environment.isolationStatusSlot,
    distance: mission.environment.commsDelaySlot,
    gravity: mission.environment.gravityStatusSlot,
    environment: mission.environment.atmosphereStatusSlot,
  };

  return {
    hazardSlug: hazard.slug,
    actorStatusLabel: `${actor.callsign} — Readiness: ${actor.readinessState} (EVA: ${actor.evaGateState})`,
    scenarioStatusSlot: scenarioMap[hazard.slug],
    actorInputOverrides: customInputs,
  };
}
