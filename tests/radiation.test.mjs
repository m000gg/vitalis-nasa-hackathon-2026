import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExposureForecast,
  integrateDoseRateSamples,
  normalizeDoseRate,
  validateRadiationTelemetryPayload,
} from "../src/lib/hazards/01-radiation.ts";

test("normalizes equivalent dose-rate units without mixing quantity families", () => {
  assert.deepEqual(normalizeDoseRate(250, "µSv/h"), {
    family: "equivalent",
    value: 0.25,
    unit: "mSv/h",
  });
  assert.equal(normalizeDoseRate(2, "mGy/h")?.family, "absorbed");
});

test("integrates compatible samples with a trapezoidal estimate", () => {
  const result = integrateDoseRateSamples([
    { family: "equivalent", value: 1, unit: "mSv/h", timestamp: "2026-11-14T10:00:00Z", uncertaintyPercent: null, qualityFlag: "valid", provenanceKind: "simulated" },
    { family: "equivalent", value: 3, unit: "mSv/h", timestamp: "2026-11-14T11:00:00Z", uncertaintyPercent: null, qualityFlag: "valid", provenanceKind: "simulated" },
  ]);
  assert.equal(result.supported, true);
  assert.equal(result.value, 2);
  assert.equal(result.unit, "mSv");
});

test("refuses to integrate absorbed and equivalent dose families together", () => {
  const result = integrateDoseRateSamples([
    { family: "absorbed", value: 1, unit: "mGy/h", timestamp: "2026-11-14T10:00:00Z", uncertaintyPercent: null, qualityFlag: "valid", provenanceKind: "measured" },
    { family: "equivalent", value: 1, unit: "mSv/h", timestamp: "2026-11-14T11:00:00Z", uncertaintyPercent: null, qualityFlag: "valid", provenanceKind: "measured" },
  ]);
  assert.equal(result.supported, false);
  assert.match(result.reason ?? "", /cannot be integrated together/);
});

test("builds a forecast only when units are compatible", () => {
  const forecast = buildExposureForecast({
    currentDose: { family: "equivalent", value: 10, unit: "mSv" },
    baselineRate: { family: "equivalent", value: 0.5, unit: "mSv/h" },
    remainingHours: 20,
    uncertaintyPercent: 20,
  });
  assert.equal(forecast.projectedValue, 20);
  assert.equal(forecast.lowerValue, 18);
  assert.equal(forecast.upperValue, 22);
});

test("validates radiation telemetry at the radiation-specific boundary", () => {
  assert.deepEqual(
    validateRadiationTelemetryPayload({
      streamName: "Personal Dosimeter",
      payload: { doseRateValue: 300, doseRateUnit: "µSv/h", measuredAt: "2026-11-14T10:00:00Z" },
    }),
    { valid: true }
  );
  assert.equal(
    validateRadiationTelemetryPayload({
      streamName: "Personal Dosimeter",
      payload: { doseRateValue: 0.3, doseRateUnit: "bananas/h" },
    }).valid,
    false
  );
});
