import { compartmentCenter } from "./generation.ts";
import { validateSpacecraft } from "./validation.ts";
import type {
  Coordinate,
  DoorState,
  HazardZone,
  MapEvent,
  MapSnapshot,
  MissionBranch,
  SerializedMapBundle,
  SpacecraftBlueprint,
  SpacecraftMapState,
} from "./types.ts";

export interface CrewIdentity {
  id: string;
  callsign: string;
  role: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function event(state: SpacecraftMapState, type: MapEvent["type"], summary: string, source: MapEvent["source"]): MapEvent {
  return { id: `${state.branchId}-${state.simulationMinute}-${state.events.length + 1}`, simulationMinute: state.simulationMinute, type, summary, source };
}

export function createInitialMapState(blueprint: SpacecraftBlueprint, missionId: string, crew: CrewIdentity[]): SpacecraftMapState {
  const preferred = ["CREW_QUARTERS", "COMMAND_BRIDGE", "ENGINEERING_BAY", "LABORATORY", "MEDICAL_BAY"];
  const positions = crew.map((character, index) => {
    const compartment = blueprint.compartments.find((item) => item.type === preferred[index % preferred.length])
      ?? blueprint.compartments.find((item) => item.type !== "CORRIDOR") as NonNullable<SpacecraftBlueprint["compartments"][number]>;
    const center = compartmentCenter(compartment);
    return {
      characterId: character.id,
      callsign: character.callsign,
      role: character.role,
      position: { x: center.x + (index % 2), y: center.y },
      destination: null,
      route: [],
      routeIndex: 0,
      movementStatus: "IDLE" as const,
      cumulativeModeledDoseMsv: 0,
    };
  });
  const base: SpacecraftMapState = {
    missionId,
    branchId: "main",
    simulationMinute: 0,
    crew: positions,
    doorStates: Object.fromEntries(blueprint.doors.map((door) => [door.id, door.defaultState])),
    zones: [],
    events: [],
    selectedCompartmentId: null,
  };
  return { ...base, events: [event(base, "GENERATION", `Spacecraft generated from seed ${blueprint.seed}.`, "system")] };
}

export function getCrewPosition(state: SpacecraftMapState, characterId: string) {
  return state.crew.find((member) => member.characterId === characterId) ?? null;
}

export function updateCrewPosition(state: SpacecraftMapState, characterId: string, position: Coordinate) {
  const next = clone(state);
  const crew = next.crew.find((member) => member.characterId === characterId);
  if (!crew) throw new Error(`Unknown crew member ${characterId}.`);
  crew.position = position;
  crew.destination = null;
  crew.route = [];
  crew.routeIndex = 0;
  crew.movementStatus = "ARRIVED";
  next.events.push(event(next, "MOVEMENT", `${crew.callsign} position updated to ${position.x}:${position.y}.`, "user"));
  return next;
}

export function assignCrewRoute(state: SpacecraftMapState, characterId: string, route: Coordinate[]) {
  const next = clone(state);
  const crew = next.crew.find((member) => member.characterId === characterId);
  if (!crew) throw new Error(`Unknown crew member ${characterId}.`);
  if (route.length < 2) throw new Error("A movement route must contain at least two points.");
  crew.route = route;
  crew.routeIndex = 0;
  crew.destination = route.at(-1) ?? null;
  crew.movementStatus = "MOVING";
  next.events.push(event(next, "ROUTE", `Route assigned to ${crew.callsign}.`, "user"));
  return next;
}

export function advanceCrewMovement(state: SpacecraftMapState, characterId: string, doseIncrementMsv = 0) {
  const next = clone(state);
  const crew = next.crew.find((member) => member.characterId === characterId);
  if (!crew) throw new Error(`Unknown crew member ${characterId}.`);
  if (crew.movementStatus !== "MOVING" || crew.route.length === 0) return next;
  crew.routeIndex = Math.min(crew.routeIndex + 1, crew.route.length - 1);
  crew.position = crew.route[crew.routeIndex];
  crew.cumulativeModeledDoseMsv = Math.round((crew.cumulativeModeledDoseMsv + Math.max(0, doseIncrementMsv)) * 1_000_000) / 1_000_000;
  next.simulationMinute += 1;
  if (crew.routeIndex >= crew.route.length - 1) {
    crew.movementStatus = "ARRIVED";
    crew.destination = null;
    next.events.push(event(next, "MOVEMENT", `${crew.callsign} arrived at the assigned destination.`, "system"));
  }
  return next;
}

export function setHazardZone(state: SpacecraftMapState, zone: HazardZone) {
  const next = clone(state);
  const index = next.zones.findIndex((item) => item.id === zone.id);
  if (index >= 0) next.zones[index] = clone(zone); else next.zones.push(clone(zone));
  next.events.push(event(next, "HAZARD", `${zone.type} zone ${zone.id} ${zone.active ? "activated" : "updated"}.`, zone.source));
  return next;
}

export function setDoorState(state: SpacecraftMapState, doorId: string, doorState: DoorState) {
  if (!(doorId in state.doorStates)) throw new Error(`Unknown door ${doorId}.`);
  const next = clone(state);
  next.doorStates[doorId] = doorState;
  next.events.push(event(next, "DOOR", `Door ${doorId} changed to ${doorState}.`, "user"));
  return next;
}

export function createSnapshot(blueprint: SpacecraftBlueprint, state: SpacecraftMapState, label: string): MapSnapshot {
  return {
    id: `snapshot-${state.branchId}-${state.simulationMinute}-${state.events.length}`,
    label,
    createdAtSimulationMinute: state.simulationMinute,
    blueprint: clone(blueprint),
    state: clone(state),
  };
}

export function createMissionBranch(snapshot: MapSnapshot, name: string, branchId: string): MissionBranch {
  const branched = clone(snapshot);
  branched.state.branchId = branchId;
  branched.state.events.push(event(branched.state, "BRANCH", `Alternative branch ${name} created.`, "user"));
  return { id: branchId, name, parentBranchId: snapshot.state.branchId, createdFromSnapshotId: snapshot.id, snapshot: branched };
}

export function serializeMap(blueprint: SpacecraftBlueprint, state: SpacecraftMapState, snapshots: MapSnapshot[] = [], branches: MissionBranch[] = []) {
  const bundle: SerializedMapBundle = { schemaVersion: 1, blueprint: clone(blueprint), state: clone(state), snapshots: clone(snapshots), branches: clone(branches) };
  return JSON.stringify(bundle);
}

export function restoreMap(serialized: string): SerializedMapBundle {
  const parsed = JSON.parse(serialized) as Partial<SerializedMapBundle>;
  if (parsed.schemaVersion !== 1 || !parsed.blueprint || !parsed.state || !Array.isArray(parsed.snapshots) || !Array.isArray(parsed.branches)) throw new Error("Unsupported or incomplete map bundle.");
  const validation = validateSpacecraft(parsed.blueprint);
  if (!validation.valid) throw new Error(`Restored blueprint is invalid: ${validation.errors.join(" ")}`);
  return parsed as SerializedMapBundle;
}
