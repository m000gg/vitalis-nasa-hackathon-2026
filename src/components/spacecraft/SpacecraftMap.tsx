"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Coordinate, SpacecraftBlueprint, SpacecraftMapState } from "@/lib/spacecraft";

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
  onTileClick: (position: Coordinate) => void;
  onCrewClick: (characterId: string) => void;
  onDoorClick: (doorId: string) => void;
  onCompartmentClick: (compartmentId: string) => void;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  useEffect(() => {
    setPan({ x: 0, y: 0 });
  }, [props.fitKey]);
  const viewWidth = props.blueprint.width * TILE / props.zoom;
  const viewHeight = props.blueprint.height * TILE / props.zoom;
  const zoneByTile = useMemo(() => {
    const result = new Map<string, "NOMINAL" | "ELEVATED" | "CRITICAL">();
    if (!props.showHazards) return result;
    for (const zone of props.state.zones.filter((item) => item.active)) {
      for (const id of zone.affectedTiles) {
        const current = result.get(id);
        if (zone.severity === "CRITICAL" || (zone.severity === "ELEVATED" && current !== "CRITICAL") || !current) result.set(id, zone.severity);
      }
    }
    return result;
  }, [props.showHazards, props.state.zones]);
  const doorByTile = useMemo(() => new Map(props.blueprint.doors.map((door) => [`${door.position.x}:${door.position.y}`, door])), [props.blueprint.doors]);

  return <div className="relative overflow-hidden border-2 border-slate-900 bg-slate-950 shadow-[6px_6px_0_#4502FF]" tabIndex={0} aria-label="Interactive spacecraft map" onKeyDown={(event) => {
    if (event.key === "ArrowLeft") setPan((value) => ({ ...value, x: value.x - 16 }));
    if (event.key === "ArrowRight") setPan((value) => ({ ...value, x: value.x + 16 }));
    if (event.key === "ArrowUp") setPan((value) => ({ ...value, y: value.y - 16 }));
    if (event.key === "ArrowDown") setPan((value) => ({ ...value, y: value.y + 16 }));
  }}>
    <svg
      className="block h-[58vh] min-h-[480px] w-full touch-none select-none"
      viewBox={`${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={`Generated spacecraft ${props.blueprint.seed}`}
      onPointerDown={(event) => { if (event.target === event.currentTarget) drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; }}
      onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.panX - (event.clientX - drag.current.x) / props.zoom, y: drag.current.panY - (event.clientY - drag.current.y) / props.zoom }); }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
    >
      <rect width={props.blueprint.width * TILE} height={props.blueprint.height * TILE} fill="#020617" />
      {props.blueprint.tiles.map((tile) => {
        const selected = props.selectedCompartmentId !== null && tile.compartmentId === props.selectedCompartmentId;
        return <rect key={tile.id} x={tile.x * TILE} y={tile.y * TILE} width={TILE} height={TILE} fill={tileColors[tile.type]} stroke={selected ? "#FFDA14" : "#334155"} strokeWidth={selected ? 1.8 : 0.45} aria-label={`${tile.compartmentId ?? "Hull"}, ${tile.type}, ${tile.x}:${tile.y}`} onClick={() => {
          const door = doorByTile.get(tile.id);
          if (door) props.onDoorClick(door.id);
          else if (tile.compartmentId) props.onCompartmentClick(tile.compartmentId);
          props.onTileClick({ x: tile.x, y: tile.y });
        }} className={tile.passable ? "cursor-crosshair" : "cursor-not-allowed"} />;
      })}
      {props.showHazards && [...zoneByTile.entries()].map(([id, severity]) => {
        const [x, y] = id.split(":").map(Number);
        return <rect key={`zone-${id}`} x={x * TILE + 2} y={y * TILE + 2} width={TILE - 4} height={TILE - 4} fill={severity === "CRITICAL" ? "#DC2626" : severity === "ELEVATED" ? "#F59E0B" : "#16A34A"} opacity="0.58" pointerEvents="none" />;
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
    <div className="pointer-events-none absolute bottom-2 left-2 border border-slate-600 bg-slate-950/85 px-2 py-1 text-[10px] text-slate-200">DRAG EMPTY SPACE TO PAN · ARROW KEYS SUPPORTED · ZOOM {Math.round(props.zoom * 100)}%</div>
  </div>;
}
