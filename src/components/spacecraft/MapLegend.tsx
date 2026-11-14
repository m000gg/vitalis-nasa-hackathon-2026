const items = [
  ["#111827", "Wall"], ["#E2E8F0", "Room"], ["#94A3B8", "Corridor"], ["#FFDA14", "Door"],
  ["#4502FF", "Selected route"], ["#DC2626", "Critical zone"], ["#F59E0B", "Elevated zone"], ["#16A34A", "Crew / shelter"],
] as const;

export function MapLegend() {
  return <div className="flex flex-wrap gap-x-4 gap-y-2 border-2 border-slate-900 bg-white p-3 text-[11px] font-bold">{items.map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><span className="h-3 w-3 border border-slate-900" style={{ backgroundColor: color }} />{label}</span>)}</div>;
}
