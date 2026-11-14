import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCrewMovement,
  allocateCrewToShelters,
  assignCrewRoute,
  compartmentCenter,
  createInitialMapState,
  createMissionBranch,
  createRadiationZone,
  createSnapshot,
  findRoute,
  generateSpacecraft,
  radiationScenarioAAdapter,
  restoreMap,
  serializeMap,
  setDoorState,
  setHazardZone,
  validateSpacecraft,
} from "../src/lib/spacecraft/index.ts";

const CREW = [
  { id: "crew-1", callsign: "Commander", role: "Commander" },
  { id: "crew-2", callsign: "CMO", role: "Medical Officer" },
  { id: "crew-3", callsign: "Engineer", role: "Engineer" },
  { id: "crew-4", callsign: "Science", role: "Scientist" },
];

function fixture(seed = "MAP-TEST") {
  const blueprint = generateSpacecraft({ includePowerSection: true }, seed);
  const state = createInitialMapState(blueprint, "mission-test", CREW);
  return { blueprint, state };
}

test("generation is deterministic for a seed and varies across seeds", () => {
  const first = generateSpacecraft({ includePowerSection: true }, "SAME-SEED");
  const second = generateSpacecraft({ includePowerSection: true }, "SAME-SEED");
  const other = generateSpacecraft({ includePowerSection: true }, "OTHER-SEED");

  assert.deepEqual(first, second);
  assert.notDeepEqual(
    first.compartments.map(({ id, x, y, width }) => ({ id, x, y, width })),
    other.compartments.map(({ id, x, y, width }) => ({ id, x, y, width })),
  );
});

test("generated spacecraft contains required connected compartments", () => {
  for (const seed of ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"]) {
    const blueprint = generateSpacecraft({}, seed);
    const validation = validateSpacecraft(blueprint);
    assert.equal(validation.valid, true, `${seed}: ${validation.errors.join(" ")}`);
    assert.ok(blueprint.compartments.some((room) => room.type === "RADIATION_SHELTER"));
    assert.ok(blueprint.doors.every((door) => door.connects.length === 2));
  }
});

test("closing the only compartment door blocks the route and reopening restores it", () => {
  const { blueprint, state } = fixture();
  const crew = state.crew[0];
  const medical = blueprint.compartments.find((room) => room.type === "MEDICAL_BAY");
  const door = blueprint.doors.find((item) => item.connects.includes(medical.id));
  assert.ok(medical && door);

  const openRoute = findRoute(blueprint, state, crew.position, compartmentCenter(medical), { mode: "shortest" });
  assert.equal(openRoute.found, true);

  const closed = setDoorState(state, door.id, "CLOSED");
  const blockedRoute = findRoute(blueprint, closed, crew.position, compartmentCenter(medical), { mode: "shortest" });
  assert.equal(blockedRoute.found, false);

  const reopened = setDoorState(closed, door.id, "OPEN");
  assert.equal(findRoute(blueprint, reopened, crew.position, compartmentCenter(medical), { mode: "shortest" }).found, true);
});

test("lowest-radiation routing can avoid a contaminated corridor lane", () => {
  const { blueprint, state } = fixture("ROUTE-CHOICE");
  const corridor = blueprint.compartments.find((room) => room.type === "CORRIDOR");
  const passable = blueprint.tiles.filter((tile) => tile.compartmentId === corridor.id && tile.passable);
  const middleY = Math.round(passable.reduce((sum, tile) => sum + tile.y, 0) / passable.length);
  const start = passable.find((tile) => tile.x === 4 && tile.y === middleY);
  const destination = passable.find((tile) => tile.x === blueprint.width - 5 && tile.y === middleY);
  assert.ok(start && destination);

  const contaminated = passable
    .filter((tile) => tile.y === middleY && tile.x > 10 && tile.x < blueprint.width - 10)
    .map((tile) => tile.id);
  const zoned = setHazardZone(state, createRadiationZone({
    id: "test-radiation-lane",
    affectedTiles: contaminated,
    doseRateMsvPerHour: 8,
    severity: "CRITICAL",
  }));

  const shortest = findRoute(blueprint, zoned, start, destination, { mode: "shortest" });
  const lowDose = findRoute(blueprint, zoned, start, destination, { mode: "lowest-radiation" });
  assert.equal(shortest.found, true);
  assert.equal(lowDose.found, true);
  assert.ok(lowDose.modeledRadiationDoseMsv <= shortest.modeledRadiationDoseMsv);
  assert.ok(lowDose.path.some((point) => point.y !== middleY));
});

test("crew movement advances virtual time and never adds a negative dose", () => {
  const { blueprint, state } = fixture("MOVEMENT");
  const crew = state.crew[0];
  const shelter = blueprint.compartments.find((room) => room.type === "RADIATION_SHELTER");
  const route = findRoute(blueprint, state, crew.position, compartmentCenter(shelter), { mode: "shortest" });
  assert.equal(route.found, true);

  let moving = assignCrewRoute(state, crew.characterId, route.path);
  moving = advanceCrewMovement(moving, crew.characterId, -4);
  const updated = moving.crew.find((member) => member.characterId === crew.characterId);
  assert.equal(moving.simulationMinute, 1);
  assert.equal(updated.cumulativeModeledDoseMsv, 0);
  assert.notDeepEqual(updated.position, crew.position);
});

test("serialization restores map state, snapshots, and independent branches", () => {
  const { blueprint, state } = fixture("BRANCHING");
  const snapshot = createSnapshot(blueprint, state, "Before event");
  const branch = createMissionBranch(snapshot, "Alternative 1", "branch-1");
  const changedBranch = setDoorState(branch.snapshot.state, blueprint.doors[0].id, "BLOCKED");

  assert.equal(state.doorStates[blueprint.doors[0].id], "OPEN");
  assert.equal(changedBranch.doorStates[blueprint.doors[0].id], "BLOCKED");

  const serialized = serializeMap(blueprint, changedBranch, [snapshot], [branch]);
  const restored = restoreMap(serialized);
  assert.deepEqual(restored.state, changedBranch);
  assert.equal(restored.snapshots.length, 1);
  assert.equal(restored.branches[0].parentBranchId, "main");
});

test("shelter allocation respects capacity and reports overflow", () => {
  const { blueprint, state } = fixture("CAPACITY");
  const shelter = blueprint.compartments.find((room) => room.type === "RADIATION_SHELTER");
  shelter.capacity = 1;
  const allocation = allocateCrewToShelters(blueprint, state);
  assert.equal(allocation.assignments.filter((item) => item.shelterId).length, 1);
  assert.equal(allocation.unassigned, CREW.length - 1);
});

test("radiation scenario A uses the existing engine and creates a simulated overlay", () => {
  const { blueprint, state } = fixture("SCENARIO-A");
  const updated = radiationScenarioAAdapter.apply(blueprint, state, {
    doseRate: 0.62,
    elevatedThreshold: 0.3,
    criticalThreshold: 0.8,
  });
  const zone = updated.zones.find((item) => item.id === "scenario-a-solar-storm");
  assert.ok(zone);
  assert.equal(zone.source, "simulated");
  assert.ok(zone.affectedTiles.length > 0);
  assert.equal(zone.parameters.doseRateMsvPerHour, 0.62);
});
