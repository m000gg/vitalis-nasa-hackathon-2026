"use client";

import React, { useId } from "react";
import { HazardChartSpec } from "@/lib/hazards";

function formatChartValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return String(Number(value.toFixed(4)));
}

export function HazardTelemetryChart({ chart }: { chart: HazardChartSpec }) {
  const gradId = useId();
  const { title, unit, chartType = "line", series, projectionSeries, thresholds } = chart;

  if (!series || series.length === 0) {
    return (
      <div className="hud-panel-subtle rounded-lg p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">{title}</p>
        <p className="mt-1 font-mono-tech">No numeric telemetry samples yet.</p>
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
  const height = isBar ? 116 : 104;
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
  const areaPoints =
    !isBar && coords.length > 1
      ? `${coords[0].x.toFixed(1)},${(height - padBottom).toFixed(1)} ${polylinePoints} ${coords[
          coords.length - 1
        ].x.toFixed(1)},${(height - padBottom).toFixed(1)}`
      : "";
  const latest = series[series.length - 1];

  const gridYFractions = [0.25, 0.5, 0.75];

  return (
    <div className="hud-panel space-y-2.5 rounded-lg p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-slate-100">{title}</p>
        <span className="rounded border border-[#3B82F6]/35 bg-[#3B82F6]/12 px-2 py-0.5 font-mono-tech text-[11px] font-bold text-blue-300">
          {isBar ? "PEAK" : "NOW"}: {formatChartValue(isBar ? seriesMax : latest.value)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-28 w-full overflow-visible rounded-md border border-slate-800/80 bg-[#060A14]"
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {gridYFractions.map((frac) => {
          const gy = padTop + frac * plotHeight;
          return (
            <line
              key={frac}
              x1={padX}
              x2={width - padX}
              y1={gy}
              y2={gy}
              stroke="rgba(148, 163, 184, 0.12)"
              strokeWidth="0.75"
            />
          );
        })}

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
              fontSize="7.5"
              fontWeight="700"
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
              stroke="rgba(148, 163, 184, 0.35)"
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
                    fill="#3B82F6"
                    fillOpacity="0.88"
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
                    fill="#94A3B8"
                  >
                    {shortLabel}
                  </text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            {areaPoints && <polygon points={areaPoints} fill={`url(#${gradId})`} />}
            {coords.length > 1 && (
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={polylinePoints}
              />
            )}
            {projCoords.length > 1 && (
              <polyline
                fill="none"
                stroke="#8B5CF6"
                strokeOpacity="0.85"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={projPolylinePoints}
              />
            )}
            {coords.map((c, idx) => (
              <circle
                key={idx}
                cx={c.x}
                cy={c.y}
                r="3.25"
                fill="#060A14"
                stroke="#3B82F6"
                strokeWidth="1.75"
              >
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
                fill="#060A14"
                stroke="#8B5CF6"
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
            <span className="inline-flex items-center gap-1.5 rounded border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-0.5 font-mono-tech text-[11px] text-violet-300">
              <span className="inline-block w-3 border-t-2 border-dashed border-[#8B5CF6]" />
              <span>
                Projected ({projPoints[0]?.label} → {projPoints[projPoints.length - 1]?.label})
              </span>
            </span>
          )}
          {thresholdLines.map((t, idx) => (
            <span
              key={`legend-${t.label}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-[#080D1A] px-2 py-0.5 font-mono-tech text-[11px] text-slate-300"
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

      <div className="flex items-center justify-between font-mono-tech text-[11px] text-slate-400">
        <span>
          MIN {formatChartValue(seriesMin)}
          {unit ? ` ${unit}` : ""} · MAX {formatChartValue(seriesMax)}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>
          {isBar
            ? `${series.length} ${series.length === 1 ? "CAT" : "CATS"}`
            : `${series.length} PTS (${series[0].label} → ${latest.label})`}
        </span>
      </div>
    </div>
  );
}
