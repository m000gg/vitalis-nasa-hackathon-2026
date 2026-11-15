import type { CrewSlot, MissionProfile, UserRole } from "@/lib/domain";
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
import {
  sanitizeActorInputsForRole as sanitizeActorInputsCore,
  sanitizeHazardRecordsForRole as sanitizeRecordsCore,
  sanitizeHazardSamplesForRole as sanitizeSamplesCore,
} from "@/lib/rbac";

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

export interface CrewMatrixMember {
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  overallStatus: HazardEvaluationResult["status"];
  publicStatusSummary: string;
  blockerCount: number;
  hazardStatuses: Record<HazardSlug, HazardEvaluationResult["status"]>;
  operationalVitals: {
    doseRateLabel: string;
    cumulativeDoseLabel: string;
    sleepLabel: string;
    acousticsLabel: string;
    exercisePct: number | null;
    medKitLabel: string;
  };
}

export interface LeaderDashboardModel {
  totalCrew: number;
  nominalCount: number;
  elevatedCount: number;
  criticalCount: number;
  crewMatrix: CrewMatrixMember[];
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

export function sanitizeHazardRecordsForRole(
  records: readonly HazardDataRecord[],
  role: UserRole,
  actorId?: string
): HazardDataRecord[] {
  return sanitizeRecordsCore(records, role, actorId, findInputSlot);
}

export function sanitizeHazardSamplesForRole(
  samples: readonly HazardSampleRecord[],
  role: UserRole,
  actorId?: string
): HazardSampleRecord[] {
  return sanitizeSamplesCore(samples, role, actorId, findInputSlot);
}

function sanitizeActorInputsForRole(
  actorInputs: Record<string, string>,
  hazardSlug: HazardSlug,
  role: UserRole,
  sanitizedRecords: readonly HazardDataRecord[]
): Record<string, string> {
  return sanitizeActorInputsCore(actorInputs, hazardSlug, role, sanitizedRecords, findInputSlot);
}

export function evaluateCharacterDashboard(
  actor: CrewSlot,
  options: {
    customInputs?: Record<string, string>;
    mission?: MissionProfile;
    hazardRecords?: HazardDataRecord[];
    hazardSamples?: HazardSampleRecord[];
    scenarioHazardRecords?: readonly HazardDataRecord[];
    scenarioHazardSamples?: readonly HazardSampleRecord[];
    role?: UserRole;
  } = {}
): CharacterDashboardModel {
  const maxActions = 2;
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
  options?: {
    actorInputs?: Record<string, Record<string, string>>;
    scenarioHazardRecords?: readonly HazardDataRecord[];
    scenarioHazardSamples?: readonly HazardSampleRecord[];
  }
): LeaderDashboardModel {
  const evalsByHazard = new Map<HazardSlug, HazardActorSnapshot[]>();
  const alertCountByMember = new Map<string, number>();
  const hazardStatusesByMember = new Map<string, Record<HazardSlug, HazardEvaluationResult["status"]>>();

  const safeScenarioRecords = sanitizeHazardRecordsForRole(
    options?.scenarioHazardRecords ?? [],
    "lead"
  );
  const safeScenarioSamples = sanitizeHazardSamplesForRole(
    options?.scenarioHazardSamples ?? [],
    "lead"
  );

  for (const member of mission.crew) {
    const memberRecords = safeScenarioRecords.filter((r) => r.characterId === member.id);
    const memberSamples = safeScenarioSamples.filter((s) => s.characterId === member.id);
    let memberAlerts = 0;
    const perHazard = {} as Record<HazardSlug, HazardEvaluationResult["status"]>;

    for (const h of HAZARDS) {
      const snap = evaluateHazardForActor(mission, member, h, {
        actorInputs: options?.actorInputs?.[member.id] ?? {},
        hazardRecords: memberRecords,
        hazardSamples: memberSamples,
        scenarioHazardRecords: safeScenarioRecords,
        scenarioHazardSamples: safeScenarioSamples,
        role: "lead",
      });
      perHazard[h.slug] = snap.status;
      if (snap.status === "CRITICAL" || snap.status === "ELEVATED") {
        memberAlerts += 1;
      }
      const list = evalsByHazard.get(h.slug) ?? [];
      list.push(snap);
      evalsByHazard.set(h.slug, list);
    }

    hazardStatusesByMember.set(member.id, perHazard);
    alertCountByMember.set(member.id, memberAlerts);
  }

  const crewMatrix: CrewMatrixMember[] = mission.crew.map((member) => {
    const statuses = hazardStatusesByMember.get(member.id) ?? ({} as Record<HazardSlug, HazardEvaluationResult["status"]>);
    const vals = Object.values(statuses);
    const overallStatus: HazardEvaluationResult["status"] = vals.includes("CRITICAL")
      ? "CRITICAL"
      : vals.includes("ELEVATED")
      ? "ELEVATED"
      : "NOMINAL";

    const memberRecords = safeScenarioRecords.filter((r) => r.characterId === member.id);
    const memberSamples = safeScenarioSamples.filter((s) => s.characterId === member.id);

    const dosimeter = memberRecords.find(
      (r) => r.hazardSlug === "radiation" && r.streamName === "Personal Dosimeter"
    );
    const wearable = memberRecords.find(
      (r) => r.hazardSlug === "isolation" && r.streamName === "Wearable / Actigraphy"
    );
    const acoustics = memberRecords.find(
      (r) => r.hazardSlug === "isolation" && r.streamName === "Habitat Acoustics & Lighting"
    );
    const medInv =
      memberRecords.find(
        (r) => r.hazardSlug === "distance" && r.streamName === "Onboard Medical Inventory"
      ) ??
      safeScenarioRecords.find(
        (r) => r.hazardSlug === "distance" && r.streamName === "Onboard Medical Inventory"
      );

    const rateVal = dosimeter?.payload?.doseRateValue;
    const rateUnit = dosimeter?.payload?.doseRateUnit ?? "µSv/h";
    const cumVal = dosimeter?.payload?.cumulativeDoseValue;
    const cumUnit = dosimeter?.payload?.cumulativeDoseUnit ?? "mSv";
    const sleepH = wearable?.payload?.sleep_duration_h;
    const noiseDba = acoustics?.payload?.sleep_quarter_noise_dba;

    const exSamples = memberSamples.filter(
      (s) => s.hazardSlug === "gravity" && s.streamName === "Daily Exercise Log"
    );
    let exercisePct: number | null = null;
    if (exSamples.length > 0) {
      const recent = exSamples.slice(-7);
      const avgTotal =
        recent.reduce((sum, s) => {
          const aero = Number(s.samplePayload?.aerobic_minutes ?? 0);
          const res = Number(s.samplePayload?.resistance_minutes ?? 0);
          const tot = Number(s.numericValue ?? aero + res);
          return sum + (Number.isFinite(tot) ? tot : 0);
        }, 0) / recent.length;
      exercisePct = Math.round((avgTotal / 150) * 100);
    } else {
      const exRec = memberRecords.find(
        (r) => r.hazardSlug === "gravity" && r.streamName === "Daily Exercise Log"
      );
      const aero = Number(exRec?.payload?.aerobic_minutes ?? NaN);
      const res = Number(exRec?.payload?.resistance_minutes ?? NaN);
      if (Number.isFinite(aero) && Number.isFinite(res)) {
        exercisePct = Math.round(((aero + res) / 150) * 100);
      }
    }

    const kitStatusRaw = String(medInv?.payload?.kitStatus ?? "").trim();

    return {
      id: member.id,
      callsign: member.callsign,
      assignedRoleTitle: member.assignedRoleTitle,
      isLeadSlot: member.isLeadSlot,
      overallStatus,
      publicStatusSummary: member.publicStatusSummary,
      blockerCount: member.metrics.blockers.length + (alertCountByMember.get(member.id) ?? 0),
      hazardStatuses: statuses,
      operationalVitals: {
        doseRateLabel:
          typeof rateVal === "number" && Number.isFinite(rateVal)
            ? `${rateVal.toFixed(1)} ${String(rateUnit)}`
            : "—",
        cumulativeDoseLabel:
          typeof cumVal === "number" && Number.isFinite(cumVal)
            ? `${cumVal.toFixed(1)} ${String(cumUnit)}`
            : "—",
        sleepLabel:
          typeof sleepH === "number" && Number.isFinite(Number(sleepH))
            ? `${Number(sleepH).toFixed(1)} h`
            : "—",
        acousticsLabel:
          typeof noiseDba === "number" && Number.isFinite(Number(noiseDba))
            ? `${Number(noiseDba).toFixed(1)} dBA`
            : "—",
        exercisePct,
        medKitLabel: kitStatusRaw ? kitStatusRaw.replace(/_/g, " ") : "Nominal",
      },
    };
  });

  const nominalCount = crewMatrix.filter((c) => c.overallStatus === "NOMINAL").length;
  const elevatedCount = crewMatrix.filter((c) => c.overallStatus === "ELEVATED").length;
  const criticalCount = crewMatrix.filter((c) => c.overallStatus === "CRITICAL").length;

  const derivedTeamAlerts: string[] = [];

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
    derivedTeamAlerts.push("All 5 hazard zones across crew slots are currently NOMINAL.");
  }

