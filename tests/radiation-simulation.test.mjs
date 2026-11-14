import assert from "node:assert/strict";
import test from "node:test";

import {
  RADIATION_SIMULATION_CATALOG,
  defaultSimulationParameters,
  runRadiationSimulation,
} from "../src/lib/radiation/simulation.ts";
import {
  PARAMETER_GROUPS,
  RADIATION_WORKBENCH_CATALOG,
  parametersForPreset,
  validateWorkbenchParameters,
} from "../src/lib/radiation/simulation-ux.ts";

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

test("all A-S workbench scenarios include complete newcomer guidance", () => {
  assert.equal(RADIATION_WORKBENCH_CATALOG.length, 19);
  for (const scenario of RADIATION_WORKBENCH_CATALOG) {
    assert.ok(scenario.whatsHappening.length > 60, `${scenario.id} needs a plain-language situation description`);
    assert.ok(scenario.whatVitalisDoes.length > 60, `${scenario.id} needs a plain-language behavior description`);
    assert.equal(scenario.previewEvents.length, 3);
    assert.equal(scenario.resultHighlights.length, 3);
    assert.ok(scenario.presets.length >= 2);
    for (const parameter of scenario.parameters) {
      assert.ok(PARAMETER_GROUPS.includes(parameter.group), `${scenario.id}/${parameter.key} has an invalid group`);
      assert.ok(parameter.tooltip.length > parameter.help.length, `${scenario.id}/${parameter.key} needs a complete tooltip`);
    }
  }
});

test("every workbench preset produces a valid real engine result", () => {
  for (const scenario of RADIATION_WORKBENCH_CATALOG) {
    for (const preset of scenario.presets) {
      const parameters = parametersForPreset(scenario, preset.id);
      assert.deepEqual(validateWorkbenchParameters(scenario, parameters), {}, `${scenario.id}/${preset.id} must be valid`);
      const result = runRadiationSimulation({ scenarioId: scenario.id, parameters });
      assert.equal(result.scenarioId, scenario.id);
      assert.ok(result.metrics.length >= 2);
      assert.ok(result.events.every((event, index, events) => index === 0 || event.offsetMinutes >= events[index - 1].offsetMinutes));
    }
  }
});

test("workbench validation blocks cross-field mistakes", () => {
  const storm = RADIATION_WORKBENCH_CATALOG.find((scenario) => scenario.id === "A");
  const extension = RADIATION_WORKBENCH_CATALOG.find((scenario) => scenario.id === "N");
  assert.ok(storm && extension);
  const stormErrors = validateWorkbenchParameters(storm, { ...defaultSimulationParameters(storm), elevatedThreshold: 4, criticalThreshold: 0.05 });
  assert.match(stormErrors.criticalThreshold, /higher/);
  const extensionErrors = validateWorkbenchParameters(extension, { ...defaultSimulationParameters(extension), originalHours: 300, extendedHours: 100 });
  assert.match(extensionErrors.extendedHours, /cannot be shorter/);
});

test("medical and research scenarios preserve safety boundaries", () => {
  const medical = runRadiationSimulation({ scenarioId: "K" });
  const bioshield = runRadiationSimulation({ scenarioId: "S" });
  assert.match(medical.explanation, /does not perform clinical triage/);
  assert.match(bioshield.explanation, /never claims proven/);
  assert.equal(bioshield.provenanceKind, "experimental");
});
