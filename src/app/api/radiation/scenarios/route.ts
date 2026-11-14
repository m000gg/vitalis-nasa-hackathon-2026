import { NextRequest, NextResponse } from "next/server";
import { RADIATION_PIPELINE_VALUES } from "@/lib/hazards/01-radiation";
import { auditPayload, createEmergencyPayload } from "@/lib/radiation/emergency";
import { getRadiationScenario, RADIATION_SCENARIOS } from "@/lib/radiation/scenarios";
import {
  fetchScenariosFromDb,
  insertHazardSampleInDb,
  upsertHazardDataInDb,
} from "@/lib/supabase/server";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function demoPolicy() {
  return {
    schemaVersion: "radiation.v1",
    policyLabel: "Vitalis Mars Transit Demo Policy v1",
    policyMode: "simulation",
    quantityFamily: "equivalent",
    rateUnit: "mSv/h",
    elevatedRateValue: 0.3,
    criticalRateValue: 0.8,
    doseUnit: "mSv",
    cumulativeBudgetValue: 120,
    remainingMissionHours: 720,
    forecastUncertaintyPercent: 20,
    sensorDisagreementPercent: 35,
    maxIntegrationGapHours: 2,
    acknowledgementWindowMinutes: 1,
  };
}

async function writeTelemetry(input: {
  scenarioId: string;
  characterId: string;
  streamName: string;
  rawValue: string;
  payload: Record<string, unknown>;
  numericValue?: number;
}) {
  await upsertHazardDataInDb({
    scenarioId: input.scenarioId,
    characterId: input.characterId,
    hazardSlug: "radiation",
    streamName: input.streamName,
    rawValue: input.rawValue,
    payload: input.payload,
  });
  if (input.numericValue !== undefined) {
    await insertHazardSampleInDb({
      scenarioId: input.scenarioId,
      characterId: input.characterId,
      hazardSlug: "radiation",
      streamName: input.streamName,
      numericValue: input.numericValue,
      samplePayload: input.payload,
    });
  }
}

