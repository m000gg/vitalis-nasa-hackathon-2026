import assert from "node:assert/strict";
import test from "node:test";

import {
  RADIATION_SIMULATION_CATALOG,
  defaultSimulationParameters,
  runRadiationSimulation,
} from "../src/lib/radiation/simulation.ts";

test("all documented radiation scenarios A-S are executable", () => {
  assert.equal(RADIATION_SIMULATION_CATALOG.length, 19);
  assert.deepEqual(RADIATION_SIMULATION_CATALOG.map((scenario) => scenario.id), "ABCDEFGHIJKLMNOPQRS".split(""));
  for (const scenario of RADIATION_SIMULATION_CATALOG) {
    const result = runRadiationSimulation({
      scenarioId: scenario.id,
      parameters: defaultSimulationParameters(scenario),
    });
    assert.equal(result.scenarioId, scenario.id);
    assert.ok(["NOMINAL", "ELEVATED", "CRITICAL"].includes(result.severity));
    assert.ok(result.metrics.length >= 2);
    assert.ok(result.actions.length >= 1 && result.actions.length <= 2);
    assert.ok(result.protocol.length >= 2);
    assert.ok(result.events.length >= 2);
    assert.ok(result.chart.length >= 2);
    assert.equal(result.limitations.length >= 2, true);
  }
});

test("simulation is deterministic for identical parameters", () => {
  const scenario = RADIATION_SIMULATION_CATALOG[0];
  const input = { scenarioId: scenario.id, parameters: defaultSimulationParameters(scenario) };
  assert.deepEqual(runRadiationSimulation(input), runRadiationSimulation(input));
});

test("solar-storm parameters change severity and explanation", () => {
  const nominal = runRadiationSimulation({ scenarioId: "A", parameters: { doseRate: 0.1 } });
  const critical = runRadiationSimulation({ scenarioId: "A", parameters: { doseRate: 1.2 } });
  assert.equal(nominal.severity, "NOMINAL");
  assert.equal(critical.severity, "CRITICAL");
  assert.notEqual(nominal.explanation, critical.explanation);
});

test("invalid parameter bounds are rejected", () => {
  assert.throws(
    () => runRadiationSimulation({ scenarioId: "B", parameters: { returnMinutes: -1 } }),
    /must be at least/
  );
  assert.throws(() => runRadiationSimulation({ scenarioId: "Z" }), /Unknown radiation scenario/);
});

test("medical and research scenarios preserve safety boundaries", () => {
  const medical = runRadiationSimulation({ scenarioId: "K" });
  const bioshield = runRadiationSimulation({ scenarioId: "S" });
  assert.match(medical.explanation, /does not perform clinical triage/);
  assert.match(bioshield.explanation, /never claims proven/);
  assert.equal(bioshield.provenanceKind, "experimental");
});
