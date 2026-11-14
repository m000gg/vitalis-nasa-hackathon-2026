"use client";

import type { HazardSeverity, HazardType } from "@/lib/spacecraft";

export function ZoneEditor(props: {
  type: HazardType;
  severity: HazardSeverity;
  doseRate: number;
  selectedTiles: number;
  onType: (value: HazardType) => void;
  onSeverity: (value: HazardSeverity) => void;
  onDoseRate: (value: number) => void;
  onClear: () => void;
}) {
  return <section className="border-2 border-slate-900 bg-white p-4">
    <p className="text-xs font-bold tracking-wider text-[#4502FF]">ZONE EDITOR</p>
    <p className="mt-1 text-xs leading-relaxed text-slate-600">In Edit Map mode, click passable tiles to add or remove them from the active simulated zone.</p>
    <label className="mt-3 block text-[10px] font-bold">HAZARD TYPE<select value={props.type} onChange={(event) => props.onType(event.target.value as HazardType)} className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-sm"><option value="radiation">Radiation</option><option value="temperature">Temperature</option><option value="pressure">Low pressure</option><option value="oxygen">Low oxygen</option><option value="blocked">Blocked</option><option value="restricted">Restricted</option><option value="safe-shelter">Safe shelter</option></select></label>
    <label className="mt-3 block text-[10px] font-bold">SEVERITY<select value={props.severity} onChange={(event) => props.onSeverity(event.target.value as HazardSeverity)} className="mt-1 w-full border-2 border-slate-900 bg-white p-2 text-sm"><option value="NOMINAL">Nominal</option><option value="ELEVATED">Elevated</option><option value="CRITICAL">Critical</option></select></label>
    {props.type === "radiation" && <label className="mt-3 block text-[10px] font-bold">MODELED DOSE RATE (mSv/h)<input type="number" min="0" max="20" step="0.01" value={props.doseRate} onChange={(event) => props.onDoseRate(Math.max(0, Number(event.target.value)))} className="mt-1 w-full border-2 border-slate-900 p-2 text-sm" /></label>}
    <div className="mt-3 flex items-center justify-between text-xs"><strong>{props.selectedTiles} TILE(S)</strong><button type="button" onClick={props.onClear} className="border-2 border-red-600 px-2 py-1 font-bold text-red-700 hover:bg-red-50">CLEAR ZONE</button></div>
  </section>;
}
