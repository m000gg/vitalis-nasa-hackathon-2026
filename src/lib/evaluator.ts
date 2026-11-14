import { CrewSlot, MissionProfile, ReadinessState } from "@/lib/domain";
import {
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "@/lib/hazards";

/**
 * Info-agnostic dashboard evaluation layer.
 *
 * Character & Leader overview evaluators live here, while each individual
 * hazard's logic lives in its own isolated file: src/lib/hazards/01..05-*.ts
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

export interface HazardActorSnapshot extends HazardEvaluationResult {
  hazardSlug: HazardSpec["slug"];
  actorStatusLabel: string;
  actorInputOverrides: Record<string, string>;
}

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
 * Delegates directly to the hazard's own isolated evaluate() function
 * inside src/lib/hazards/01..05-*.ts.
 */
export function evaluateHazardForActor(
  mission: MissionProfile,
  actor: CrewSlot,
  hazard: HazardSpec,
  options: {
    actorInputs: Record<string, string>;
    hazardRecords?: HazardDataRecord[];
    hazardSamples?: HazardSampleRecord[];
    linkOnline: boolean;
    reentryMode: boolean;
  }
): HazardActorSnapshot {
  const scopedRecords = (options.hazardRecords ?? []).filter(
    (r) => r.hazardSlug === hazard.slug
  );
  const scopedSamples = (options.hazardSamples ?? []).filter(
    (s) => s.hazardSlug === hazard.slug
  );
  const result = hazard.evaluate({
    mission,
    actor,
    actorInputs: options.actorInputs,
    hazardRecords: scopedRecords,
    hazardSamples: scopedSamples,
    linkOnline: options.linkOnline,
    reentryMode: options.reentryMode,
  });

  // Auto-generate fallback charts for any numeric time-series streams logged via character_hazard_samples
  // unless the hazard module already built a custom chart with the same id.
  const charts: HazardChartSpec[] = [...(result.charts ?? [])];
  const existingIds = new Set(charts.map((c) => c.id));
  const streamGroups = new Map<string, HazardSampleRecord[]>();
  scopedSamples.forEach((s) => {
    if (s.numericValue === null || !Number.isFinite(s.numericValue)) return;
    const list = streamGroups.get(s.streamName) ?? [];
    list.push(s);
    streamGroups.set(s.streamName, list);
  });

  streamGroups.forEach((points, streamName) => {
    const autoId = `sample-${streamName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (existingIds.has(autoId)) return;
    const slotMeta = hazard.inputSlots.find((slot) => slot.streamName === streamName);
    charts.push({
      id: autoId,
      title: `${streamName} Telemetry`,
      unit: slotMeta?.unit ?? "",
      series: points.map((p) => ({
        label: new Date(p.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value: p.numericValue as number,
      })),
    });
  });

  return {
    ...result,
    charts,
    hazardSlug: hazard.slug,
    actorStatusLabel: `${actor.callsign} — Readiness: ${actor.readinessState} (EVA: ${actor.evaGateState})`,
    actorInputOverrides: options.actorInputs,
  };
}
