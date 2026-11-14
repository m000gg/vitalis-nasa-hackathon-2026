# Spacecraft Map Engine

## Overview

The Spacecraft Map Engine is the shared spatial simulation layer for Vitalis+. It generates a deterministic 2D spacecraft, places mission crew, models doors and hazard zones, calculates traversable routes, advances movement in virtual time, and preserves alternative mission states.

The current interactive surface is available at `/mission-studio/map`. It is a decision-support demo, not a flight-certified digital twin. Geometry, route exposure and movement are explicitly modeled or simulated; they are not presented as measured NASA spacecraft data.

Implemented capabilities:

- deterministic seed-based spacecraft generation;
- required compartments, doors, sensors and equipment metadata;
- generator validation and room-connectivity checks;
- A* routing with shortest, fastest, lowest-radiation and safe modes;
- door, blocked-zone, restricted-zone and critical-zone route constraints;
- crew placement, route assignment and virtual-time movement;
- radiation scenario A and D adapters backed by the existing radiation engine;
- capacity-aware shelter allocation;
- browser-local state restoration, snapshots, undo/redo, JSON export and branches;
- a server-only persistence adapter and an unapplied Supabase schema proposal.

## Architecture

The engine separates immutable geometry from changing mission state:

| Layer | Responsibility | Main files |
| --- | --- | --- |
| Generation | Seeded ship geometry, rooms, doors, sensors and equipment | `src/lib/spacecraft/generation.ts`, `random.ts` |
| Validation | Required-room, door-reference and connectivity checks | `src/lib/spacecraft/validation.ts` |
| Simulation state | Crew positions, door states, zones, events, snapshots and branches | `src/lib/spacecraft/state.ts`, `types.ts` |
| Routing | A* search, route constraints, timing and modeled radiation dose | `src/lib/spacecraft/pathfinding.ts` |
| Hazard adapters | Translation from hazard-engine output to spatial zones or door changes | `src/lib/spacecraft/hazards.ts` |
| Persistence | Server-only optional map save/restore | `src/lib/spacecraft/persistence.ts` |
| Visualization | SVG map, controls, legend, zone editor and Mission Studio orchestration | `src/components/spacecraft/*` |

`SpacecraftBlueprint` is immutable for a generated ship. `SpacecraftMapState` is branch-specific and changes as doors, hazards, crew and mission time change. This prevents an alternative branch from silently mutating the original geometry or timeline.

## Procedural Generation

Use `generateSpacecraft(config, seed)` to create a blueprint. The string seed is hashed into a deterministic pseudo-random sequence. The same seed and configuration produce a deeply equal blueprint; a different seed changes middle-room ordering, room widths and shelter capacity while keeping mandatory structural constraints.

The current generator uses a central multi-lane corridor and two banks of rooms. It always attempts to include:

- Command Bridge;
- Crew Quarters;
- Medical Bay;
- Radiation Storm Shelter;
- Laboratory;
- Engineering Bay;
- Life Support;
- Storage;
- Airlock;
- optional Power Section.

Every room has one generated door and a connector to the central corridor. `validateSpacecraft` then checks required room types, door references, physical door tiles and reachability of every room center from the corridor.

```ts
import { generateSpacecraft, validateSpacecraft } from "@/lib/spacecraft";

const blueprint = generateSpacecraft(
  { width: 52, height: 32, missionType: "TRANSIT", includePowerSection: true },
  "MARS-TRANSIT-126",
);

const validation = validateSpacecraft(blueprint);
if (!validation.valid) throw new Error(validation.errors.join(" "));
```

Current generator limits are 42–64 tiles wide and 26–38 tiles high. It is a constrained demo layout, not a general deck-plan compiler. It does not generate multiple decks, pressure bulkheads, real spacecraft dimensions or engineering-certified shielding geometry.

## Map Data Model

All shared types live in `src/lib/spacecraft/types.ts`.