export async function GET() {
  return NextResponse.json({ scenarios: RADIATION_SCENARIOS });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const scenarioId = text(body.scenarioId);
  const actorId = text(body.actorId);
  const scenarioCode = text(body.scenarioIdCode || body.radiationScenarioId).toUpperCase();
  const definition = getRadiationScenario(scenarioCode);
  if (!scenarioId || !actorId || !definition) {
    return NextResponse.json({ error: "scenarioId, actorId and a valid radiationScenarioId are required." }, { status: 400 });
  }
  if (definition.status !== "implemented") {
    return NextResponse.json({
      error: "unsupported_model",
      scenario: definition,
      explanation: "This scenario is catalogued honestly but lacks a validated/implemented model in the MVP.",
    }, { status: 422 });
  }

  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((item) => item.id === scenarioId);
    if (!mission) return NextResponse.json({ error: `Unknown scenario '${scenarioId}'.` }, { status: 404 });
    const commander = mission.crew.find((member) => member.isLeadSlot);
    const member = mission.crew.find((crew) => !crew.isLeadSlot) ?? commander;
    if (!commander || !member) return NextResponse.json({ error: "Scenario has no usable crew configuration." }, { status: 422 });
    if (actorId !== commander.id) {
      return NextResponse.json({ error: "Only the mission lead may run a radiation simulation." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const runId = text(body.runId) || `radiation-${scenarioCode}-${Date.now().toString(36)}`;
    await writeTelemetry({
      scenarioId,
      characterId: commander.id,
      streamName: RADIATION_PIPELINE_VALUES.streams.missionPolicy,
      rawValue: "SIMULATION POLICY — NOT A UNIVERSAL NASA LIMIT",
      payload: demoPolicy(),
    });

    if (scenarioCode === "A" || scenarioCode === "B") {
      const rate = scenarioCode === "A" ? 0.95 : 0.45;
      await writeTelemetry({
        scenarioId,
        characterId: member.id,
        streamName: RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
        rawValue: `${rate} mSv/h (simulated)` ,
        numericValue: rate,
        payload: {
          schemaVersion: "radiation.v1",
          doseRateValue: rate,
          doseRateUnit: "mSv/h",
          cumulativeDoseValue: scenarioCode === "A" ? 48 : 23,
          cumulativeDoseUnit: "mSv",
          uncertaintyPercent: 12,
          instrument: "VITALIS-DEMO-DOS-01",
          qualityFlag: "valid",
          provenanceKind: "simulated",
          measuredAt: now,
          source: `${definition.title} reproducible demo fixture — not NASA astronaut data`,
        },
      });
      await writeTelemetry({
        scenarioId,
        characterId: commander.id,
        streamName: RADIATION_PIPELINE_VALUES.streams.spaceWeather,
        rawValue: "Simulated SEP context active",
        payload: {
          schemaVersion: "radiation.v1",
          eventId: runId,
          eventType: "SEP",
          startTime: now,
          active: true,
          provenanceKind: "simulated",
          source: "Vitalis scenario replay; event context is not crew dose",
        },
      });
    }

    if (scenarioCode === "C") {
      for (const [index, crew] of mission.crew.entries()) {
        const cumulativeDose = 18 + index * 9;
        await writeTelemetry({
          scenarioId,
          characterId: crew.id,
          streamName: RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
          rawValue: `${cumulativeDose} mSv (simulated)` ,
          numericValue: 0.12 + index * 0.02,
          payload: {
            schemaVersion: "radiation.v1",
            doseRateValue: 0.12 + index * 0.02,
            doseRateUnit: "mSv/h",
            cumulativeDoseValue: cumulativeDose,
            cumulativeDoseUnit: "mSv",
            instrument: `VITALIS-DEMO-DOS-${index + 1}`,
            qualityFlag: "valid",
            provenanceKind: "simulated",
            measuredAt: now,
            source: "Unequal Crew Exposure demo fixture",
          },
        });
      }
    }

    if (scenarioCode === "D") {
      const sensorCrew = mission.crew.slice(0, 2);
      for (const [index, crew] of sensorCrew.entries()) {
        const rate = index === 0 ? 0.14 : 0.58;
        await writeTelemetry({
          scenarioId,
          characterId: crew.id,
          streamName: RADIATION_PIPELINE_VALUES.streams.compartmentSensors,
          rawValue: `${rate} mSv/h (simulated)` ,
          numericValue: rate,
          payload: {
            schemaVersion: "radiation.v1",
            compartmentId: index === 0 ? "Habitat-A" : "Habitat-B",
            doseRateValue: rate,
            doseRateUnit: "mSv/h",
            detectorStatus: "valid",
            uncertaintyPercent: 7,
            provenanceKind: "simulated",
            measuredAt: now,
            source: "Shield Integrity Failure demo fixture — detector disagreement, not proof of shield failure",
          },
        });
      }
    }

    const eventId = `evt-${runId}`;
    const statePayload = createEmergencyPayload({
      eventId,
      commanderId: commander.id,
      title: definition.title,
      severity: scenarioCode === "A" ? "CRITICAL" : "WARNING",
      trigger: "scenario_replay",
      reason: definition.description,
      simulation: true,
      idempotencyKey: runId,
      now,
    });
    await writeTelemetry({
      scenarioId,
      characterId: commander.id,
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyState,
      rawValue: "ACTIVE",
      payload: statePayload,
    });
    await insertHazardSampleInDb({
      scenarioId,
      characterId: commander.id,
      hazardSlug: "radiation",
      streamName: RADIATION_PIPELINE_VALUES.streams.emergencyAudit,
      samplePayload: auditPayload({
        eventId,
        action: "SCENARIO_STARTED",
        actorId: commander.id,
        detail: definition.title,
        simulation: true,
      }),
    });

    return NextResponse.json({ runId, eventId, scenario: definition, source: "supabase", simulation: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scenario runner failed." }, { status: 500 });
  }
}
