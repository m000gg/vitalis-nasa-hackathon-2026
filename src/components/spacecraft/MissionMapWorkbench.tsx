"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, GitBranch, Map, Navigation, Radio, Save, ShieldAlert, Sparkles, Users } from "lucide-react";
import {
  advanceCrewMovement,
  allocateCrewToShelters,
  assignCrewRoute,
  calculateRouteExposure,
  compartmentCenter,
  createInitialMapState,
  createMissionBranch,
  createSnapshot,
  findRoute,
  generateSpacecraft,
  radiationScenarioAAdapter,
  radiationScenarioDAdapter,
  restoreMap,
  serializeMap,
  setDoorState,
  setHazardZone,
  validateSpacecraft,
  type CrewIdentity,
  type DoorState,
  type HazardSeverity,
  type HazardParameters,
  type HazardType,
  type HazardZone,
  type MapSnapshot,
  type MissionBranch,
  type RouteMode,
  type RouteResult,
  type SpacecraftBlueprint,
  type SpacecraftMapState,
} from "@/lib/spacecraft";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";
import { SpacecraftMap } from "./SpacecraftMap";
import { ZoneEditor } from "./ZoneEditor";

const DEMO_CREW: CrewIdentity[] = [
  { id: "demo-cmdr", callsign: "Commander", role: "Mission Commander" },
  { id: "demo-cmo", callsign: "CMO", role: "Medical Officer" },
  { id: "demo-eng", callsign: "Engineer", role: "Flight Engineer" },
  { id: "demo-science", callsign: "Science", role: "Payload Specialist" },
  { id: "demo-comms", callsign: "Comms", role: "Communications Officer" },
];

const STORAGE_KEY = "vitalis-spacecraft-map-engine:v1";
const panel = "border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#FFDA14]";
const action = "border-2 border-slate-900 bg-white px-3 py-2 text-xs font-bold hover:bg-[#FFDA14] focus:outline-none focus:ring-2 focus:ring-[#4502FF] disabled:opacity-40";

function zoneParameters(type: HazardType, doseRate: number): HazardParameters {
  if (type === "radiation") return { doseRateMsvPerHour: doseRate, uncertaintyPercent: 20 };
  if (type === "temperature") return { temperatureCelsius: 45 };
  if (type === "pressure") return { pressureKpa: 55 };
  if (type === "oxygen") return { oxygenPercent: 16 };
  if (type === "restricted") return { allowedCharacterIds: [] };
  if (type === "safe-shelter") return { capacity: 4 };
  return { reason: "Operator-marked obstruction" };
}

