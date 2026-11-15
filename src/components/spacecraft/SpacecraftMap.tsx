"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand } from "lucide-react";
import type { Coordinate, HazardZone, SpacecraftBlueprint, SpacecraftMapState } from "@/lib/spacecraft";

const TILE = 16;
const tileColors = {
  BLOCKED: "#020617",
  WALL: "#111827",
  FLOOR: "#E2E8F0",
  CORRIDOR: "#94A3B8",
  DOOR: "#FFDA14",
  AIRLOCK: "#BFDBFE",
  EQUIPMENT: "#C4B5FD",
} as const;

export function SpacecraftMap(props: {
  blueprint: SpacecraftBlueprint;
  state: SpacecraftMapState;
  route: Coordinate[];
  alternateRoute?: Coordinate[];
  selectedCrewId: string | null;
  selectedCompartmentId: string | null;
  zoom: number;
  fitKey: number;
  showHazards: boolean;
  showSensors: boolean;
  onZoomChange?: (zoom: number) => void;
  onTileClick: (position: Coordinate) => void;
  onCrewClick: (characterId: string) => void;
  onDoorClick: (doorId: string) => void;
  onCompartmentClick: (compartmentId: string) => void;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ tileId: string; left: number; top: number } | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [props.fitKey]);
  const viewWidth = props.blueprint.width * TILE / props.zoom;
  const viewHeight = props.blueprint.height * TILE / props.zoom;
  const zoneByTile = useMemo(() => {
    const result = new Map<string, HazardZone>();
    if (!props.showHazards) return result;
    for (const zone of props.state.zones.filter((item) => item.active)) {
      for (const id of zone.affectedTiles) {
        const current = result.get(id);
        if (zone.severity === "CRITICAL" || (zone.severity === "ELEVATED" && current?.severity !== "CRITICAL") || !current) result.set(id, zone);
      }
    }
    return result;
  }, [props.showHazards, props.state.zones]);
  const doorByTile = useMemo(() => new Map(props.blueprint.doors.map((door) => [`${door.position.x}:${door.position.y}`, door])), [props.blueprint.doors]);

  const hoveredTile = hovered ? props.blueprint.tiles.find((tile) => tile.id === hovered.tileId) : null;
  const hoveredRoom = hoveredTile?.compartmentId ? props.blueprint.compartments.find((room) => room.id === hoveredTile.compartmentId) : null;
  const hoveredZone = hovered ? zoneByTile.get(hovered.tileId) : null;

  return <div ref={containerRef} className="relative overflow-hidden border-2 border-slate-900 bg-slate-950 shadow-[6px_6px_0_#4502FF]" tabIndex={0} aria-label="Interactive spacecraft map" onWheel={(event) => { if (!props.onZoomChange) return; event.preventDefault(); props.onZoomChange(Math.max(0.6, Math.min(2.5, props.zoom + (event.deltaY < 0 ? 0.15 : -0.15)))); }} onKeyDown={(event) => {
    if (event.key === "ArrowLeft") setPan((value) => ({ ...value, x: value.x - 16 }));
    if (event.key === "ArrowRight") setPan((value) => ({ ...value, x: value.x + 16 }));
    if (event.key === "ArrowUp") setPan((value) => ({ ...value, y: value.y - 16 }));
    if (event.key === "ArrowDown") setPan((value) => ({ ...value, y: value.y + 16 }));
  }}>
    <button type="button" aria-label="Open map fullscreen" onClick={() => void containerRef.current?.requestFullscreen()} className="absolute right-2 top-2 z-20 rounded border border-slate-600 bg-slate-950/90 p-2 text-white hover:bg-[#4502FF]"><Expand className="h-4 w-4" /></button>
    <svg
      className="block h-[58vh] min-h-[480px] w-full touch-none select-none"
      viewBox={`${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={`Generated spacecraft ${props.blueprint.seed}`}
      onPointerDown={(event) => { if (event.shiftKey || event.target === event.currentTarget) drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; }}
      onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.panX - (event.clientX - drag.current.x) / props.zoom, y: drag.current.panY - (event.clientY - drag.current.y) / props.zoom }); }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
    >
      <defs>
        <pattern id="measured-pattern" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4L4 0" stroke="#fff" strokeWidth="0.7" opacity="0.5" /></pattern>
        <pattern id="modeled-pattern" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#fff" opacity="0.55" /></pattern>
        <pattern id="reconstructed-pattern" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 3H6" stroke="#fff" strokeWidth="0.7" opacity="0.45" /></pattern>
      </defs>
      <rect width={props.blueprint.width * TILE} height={props.blueprint.height * TILE} fill="#020617" />
      {props.blueprint.tiles.map((tile) => {
        const selected = props.selectedCompartmentId !== null && tile.compartmentId === props.selectedCompartmentId;
        return <rect key={tile.id} x={tile.x * TILE} y={tile.y * TILE} width={TILE} height={TILE} fill={tileColors[tile.type]} stroke={selected ? "#FFDA14" : "#334155"} strokeWidth={selected ? 1.8 : 0.45} aria-label={`${tile.compartmentId ?? "Hull"}, ${tile.type}, ${tile.x}:${tile.y}`} onPointerMove={(event) => { const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (bounds) setHovered({ tileId: tile.id, left: Math.min(bounds.width - 230, Math.max(8, event.clientX - bounds.left + 12)), top: Math.min(bounds.height - 120, Math.max(8, event.clientY - bounds.top + 12)) }); }} onPointerLeave={() => setHovered(null)} onClick={() => {
          const door = doorByTile.get(tile.id);
          if (door) props.onDoorClick(door.id);
          else if (tile.compartmentId) props.onCompartmentClick(tile.compartmentId);
          props.onTileClick({ x: tile.x, y: tile.y });
        }} className={tile.passable ? "cursor-crosshair" : "cursor-not-allowed"} />;
      })}
      {props.showHazards && [...zoneByTile.entries()].map(([id, zone]) => {
        const [x, y] = id.split(":").map(Number);
        const color = zone.severity === "CRITICAL" ? "#DC2626" : zone.severity === "ELEVATED" ? "#F59E0B" : "#16A34A";
        const pattern = zone.source === "measured" ? "url(#measured-pattern)" : zone.source === "modeled" ? "url(#modeled-pattern)" : zone.source === "reconstructed" ? "url(#reconstructed-pattern)" : null;
        return <g key={`zone-${id}`} pointerEvents="none"><rect x={x * TILE + 1} y={y * TILE + 1} width={TILE - 2} height={TILE - 2} fill={color} opacity="0.62" />{pattern && <rect x={x * TILE + 1} y={y * TILE + 1} width={TILE - 2} height={TILE - 2} fill={pattern} />}</g>;
      })}
      {props.blueprint.compartments.filter((room) => room.type !== "CORRIDOR").map((room) => <text key={room.id} x={(room.x + room.width / 2) * TILE} y={(room.y + 1.2) * TILE} textAnchor="middle" fill="#0F172A" fontSize="5" fontWeight="700" pointerEvents="none">{room.name.toUpperCase()}</text>)}
      {props.blueprint.doors.map((door) => <rect key={`door-state-${door.id}`} x={door.position.x * TILE + 4} y={door.position.y * TILE + 4} width={TILE - 8} height={TILE - 8} fill={props.state.doorStates[door.id] === "OPEN" ? "#16A34A" : props.state.doorStates[door.id] === "CLOSED" ? "#F59E0B" : "#DC2626"} pointerEvents="none" />)}
      {props.showSensors && props.blueprint.sensors.map((sensor) => <g key={sensor.id} pointerEvents="none"><circle cx={(sensor.position.x + 0.5) * TILE} cy={(sensor.position.y + 0.5) * TILE} r="3.5" fill="#38BDF8" stroke="#082F49" strokeWidth="1" /><circle cx={(sensor.position.x + 0.5) * TILE} cy={(sensor.position.y + 0.5) * TILE} r="1.2" fill="#E0F2FE" /></g>)}
      {props.alternateRoute && props.alternateRoute.length > 1 && <polyline points={props.alternateRoute.map((point) => `${(point.x + 0.5) * TILE},${(point.y + 0.5) * TILE}`).join(" ")} fill="none" stroke="#22D3EE" strokeWidth="2" strokeDasharray="4 3" opacity="0.8" pointerEvents="none" />}
      {props.route.length > 1 && <polyline points={props.route.map((point) => `${(point.x + 0.5) * TILE},${(point.y + 0.5) * TILE}`).join(" ")} fill="none" stroke="#4502FF" strokeWidth="3" strokeLinejoin="round" strokeLinecap="square" pointerEvents="none" />}
      {props.state.crew.map((crew, index) => {
        const x = (crew.position.x + 0.5) * TILE;
        const y = (crew.position.y + 0.5) * TILE;
        const selected = crew.characterId === props.selectedCrewId;
        return <g key={crew.characterId} className="cursor-pointer" onClick={(event) => { event.stopPropagation(); props.onCrewClick(crew.characterId); }} role="button" aria-label={`Select ${crew.callsign}`} tabIndex={0}>
          <rect x={x - 5} y={y - 6} width="10" height="12" rx="1" fill={selected ? "#FFDA14" : "#16A34A"} stroke={selected ? "#4502FF" : "#052E16"} strokeWidth={selected ? 2 : 1} />
          <rect x={x - 3} y={y - 3} width="6" height="4" fill="#E0F2FE" stroke="#0F172A" strokeWidth="0.8" />
          <text x={x} y={y + 10} textAnchor="middle" fill="#F8FAFC" fontSize="4.5" fontWeight="700">{crew.callsign.slice(0, 8).toUpperCase() || `CREW ${index + 1}`}</text>
        </g>;
      })}
    </svg>
    {hovered && hoveredTile && <div className="pointer-events-none absolute z-20 w-56 rounded-lg border border-slate-600 bg-slate-950/95 p-3 text-xs text-white shadow-xl" style={{ left: hovered.left, top: hovered.top }}><p className="font-bold text-[#FFDA14]">{hoveredRoom?.name ?? "Spacecraft hull"}</p><p className="mt-1 text-slate-300">{hoveredTile.type.replaceAll("_", " ")} · {hoveredTile.x}:{hoveredTile.y}</p>{hoveredZone ? <><p className="mt-2 font-bold">{hoveredZone.severity} {hoveredZone.type}</p><p className="text-slate-300">Source: {hoveredZone.source}</p>{"doseRateMsvPerHour" in hoveredZone.parameters && <p className="text-slate-300">{hoveredZone.parameters.doseRateMsvPerHour} mSv/h · ±{hoveredZone.parameters.uncertaintyPercent}%</p>}</> : <p className="mt-2 text-slate-400">No active hazard overlay</p>}</div>}
    <div className="pointer-events-none absolute bottom-2 left-2 border border-slate-600 bg-slate-950/85 px-2 py-1 text-[10px] text-slate-200">SHIFT + DRAG TO PAN · ARROW KEYS · WHEEL ZOOM · {Math.round(props.zoom * 100)}%</div>
  </div>;
}
