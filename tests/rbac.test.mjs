import assert from "node:assert/strict";
import test from "node:test";

import {
  sanitizeActorInputsForRole,
  sanitizeHazardRecordsForRole,
  sanitizeHazardSamplesForRole,
} from "../src/lib/rbac.ts";

const sampleRecords = [
  {
    id: "r1",
    scenarioId: "sc_1",
    characterId: "mem-1",
    hazardSlug: "radiation",
    streamName: "Personal Dosimeter",
    rawValue: "28.5 µSv/h",
    payload: { doseRateValue: 28.5, doseRateUnit: "µSv/h", cumulativeDoseValue: 64.2, cumulativeDoseUnit: "mSv" },
    updatedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "r2",
    scenarioId: "sc_1",
    characterId: "mem-2",
    hazardSlug: "radiation",
    streamName: "Personal Dosimeter",
    rawValue: "190.0 µSv/h",
    payload: { doseRateValue: 190.0, doseRateUnit: "µSv/h", cumulativeDoseValue: 145.0, cumulativeDoseUnit: "mSv" },
    updatedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "r3",
    scenarioId: "sc_1",
    characterId: "mem-2",
    hazardSlug: "isolation",
    streamName: "60-Second Self-Check (Private)",
    rawValue: "PVT 310 ms",
    payload: {
      pvt_median_rt_ms: 310,
      subjective_fatigue_1_5: 3,
      mood_valence_private: 2,
      private_journal_note: "Feeling homesick today",
    },
    updatedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "r4",
    scenarioId: "sc_1",
    characterId: "lead-1",
    hazardSlug: "radiation",
    streamName: "Compartment Sensors",
    rawValue: "Storm Shelter: 24 µSv/h",
    payload: { compartmentId: "Storm Shelter", doseRateValue: 24, doseRateUnit: "µSv/h" },
    updatedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "r5",
    scenarioId: "sc_1",
    characterId: "mem-2",
    hazardSlug: "gravity",
    streamName: "Handgrip & Calf Volume",
    rawValue: "Calf -6.1%",
    payload: { calf_circumference_cm: 36.2, handgrip_kg: 41.0 },
    updatedAt: "2026-11-15T10:00:00Z",
  },
];

const sampleHistory = [
  {
    id: "s1",
    scenarioId: "sc_1",
    characterId: "mem-1",
    hazardSlug: "radiation",
    streamName: "Personal Dosimeter",
    numericValue: 28.5,
    samplePayload: { doseRateValue: 28.5, doseRateUnit: "µSv/h" },
    recordedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "s2",
    scenarioId: "sc_1",
    characterId: "mem-2",
    hazardSlug: "isolation",
    streamName: "Wearable / Actigraphy",
    numericValue: 5.9,
    samplePayload: { sleep_duration_h: 5.9 },
    recordedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "s3",
    scenarioId: "sc_1",
    characterId: "lead-1",
    hazardSlug: "environment",
    streamName: "Lab Air Readings",
    numericValue: 2.1,
    samplePayload: { co2MmHg: 2.1 },
    recordedAt: "2026-11-15T10:00:00Z",
  },
  {
    id: "s4",
    scenarioId: "sc_1",
    characterId: "mem-2",
    hazardSlug: "isolation",
    streamName: "60-Second Self-Check (Private)",
    numericValue: 310,
    samplePayload: { pvt_median_rt_ms: 310, mood_valence_private: 1, privateJournalNote: "Private" },
    recordedAt: "2026-11-15T10:00:00Z",
  },
];

test("RBAC member receives only own telemetry plus shared mission streams", () => {
  const recForMem1 = sanitizeHazardRecordsForRole(sampleRecords, "member", "mem-1");
  assert.deepEqual(
    recForMem1.map((r) => r.id),
    ["r1", "r4"]
  );

  const smpForMem1 = sanitizeHazardSamplesForRole(sampleHistory, "member", "mem-1");
  assert.deepEqual(
    smpForMem1.map((s) => s.id),
    ["s1", "s3"]
  );
});

test("RBAC member preserves own private fields while never seeing another member", () => {
  const recForMem2 = sanitizeHazardRecordsForRole(sampleRecords, "member", "mem-2");
  const selfCheck = recForMem2.find((r) => r.id === "r3");
  assert.ok(selfCheck);
  assert.equal(selfCheck.payload.private_journal_note, "Feeling homesick today");
  assert.equal(recForMem2.some((r) => r.characterId === "mem-1"), false);
});

test("RBAC lead sees all crew records with private subfields stripped", () => {
  const recForLead = sanitizeHazardRecordsForRole(sampleRecords, "lead", "lead-1");
  assert.equal(recForLead.length, 5);
  const mem2Check = recForLead.find((r) => r.id === "r3");
  assert.ok(mem2Check);
  assert.equal(mem2Check.payload.pvt_median_rt_ms, 310);
  assert.equal("mood_valence_private" in mem2Check.payload, false);
  assert.equal("private_journal_note" in mem2Check.payload, false);

  const smpForLead = sanitizeHazardSamplesForRole(sampleHistory, "lead", "lead-1");
  const mem2Smp = smpForLead.find((s) => s.id === "s4");
  assert.ok(mem2Smp);
  assert.equal(mem2Smp.samplePayload.pvt_median_rt_ms, 310);
  assert.equal("mood_valence_private" in mem2Smp.samplePayload, false);
  assert.equal("privateJournalNote" in mem2Smp.samplePayload, false);

  const cleanedInputs = sanitizeActorInputsForRole(
    { "60-Second Self-Check (Private)": "Journal: raw", "Wearable / Actigraphy": "7.2" },
    "isolation",
    "lead",
    recForLead
  );
  assert.equal(cleanedInputs["60-Second Self-Check (Private)"], "PVT 310 ms");
  assert.equal(cleanedInputs["Wearable / Actigraphy"], "7.2");
});