| Type | Important fields | Purpose |
| --- | --- | --- |
| `SpacecraftTile` | `x`, `y`, `type`, `passable`, `compartmentId` | One grid cell. |
| `Compartment` | bounds, type, capacity, restrictions, sensor/equipment IDs | Semantic room metadata. |
| `Door` | position, connected compartment IDs, default state | Connection whose live state can block routing. |
| `Sensor` | kind, unit, room and position | Sensor location metadata; it does not fabricate readings. |
| `Equipment` | kind, label, room and position | Reusable equipment marker. |
| `CrewMapPosition` | character ID, position, destination, route, movement status | Branch-local crew movement state. |
| `HazardZone` | type, severity, affected tiles, parameters, source, active | Spatial overlay with explicit provenance. |
| `SpacecraftMapState` | crew, door states, zones, events, branch and virtual minute | Mutable simulation state. |
| `MapSnapshot` | blueprint and state copy | Restorable point in virtual mission time. |
| `MissionBranch` | parent, source snapshot and branch snapshot | Independent alternative timeline. |

Hazard parameters are a closed union. Radiation uses `doseRateMsvPerHour` and `uncertaintyPercent`; temperature, pressure and oxygen keep their own units. Unknown clinical or physical conversions are not inferred.

## Pathfinding

`findRoute` uses A* over four-directional passable tiles. It returns a `RouteResult` instead of throwing when no valid route exists.

Route modes:

| Mode | Cost and constraints |
| --- | --- |
| `shortest` | Minimizes traversed tiles. |
| `fastest` | Favors corridors and includes slower door/equipment traversal costs. |
| `lowest-radiation` | Adds a cost from active radiation-zone dose rate. |
| `safe` | Rejects critical hazard tiles in addition to ordinary blocked/restricted rules. |

All modes reject impassable tiles, non-open doors, active blocked zones and unauthorized restricted zones. `safe` also rejects active critical zones except tiles explicitly marked as safe shelters.

```ts
const result = findRoute(blueprint, state, crew.position, destination, {
  mode: "lowest-radiation",
  characterId: crew.characterId,
  metersPerSecond: 1.2,
});

if (!result.found) {
  console.warn(result.warnings[0]);
} else {
  console.log(result.path, result.estimatedSeconds, result.modeledRadiationDoseMsv);
}
```

Route exposure is an illustrative integration of active spatial radiation rate over modeled traversal time. If no compatible radiation field exists, dose is returned as `null` with `radiationDataComplete: false`; the engine does not invent a background dose.

## Hazard Integration

A hazard adapter translates an existing domain-engine result into map state:

```ts
export interface HazardOverlayAdapter<TInput> {
  id: string;
  hazard: "radiation" | "isolation" | "distance" | "gravity" | "environment";
  status: "implemented" | "planned";
  apply(
    blueprint: SpacecraftBlueprint,
    state: SpacecraftMapState,
    input: TInput,
  ): SpacecraftMapState;
}
```

### Radiation — implemented

`radiationScenarioAAdapter` and `radiationScenarioDAdapter` call the existing `runRadiationSimulation` engine. Scenario A creates a simulated crew-quarter/corridor radiation overlay. Scenario D creates an engineering overlay and can mark the related engineering door as damaged.

```ts
const next = radiationScenarioAAdapter.apply(blueprint, state, {
  doseRate: 0.62,
  elevatedThreshold: 0.3,
  criticalThreshold: 0.8,
});
```

### Gravity — planned adapter

The map already supports spatial zones, but no gravity-domain adapter is implemented. A future adapter can translate a validated gravity result into affected tiles and movement-cost metadata. Do not label a generic map zone as measured g-force without a compatible source model.

### Isolation — planned adapter

A future isolation adapter can use compartment occupancy and crew separation to visualize low-contact areas. Psychological or medical conclusions must stay in the isolation hazard engine; the map should only render validated spatial output.

### Environment — planned adapter

The zone model currently accepts temperature, pressure and oxygen parameters. A future environment adapter can map real domain results onto compartments and use critical zones to restrict safe routing. The present zone editor creates simulated overlays only.

### Distance — planned adapter

Distance-from-Earth primarily affects communication delay and mission context, not tile geometry. A future adapter may annotate mission events or equipment availability. No distance adapter currently changes paths.

