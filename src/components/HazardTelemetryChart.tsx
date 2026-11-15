"use client";

import React from "react";
import { HazardChartSpec } from "@/lib/hazards";

function formatChartValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(4)));
}

export function HazardTelemetryChart({ chart }: { chart: HazardChartSpec }) {
  const { title, unit, series, thresholds } = chart;

  if (!series || series.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1">Here is: Log numeric samples to render chart points.</p>
      </div>
    );
  }

  const values = series.map((p) => p.value);
  const seriesMin = Math.min(...values);
  const seriesMax = Math.max(...values);
  const validThresholds = (thresholds ?? []).filter((t) => Number.isFinite(t.value));
  const scaleValues = [...values, ...validThresholds.map((t) => t.value)];
  const minVal = Math.min(...scaleValues);
  const maxVal = Math.max(...scaleValues);
  const span = maxVal - minVal || 1;
  const width = 320;
  const height = 100;
  const padX = 12;
  const padY = 12;

  const valueToY = (v: number) =>
    maxVal === minVal ? height / 2 : height - padY - ((v - minVal) / span) * (height - padY * 2);

  const coords = series.map((p, idx) => {
    const x =
      series.length === 1
        ? width / 2
        : padX + (idx / (series.length - 1)) * (width - padX * 2);
    const y = valueToY(p.value);
    return { x, y, point: p };
  });

  const thresholdLines = validThresholds.map((t) => ({
    ...t,
    color: t.color ?? "#ef4444",
    y: valueToY(t.value),
  }));

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const latest = series[series.length - 1];

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-800">
          Latest: {formatChartValue(latest.value)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full overflow-visible rounded-lg bg-slate-50"
        role="img"
        aria-label={title}
      >
        {thresholdLines.map((t, idx) => (
          <g key={`${t.label}-${idx}`}>
            <line
              x1={padX}
              x2={width - padX}
              y1={t.y}
              y2={t.y}
              stroke={t.color}
              strokeWidth="1.25"
              strokeDasharray="4 3"
            />
            <text
              x={width - padX}
              y={Math.max(10, t.y - 3)}
              textAnchor="end"
              fontSize="8"
              fontWeight="600"
              fill={t.color}
            >
              {t.label} ({formatChartValue(t.value)}
              {unit ? ` ${unit}` : ""})
            </text>
          </g>
        ))}
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
              {c.point.label}: {formatChartValue(c.point.value)}
              {unit ? ` ${unit}` : ""}
            </title>
          </circle>
        ))}
      </svg>

      {thresholdLines.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {thresholdLines.map((t, idx) => (
            <span
              key={`legend-${t.label}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
            >
              <span
                className="inline-block w-3 border-t-2 border-dashed"
                style={{ borderColor: t.color }}
              />
              <span>
                {t.label}: {formatChartValue(t.value)}
                {unit ? ` ${unit}` : ""}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Min: {formatChartValue(seriesMin)}
          {unit ? ` ${unit}` : ""} · Max: {formatChartValue(seriesMax)}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>
          {series.length} sample{series.length === 1 ? "" : "s"} ({series[0].label} → {latest.label})
        </span>
      </div>
    </div>
  );
}
