"use client";

import { Crosshair, Edit3, Expand, Pause, Play, RotateCcw, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";

interface MapControlsProps {
  zoom: number;
  editMode: boolean;
  paused: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onZoom: (next: number) => void;
  onFit: () => void;
  onEditMode: () => void;
  onPaused: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFullscreen?: () => void;
}

const button = "border-2 border-slate-900 px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#4502FF] disabled:opacity-40";
const idleButton = `${button} bg-white hover:bg-[#FFDA14]`;

export function MapControls(props: MapControlsProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Map controls">
      <button type="button" className={idleButton} onClick={() => props.onZoom(Math.min(2.5, props.zoom + 0.2))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
      <button type="button" className={idleButton} onClick={() => props.onZoom(Math.max(0.6, props.zoom - 0.2))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
      <button type="button" className={idleButton} onClick={props.onFit}><Crosshair className="mr-1 inline h-4 w-4" />FIT</button>
      <button type="button" className={`${button} ${props.editMode ? "bg-[#4502FF] text-white hover:bg-violet-800" : "bg-white hover:bg-[#FFDA14]"}`} onClick={props.onEditMode}><Edit3 className="mr-1 inline h-4 w-4" />{props.editMode ? "EDITING" : "EDIT MAP"}</button>
      <button type="button" className={idleButton} onClick={props.onPaused}>{props.paused ? <Play className="mr-1 inline h-4 w-4" /> : <Pause className="mr-1 inline h-4 w-4" />}{props.paused ? "RESUME" : "PAUSE"}</button>
      <button type="button" className={idleButton} onClick={props.onUndo} disabled={!props.canUndo}><Undo2 className="h-4 w-4" /><span className="sr-only">Undo</span></button>
      <button type="button" className={idleButton} onClick={props.onRedo} disabled={!props.canRedo}><Redo2 className="h-4 w-4" /><span className="sr-only">Redo</span></button>
      <button type="button" className={idleButton} onClick={props.onFit}><RotateCcw className="mr-1 inline h-4 w-4" />RESET VIEW</button>
      {props.onFullscreen && <button type="button" className={idleButton} onClick={props.onFullscreen}><Expand className="mr-1 inline h-4 w-4" />FULLSCREEN</button>}
    </div>
  );
}