Register implemented adapters in `HAZARD_ADAPTERS` and leave unimplemented entries marked `planned`. Never use a planned entry as evidence that integration works.

## Crew Integration

The Mission Studio requests existing crew with:

```text
GET /api/characters?scenarioId=mars-transit-126
```

Returned character IDs, callsigns and role titles become `CrewIdentity` objects. `createInitialMapState` places them in suitable rooms. Demo movement updates only `SpacecraftMapState`; it does not write positions or modeled exposure into existing character or hazard records.

```ts
const crew = characters.map((character) => ({
  id: character.id,
  callsign: character.callsign,
  role: character.assignedRoleTitle,
}));

let state = createInitialMapState(blueprint, scenarioId, crew);
state = assignCrewRoute(state, crew[0].id, route.path);
state = advanceCrewMovement(state, crew[0].id, modeledDoseIncrementMsv);
```

When Supabase is unavailable, the UI uses clearly identified Demo Mode crew. This fallback is isolated and is not uploaded as real crew telemetry.

## Mission Studio Integration

`MissionMapWorkbench` owns the interactive orchestration:

1. restore a browser-local bundle when available;
2. otherwise read crew identities from the existing character API;
3. generate and validate the seeded blueprint;
4. apply mission or operator events to immutable state copies;
5. compare and assign routes;
6. advance moving crew only when the virtual simulation is resumed;
7. preserve state in `localStorage` and allow JSON export.

Snapshots contain a deep copy of blueprint and state. Branches are created from snapshots and receive a new `branchId`; changing a branch does not mutate `main`. Restoring browser state does not reapply a hazard event or dose increment.

The current event sources are `system`, `user`, `simulated`, `modeled` or `measured`. Map events are shown in the mission journal with virtual time.

## Public API

Import client-safe APIs from `@/lib/spacecraft`. Persistence is deliberately imported separately from `@/lib/spacecraft/persistence` on the server.

### Generation and lookup

| Function | Parameters | Returns | Errors |
| --- | --- | --- | --- |
| `generateSpacecraft` | optional `GenerationConfig`, seed string | `SpacecraftBlueprint` | Clamps dimensions; does not normally throw. |
| `validateSpacecraft` | blueprint | `MapValidationResult` | Returns errors/warnings; does not throw. |
| `getTile` | blueprint, x, y | tile or `null` | None. |
| `getCompartment` | blueprint, ID | compartment or `null` | None. |
| `compartmentCenter` | compartment | coordinate | None. |

### Routing

| Function | Parameters | Returns | Errors |
| --- | --- | --- | --- |
| `findRoute` | blueprint, state, start, destination, options | `RouteResult` | Invalid/unreachable routes return `found: false`. |
| `calculateRouteExposure` | route, blueprint, state, optional speed | dose and completeness | Missing field returns `doseMsv: null`. |

### State and history

| Function | Purpose | Possible errors |
| --- | --- | --- |
| `createInitialMapState` | Place known crew and initialize doors/events. | Requires a valid blueprint with a usable room. |
| `updateCrewPosition` | Immediately place a known crew member. | Unknown character ID. |
| `assignCrewRoute` | Assign a route with at least two points. | Unknown character or too-short route. |
| `advanceCrewMovement` | Move one route step and increment virtual time. | Unknown character ID. |
| `setHazardZone` | Insert or replace a zone by ID. | None after type validation. |
| `setDoorState` | Change a known door state. | Unknown door ID. |
| `createSnapshot` | Deep-copy blueprint and state. | None. |
| `createMissionBranch` | Create an independent branch snapshot. | None. |
| `serializeMap` | Produce schema-versioned JSON. | JSON serialization errors for non-contract values. |
| `restoreMap` | Parse and validate bundle JSON. | Malformed, unsupported or invalid blueprint. |

### Hazard helpers

