"use client";

import React from "react";
import { HazardChartSpec } from "@/lib/hazards";

export function HazardTelemetryChart({ chart }: { chart: HazardChartSpec }) {
  const { title, unit, series } = chart;

  if (!series || series.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1">Here is: Log numeric samples to render chart points.</p>
      </div>
    );
  }

  const values = series.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const span = maxVal - minVal || 1;
  const width = 320;
  const height = 100;
  const padX = 12;
  const padY = 12;

  const coords = series.map((p, idx) => {
    const x =
      series.length === 1
        ? width / 2
        : padX + (idx / (series.length - 1)) * (width - padX * 2);
    const y =
      series.length === 1
        ? height / 2
        : height - padY - ((p.value - minVal) / span) * (height - padY * 2);
    return { x, y, point: p };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const latest = series[series.length - 1];

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-800">
          Latest: {latest.value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full overflow-visible rounded-lg bg-slate-50"
        role="img"
        aria-label={title}
      >
        {coords.length > 1 && (
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={polylinePoints}
          />
        )}
        {coords.map((c, idx) => (
          <circle key={idx} cx={c.x} cy={c.y} r="3.5" fill="#0f172a">
            <title>
              {c.point.label}: {c.point.value}
              {unit ? ` ${unit}` : ""}
            </title>
          </circle>
        ))}
      </svg>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Min: {minVal}
          {unit ? ` ${unit}` : ""} · Max: {maxVal}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>
          {series.length} sample{series.length === 1 ? "" : "s"} ({series[0].label} → {latest.label})
        </span>
      </div>
    </div>
  );
}
