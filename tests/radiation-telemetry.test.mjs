import test from "node:test";
import assert from "node:assert/strict";
import {
  acknowledgeTelemetryAlert,
  advanceDemoTelemetry,
  computeImmediateForecast,
  computeProlongedForecast,
  createDemoTelemetryState,
  setDemoProfile,
  setSensorOnline,
  validateTelemetryThresholds,
} from "../src/lib/radiation/telemetry-engine.ts";

const compartments = [
  { id: "bridge", name: "Command Bridge", type: "COMMAND_BRIDGE", x: 0, y: 0, width: 4, height: 4, capacity: null, restrictedTo: [], equipmentIds: [], sensorIds: [] },
  { id: "shelter", name: "Radiation Shelter", type: "RADIATION_SHELTER", x: 4, y: 0, width: 4, height: 4, capacity: 4, restrictedTo: [], equipmentIds: [], sensorIds: [] },
  { id: "airlock", name: "Airlock", type: "AIRLOCK", x: 8, y: 0, width: 4, height: 4, capacity: null, restrictedTo: [], equipmentIds: [], sensorIds: [] },
];
const crew = [{ id: "cmdr", callsign: "Commander" }, { id: "cmo", callsign: "Medical" }];
const thresholds = { warningMsvPerHour: 0.5, criticalMsvPerHour: 1.5 };

function initial(seed = "TEST-SEED") {
  return createDemoTelemetryState({ seed, compartments, crew, thresholds });
}

test("demo telemetry is deterministic for the same seed and elapsed time", () => {
  const first = advanceDemoTelemetry(initial(), 2, thresholds);
  const second = advanceDemoTelemetry(initial(), 2, thresholds);
  assert.deepEqual(first, second);
});

test("crew dose integrates the same compartment stream", () => {
  const before = initial();
  const after = advanceDemoTelemetry(before, 60, thresholds);
  const member = after.crew[0];
  const assignedSensor = after.sensors.find((sensor) => sensor.compartmentId === member.compartmentId);
  assert.equal(member.currentDoseRateMsvPerHour, assignedSensor.doseRateMsvPerHour);
  assert.ok(member.cumulativeDoseMsv > 0);
  assert.ok(Math.abs(member.cumulativeDoseMsv - member.currentDoseRateMsvPerHour / 60) < 0.00001);
});

test("critical demo profile creates a derived alert and supports acknowledgement", () => {
  const critical = advanceDemoTelemetry(setDemoProfile(initial(), "CRITICAL"), 2, thresholds);
  assert.equal(critical.overallStatus, "CRITICAL");
  assert.equal(critical.alerts[0].severity, "CRITICAL");
  const acknowledged = acknowledgeTelemetryAlert(critical, critical.alerts[0].id);
  assert.equal(acknowledged.alerts[0].acknowledgedAtSecond, critical.simulationSecond);
});

test("failed sensor stops producing readings until restored", () => {
  const source = initial();
  const sensorId = source.sensors[0].id;
  const failed = advanceDemoTelemetry(setSensorOnline(source, sensorId, false), 2, thresholds);
  assert.equal(failed.sensors[0].status, "OFFLINE");
  assert.equal(failed.sensors[0].doseRateMsvPerHour, null);
  const restored = advanceDemoTelemetry(setSensorOnline(failed, sensorId, true), 2, thresholds);
  assert.notEqual(restored.sensors[0].doseRateMsvPerHour, null);
});

test("immediate forecast and prolonged scenarios derive from the current rate", () => {
  const state = advanceDemoTelemetry(setDemoProfile(initial(), "ELEVATED"), 30, thresholds);
  const immediate = computeImmediateForecast(state);
  const prolonged = computeProlongedForecast(state);
  assert.equal(immediate.horizons.map((item) => item.minutes).join(","), "15,60,360");
  assert.equal(prolonged.horizons.map((item) => item.hours).join(","), "24,168,720");
  assert.ok(immediate.horizons.every((item) => item.additionalDoseMsv >= 0));
  assert.equal(prolonged.horizons[0].constantRateDoseMsv, Math.round(state.ambientDoseRateMsvPerHour * 24 * 1e6) / 1e6);
});

test("threshold validation rejects negative and contradictory configurations", () => {
  assert.deepEqual(validateTelemetryThresholds(thresholds), []);
  assert.ok(validateTelemetryThresholds({ warningMsvPerHour: -1, criticalMsvPerHour: 0 }).length >= 2);
  assert.ok(validateTelemetryThresholds({ warningMsvPerHour: 2, criticalMsvPerHour: 1 }).some((error) => error.includes("higher")));
});
