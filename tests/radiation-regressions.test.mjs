import assert from "node:assert/strict";
import test from "node:test";
import { runRadiationSimulation } from "../src/lib/radiation/simulation.ts";

test("scenario A returns events in chronological order", () => {
  const result = runRadiationSimulation({
    scenarioId: "A",
    parameters: { routeMinutes: 1, ackWindow: 30 },
  });
  assert.deepEqual(
    result.events.map((event) => event.offsetMinutes),
    [...result.events].map((event) => event.offsetMinutes).sort((a, b) => a - b)
  );
});

test("scenario A rejects a critical threshold below the elevated threshold", () => {
  assert.throws(
    () => runRadiationSimulation({
      scenarioId: "A",
      parameters: { doseRate: 0.2, elevatedThreshold: 4, criticalThreshold: 0.05 },
    }),
    /critical threshold must be greater/i
  );
});

test("scenario A does not announce acknowledgement escalation for a nominal rate", () => {
  const result = runRadiationSimulation({
    scenarioId: "A",
    parameters: { doseRate: 0.1, elevatedThreshold: 0.3, criticalThreshold: 0.8, captainAcknowledged: false },
  });
  assert.equal(result.severity, "NOMINAL");
  assert.match(result.summary, /not active/i);
  assert.doesNotMatch(`${result.summary} ${result.explanation}`, /triggers|expired|overdue/i);
  assert.equal(result.events.some((event) => /escalat/i.test(event.label)), false);
});

test("scenario C compares crew exposure symmetrically", () => {
  const result = runRadiationSimulation({
    scenarioId: "C",
    parameters: { higherDose: 0, peerDose: 200, differenceThreshold: 12 },
  });
  assert.equal(result.severity, "ELEVATED");
  assert.equal(result.comparisonValue, 200);
  assert.match(result.explanation, /200 mSv/);
});

test("scenario I flags a positive rate after a zero baseline without inventing a percentage", () => {
  const result = runRadiationSimulation({
    scenarioId: "I",
    parameters: { beforeRate: 0, afterRate: 2, measurementUncertainty: 10 },
  });
  assert.equal(result.severity, "ELEVATED");
  assert.equal(result.comparisonValue, 2);
  assert.equal(result.comparisonUnit, "mSv/h");
  assert.match(result.explanation, /zero baseline|absolute increase/i);
});

test("scenario M keeps zero local and neighbor readings nominal", () => {
  const result = runRadiationSimulation({
    scenarioId: "M",
    parameters: { localRate: 0, neighborRate: 0, sourceProcedureLoaded: true },
  });
  assert.equal(result.severity, "NOMINAL");
  assert.doesNotMatch(result.events.map((event) => event.label).join(" "), /anomaly detected/i);
});

test("scenario N rejects a revised duration shorter than the original extension baseline", () => {
  assert.throws(
    () => runRadiationSimulation({
      scenarioId: "N",
      parameters: { originalHours: 300, extendedHours: 100, doseRate: 0.5 },
    }),
    /extended remaining time must be greater than or equal/i
  );
});

test("explicit null input is rejected instead of replaced by a default", () => {
  assert.throws(
    () => runRadiationSimulation({ scenarioId: "A", parameters: { doseRate: null } }),
    /onboard dose rate must be a finite number/i
  );
});

test("scenario L returns a concrete capacity-safe crew allocation", () => {
  const result = runRadiationSimulation({
    scenarioId: "L",
    parameters: { crewCount: 5, primaryCapacity: 3, secondaryCapacity: 2, secondaryReady: true },
  });
  assert.equal(result.severity, "NOMINAL");
  assert.equal(result.assignments?.length, 5);
  assert.equal(result.assignments?.filter((item) => item.shelter === "Primary shelter").length, 3);
  assert.equal(result.assignments?.filter((item) => item.shelter === "Secondary shelter").length, 2);
});
