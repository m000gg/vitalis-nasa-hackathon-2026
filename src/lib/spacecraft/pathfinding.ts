import { getTile } from "./generation.ts";
import { tileId, type Coordinate, type HazardZone, type RouteOptions, type RouteResult, type SpacecraftBlueprint, type SpacecraftMapState, type SpacecraftTile } from "./types.ts";

const TILE_METERS = 1.5;

function manhattan(a: Coordinate, b: Coordinate) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function radiationRate(tile: SpacecraftTile, zones: HazardZone[]) {
  let rate = 0;
  for (const zone of zones) {
    if (!zone.active || zone.type !== "radiation" || !zone.affectedTiles.includes(tile.id)) continue;
    if ("doseRateMsvPerHour" in zone.parameters) rate += zone.parameters.doseRateMsvPerHour;
  }
  return rate;
}

function isForbidden(tile: SpacecraftTile, state: SpacecraftMapState, options: RouteOptions, blueprint: SpacecraftBlueprint) {
  if (!tile.passable) return true;
  const door = blueprint.doors.find((item) => item.position.x === tile.x && item.position.y === tile.y);
  if (door && state.doorStates[door.id] !== "OPEN") return true;
  const zones = state.zones.filter((zone) => zone.active && zone.affectedTiles.includes(tile.id));
  if (zones.some((zone) => options.avoidZoneIds?.includes(zone.id))) return true;
  if (zones.some((zone) => zone.type === "blocked")) return true;
  if (zones.some((zone) => zone.type === "restricted" && "allowedCharacterIds" in zone.parameters && options.characterId && !zone.parameters.allowedCharacterIds.includes(options.characterId))) return true;
  if (options.mode === "safe" && zones.some((zone) => zone.severity === "CRITICAL" && zone.type !== "safe-shelter")) return true;
  return false;
}

function movementCost(tile: SpacecraftTile, state: SpacecraftMapState, options: RouteOptions) {
  if (options.mode === "fastest") {
    if (tile.type === "CORRIDOR") return 0.65;
    if (tile.type === "DOOR") return 1.25;
    if (tile.type === "EQUIPMENT") return 1.4;
  }
  if (options.mode === "lowest-radiation") return 1 + radiationRate(tile, state.zones) * 40;
  return 1;
}

function reconstruct(cameFrom: Map<string, string>, current: string) {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current) as string;
    path.push(current);
  }
  return path.reverse().map((id) => {
    const [x, y] = id.split(":").map(Number);
    return { x, y };
  });
}

export function calculateRouteExposure(route: Coordinate[], blueprint: SpacecraftBlueprint, state: SpacecraftMapState, metersPerSecond = 1.2) {
  if (!state.zones.some((zone) => zone.active && zone.type === "radiation")) return { doseMsv: null, dataComplete: false };
  const secondsPerTile = TILE_METERS / Math.max(0.1, metersPerSecond);
  let doseMsv = 0;
  for (const point of route) {
    const tile = getTile(blueprint, point.x, point.y);
    if (tile) doseMsv += radiationRate(tile, state.zones) * secondsPerTile / 3600;
  }
  return { doseMsv, dataComplete: true };
}

export function findRoute(
  blueprint: SpacecraftBlueprint,
  state: SpacecraftMapState,
  start: Coordinate,
  destination: Coordinate,
  options: RouteOptions = { mode: "shortest" }
): RouteResult {
  const startTile = getTile(blueprint, start.x, start.y);
  const destinationTile = getTile(blueprint, destination.x, destination.y);
  if (!startTile?.passable || !destinationTile?.passable) {
    return { found: false, mode: options.mode, path: [], lengthTiles: 0, estimatedSeconds: 0, modeledRadiationDoseMsv: null, radiationDataComplete: false, warnings: ["Start and destination must both be passable tiles."] };
  }
  const startId = tileId(start.x, start.y);
  const goalId = tileId(destination.x, destination.y);
  const heuristicScale = options.mode === "fastest" ? 0.65 : 1;
  const open = new Set([startId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map([[startId, 0]]);
  const fScore = new Map([[startId, manhattan(start, destination) * heuristicScale]]);

  while (open.size > 0) {
    const currentId = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0];
    if (currentId === goalId) {
      const path = reconstruct(cameFrom, currentId);
      const metersPerSecond = Math.max(0.1, options.metersPerSecond ?? 1.2);
      const exposure = calculateRouteExposure(path, blueprint, state, metersPerSecond);
      return {
        found: true,
        mode: options.mode,
        path,
        lengthTiles: Math.max(0, path.length - 1),
        estimatedSeconds: Math.round(Math.max(0, path.length - 1) * TILE_METERS / metersPerSecond),
        modeledRadiationDoseMsv: exposure.doseMsv === null ? null : Math.round(exposure.doseMsv * 1_000_000) / 1_000_000,
        radiationDataComplete: exposure.dataComplete,
        warnings: exposure.dataComplete ? [] : ["No compatible radiation field is active; route dose is unavailable rather than assumed."],
      };
    }
    open.delete(currentId);
    const [x, y] = currentId.split(":").map(Number);
    for (const next of [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]) {
      const tile = getTile(blueprint, next.x, next.y);
      if (!tile || isForbidden(tile, state, options, blueprint)) continue;
      const nextId = tile.id;
      const tentative = (gScore.get(currentId) ?? Infinity) + movementCost(tile, state, options);
      if (tentative >= (gScore.get(nextId) ?? Infinity)) continue;
      cameFrom.set(nextId, currentId);
      gScore.set(nextId, tentative);
      fScore.set(nextId, tentative + manhattan(next, destination) * heuristicScale);
      open.add(nextId);
    }
  }
  return { found: false, mode: options.mode, path: [], lengthTiles: 0, estimatedSeconds: 0, modeledRadiationDoseMsv: null, radiationDataComplete: false, warnings: ["No traversable route satisfies the selected constraints."] };
}
