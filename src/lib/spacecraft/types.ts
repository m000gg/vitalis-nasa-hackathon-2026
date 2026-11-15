export type Coordinate = { x: number; y: number };

export type TileType = "FLOOR" | "WALL" | "DOOR" | "CORRIDOR" | "AIRLOCK" | "EQUIPMENT" | "BLOCKED";
export type CompartmentType =
  | "COMMAND_BRIDGE"
  | "CREW_QUARTERS"
  | "MEDICAL_BAY"
  | "RADIATION_SHELTER"
  | "LABORATORY"
  | "ENGINEERING_BAY"
  | "LIFE_SUPPORT"
  | "STORAGE"
  | "AIRLOCK"
  | "CORRIDOR"
  | "POWER_SECTION";

export type DoorState = "OPEN" | "CLOSED" | "DAMAGED" | "BLOCKED";
export type HazardType = "radiation" | "temperature" | "pressure" | "oxygen" | "blocked" | "restricted" | "safe-shelter";
export type HazardSeverity = "NOMINAL" | "ELEVATED" | "CRITICAL";
export type HazardSource = "measured" | "modeled" | "simulated" | "reconstructed";
export type RouteMode = "shortest" | "fastest" | "lowest-radiation" | "safe";
export type ShapeFamily = "LINEAR" | "CROSS" | "T" | "Y" | "RING" | "ASYMMETRIC" | "CLUSTERED" | "CHAOTIC";
export type ShipSize = "COMPACT" | "STANDARD" | "LARGE";
export type CorridorComplexity = "LOW" | "MEDIUM" | "HIGH";
export type MapMode = "EXPLORE" | "ROUTE" | "EDIT_ZONES" | "EVENTS";

export interface SpacecraftTile extends Coordinate {
  id: string;
  type: TileType;
  compartmentId: string | null;
  passable: boolean;
}

export interface Compartment {
  id: string;
  name: string;
  type: CompartmentType;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number | null;
  restrictedTo: string[];
  equipmentIds: string[];
  sensorIds: string[];
}

export interface Door {
  id: string;
  position: Coordinate;
  connects: [string, string];
  defaultState: DoorState;
}

export interface Sensor {
  id: string;
  kind: "dosimeter" | "temperature" | "pressure" | "oxygen" | "general";
  position: Coordinate;
  compartmentId: string;
  unit: string;
}

export interface Equipment {
  id: string;
  kind: "life-support" | "medical" | "research" | "power" | "communications";
  label: string;
  position: Coordinate;
  compartmentId: string;
}

export type HazardParameters =
  | { doseRateMsvPerHour: number; uncertaintyPercent: number }
  | { temperatureCelsius: number }
  | { pressureKpa: number }
  | { oxygenPercent: number }
  | { reason: string }
  | { allowedCharacterIds: string[] }
  | { capacity: number };

export interface HazardZone {
  id: string;
  type: HazardType;
  affectedTiles: string[];
  severity: HazardSeverity;
  parameters: HazardParameters;
  source: HazardSource;
  active: boolean;
}

export interface SpacecraftBlueprint {
  id: string;
  seed: string;
  generatorVersion: "1.0.0" | "2.0.0";
  shapeFamily?: ShapeFamily;
  generationConfig?: Required<Pick<GenerationConfig, "shapeFamily" | "shipSize" | "compartmentCount" | "corridorComplexity" | "asymmetry" | "shelterCapacity" | "hazardDensity">>;
  width: number;
  height: number;
  tiles: SpacecraftTile[];
  compartments: Compartment[];
  doors: Door[];
  sensors: Sensor[];
  equipment: Equipment[];
  createdFor: "TRANSIT" | "SURFACE";
}

export interface CrewMapPosition {
  characterId: string;
  callsign: string;
  role: string;
  position: Coordinate;
  destination: Coordinate | null;
  route: Coordinate[];
  routeIndex: number;
  movementStatus: "IDLE" | "MOVING" | "ARRIVED" | "BLOCKED" | "SHELTERED" | "WAITING";
  cumulativeModeledDoseMsv: number;
}

export interface MapEvent {
  id: string;
  simulationMinute: number;
  type: "GENERATION" | "HAZARD" | "DOOR" | "ROUTE" | "MOVEMENT" | "BRANCH" | "SNAPSHOT";
  summary: string;
  source: HazardSource | "system" | "user";
}

export interface SpacecraftMapState {
  missionId: string;
  branchId: string;
  simulationMinute: number;
  crew: CrewMapPosition[];
  doorStates: Record<string, DoorState>;
  zones: HazardZone[];
  events: MapEvent[];
  selectedCompartmentId: string | null;
}

export interface MapSnapshot {
  id: string;
  label: string;
  createdAtSimulationMinute: number;
  blueprint: SpacecraftBlueprint;
  state: SpacecraftMapState;
}

export interface MissionBranch {
  id: string;
  name: string;
  parentBranchId: string | null;
  createdFromSnapshotId: string;
  snapshot: MapSnapshot;
}

export interface GenerationConfig {
  width?: number;
  height?: number;
  includePowerSection?: boolean;
  missionType?: "TRANSIT" | "SURFACE";
  shapeFamily?: ShapeFamily;
  shipSize?: ShipSize;
  compartmentCount?: number;
  corridorComplexity?: CorridorComplexity;
  asymmetry?: number;
  shelterCapacity?: number;
  hazardDensity?: number;
}

export interface MapHazardOverlay extends HazardZone {
  label?: string;
  uncertaintyPercent?: number;
}

export interface MissionMapEvent extends MapEvent {
  scenarioId?: string;
  focusCompartmentIds?: string[];
}

export interface MapSelection {
  kind: "tile" | "compartment" | "crew" | "event" | "none";
  id: string | null;
  position?: Coordinate;
}

export interface MapDataSource {
  id: string;
  label: string;
  provenance: HazardSource | "no-data";
  updatedAt?: string;
  uncertaintyPercent?: number;
}

export interface MapPlaybackState {
  cursor: number;
  playing: boolean;
  speed: 0.5 | 1 | 2 | 4;
  eventCount: number;
}

export interface MapScenarioAdapter<TInput = Record<string, unknown>> {
  scenarioId: string;
  title: string;
  projection: "spatial" | "analytic" | "hybrid";
  apply: (blueprint: SpacecraftBlueprint, state: SpacecraftMapState, input: TInput) => SpacecraftMapState;
}

export interface MapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RouteOptions {
  mode: RouteMode;
  characterId?: string;
  metersPerSecond?: number;
  avoidZoneIds?: string[];
}

export interface RouteResult {
  found: boolean;
  mode: RouteMode;
  path: Coordinate[];
  lengthTiles: number;
  estimatedSeconds: number;
  modeledRadiationDoseMsv: number | null;
  radiationDataComplete: boolean;
  warnings: string[];
}

export interface SerializedMapBundle {
  schemaVersion: 1;
  blueprint: SpacecraftBlueprint;
  state: SpacecraftMapState;
  snapshots: MapSnapshot[];
  branches: MissionBranch[];
}

export const tileId = (x: number, y: number) => `${x}:${y}`;
