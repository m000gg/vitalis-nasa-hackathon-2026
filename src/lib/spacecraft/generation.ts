import { seededRandom, seededShuffle } from "./random.ts";
import {
  tileId,
  type Compartment,
  type CompartmentType,
  type Door,
  type Equipment,
  type GenerationConfig,
  type Sensor,
  type SpacecraftBlueprint,
  type SpacecraftTile,
} from "./types.ts";

const ROOM_LABELS: Record<CompartmentType, string> = {
  COMMAND_BRIDGE: "Command Bridge",
  CREW_QUARTERS: "Crew Quarters",
  MEDICAL_BAY: "Medical Bay",
  RADIATION_SHELTER: "Radiation Storm Shelter",
  LABORATORY: "Laboratory",
  ENGINEERING_BAY: "Engineering Bay",
  LIFE_SUPPORT: "Life Support",
  STORAGE: "Storage",
  AIRLOCK: "Airlock",
  CORRIDOR: "Central Corridor",
  POWER_SECTION: "Power Section",
};

const REQUIRED_ROOMS: CompartmentType[] = [
  "COMMAND_BRIDGE",
  "CREW_QUARTERS",
  "MEDICAL_BAY",
  "RADIATION_SHELTER",
  "LABORATORY",
  "ENGINEERING_BAY",
  "LIFE_SUPPORT",
  "STORAGE",
  "AIRLOCK",
];

function equipmentKind(type: CompartmentType): Equipment["kind"] {
  if (type === "MEDICAL_BAY") return "medical";
  if (type === "LABORATORY") return "research";
  if (type === "LIFE_SUPPORT") return "life-support";
  if (type === "POWER_SECTION" || type === "ENGINEERING_BAY") return "power";
  return "communications";
}

export function generateSpacecraft(config: GenerationConfig = {}, seed = "vitalis-demo") : SpacecraftBlueprint {
  const width = Math.max(42, Math.min(64, Math.round(config.width ?? 48)));
  const height = Math.max(26, Math.min(38, Math.round(config.height ?? 30)));
  const random = seededRandom(seed);
  const corridorY = Math.floor(height / 2);
  const tiles = new Map<string, SpacecraftTile>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.set(tileId(x, y), { id: tileId(x, y), x, y, type: "BLOCKED", compartmentId: null, passable: false });
    }
  }

  const setTile = (x: number, y: number, tile: Partial<SpacecraftTile>) => {
    const id = tileId(x, y);
    tiles.set(id, { ...(tiles.get(id) as SpacecraftTile), ...tile, id, x, y });
  };

  const corridor: Compartment = {
    id: "comp-corridor",
    name: ROOM_LABELS.CORRIDOR,
    type: "CORRIDOR",
    x: 1,
    y: corridorY - 2,
    width: width - 2,
    height: 5,
    capacity: null,
    restrictedTo: [],
    equipmentIds: [],
    sensorIds: [],
  };
  for (let y = corridor.y; y < corridor.y + corridor.height; y += 1) {
    for (let x = corridor.x; x < corridor.x + corridor.width; x += 1) {
      const edge = y === corridor.y || y === corridor.y + corridor.height - 1 || x === corridor.x || x === corridor.x + corridor.width - 1;
      setTile(x, y, { type: edge ? "WALL" : "CORRIDOR", passable: !edge, compartmentId: corridor.id });
    }
  }

  const requestedRooms = config.includePowerSection === false ? REQUIRED_ROOMS : [...REQUIRED_ROOMS, "POWER_SECTION" as const];
  const fixedEnds: CompartmentType[] = ["COMMAND_BRIDGE", "AIRLOCK"];
  const middle = seededShuffle(requestedRooms.filter((type) => !fixedEnds.includes(type)), random);
  const ordered = ["COMMAND_BRIDGE" as const, ...middle, "AIRLOCK" as const];
  const columns = 5;
  const horizontalStep = Math.floor((width - 6) / columns);
  const roomHeight = Math.max(8, Math.min(10, corridorY - 4));
  const compartments: Compartment[] = [corridor];
  const doors: Door[] = [];
  const sensors: Sensor[] = [];
  const equipment: Equipment[] = [];

  ordered.slice(0, columns * 2).forEach((type, index) => {
    const column = index % columns;
    const above = index < columns;
    const roomWidth = Math.max(6, Math.min(horizontalStep - 1, 6 + Math.floor(random() * 2)));
    const x = 2 + column * horizontalStep;
    const y = above ? 2 : corridorY + 3;
    const id = `comp-${type.toLowerCase().replaceAll("_", "-")}`;
    const equipmentId = `equipment-${id}`;
    const sensorId = `sensor-${id}`;
    const room: Compartment = {
      id,
      name: ROOM_LABELS[type],
      type,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
      capacity: type === "RADIATION_SHELTER" ? 4 + Math.floor(random() * 3) : null,
      restrictedTo: [],
      equipmentIds: [equipmentId],
      sensorIds: [sensorId],
    };
    compartments.push(room);
    for (let roomY = y; roomY < y + roomHeight; roomY += 1) {
      for (let roomX = x; roomX < x + roomWidth; roomX += 1) {
        const edge = roomX === x || roomX === x + roomWidth - 1 || roomY === y || roomY === y + roomHeight - 1;
        setTile(roomX, roomY, {
          type: edge ? "WALL" : type === "AIRLOCK" ? "AIRLOCK" : "FLOOR",
          passable: !edge,
          compartmentId: id,
        });
      }
    }

    const doorX = x + Math.floor(roomWidth / 2);
    const doorY = above ? y + roomHeight - 1 : y;
    const doorId = `door-${id}`;
    setTile(doorX, doorY, { type: "DOOR", passable: true, compartmentId: id });
    const connectorEnd = above ? corridorY : corridorY;
    const start = Math.min(doorY, connectorEnd);
    const end = Math.max(doorY, connectorEnd);
    for (let connectorY = start; connectorY <= end; connectorY += 1) {
      if (connectorY !== doorY) setTile(doorX, connectorY, { type: "CORRIDOR", passable: true, compartmentId: corridor.id });
    }
    doors.push({ id: doorId, position: { x: doorX, y: doorY }, connects: [id, corridor.id], defaultState: "OPEN" });

    const center = { x: x + Math.floor(roomWidth / 2), y: y + Math.floor(roomHeight / 2) };
    sensors.push({ id: sensorId, kind: "dosimeter", position: center, compartmentId: id, unit: "mSv/h" });
    equipment.push({ id: equipmentId, kind: equipmentKind(type), label: `${ROOM_LABELS[type]} system`, position: { x: center.x - 1, y: center.y }, compartmentId: id });
    setTile(center.x - 1, center.y, { type: "EQUIPMENT", passable: true, compartmentId: id });
  });

  return {
    id: `spacecraft-${seed.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "generated"}`,
    seed,
    generatorVersion: "1.0.0",
    width,
    height,
    tiles: [...tiles.values()],
    compartments,
    doors,
    sensors,
    equipment,
    createdFor: config.missionType === "SURFACE" ? "SURFACE" : "TRANSIT",
  };
}

export function getCompartment(blueprint: SpacecraftBlueprint, compartmentId: string) {
  return blueprint.compartments.find((compartment) => compartment.id === compartmentId) ?? null;
}

export function getTile(blueprint: SpacecraftBlueprint, x: number, y: number) {
  return blueprint.tiles.find((tile) => tile.x === x && tile.y === y) ?? null;
}

export function compartmentCenter(compartment: Compartment) {
  return { x: compartment.x + Math.floor(compartment.width / 2), y: compartment.y + Math.floor(compartment.height / 2) };
}