  return {
    totalCrew: crewMatrix.length,
    nominalCount,
    elevatedCount,
    criticalCount,
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

  const allRecords = sanitizeHazardRecordsForRole(rawAllRecords, effectiveRole, actor.id);
  const allSamples = sanitizeHazardSamplesForRole(rawAllSamples, effectiveRole, actor.id);
  const scenarioRecords = sanitizeHazardRecordsForRole(rawScenarioRecords, effectiveRole, actor.id);
  const scenarioSamples = sanitizeHazardSamplesForRole(rawScenarioSamples, effectiveRole, actor.id);
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
  });

  // Auto-generate fallback charts for any numeric time-series streams logged via character_hazard_samples
  // unless the hazard module already built a custom chart with the same id.
  const charts: HazardChartSpec[] = [...(result.charts ?? [])];
  if (hazard.slug !== "environment" || charts.length === 0) {
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
      const spansMultipleDays =
        points.length >= 2 &&
        new Date(points[0].recordedAt).toDateString() !==
          new Date(points[points.length - 1].recordedAt).toDateString();
      charts.push({
        id: autoId,
        title: `${streamName} Telemetry`,
        unit: slotMeta?.unit ?? "",
        series: points.map((p) => {
          const dt = new Date(p.recordedAt);
          const label = Number.isNaN(dt.getTime())
            ? p.recordedAt
            : spansMultipleDays
            ? dt.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return {
            label,
            value: Number((p.numericValue as number).toFixed(4)),
          };
        }),
      });
    });
  }

  return {
    ...result,
    charts,
    hazardSlug: hazard.slug,
    actorStatusLabel: `${actor.callsign} (${actor.assignedRoleTitle})`,
    actorInputOverrides: sanitizedActorInputs,
  };
}