export function MissionMapWorkbench() {
  const [seed, setSeed] = useState("VITALIS-126");
  const [blueprint, setBlueprint] = useState<SpacecraftBlueprint>(() => generateSpacecraft({ includePowerSection: true }, "VITALIS-126"));
  const [mapState, setMapState] = useState<SpacecraftMapState>(() => createInitialMapState(generateSpacecraft({ includePowerSection: true }, "VITALIS-126"), "mars-transit-126", DEMO_CREW));
  const [crewSource, setCrewSource] = useState<"Loading" | "Supabase" | "Demo Mode">("Loading");
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(mapState.crew[0]?.characterId ?? null);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>("shortest");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [alternateRoute, setAlternateRoute] = useState<RouteResult | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [paused, setPaused] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [zoneType, setZoneType] = useState<HazardType>("radiation");
  const [zoneSeverity, setZoneSeverity] = useState<HazardSeverity>("ELEVATED");
  const [zoneDoseRate, setZoneDoseRate] = useState(0.62);
  const [snapshots, setSnapshots] = useState<MapSnapshot[]>([]);
  const [branches, setBranches] = useState<MissionBranch[]>([]);
  const [undoStack, setUndoStack] = useState<SpacecraftMapState[]>([]);
  const [redoStack, setRedoStack] = useState<SpacecraftMapState[]>([]);
  const [notice, setNotice] = useState("Select a crew member, then click a destination tile to compare routes.");
  const [storageReady, setStorageReady] = useState(false);
  const initialBlueprintRef = useRef(blueprint);

  const validation = useMemo(() => validateSpacecraft(blueprint), [blueprint]);
  const selectedCrew = mapState.crew.find((crew) => crew.characterId === selectedCrewId) ?? null;
  const selectedCompartment = blueprint.compartments.find((room) => room.id === selectedCompartmentId) ?? null;
  const customZone = mapState.zones.find((zone) => zone.id === "operator-zone");

  const commitState = useCallback((next: SpacecraftMapState, message?: string) => {
    setUndoStack((current) => [...current.slice(-19), mapState]);
    setRedoStack([]);
    setMapState(next);
    if (message) setNotice(message);
  }, [mapState]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const restored = restoreMap(saved);
        setBlueprint(restored.blueprint);
        setMapState(restored.state);
        setSnapshots(restored.snapshots);
        setBranches(restored.branches);
        setSeed(restored.blueprint.seed);
        setCrewSource("Demo Mode");
        setSelectedCrewId(restored.state.crew[0]?.characterId ?? null);
        setNotice("Restored the latest browser-local mission snapshot. No dose was applied again.");
        setStorageReady(true);
        return;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setStorageReady(true);
    fetch("/api/characters?scenarioId=mars-transit-126")
      .then(async (response) => {
        if (!response.ok) throw new Error("Supabase unavailable");
        const data = await response.json() as { characters?: Array<{ id: string; callsign: string; assignedRoleTitle: string }> };
        const crew = (data.characters ?? []).map((character) => ({ id: character.id, callsign: character.callsign, role: character.assignedRoleTitle }));
        if (crew.length === 0) throw new Error("No crew returned");
        setMapState(createInitialMapState(initialBlueprintRef.current, "mars-transit-126", crew));
        setSelectedCrewId(crew[0].id);
        setCrewSource("Supabase");
      })
      .catch(() => {
        setCrewSource("Demo Mode");
        setNotice("Supabase is unavailable. The isolated Demo Mode crew is active and no shared records will be changed.");
      });
  }, []); // The initial map is intentionally restored only once.

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(STORAGE_KEY, serializeMap(blueprint, mapState, snapshots, branches));
  }, [blueprint, branches, mapState, snapshots, storageReady]);

  useEffect(() => {
    if (paused || !mapState.crew.some((crew) => crew.movementStatus === "MOVING")) return;
    const timer = window.setInterval(() => {
      setMapState((current) => {
        let next = current;
        for (const crew of current.crew.filter((item) => item.movementStatus === "MOVING")) {
          const nextPoint = crew.route[Math.min(crew.routeIndex + 1, crew.route.length - 1)];
          const doseIncrement = nextPoint
            ? calculateRouteExposure([nextPoint], blueprint, current).doseMsv ?? 0
            : 0;
          next = advanceCrewMovement(next, crew.characterId, doseIncrement);
        }
        return next;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [blueprint, mapState.crew, paused]);

  const generate = () => {
    const nextBlueprint = generateSpacecraft({ includePowerSection: true }, seed.trim() || `VITALIS-${Date.now()}`);
    const nextState = createInitialMapState(nextBlueprint, "mars-transit-126", mapState.crew.map((crew) => ({ id: crew.characterId, callsign: crew.callsign, role: crew.role })));
    setBlueprint(nextBlueprint);
    setMapState(nextState);
    setSnapshots([]);
    setBranches([]);
    setRouteResult(null);
    setAlternateRoute(null);
    setUndoStack([]);
    setRedoStack([]);
    setSelectedCrewId(nextState.crew[0]?.characterId ?? null);
    setNotice(`Generated and validated spacecraft ${nextBlueprint.seed}.`);
  };

  const previewRoute = (destination: { x: number; y: number }) => {
    if (!selectedCrew) return;
    const primary = findRoute(blueprint, mapState, selectedCrew.position, destination, { mode: routeMode, characterId: selectedCrew.characterId });
    const comparisonMode: RouteMode = routeMode === "shortest" ? "lowest-radiation" : "shortest";
    const comparison = findRoute(blueprint, mapState, selectedCrew.position, destination, { mode: comparisonMode, characterId: selectedCrew.characterId });
    setRouteResult(primary);
    setAlternateRoute(comparison);
    setNotice(primary.found ? `${primary.mode} route ready. Compare it before assigning movement.` : primary.warnings[0]);
  };

  const onTileClick = (position: { x: number; y: number }) => {
    const tile = blueprint.tiles.find((item) => item.x === position.x && item.y === position.y);
    if (!tile?.passable) return;
    if (editMode) {
      if (tile.type === "DOOR") return;
      const existing = customZone?.affectedTiles ?? [];
      const affectedTiles = existing.includes(tile.id) ? existing.filter((id) => id !== tile.id) : [...existing, tile.id];
      const zone: HazardZone = { id: "operator-zone", type: zoneType, affectedTiles, severity: zoneSeverity, parameters: zoneParameters(zoneType, zoneDoseRate), source: "simulated", active: affectedTiles.length > 0 };
      commitState(setHazardZone(mapState, zone), `Operator zone updated: ${affectedTiles.length} tile(s).`);
      return;
    }
    previewRoute(position);
  };

  const assignRoute = () => {
    if (!selectedCrew || !routeResult?.found) return;
    commitState(assignCrewRoute(mapState, selectedCrew.characterId, routeResult.path), `Movement assigned to ${selectedCrew.callsign}. Press Resume to advance virtual mission time.`);
  };

  const routeToShelter = () => {
    if (!selectedCrew) return;
    const shelter = blueprint.compartments.find((room) => room.type === "RADIATION_SHELTER");
    if (shelter) previewRoute(compartmentCenter(shelter));
  };

  const applySolarStorm = () => {
    commitState(radiationScenarioAAdapter.apply(blueprint, mapState, { doseRate: 0.62, elevatedThreshold: 0.3, criticalThreshold: 0.8 }), "Scenario A applied through the existing radiation engine. Crew-quarter and corridor routes were recalculated.");
    setShowHazards(true);
  };

  const applyShieldDamage = () => {
    commitState(radiationScenarioDAdapter.apply(blueprint, mapState, { sensorA: 0.14, sensorB: 0.58, spreadThreshold: 35 }), "Scenario D applied. The engineering zone and its damaged door now affect routing.");
  };

  const allocateShelters = () => {
    const allocation = allocateCrewToShelters(blueprint, mapState);
    let next = mapState;
    for (const assignment of allocation.assignments) if (assignment.route?.found) next = assignCrewRoute(next, assignment.characterId, assignment.route.path);
    commitState(next, allocation.unassigned === 0 ? "All crew received capacity-safe shelter routes." : `${allocation.unassigned} crew member(s) remain unassigned because no safe capacity is reachable.`);
  };

  const saveSnapshot = () => {
    const snapshot = createSnapshot(blueprint, mapState, `Mission minute ${mapState.simulationMinute}`);
    setSnapshots((current) => [...current, snapshot]);
    setNotice(`Snapshot ${snapshot.id} saved locally.`);
  };

  const createBranch = () => {
    const snapshot = createSnapshot(blueprint, mapState, `Branch point ${branches.length + 1}`);
    const branch = createMissionBranch(snapshot, `Alternative ${branches.length + 1}`, `branch-${branches.length + 1}`);
    setSnapshots((current) => [...current, snapshot]);
    setBranches((current) => [...current, branch]);
    setMapState(branch.snapshot.state);
    setNotice(`${branch.name} created from an immutable snapshot. The previous branch remains unchanged.`);
  };

  const downloadBundle = () => {
    const url = URL.createObjectURL(new Blob([serializeMap(blueprint, mapState, snapshots, branches)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vitalis-map-${blueprint.seed}-${mapState.branchId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-900 sm:px-6" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
    <div className="mx-auto max-w-[1700px] space-y-4">
      <header className="border-2 border-slate-900 bg-[#111827] p-5 text-white shadow-[7px_7px_0_#FFDA14]">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.2em] text-[#FFDA14]">VITALIS+ / SHARED SPATIAL ENGINE</p><h1 className="mt-1 text-3xl font-bold">SPACECRAFT DIGITAL TWIN</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">A deterministic, tile-based mission map. Geometry, hazards, crew positions, routes and branches are simulation state—not decoration.</p></div><div className="flex gap-2"><Link href="/radiation-demo" className="border-2 border-[#FFDA14] px-3 py-2 text-xs font-bold text-[#FFDA14] hover:bg-[#FFDA14] hover:text-slate-950">RADIATION LAB</Link><Link href="/" className="border-2 border-white px-3 py-2 text-xs font-bold hover:bg-white hover:text-slate-950">BACK TO APP</Link></div></div>
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4"><span className="border border-slate-600 p-2"><Radio className="mr-1 inline h-4 w-4 text-[#FFDA14]" />CREW SOURCE: {crewSource.toUpperCase()}</span><span className="border border-slate-600 p-2"><Map className="mr-1 inline h-4 w-4 text-[#FFDA14]" />SEED: {blueprint.seed}</span><span className="border border-slate-600 p-2"><Users className="mr-1 inline h-4 w-4 text-[#FFDA14]" />{mapState.crew.length} CREW</span><span className="border border-slate-600 p-2"><GitBranch className="mr-1 inline h-4 w-4 text-[#FFDA14]" />{mapState.branchId.toUpperCase()} · T+{mapState.simulationMinute} MIN</span></div>
      </header>

      <div className="border-2 border-[#4502FF] bg-violet-50 p-3 text-sm" role="status">{notice}</div>

      <section className="grid gap-4 xl:grid-cols-[320px_1fr_330px]">
        <aside className="space-y-4">
          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">PROCEDURAL GENERATION</p><label className="mt-3 block text-[10px] font-bold">SEED<input value={seed} onChange={(event) => setSeed(event.target.value)} className="mt-1 w-full border-2 border-slate-900 p-2 text-sm" /></label><button type="button" onClick={generate} className="mt-3 w-full border-2 border-slate-900 bg-[#4502FF] px-3 py-3 text-sm font-bold text-white shadow-[3px_3px_0_#111827]"><Sparkles className="mr-2 inline h-4 w-4" />GENERATE NEW SPACECRAFT</button><div className={`mt-3 border p-2 text-xs ${validation.valid ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-red-600 bg-red-50 text-red-900"}`}>{validation.valid ? `VALID · ${blueprint.compartments.length} compartments · ${blueprint.doors.length} doors` : validation.errors.join(" ")}</div></section>

          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">MISSION EVENTS</p><div className="mt-3 grid gap-2"><button type="button" className={action} onClick={applySolarStorm}><ShieldAlert className="mr-1 inline h-4 w-4 text-red-600" />SOLAR STORM · A</button><button type="button" className={action} onClick={applyShieldDamage}><AlertTriangle className="mr-1 inline h-4 w-4 text-amber-600" />SHIELD DAMAGE · D</button><button type="button" className={action} onClick={allocateShelters}>ALLOCATE SHELTERS · L</button><button type="button" className={action} onClick={() => commitState({ ...mapState, zones: [] }, "All Demo Mode zones cleared.")}>CLEAR HAZARDS</button></div></section>

          <ZoneEditor type={zoneType} severity={zoneSeverity} doseRate={zoneDoseRate} selectedTiles={customZone?.affectedTiles.length ?? 0} onType={setZoneType} onSeverity={setZoneSeverity} onDoseRate={setZoneDoseRate} onClear={() => commitState(setHazardZone(mapState, { id: "operator-zone", type: zoneType, severity: zoneSeverity, parameters: zoneParameters(zoneType, zoneDoseRate), affectedTiles: [], source: "simulated", active: false }), "Operator zone cleared.")} />
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-slate-900 bg-white p-3"><MapControls zoom={zoom} editMode={editMode} paused={paused} canUndo={undoStack.length > 0} canRedo={redoStack.length > 0} onZoom={setZoom} onFit={() => { setZoom(1); setFitKey((value) => value + 1); }} onEditMode={() => setEditMode((value) => !value)} onPaused={() => setPaused((value) => !value)} onUndo={() => { const previous = undoStack.at(-1); if (!previous) return; setRedoStack((current) => [...current, mapState]); setUndoStack((current) => current.slice(0, -1)); setMapState(previous); }} onRedo={() => { const next = redoStack.at(-1); if (!next) return; setUndoStack((current) => [...current, mapState]); setRedoStack((current) => current.slice(0, -1)); setMapState(next); }} /><div className="flex gap-2 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={showHazards} onChange={(event) => setShowHazards(event.target.checked)} />HAZARDS</label><label className="flex items-center gap-1"><input type="checkbox" checked={showSensors} onChange={(event) => setShowSensors(event.target.checked)} />SENSORS</label></div></div>
          <SpacecraftMap blueprint={blueprint} state={mapState} route={routeResult?.path ?? selectedCrew?.route ?? []} alternateRoute={alternateRoute?.path} selectedCrewId={selectedCrewId} selectedCompartmentId={selectedCompartmentId} zoom={zoom} fitKey={fitKey} showHazards={showHazards} showSensors={showSensors} onTileClick={onTileClick} onCrewClick={(id) => { setSelectedCrewId(id); setRouteResult(null); setAlternateRoute(null); }} onCompartmentClick={setSelectedCompartmentId} onDoorClick={(doorId) => { if (!editMode) return; const order: DoorState[] = ["OPEN", "CLOSED", "DAMAGED", "BLOCKED"]; const current = mapState.doorStates[doorId]; commitState(setDoorState(mapState, doorId, order[(order.indexOf(current) + 1) % order.length]), `Door ${doorId} updated; affected routes must be recalculated.`); setRouteResult(null); setAlternateRoute(null); }} />
          <MapLegend />
        </div>

        <aside className="space-y-4">
          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">CREW & ROUTING</p><div className="mt-3 grid gap-2">{mapState.crew.map((crew) => <button key={crew.characterId} type="button" onClick={() => setSelectedCrewId(crew.characterId)} className={`border-2 p-2 text-left text-xs ${selectedCrewId === crew.characterId ? "border-[#4502FF] bg-violet-50" : "border-slate-300"}`}><strong>{crew.callsign}</strong><span className="mt-1 block text-[10px] text-slate-500">{crew.role} · {crew.movementStatus} · {crew.position.x}:{crew.position.y}</span><span className="mt-1 block text-[10px] text-slate-500">MODELED ROUTE DOSE: {crew.cumulativeModeledDoseMsv} mSv</span></button>)}</div><label className="mt-3 block text-[10px] font-bold">ROUTE MODE<select value={routeMode} onChange={(event) => setRouteMode(event.target.value as RouteMode)} className="mt-1 w-full border-2 border-slate-900 p-2 text-sm"><option value="shortest">Shortest route</option><option value="fastest">Fastest route</option><option value="lowest-radiation">Lowest radiation exposure</option><option value="safe">Safe route</option></select></label><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={action} onClick={routeToShelter}>TO SHELTER</button><button type="button" className={action} onClick={assignRoute} disabled={!routeResult?.found}>ASSIGN ROUTE</button></div></section>

          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">ROUTE COMPARISON</p>{routeResult ? <div className="mt-3 space-y-2"><RouteCard result={routeResult} primary /><RouteCard result={alternateRoute} /><p className="text-[10px] leading-relaxed text-slate-500">A missing radiation estimate is shown as unavailable; the engine never invents a background dose rate.</p></div> : <p className="mt-3 text-xs text-slate-600">Choose a crew member and click a passable destination.</p>}</section>

          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">SELECTED COMPARTMENT</p>{selectedCompartment ? <div className="mt-2 text-xs"><strong>{selectedCompartment.name}</strong><p className="mt-1 text-slate-600">{selectedCompartment.type.replaceAll("_", " ")} · capacity {selectedCompartment.capacity ?? "n/a"}</p><p className="mt-1 text-slate-600">{selectedCompartment.sensorIds.length} sensor(s) · {selectedCompartment.equipmentIds.length} equipment item(s)</p></div> : <p className="mt-2 text-xs text-slate-600">Click a room to inspect it.</p>}</section>

          <section className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">SNAPSHOTS & BRANCHES</p><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={action} onClick={saveSnapshot}><Save className="mr-1 inline h-4 w-4" />SNAPSHOT</button><button type="button" className={action} onClick={createBranch}><GitBranch className="mr-1 inline h-4 w-4" />BRANCH</button></div><button type="button" className={`${action} mt-2 w-full`} onClick={downloadBundle}><Download className="mr-1 inline h-4 w-4" />EXPORT STATE</button><div className="mt-3 space-y-2">{branches.map((branch) => <button key={branch.id} type="button" className="w-full border border-slate-300 p-2 text-left text-xs hover:border-[#4502FF]" onClick={() => { setBlueprint(branch.snapshot.blueprint); setMapState(branch.snapshot.state); setNotice(`${branch.name} restored. Other branches were not modified.`); }}><strong>{branch.name}</strong><span className="block text-[10px] text-slate-500">from {branch.createdFromSnapshotId}</span></button>)}</div></section>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.55fr]"><div className={panel}><p className="text-xs font-bold tracking-wider text-[#4502FF]">MISSION EVENT JOURNAL</p><div className="mt-3 grid max-h-52 gap-2 overflow-y-auto">{mapState.events.slice().reverse().map((event) => <div key={event.id} className="grid grid-cols-[70px_1fr] gap-3 border-b border-slate-200 pb-2 text-xs"><span className="font-bold text-slate-500">T+{event.simulationMinute} MIN</span><span><strong>{event.type}</strong> · {event.summary} <em className="text-slate-500">[{event.source}]</em></span></div>)}</div></div><div className="border-2 border-slate-900 bg-[#111827] p-4 text-white"><p className="text-xs font-bold tracking-wider text-[#FFDA14]">MODEL BOUNDARY</p><p className="mt-2 text-xs leading-relaxed text-slate-300">Crew movement, zones and route dose are simulated. Supabase crew identities may be read, but Demo Mode never writes positions or modeled exposure into the shared astronaut records. The proposed persistence schema is not applied automatically.</p></div></section>
    </div>
  </main>;
}

function RouteCard({ result, primary = false }: { result: RouteResult | null; primary?: boolean }) {
  if (!result) return null;
  return <div className={`border-2 p-3 text-xs ${primary ? "border-[#4502FF] bg-violet-50" : "border-cyan-500 bg-cyan-50"}`}><div className="flex items-center justify-between"><strong className="uppercase"><Navigation className="mr-1 inline h-3.5 w-3.5" />{result.mode}</strong><span>{primary ? "SELECTED" : "COMPARISON"}</span></div>{result.found ? <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]"><span>{result.lengthTiles} tiles</span><span>{result.estimatedSeconds}s</span><span>{result.modeledRadiationDoseMsv === null ? "dose n/a" : `${result.modeledRadiationDoseMsv} mSv`}</span></div> : <p className="mt-2 text-red-700">{result.warnings[0]}</p>}</div>;
}
