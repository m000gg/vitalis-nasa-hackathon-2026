"use client";

import React from "react";
import { HazardChartSpec } from "@/lib/hazards";

function formatChartValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(4)));
}

export function HazardTelemetryChart({ chart }: { chart: HazardChartSpec }) {
  const { title, unit, chartType = "line", series, projectionSeries, thresholds } = chart;

  if (!series || series.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1">No numeric telemetry samples yet.</p>
      </div>
    );
  }

  const isBar = chartType === "bar";
  const projPoints = !isBar && projectionSeries ? projectionSeries : [];
  const values = series.map((p) => p.value);
  const seriesMin = Math.min(...values);
  const seriesMax = Math.max(...values);
  const validThresholds = (thresholds ?? []).filter((t) => Number.isFinite(t.value));
  const scaleValues = [
    ...values,
    ...projPoints.map((p) => p.value),
    ...validThresholds.map((t) => t.value),
    ...(isBar && seriesMin >= 0 ? [0] : []),
  ];
  const minVal = Math.min(...scaleValues);
  const maxVal = Math.max(...scaleValues);
  const span = maxVal - minVal || 1;
  const width = 320;
  const height = isBar ? 112 : 100;
  const padX = 12;
  const padTop = 12;
  const padBottom = isBar ? 22 : 12;
  const plotHeight = height - padTop - padBottom;

  const valueToY = (v: number) =>
    maxVal === minVal ? padTop + plotHeight / 2 : height - padBottom - ((v - minVal) / span) * plotHeight;

  const totalLineCount = series.length + projPoints.length;
  const lineXForIndex = (idx: number) =>
    totalLineCount <= 1 ? width / 2 : padX + (idx / (totalLineCount - 1)) * (width - padX * 2);

  const slotW = (width - padX * 2) / series.length;
  const barW = Math.min(34, Math.max(10, slotW * 0.56));
  const barBaselineY = valueToY(Math.max(0, minVal));

  const coords = series.map((p, idx) => {
    const x = isBar ? padX + (idx + 0.5) * slotW : lineXForIndex(idx);
    const y = valueToY(p.value);
    return { x, y, point: p };
  });

  const projCoords =
    projPoints.length > 0
      ? [
          coords[coords.length - 1],
          ...projPoints.map((p, idx) => ({
            x: lineXForIndex(series.length + idx),
            y: valueToY(p.value),
            point: p,
          })),
        ]
      : [];

  const thresholdLines = validThresholds.map((t) => ({
    ...t,
    color: t.color ?? "#ef4444",
    y: valueToY(t.value),
  }));

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const projPolylinePoints = projCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const latest = series[series.length - 1];

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{title}</p>
        <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-800">
          {isBar ? "Peak" : "Latest"}: {formatChartValue(isBar ? seriesMax : latest.value)}
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

        {isBar ? (
          <>
            <line
              x1={padX}
              x2={width - padX}
              y1={barBaselineY}
              y2={barBaselineY}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            {coords.map((c, idx) => {
              const barHeight = Math.max(2, Math.abs(barBaselineY - c.y));
              const barY = Math.min(c.y, barBaselineY);
              const shortLabel =
                c.point.label.length > 10 ? `${c.point.label.slice(0, 9)}…` : c.point.label;
              return (
                <g key={idx}>
                  <rect
                    x={c.x - barW / 2}
                    y={barY}
                    width={barW}
                    height={barHeight}
                    rx="2"
                    fill="#0284c7"
                  >
                    <title>
                      {c.point.label}: {formatChartValue(c.point.value)}
                      {unit ? ` ${unit}` : ""}
                    </title>
                  </rect>
                  <text
                    x={c.x}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill="#475569"
                  >
                    {shortLabel}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
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
            {projCoords.length > 1 && (
              <polyline
                fill="none"
                stroke="#0284c7"
                strokeOpacity="0.65"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={projPolylinePoints}
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
            {projCoords.slice(1).map((c, idx) => (
              <circle
                key={`proj-${idx}`}
                cx={c.x}
                cy={c.y}
                r="3"
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth="1.75"
              >
                <title>
                  Projected {c.point.label}: {formatChartValue(c.point.value)}
                  {unit ? ` ${unit}` : ""}
                </title>
              </circle>
            ))}
          </>
        )}
      </svg>

      {(thresholdLines.length > 0 || projCoords.length > 1) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {projCoords.length > 1 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              <span className="inline-block w-3 border-t-2 border-dashed border-sky-600" />
              <span>Projected ({projPoints[0]?.label} → {projPoints[projPoints.length - 1]?.label})</span>
            </span>
          )}
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
          {isBar
            ? `${series.length} ${series.length === 1 ? "category" : "categories"}`
            : `${series.length} sample${series.length === 1 ? "" : "s"} (${series[0].label} → ${latest.label})`}
        </span>
      </div>
    </div>
  );
}
