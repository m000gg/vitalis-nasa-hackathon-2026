import { CrewSlot, MissionProfile, ReadinessState, UserRole } from "@/lib/domain";
import {
  HAZARDS,
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationResult,
  HazardInputSlot,
  HazardSampleRecord,
  HazardSlug,
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

function findInputSlot(hazardSlug: HazardSlug, streamName: string): HazardInputSlot | undefined {
  const spec = HAZARDS.find((h) => h.slug === hazardSlug);
  return spec?.inputSlots.find((s) => s.streamName === streamName);
}

function getPrivateSubfieldKeys(slot?: HazardInputSlot): Set<string> {
  const keys = new Set<string>();
  if (slot?.subfields) {
    slot.subfields.forEach((sf) => {
      if (sf.isPrivate) {
        keys.add(sf.key);
      }
    });
  }
  if (slot?.streamName === "60-Second Self-Check (Private)") {
    keys.add("privateJournalNote");
  }
  return keys;
}

function stripKeysFromPayload(
  payload: Record<string, unknown>,
  privateKeys: Set<string>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!privateKeys.has(k)) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export function sanitizeHazardRecordsForRole(
  records: readonly HazardDataRecord[],
  role: UserRole
): HazardDataRecord[] {
  if (role !== "lead") {
    return [...records];
  }

  const sanitized: HazardDataRecord[] = [];
  for (const rec of records) {
    const slot = findInputSlot(rec.hazardSlug, rec.streamName);
    if (slot?.isPrivate) {
      continue;
    }

    const privateKeys = getPrivateSubfieldKeys(slot);
    if (privateKeys.size === 0) {
      sanitized.push(rec);
      continue;
    }

    const cleanedPayload = stripKeysFromPayload(rec.payload ?? {}, privateKeys);
    let cleanedRawValue = rec.rawValue;

    if (slot?.subfields && slot.subfields.length > 0) {
      const publicParts = slot.subfields
        .filter((sf) => !sf.isPrivate && cleanedPayload[sf.key] !== undefined && cleanedPayload[sf.key] !== "")
        .map((sf) => `${sf.label}: ${String(cleanedPayload[sf.key])}${sf.unit ? ` ${sf.unit}` : ""}`);
      cleanedRawValue = publicParts.join(", ");
    } else {
      const hasAnyPrivateInPayload = Object.keys(rec.payload ?? {}).some((k) => privateKeys.has(k));
      if (hasAnyPrivateInPayload && Object.keys(cleanedPayload).length === 0) {
        cleanedRawValue = "";
      }
    }

    sanitized.push({
      ...rec,
      rawValue: cleanedRawValue,
      payload: cleanedPayload,
    });
  }
  return sanitized;
}

export function sanitizeHazardSamplesForRole(
  samples: readonly HazardSampleRecord[],
  role: UserRole
): HazardSampleRecord[] {
  if (role !== "lead") {
    return [...samples];
  }

  const sanitized: HazardSampleRecord[] = [];
  for (const sample of samples) {
    const slot = findInputSlot(sample.hazardSlug, sample.streamName);
    if (slot?.isPrivate) {
      continue;
    }

    const privateKeys = getPrivateSubfieldKeys(slot);
    if (privateKeys.size === 0) {
      sanitized.push(sample);
      continue;
    }

    sanitized.push({
      ...sample,
      samplePayload: stripKeysFromPayload(sample.samplePayload ?? {}, privateKeys),
    });
  }
  return sanitized;
}

function sanitizeActorInputsForRole(
  actorInputs: Record<string, string>,
  hazardSlug: HazardSlug,
  role: UserRole,
  sanitizedRecords: readonly HazardDataRecord[]
): Record<string, string> {
  if (role !== "lead") {
    return actorInputs;
  }

  const cleaned: Record<string, string> = {};
  for (const [streamName, value] of Object.entries(actorInputs)) {
    const slot = findInputSlot(hazardSlug, streamName);
    if (slot?.isPrivate) {
      continue;
    }
    const privateKeys = getPrivateSubfieldKeys(slot);
    if (privateKeys.size > 0) {
      const safeRec = sanitizedRecords.find(
        (r) => r.hazardSlug === hazardSlug && r.streamName === streamName
      );
      if (safeRec && safeRec.rawValue) {
        cleaned[streamName] = safeRec.rawValue;
      }
      continue;
    }
    cleaned[streamName] = value;
  }
  return cleaned;
}

export function evaluateCharacterDashboard(
  actor: CrewSlot,
  options: {
    shelterConfirmed: boolean;
    reentryMode: boolean;
    customInputs?: Record<string, string>;
    mission?: MissionProfile;
    hazardRecords?: HazardDataRecord[];
    hazardSamples?: HazardSampleRecord[];
    scenarioHazardRecords?: readonly HazardDataRecord[];
    scenarioHazardSamples?: readonly HazardSampleRecord[];
    linkOnline?: boolean;
    role?: UserRole;
  }
): CharacterDashboardModel {
  const maxActions = options.reentryMode ? 1 : 2;
  const effectiveRole: UserRole = options.role ?? (actor.isLeadSlot ? "lead" : "member");
  const liveBlockers: string[] = [];
  const criticalSolutions: string[] = [];
  const elevatedSolutions: string[] = [];

  if (options.mission) {
    for (const h of HAZARDS) {
      const snap = evaluateHazardForActor(options.mission, actor, h, {
        actorInputs: options.customInputs ?? {},
        hazardRecords: options.hazardRecords,
        hazardSamples: options.hazardSamples,
        scenarioHazardRecords: options.scenarioHazardRecords,
        scenarioHazardSamples: options.scenarioHazardSamples,
        role: effectiveRole,
        linkOnline: options.linkOnline ?? options.mission.environment.linkOnlineDefault,
        reentryMode: options.reentryMode,
      });

      if (snap.status === "CRITICAL" || snap.status === "ELEVATED") {
        liveBlockers.push(`${h.shortTitle} (${snap.status}): ${snap.immediateHorizon}`);
        if (snap.status === "CRITICAL") {
          criticalSolutions.push(...snap.solutions);
        } else {
          elevatedSolutions.push(...snap.solutions);
        }
      }
    }
  }

  const blockers = Array.from(new Set([...liveBlockers, ...actor.metrics.blockers]));
  const combinedActions = Array.from(
    new Set([...criticalSolutions, ...elevatedSolutions, ...actor.metrics.actions])
  );
  const actions = combinedActions.slice(0, maxActions);

  return {
    actorId: actor.id,
    callsign: actor.callsign,
    roleTitle: actor.assignedRoleTitle,
    readinessState: actor.readinessState,
    evaGateState: actor.evaGateState,
    shelterConfirmed: options.shelterConfirmed,
    etaLabel: actor.metrics.etaSlot,
    actions,
    blockers,
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
  shelterConfirmations: Record<string, boolean>,
  options?: {
    actorInputs?: Record<string, Record<string, string>>;
    scenarioHazardRecords?: readonly HazardDataRecord[];
    scenarioHazardSamples?: readonly HazardSampleRecord[];
    linkOnline?: boolean;
    reentryMode?: boolean;
  }
): LeaderDashboardModel {
  const linkOnline = options?.linkOnline ?? mission.environment.linkOnlineDefault;
  const reentryMode = options?.reentryMode ?? false;

  const evalsByHazard = new Map<HazardSlug, HazardActorSnapshot[]>();
  const alertCountByMember = new Map<string, number>();

  if (options) {
    for (const member of mission.crew) {
      const memberRecords = (options.scenarioHazardRecords ?? []).filter(
        (r) => r.characterId === member.id
      );
      const memberSamples = (options.scenarioHazardSamples ?? []).filter(
        (s) => s.characterId === member.id
      );
      let memberAlerts = 0;

      for (const h of HAZARDS) {
        const snap = evaluateHazardForActor(mission, member, h, {
          actorInputs: options.actorInputs?.[member.id] ?? {},
          hazardRecords: memberRecords,
          hazardSamples: memberSamples,
          scenarioHazardRecords: options.scenarioHazardRecords,
          scenarioHazardSamples: options.scenarioHazardSamples,
          role: "lead",
          linkOnline,
          reentryMode,
        });
        if (snap.status === "CRITICAL" || snap.status === "ELEVATED") {
          memberAlerts += 1;
        }
        const list = evalsByHazard.get(h.slug) ?? [];
        list.push(snap);
        evalsByHazard.set(h.slug, list);
      }

      alertCountByMember.set(member.id, memberAlerts);
    }
  }

  const crewMatrix = mission.crew.map((member) => ({
    id: member.id,
    callsign: member.callsign,
    assignedRoleTitle: member.assignedRoleTitle,
    readinessState: member.readinessState,
    evaGateState: member.evaGateState,
    shelterConfirmed: !!shelterConfirmations[member.id],
    publicStatusSummary: member.publicStatusSummary,
    blockerCount: member.metrics.blockers.length + (alertCountByMember.get(member.id) ?? 0),
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

  for (const h of HAZARDS) {
    const snaps = evalsByHazard.get(h.slug) ?? [];
    const criticalSnaps = snaps.filter((s) => s.status === "CRITICAL");
    const elevatedSnaps = snaps.filter((s) => s.status === "ELEVATED");

    if (criticalSnaps.length > 0) {
      derivedTeamAlerts.push(
        `[CRITICAL] Hazard ${h.number} (${h.shortTitle}): ${criticalSnaps.length} crew slot(s) critical — ${criticalSnaps[0].immediateHorizon}`
      );
    } else if (elevatedSnaps.length > 0) {
      derivedTeamAlerts.push(
        `[ELEVATED] Hazard ${h.number} (${h.shortTitle}): ${elevatedSnaps.length} crew slot(s) elevated — ${elevatedSnaps[0].immediateHorizon}`
      );
    }
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
    scenarioHazardRecords?: readonly HazardDataRecord[];
    scenarioHazardSamples?: readonly HazardSampleRecord[];
    role?: UserRole;
    linkOnline: boolean;
    reentryMode: boolean;
  }
): HazardActorSnapshot {
  const effectiveRole: UserRole = options.role ?? (actor.isLeadSlot ? "lead" : "member");
  const rawAllRecords =
    options.hazardRecords ??
    (options.scenarioHazardRecords
      ? options.scenarioHazardRecords.filter((r) => r.characterId === actor.id)
      : []);
  const rawAllSamples =
    options.hazardSamples ??
    (options.scenarioHazardSamples
      ? options.scenarioHazardSamples.filter((s) => s.characterId === actor.id)
      : []);
  const rawScenarioRecords = options.scenarioHazardRecords ?? rawAllRecords;
  const rawScenarioSamples = options.scenarioHazardSamples ?? rawAllSamples;

  const allRecords = sanitizeHazardRecordsForRole(rawAllRecords, effectiveRole);
  const allSamples = sanitizeHazardSamplesForRole(rawAllSamples, effectiveRole);
  const scenarioRecords = sanitizeHazardRecordsForRole(rawScenarioRecords, effectiveRole);
  const scenarioSamples = sanitizeHazardSamplesForRole(rawScenarioSamples, effectiveRole);
  const sanitizedActorInputs = sanitizeActorInputsForRole(
    options.actorInputs,
    hazard.slug,
    effectiveRole,
    allRecords
  );

  const scopedRecords = allRecords.filter((r) => r.hazardSlug === hazard.slug);
  const scopedSamples = allSamples.filter((s) => s.hazardSlug === hazard.slug);
  const result = hazard.evaluate({
    mission,
    actor,
    role: effectiveRole,
    actorInputs: sanitizedActorInputs,
    hazardRecords: scopedRecords,
    hazardSamples: scopedSamples,
    allHazardRecords: allRecords,
    allHazardSamples: allSamples,
    scenarioHazardRecords: scenarioRecords,
    scenarioHazardSamples: scenarioSamples,
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
    actorInputOverrides: sanitizedActorInputs,
  };
}
