import { compartmentCenter, getTile } from "./generation.ts";
import type { Coordinate, MapValidationResult, SpacecraftBlueprint } from "./types.ts";

const REQUIRED = ["COMMAND_BRIDGE", "CREW_QUARTERS", "MEDICAL_BAY", "RADIATION_SHELTER", "LABORATORY", "ENGINEERING_BAY", "LIFE_SUPPORT", "STORAGE", "AIRLOCK"];

function reachableTiles(blueprint: SpacecraftBlueprint, start: Coordinate) {
  const reached = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift() as Coordinate;
    const id = `${current.x}:${current.y}`;
    if (reached.has(id)) continue;
    const tile = getTile(blueprint, current.x, current.y);
    if (!tile?.passable) continue;
    reached.add(id);
    queue.push({ x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y }, { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 });
  }
  return reached;
}

export function validateSpacecraft(blueprint: SpacecraftBlueprint): MapValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const types = new Set(blueprint.compartments.map((compartment) => compartment.type));
  for (const required of REQUIRED) if (!types.has(required as never)) errors.push(`Missing required compartment: ${required}.`);
  const corridor = blueprint.compartments.find((compartment) => compartment.type === "CORRIDOR");
  if (!corridor) errors.push("Central corridor is missing.");
  const center = { x: Math.floor(blueprint.width / 2), y: Math.floor(blueprint.height / 2) };
  const startTile = blueprint.tiles
    .filter((tile) => tile.compartmentId === corridor?.id && tile.passable)
    .sort((a, b) => Math.abs(a.x - center.x) + Math.abs(a.y - center.y) - (Math.abs(b.x - center.x) + Math.abs(b.y - center.y)))[0];
  if (startTile) {
    const reached = reachableTiles(blueprint, startTile);
    for (const compartment of blueprint.compartments.filter((item) => item.type !== "CORRIDOR")) {
      const center = compartmentCenter(compartment);
      if (!reached.has(`${center.x}:${center.y}`)) errors.push(`${compartment.name} is not reachable from the central corridor.`);
    }
  }
  for (const door of blueprint.doors) {
    const tile = getTile(blueprint, door.position.x, door.position.y);
    if (tile?.type !== "DOOR") errors.push(`Door ${door.id} is not placed on a door tile.`);
    if (!door.connects.every((id) => blueprint.compartments.some((compartment) => compartment.id === id))) errors.push(`Door ${door.id} references an unknown compartment.`);
  }
  const shelters = blueprint.compartments.filter((compartment) => compartment.type === "RADIATION_SHELTER");
  if (shelters.reduce((sum, shelter) => sum + (shelter.capacity ?? 0), 0) < 4) warnings.push("Generated shelter capacity is below the standard four-person demo crew.");
  return { valid: errors.length === 0, errors, warnings };
}
