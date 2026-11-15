import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExposureForecast,
  detectSensorDisagreement,
  integrateDoseRateSamples,
  normalizeDoseRate,
  validateRadiationTelemetryPayload,
} from "../src/lib/hazards/01-radiation.ts";
import { normalizeDonkiEvent } from "../src/lib/radiation/donki.ts";

test("normalizes equivalent dose-rate units without mixing quantity families", () => {
  assert.deepEqual(normalizeDoseRate(250, "µSv/h"), {
    family: "equivalent",
    value: 0.25,
    unit: "mSv/h",
  });
  assert.deepEqual(normalizeDoseRate(164.9, "µSv/h"), {
    family: "equivalent",
    value: 0.1649,
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

test("extracts instruments, linked events, and HTTPS link from NASA DONKI RBE events", () => {
  const normalized = normalizeDonkiEvent("RBE", {
    rbeID: "2026-10-16T13:20:00-RBE-001",
    eventTime: "2026-10-16T13:20Z",
    instruments: [{ displayName: "GOES-P: SEISS >2MeV" }],
    linkedEvents: [{ activityID: "2026-10-08T16:24:00-CME-001" }, { activityID: "2026-10-08T16:53:00-CME-001" }],
    link: "https://ccmc.gsfc.nasa.gov/DONKI/view/RBE/49129/-1",
  });
  assert.equal(normalized.eventId, "2026-10-16T13:20:00-RBE-001");
  assert.match(normalized.summary, /GOES-P: SEISS >2MeV/);
  assert.match(normalized.summary, /2026-10-08T16:24:00-CME-001 \(\+1\)/);
  assert.equal(normalized.link, "https://ccmc.gsfc.nasa.gov/DONKI/view/RBE/49129/-1");
});

test("detects compartment sensor disagreement without mixing Gy and Sv", () => {
  const spread = detectSensorDisagreement(
    [
      { family: "equivalent", value: 0.14, unit: "mSv/h" },
      { family: "equivalent", value: 0.58, unit: "mSv/h" },
    ],
    35
  );
  assert.equal(spread.supported, true);
  assert.equal(spread.disagreement, true);

  const mixed = detectSensorDisagreement(
    [
      { family: "equivalent", value: 0.14, unit: "mSv/h" },
      { family: "absorbed", value: 0.58, unit: "mGy/h" },
    ],
    35
  );
  assert.equal(mixed.supported, false);
});
