import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workbenchPath = new URL("../src/components/hazards/01-radiation.tsx", import.meta.url);
const tooltipPath = new URL("../src/components/ui/InfoTooltip.tsx", import.meta.url);
const mapPath = new URL("../src/components/spacecraft/MissionMapWorkbench.tsx", import.meta.url);
const telemetryPath = new URL("../src/components/radiation/RadiationTelemetryCenter.tsx", import.meta.url);

test("Workbench uses progressive disclosure instead of duplicated parameter help", async () => {
  const source = await readFile(workbenchPath, "utf8");
  assert.match(source, /READY TO SIMULATE/);
  assert.match(source, /ADVANCED PARAMETERS/);
  assert.match(source, /TECHNICAL DETAILS/);
  assert.match(source, /workspaceTab === "telemetry"/);
  assert.match(source, /workspaceTab === "engineering"/);
  assert.doesNotMatch(source, /\{parameter\.help\}/);
});

test("shared tooltip contract covers portal, pointer, keyboard and outside-click behavior", async () => {
  const source = await readFile(tooltipPath, "utf8");
  assert.match(source, /createPortal/);
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onFocus/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /pointerdown/);
});

test("map exposes the four interaction modes and all A-S projections", async () => {
  const source = await readFile(mapPath, "utf8");
  for (const mode of ["EXPLORE", "ROUTE", "EDIT_ZONES", "EVENTS"]) assert.match(source, new RegExp(mode));
  assert.match(source, /RADIATION_SCENARIO_PROJECTIONS/);
  assert.match(source, /PROJECT CURRENT RESULT/);
});

test("telemetry center exposes autonomous controls and all seven functional surfaces", async () => {
  const source = await readFile(telemetryPath, "utf8");
  for (const control of ["DEMO", "LIVE", "PAUSE", "RESUME", "RESET", "NORMAL", "ELEVATED", "CRITICAL"]) {
    assert.match(source, new RegExp(control));
  }
  for (const surface of ["CREW EXPOSURE", "COMPARTMENT SENSORS", "IMMEDIATE HORIZON", "PROLONGED HORIZON", "NASA DONKI CONTEXT", "EMERGENCY STATE", "EVENT HISTORY"]) {
    assert.match(source, new RegExp(surface));
  }
  assert.match(source, /setSensorOnline/);
  assert.match(source, /acknowledgeTelemetryAlert/);
  assert.match(source, /InfoTooltip/);
});