| Function | Purpose | Possible errors |
| --- | --- | --- |
| `createRadiationZone` | Build a typed radiation overlay. | Negative or non-finite rate. |
| `allocateCrewToShelters` | Capacity-aware safe routes for all crew. | Unreachable/overflow crew are returned unassigned. |
| `radiationScenarioAAdapter.apply` | Solar-storm overlay using scenario A. | Existing simulation validation errors. |
| `radiationScenarioDAdapter.apply` | Sensor disagreement/damage overlay using scenario D. | Existing simulation validation errors. |

## Supabase Persistence

The repository includes `supabase/spacecraft_map_engine.sql` as a review-only proposal. It has **not** been applied automatically to the shared project.

Proposed tables:

- `spacecraft_blueprints`: scenario, seed, generator version, configuration and geometry JSON;
- `spacecraft_map_states`: scenario, blueprint, branch, virtual minute and a versioned state bundle.

Both proposed tables enable RLS, revoke access from `anon` and `authenticated`, and grant access only to `service_role`. This is intentional until Vitalis+ has user-bound mission authorization. The service role must remain server-only.

`saveSpacecraftMap` upserts a blueprint and inserts an immutable map-state record. `loadLatestSpacecraftMap` restores the newest record for one scenario and branch. Both require `SUPABASE_SERVICE_ROLE_KEY` and throw a clear error when trusted persistence is unavailable.

Do not expose these functions through an unauthenticated route. Review the SQL, authentication model and RLS with the team before applying it.

## UI Components

| Component | Responsibility |
| --- | --- |
| `MissionMapWorkbench` | Full Mission Studio orchestration and panels. |
| `SpacecraftMap` | Responsive SVG grid, overlays, crew sprites, routes, zoom/pan and selection. |
| `MapControls` | Zoom, fit, edit, pause/resume and undo/redo. |
| `ZoneEditor` | Simulated zone type, severity, radiation rate and tile editing. |
| `MapLegend` | Shared color and symbol legend. |

Minimal embedding:

```tsx
import { MissionMapWorkbench } from "@/components/spacecraft/MissionMapWorkbench";

export default function MapPage() {
  return <MissionMapWorkbench />;
}
```

`SpacecraftMap` can also be embedded independently when a parent supplies blueprint, map state, selected IDs and interaction handlers. It supports pointer/touch tile selection, pointer panning, keyboard arrow panning, responsive sizing and accessible control labels.

## Local Development

Requirements: Node.js 22+, npm. Supabase variables are optional for isolated Demo Mode.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:1654/mission-studio/map`.

Optional existing environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`;
- the public Supabase key documented in `.env.example`;
- `SUPABASE_SERVICE_ROLE_KEY` only for reviewed server-side persistence;
- optional `NASA_API_KEY` for radiation DONKI context, not for map generation.

The application intentionally binds to `127.0.0.1:1654` for local development.

## Testing

```bash
npm run test:spacecraft
npm run test:radiation
npx tsc --noEmit
npm run lint
npm run build
```

`tests/spacecraft-map.test.mjs` covers deterministic generation, multiple-seed validation, room-door blocking, alternative radiation-aware routing, movement, non-negative modeled dose, serialization, snapshot/branch isolation, shelter capacity and radiation scenario A integration.

Manual UI smoke test:

1. open `/mission-studio/map`;
2. generate the same seed twice and verify the same layout;
3. select a crew member and destination, then compare and assign routes;
4. resume movement and verify virtual time changes;
5. apply scenario A or D and recalculate routes;
6. enter Edit Map, add a simulated zone and cycle a door state;
7. create a snapshot and branch, export state, reload and verify restoration.

## Limitations

- Geometry is a constrained 2D demo layout, not a real spacecraft deck plan.
- Movement speed, tile scale and radiation field are modeling assumptions.
- Only radiation scenarios A and D currently have map adapters.
- Gravity, isolation, environment and distance adapters are planned, not implemented.
- Operator-created zones are simulated and are not sensor measurements.
- Browser persistence is local to one browser profile.
- The Supabase map schema is a proposal and is not applied by this delivery.
- Server persistence is intentionally unavailable without a service-role key and reviewed authorization.
- The engine does not provide medical diagnosis, flight control or autonomous crew orders.
