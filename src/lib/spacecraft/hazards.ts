import { compartmentCenter } from "./generation.ts";
import { findRoute } from "./pathfinding.ts";
import { setDoorState, setHazardZone } from "./state.ts";
import { runRadiationSimulation } from "../radiation/simulation.ts";
import type { HazardSeverity, HazardZone, SpacecraftBlueprint, SpacecraftMapState } from "./types.ts";

export interface HazardOverlayAdapter<TInput = unknown> {
  id: string;
  hazard: "radiation" | "isolation" | "distance" | "gravity" | "environment";
  status: "implemented" | "planned";
  apply: (blueprint: SpacecraftBlueprint, state: SpacecraftMapState, input: TInput) => SpacecraftMapState;
}

export function createRadiationZone(input: {
  id: string;
  affectedTiles: string[];
  doseRateMsvPerHour: number;
  severity: HazardSeverity;
  source?: HazardZone["source"];
}) : HazardZone {
  if (!Number.isFinite(input.doseRateMsvPerHour) || input.doseRateMsvPerHour < 0) throw new Error("Radiation dose rate must be a non-negative finite value.");
  return {
    id: input.id,
    type: "radiation",
    affectedTiles: [...new Set(input.affectedTiles)],
    severity: input.severity,
    parameters: { doseRateMsvPerHour: input.doseRateMsvPerHour, uncertaintyPercent: 20 },
    source: input.source ?? "simulated",
    active: true,
  };
}

export const radiationScenarioAAdapter: HazardOverlayAdapter<{ doseRate: number; elevatedThreshold: number; criticalThreshold: number }> = {
  id: "radiation-scenario-a",
  hazard: "radiation",
  status: "implemented",
  apply(blueprint, state, input) {
    const result = runRadiationSimulation({ scenarioId: "A", parameters: { ...input, routeMinutes: 6, ackWindow: 2, shelterRateMultiplier: 0.42, captainAcknowledged: false } });
    const exposedRooms = blueprint.compartments.filter((compartment) => compartment.type === "CREW_QUARTERS" || compartment.type === "CORRIDOR");
    const affectedTiles = blueprint.tiles.filter((tile) => tile.passable && exposedRooms.some((room) => room.id === tile.compartmentId)).map((tile) => tile.id);
    return setHazardZone(state, createRadiationZone({ id: "scenario-a-solar-storm", affectedTiles, doseRateMsvPerHour: input.doseRate, severity: result.severity, source: "simulated" }));
  },
};

export const radiationScenarioDAdapter: HazardOverlayAdapter<{ sensorA: number; sensorB: number; spreadThreshold: number }> = {
  id: "radiation-scenario-d",
  hazard: "radiation",
  status: "implemented",
  apply(blueprint, state, input) {
    const result = runRadiationSimulation({ scenarioId: "D", parameters: input });
    const engineering = blueprint.compartments.find((compartment) => compartment.type === "ENGINEERING_BAY");
    if (!engineering) return state;
    const affectedTiles = blueprint.tiles.filter((tile) => tile.passable && tile.compartmentId === engineering.id).map((tile) => tile.id);
    let next = setHazardZone(state, createRadiationZone({ id: "scenario-d-shield-check", affectedTiles, doseRateMsvPerHour: Math.max(input.sensorA, input.sensorB), severity: result.severity, source: "simulated" }));
    if (result.severity !== "NOMINAL") {
      const door = blueprint.doors.find((item) => item.connects.includes(engineering.id));
      if (door) next = setDoorState(next, door.id, "DAMAGED");
    }
    return next;
  },
};

export function allocateCrewToShelters(blueprint: SpacecraftBlueprint, state: SpacecraftMapState) {
  const shelters = blueprint.compartments.filter((compartment) => compartment.type === "RADIATION_SHELTER");
  const remaining = new Map(shelters.map((shelter) => [shelter.id, shelter.capacity ?? 0]));
  const assignments = state.crew.map((crew) => {
    const candidates = shelters
      .map((shelter) => ({ shelter, route: findRoute(blueprint, state, crew.position, compartmentCenter(shelter), { mode: "safe", characterId: crew.characterId }) }))
      .filter((candidate) => candidate.route.found && (remaining.get(candidate.shelter.id) ?? 0) > 0)
      .sort((a, b) => a.route.lengthTiles - b.route.lengthTiles);
    const selected = candidates[0];
    if (!selected) return { characterId: crew.characterId, callsign: crew.callsign, shelterId: null, route: null };
    remaining.set(selected.shelter.id, (remaining.get(selected.shelter.id) ?? 1) - 1);
    return { characterId: crew.characterId, callsign: crew.callsign, shelterId: selected.shelter.id, route: selected.route };
  });
  return { assignments, unassigned: assignments.filter((assignment) => assignment.shelterId === null).length };
}

export const HAZARD_ADAPTERS = [
  radiationScenarioAAdapter,
  radiationScenarioDAdapter,
  { id: "gravity-overlay", hazard: "gravity", status: "planned" },
  { id: "isolation-overlay", hazard: "isolation", status: "planned" },
  { id: "environment-overlay", hazard: "environment", status: "planned" },
  { id: "distance-overlay", hazard: "distance", status: "planned" },
] as const;
