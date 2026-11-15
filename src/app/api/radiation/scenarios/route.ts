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

async function writeDosimeterSeries(input: {
  scenarioId: string;
  characterId: string;
  rates: [number, number, number];
  cumulativeDose: number;
  instrument: string;
  source: string;
  nowMs: number;
}) {
  const offsetsHours = [2, 1, 0];
  for (let i = 0; i < offsetsHours.length; i += 1) {
    const measuredAt = new Date(input.nowMs - offsetsHours[i] * 3_600_000).toISOString();
    const rate = input.rates[i];
    const payload = {
      schemaVersion: "radiation.v1",
      doseRateValue: rate,
      doseRateUnit: "mSv/h",
      cumulativeDoseValue: input.cumulativeDose,
      cumulativeDoseUnit: "mSv",
      uncertaintyPercent: 10,
      instrument: input.instrument,
      qualityFlag: "valid",
      provenanceKind: "simulated",
      measuredAt,
      source: input.source,
    };
    if (i < offsetsHours.length - 1) {
      await insertHazardSampleInDb({
        scenarioId: input.scenarioId,
        characterId: input.characterId,
        hazardSlug: "radiation",
        streamName: RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
        numericValue: rate,
        samplePayload: payload,
      });
    } else {
      await writeTelemetry({
        scenarioId: input.scenarioId,
        characterId: input.characterId,
        streamName: RADIATION_PIPELINE_VALUES.streams.personalDosimeter,
        rawValue: `${rate} mSv/h · Cum ${input.cumulativeDose} mSv (simulated)`,
        numericValue: rate,
        payload,
      });
    }
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
    return NextResponse.json(
      { error: "scenarioId, actorId and a valid radiationScenarioId are required." },
      { status: 400 }
    );
  }

  try {
    const { scenarios } = await fetchScenariosFromDb();
    const mission = scenarios.find((item) => item.id === scenarioId);
    if (!mission) {
      return NextResponse.json({ error: `Unknown scenario '${scenarioId}'.` }, { status: 404 });
    }
    const commander = mission.crew.find((member) => member.isLeadSlot);
    if (!commander || mission.crew.length === 0) {
      return NextResponse.json({ error: "Scenario has no usable crew configuration." }, { status: 422 });
    }
    if (actorId !== commander.id) {
      return NextResponse.json(
        { error: "Only the mission lead may run a radiation simulation." },
        { status: 403 }
      );
    }

    const nowDate = new Date();
    const now = nowDate.toISOString();
    const nowMs = nowDate.getTime();
    const runId = text(body.runId) || `radiation-${scenarioCode}-${Date.now().toString(36)}`;

    await writeTelemetry({
      scenarioId,
      characterId: commander.id,
      streamName: RADIATION_PIPELINE_VALUES.streams.missionPolicy,
      rawValue: "SIMULATION POLICY — NOT A UNIVERSAL NASA LIMIT",
      payload: demoPolicy(),
    });

    await writeTelemetry({
      scenarioId,
      characterId: commander.id,
      streamName: RADIATION_PIPELINE_VALUES.streams.spaceWeather,
      rawValue:
        scenarioCode === "A"
          ? "Simulated SEP storm context active"
          : "Quiet simulated background space weather",
      payload: {
        schemaVersion: "radiation.v1",
        eventId: runId,
        eventType: scenarioCode === "A" ? "SEP" : "FLR",
        startTime: now,
        active: scenarioCode === "A",
        provenanceKind: "simulated",
        source: "Vitalis scenario replay; event context is not crew dose",
      },
    });

    for (const [index, crew] of mission.crew.entries()) {
      let rates: [number, number, number] = [0.06, 0.06, 0.06];
      let cumulativeDose = 18;
      if (scenarioCode === "A") {
        rates = crew.isLeadSlot ? [0.18, 0.42, 0.85] : [0.22, 0.55, 0.95];
        cumulativeDose = 48;
      } else if (scenarioCode === "B") {
        rates = !crew.isLeadSlot && index === 1 ? [0.16, 0.31, 0.45] : [0.08, 0.09, 0.1];
        cumulativeDose = !crew.isLeadSlot && index === 1 ? 26 : 19;
      } else if (scenarioCode === "C") {
        const base = 0.08 + index * 0.05;
        rates = [base, base, Number((base + 0.02).toFixed(2))];
        cumulativeDose = 18 + index * 14;
      }

      await writeDosimeterSeries({
        scenarioId,
        characterId: crew.id,
        rates,
        cumulativeDose,
        instrument: `VITALIS-DEMO-DOS-${index + 1}`,
        source: `${definition.title} reproducible demo fixture — not NASA astronaut data`,
        nowMs,
      });
    }

    const sensorCrew = mission.crew.slice(0, 2);
    for (const [index, crew] of sensorCrew.entries()) {
      const rate =
        scenarioCode === "D"
          ? index === 0
            ? 0.14
            : 0.58
          : scenarioCode === "A"
          ? index === 0
            ? 0.32
            : 0.35
          : 0.09;
      await writeTelemetry({
        scenarioId,
        characterId: crew.id,
        streamName: RADIATION_PIPELINE_VALUES.streams.compartmentSensors,
        rawValue: `${rate} mSv/h (simulated)`,
        numericValue: rate,
        payload: {
          schemaVersion: "radiation.v1",
          compartmentId: index === 0 ? "Habitat-A (Shielded)" : "Habitat-B (Forward)",
          doseRateValue: rate,
          doseRateUnit: "mSv/h",
          detectorStatus: scenarioCode === "D" && index === 1 ? "suspect" : "online",
          uncertaintyPercent: 7,
          provenanceKind: "simulated",
          measuredAt: now,
          source:
            scenarioCode === "D"
              ? "Detector disagreement fixture — verify sensors before assuming shield breach"
              : `${definition.title} compartment baseline`,
        },
      });
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

    return NextResponse.json(
      { runId, eventId, scenario: definition, source: "supabase", simulation: true },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scenario runner failed." },
      { status: 500 }
    );
  }
}
