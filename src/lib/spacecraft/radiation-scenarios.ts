import { createRadiationZone } from "./hazards.ts";
import { setHazardZone } from "./state.ts";
import type { CompartmentType, HazardSeverity, SpacecraftBlueprint, SpacecraftMapState } from "./types.ts";

export interface RadiationMapInput {
  scenarioId: string;
  severity: HazardSeverity;
  summary: string;
  parameters: Record<string, number | boolean | string>;
  metrics?: Array<{ label: string; value: number | string; unit?: string }>;
}

export interface RadiationScenarioProjection {
  id: string;
  title: string;
  kind: "spatial" | "analytic" | "hybrid";
  roomTypes: CompartmentType[];
  note: string;
}

export const RADIATION_SCENARIO_PROJECTIONS: RadiationScenarioProjection[] = [
  { id:"A", title:"Solar Storm During Sleep", kind:"spatial", roomTypes:["CREW_QUARTERS","CORRIDOR","RADIATION_SHELTER"], note:"Shows the exposed sleeping area, transit path, and shelter context." },
  { id:"B", title:"EVA Radiation Event", kind:"hybrid", roomTypes:["AIRLOCK"], note:"The map shows airlock operations; external EVA exposure remains analytic." },
  { id:"C", title:"Uneven Crew Exposure", kind:"analytic", roomTypes:[], note:"Crew dose comparison has no defensible compartment footprint." },
  { id:"D", title:"Shielding or Sensor Disagreement", kind:"spatial", roomTypes:["ENGINEERING_BAY"], note:"Focuses the compartment containing the simulated diagnostic check." },
  { id:"E", title:"Shelter Readiness", kind:"spatial", roomTypes:["RADIATION_SHELTER","CORRIDOR"], note:"Shows shelter access and preparation routes." },
  { id:"F", title:"Conflicting Sensor Readings", kind:"hybrid", roomTypes:["LABORATORY","ENGINEERING_BAY"], note:"Marks sensor locations without claiming which sensor is correct." },
  { id:"G", title:"Communications Delay", kind:"analytic", roomTypes:[], note:"Communications latency is mission context, not a radiation zone." },
  { id:"H", title:"Alternative Shelter Route", kind:"spatial", roomTypes:["CREW_QUARTERS","RADIATION_SHELTER","CORRIDOR"], note:"Supports route comparison between crew and shelter." },
  { id:"I", title:"Protective Cargo", kind:"spatial", roomTypes:["STORAGE"], note:"Maps the storage compartment used by the model." },
  { id:"J", title:"Surface Operations", kind:"hybrid", roomTypes:["AIRLOCK"], note:"Shows ingress/egress; surface exposure is represented analytically." },
  { id:"K", title:"Medical Priority", kind:"spatial", roomTypes:["MEDICAL_BAY","RADIATION_SHELTER"], note:"Shows medical and shelter destinations, not a diagnosis." },
  { id:"L", title:"Shelter Capacity", kind:"spatial", roomTypes:["RADIATION_SHELTER","CORRIDOR"], note:"Supports capacity allocation and reachable routes." },
  { id:"M", title:"Reactor Anomaly", kind:"spatial", roomTypes:["POWER_SECTION","ENGINEERING_BAY"], note:"Only maps installed power and engineering compartments." },
  { id:"N", title:"Mission Extension", kind:"analytic", roomTypes:[], note:"Duration-driven cumulative dose has no single room footprint." },
  { id:"O", title:"Component Contribution", kind:"analytic", roomTypes:[], note:"The result is a component calculation, not a spatial measurement." },
  { id:"P", title:"Separated Crew Contexts", kind:"hybrid", roomTypes:["CREW_QUARTERS","LABORATORY"], note:"Highlights contexts without inventing per-room readings." },
  { id:"Q", title:"Missing Telemetry", kind:"hybrid", roomTypes:["CORRIDOR"], note:"Displays missing or reconstructed coverage explicitly." },
  { id:"R", title:"Combined Hazard Response", kind:"spatial", roomTypes:["LIFE_SUPPORT","RADIATION_SHELTER","CORRIDOR"], note:"Shows the affected operational chain and shelter route." },
  { id:"S", title:"Research Comparison", kind:"analytic", roomTypes:[], note:"Research comparison stays analytic unless spatial inputs are supplied." },
];

function inferredDoseRate(input: RadiationMapInput): number | null {
  const candidates = ["doseRate", "onboardDoseRate", "sensorA", "sensorB", "currentRate", "newRate"];
  const values = candidates.map((key) => input.parameters[key]).filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  if (values.length) return Math.max(...values);
  const metric = input.metrics?.find((item) => item.unit === "mSv/h" && typeof item.value === "number");
  return metric && typeof metric.value === "number" ? metric.value : null;
}

export function projectRadiationScenario(blueprint: SpacecraftBlueprint, state: SpacecraftMapState, input: RadiationMapInput) {
  const projection = RADIATION_SCENARIO_PROJECTIONS.find((item) => item.id === input.scenarioId);
  if (!projection) throw new Error(`Unknown radiation scenario ${input.scenarioId}.`);
  const baseEvent = { id:`${state.branchId}-${state.simulationMinute}-scenario-${input.scenarioId}-${state.events.length+1}`, simulationMinute:state.simulationMinute, type:"HAZARD" as const, summary:`Scenario ${input.scenarioId}: ${input.summary} ${projection.note}`, source:"simulated" as const };
  if (projection.kind === "analytic") return { ...state, events:[...state.events, baseEvent] };
  const rooms = blueprint.compartments.filter((room) => projection.roomTypes.includes(room.type));
  const affectedTiles = blueprint.tiles.filter((tile) => tile.passable && rooms.some((room) => room.id === tile.compartmentId)).map((tile) => tile.id);
  const rate = inferredDoseRate(input);
  if (affectedTiles.length === 0 || rate === null) return { ...state, events:[...state.events, { ...baseEvent, summary:`${baseEvent.summary} No spatial dose overlay was created because compatible rate data was unavailable.` }] };
  return setHazardZone(state, createRadiationZone({ id:`scenario-${input.scenarioId.toLowerCase()}-projection`, affectedTiles, doseRateMsvPerHour:rate, severity:input.severity, source: input.scenarioId === "Q" ? "reconstructed" : "simulated" }));
}
