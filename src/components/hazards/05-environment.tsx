"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  Info,
  MoveRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import type { HazardScreenProps } from "./types";
import {
  AirStatus,
  DataTag,
  ENVIRONMENT_PIPELINE_VALUES as V,
  ModuleAlert,
  ModuleModel,
  TimeBasis,
  buildEnvironmentModel,
  environmentStatus,
  formatSlope,
} from "@/lib/hazards/05-environment";

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN
 * Owner: Teammate 5 — Edit ONLY this file (and src/lib/hazards/05-environment.ts).
 *
 * Read-only view of the module air samples in the database (docs/hazards/05-hostile-closed-environments.md §4):
 *   Feature 1 — Habitat Map (module status, worst metric, metric table with REAL/SIM tags, banner)
 *   Feature 2 — CO2 forecast (headache odds above 4 mmHg, trend estimate, alert cards, ledger)
 * The only interaction is selecting a module and acknowledging an alert (kept in this browser only).
 */

const ACK_STORAGE_KEY = "vitalis.hazard5.acknowledgedAlerts";
const ACK_STORAGE_MAX = 200;

type TileStatus = AirStatus | "none";

const STATUS_STYLE: Record<TileStatus, { label: string; chip: string; card: string; ring: string; Icon: typeof CircleCheck }> = {
  green: {
    label: "Green",
    chip: "bg-emerald-100 text-emerald-800",
    card: "border-emerald-300 bg-emerald-50",
    ring: "ring-emerald-500",
    Icon: CircleCheck,
  },
  yellow: {
    label: "Yellow",
    chip: "bg-amber-100 text-amber-800",
    card: "border-amber-300 bg-amber-50",
    ring: "ring-amber-500",
    Icon: TriangleAlert,
  },
  red: {
    label: "Red",
    chip: "bg-red-100 text-red-800",
    card: "border-red-300 bg-red-50",
    ring: "ring-red-500",
    Icon: CircleX,
  },
  none: {
    label: "No data",
    chip: "bg-slate-100 text-slate-600",
    card: "border-slate-300 bg-white",
    ring: "ring-slate-400",
    Icon: CircleDashed,
  },
};

/** SVG colors for the chart, keyed by the same status the chips use. */
const STATUS_HEX: Record<AirStatus, string> = { green: "#059669", yellow: "#d97706", red: "#dc2626" };

const HAZARD_STATUS_CHIP: Record<"NOMINAL" | "ELEVATED" | "CRITICAL", string> = {
  NOMINAL: "bg-emerald-100 text-emerald-800",
  ELEVATED: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-red-100 text-red-800",
};

function round(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

function StatusChip({ status, text }: { status: TileStatus; text?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.chip}`}>
      <s.Icon className="h-3.5 w-3.5" aria-hidden />
      {text ?? s.label}
    </span>
  );
}

function TagChip({ tag }: { tag: DataTag }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
        tag === "REAL" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {tag}
    </span>
  );
}

function TrendIcon({ module }: { module: ModuleModel }) {
  if (module.forecast.state !== "ready") return null;
  const cls = "h-3.5 w-3.5";
  if (module.forecast.trend === "rising") return <TrendingUp className={`${cls} text-red-600`} aria-hidden />;
  if (module.forecast.trend === "falling") return <TrendingDown className={`${cls} text-emerald-600`} aria-hidden />;
  return <MoveRight className={`${cls} text-slate-500`} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Acknowledged alerts (per browser; an escalation changes ackKey, so it asks again)
// ---------------------------------------------------------------------------

function useAcknowledgedAlerts() {
  const [acked, setAcked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setAcked(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
      // Storage unavailable (private window, blocked site data): acknowledgements stay in memory only.
    }
  }, []);

  /** Acknowledge, or undo an acknowledgement when the alert is already acknowledged. */
  const toggleAcknowledged = (ackKey: string) => {
    setAcked((prev) => {
      const next = prev.includes(ackKey) ? prev.filter((k) => k !== ackKey) : [...prev, ackKey].slice(-ACK_STORAGE_MAX);
      try {
        window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore, see above
      }
      return next;
    });
  };

  return { acked, toggleAcknowledged };
}

// ---------------------------------------------------------------------------
// CO2 chart: last 2 h (solid), dashed line for the next 2 h (trend slope, flat when stable), and two reference
// lines: the red NASA limit at 4 mmHg and a thinner, lighter amber early-warning line at co2EarlyWarningMmhg.
// The dashed line is module.trendLine from the logic file, so it uses the same slope and window as the status.
// ---------------------------------------------------------------------------

const TICK_MIN_GAP_PX = 9;
/** Text color of the early-warning label: darker than the light line so the small label stays readable. */
const EARLY_WARNING_TEXT = "#b45309";
/** History: solid blue. Trend estimate: a lighter shade of the same blue, half the stroke width, dashed, round caps. */
const HISTORY_LINE = { color: "#0284c7", width: 2.25 };
const TREND_LINE = { color: "#38bdf8", width: HISTORY_LINE.width / 2, dash: "4 4" };

function Co2Chart({ module }: { module: ModuleModel }) {
  const width = 320;
  const height = 130;
  const pad = { left: 30, right: 10, top: 10, bottom: 18 };
  const horizon = V.trendSettings.historyWindowMin;
  const limit = V.limits.co2TargetMmhg;
  const early = V.co2Warning.co2EarlyWarningMmhg;
  const last = module.history[module.history.length - 1];
  if (!last || !module.co2) return null;
  const latestMin = last.tMin;
  const statusColor = STATUS_HEX[module.co2.status];

  // The y range always contains both reference lines (3.8 and 4 mmHg), the samples and the dashed line.
  const data = [...module.history, ...module.trendLine].map((s) => s.co2Mmhg);
  const dataMin = Math.min(...data, limit, early);
  const dataMax = Math.max(...data, limit, early);
  const spanPad = Math.max((dataMax - dataMin) * 0.12, 0.1);
  const minY = dataMin - spanPad;
  const maxY = dataMax + spanPad;

  const x = (t: number) => pad.left + ((t - (latestMin - horizon)) / (2 * horizon)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - minY) / (maxY - minY)) * (height - pad.top - pad.bottom);
  const toPoints = (samples: { tMin: number; co2Mmhg: number }[]) =>
    samples.map((s) => `${x(s.tMin).toFixed(1)},${y(s.co2Mmhg).toFixed(1)}`).join(" ");
  const limitY = y(limit);
  const earlyY = y(early);

  // Two-decimal ticks. Both reference lines always get one ("4.00" and "3.80"); when the lines are closer than a
  // label height (very tall y range) the two labels are nudged apart. The lowest and highest value get a tick
  // only when it does not duplicate or overlap another label.
  const nudge = Math.max(0, (TICK_MIN_GAP_PX - (earlyY - limitY)) / 2);
  const ticks: { label: string; y: number }[] = [
    { label: limit.toFixed(2), y: limitY - nudge },
    { label: early.toFixed(2), y: earlyY + nudge },
  ];
  for (const v of [dataMin, dataMax]) {
    const tick = { label: v.toFixed(2), y: y(v) };
    if (ticks.some((t) => t.label === tick.label || Math.abs(t.y - tick.y) < TICK_MIN_GAP_PX)) continue;
    ticks.push(tick);
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full rounded-lg bg-white"
      role="img"
      aria-label={`${module.moduleName} CO2 ${module.co2.label}: last 2 hours of samples and trend estimate, NASA limit ${limit} mmHg, early warning ${early} mmHg`}
    >
      {ticks.map((t) => (
        <text key={t.label} x={pad.left - 4} y={t.y + 3} textAnchor="end" fontSize="8" fill="#64748b">
          {t.label}
        </text>
      ))}
      <line x1={x(latestMin)} x2={x(latestMin)} y1={pad.top} y2={height - pad.bottom} stroke="#cbd5e1" strokeWidth="1" />
      {/* Early warning (our setting): thinner and lighter than the NASA limit; label on the left, below its line */}
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={earlyY}
        y2={earlyY}
        stroke={V.chart.earlyWarningColor}
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />
      <text x={pad.left + 3} y={earlyY + 9} fontSize="7" fill={EARLY_WARNING_TEXT} stroke="#ffffff" strokeWidth="2" paintOrder="stroke">
        {V.chart.earlyWarningLabel} ({early} mmHg)
      </text>
      {/* NASA limit: label on the right, above its line */}
      <line x1={pad.left} x2={width - pad.right} y1={limitY} y2={limitY} stroke={V.chart.limitColor} strokeWidth="1.25" strokeDasharray="4 3" />
      <text x={width - pad.right} y={Math.max(9, limitY - 3)} textAnchor="end" fontSize="8" fontWeight="600" fill={V.chart.limitColor}>
        {V.chart.limitLabel} ({limit} mmHg)
      </text>
      {module.history.length > 1 && (
        <polyline
          fill="none"
          stroke={HISTORY_LINE.color}
          strokeWidth={HISTORY_LINE.width}
          strokeLinejoin="round"
          points={toPoints(module.history)}
        />
      )}
      <polyline
        fill="none"
        stroke={TREND_LINE.color}
        strokeWidth={TREND_LINE.width}
        strokeDasharray={TREND_LINE.dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={toPoints(module.trendLine)}
      />
      <circle cx={x(last.tMin)} cy={y(last.co2Mmhg)} r="4" fill={statusColor} stroke="#ffffff" strokeWidth="1" />
      <text x={pad.left + 3} y={pad.top + 6} fontSize="8" fontWeight="600" fill={statusColor}>
        {module.co2.label}
      </text>
      <text x={pad.left} y={height - 4} fontSize="8" fill="#64748b">
        −2 h
      </text>
      <text x={x(latestMin)} y={height - 4} textAnchor="middle" fontSize="8" fill="#64748b">
        latest sample
      </text>
      <text x={width - pad.right} y={height - 4} textAnchor="end" fontSize="8" fill="#64748b">
        +2 h
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function AlertCard({ alert, acked, onToggleAck }: { alert: ModuleAlert; acked: boolean; onToggleAck: () => void }) {
  const critical = alert.severity === "critical";
  return (
    <article
      className={`rounded-xl border p-4 text-xs ${
        acked ? "border-slate-200 bg-slate-50 opacity-75" : critical ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {critical ? (
            <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              <span className={critical ? "text-red-700" : "text-amber-700"}>{critical ? "CRITICAL" : "WARNING"}</span> · {alert.title}
            </p>
            <p className="mt-0.5 text-slate-600">
              {critical ? "ETA: now (already above the target)" : `Reason: ${alert.reason ?? "—"}`} · since {alert.startedAtLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleAck}
          aria-pressed={acked}
          title={acked ? "Click to undo the acknowledgement" : undefined}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
            acked
              ? "border-slate-300 bg-slate-200 text-slate-700 hover:bg-slate-300"
              : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
          }`}
        >
          {acked && <Check className="h-3.5 w-3.5" aria-hidden />}
          {acked ? "Acknowledged" : "Acknowledge"}
        </button>
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 pl-9 text-slate-800">
        {alert.actions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ol>
      <p className="mt-1.5 pl-6 text-[10px] text-slate-500">Demo placeholder actions, not NASA procedures.</p>
    </article>
  );
}

function ModuleTile({ module, selected, onSelect }: { module: ModuleModel; selected: boolean; onSelect: () => void }) {
  const status: TileStatus = module.air?.status ?? "none";
  const s = STATUS_STYLE[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-24 flex-1 flex-col items-start justify-between rounded-xl border-2 p-3 text-left text-xs transition ${s.card} ${
        selected ? `ring-2 ring-offset-2 ${s.ring}` : "hover:brightness-95"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-900">{module.moduleName}</span>
        <s.Icon className="h-5 w-5" aria-label={s.label} />
      </span>
      <span className="font-mono text-[11px] text-slate-700">
        {!module.air
          ? "No data"
          : module.air.status === "green"
          ? "All metrics in limits"
          : module.air.worstMetric.statusLabel
          ? `${module.air.worstMetric.text} · ${module.air.worstMetric.statusLabel}`
          : module.air.worstMetric.text}
        {module.air && module.air.status !== "green" && module.air.worstMetric.statusReason && (
          <span className="mt-0.5 block font-sans text-[10px] text-slate-600">{module.air.worstMetric.statusReason}</span>
        )}
      </span>
    </button>
  );
}

function metricLabel(metric: string): string {
  if (metric === "co2") return "CO2";
  if (metric === "o2") return "O2";
  return metric[0].toUpperCase() + metric.slice(1);
}

function ModuleDetails({ module }: { module: ModuleModel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {module.moduleName}
          {module.latestLabel && <span className="ml-2 font-normal text-slate-500">latest sample: {module.latestLabel}</span>}
        </p>
        {module.air && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Worst metric:</span>
            <StatusChip status={module.air.worstMetric.status} text={module.air.worstMetric.text} />
          </div>
        )}
      </div>
      {!module.hasData ? (
        <p className="mt-3 text-slate-600">
          {V.messages.noSamples} Stream: “{module.streamName}”.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Metric</th>
                <th className="py-1 pr-3 font-medium">Value</th>
                <th className="py-1 pr-3 font-medium">Status</th>
                <th className="py-1 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(module.air?.metrics ?? []).map((m) => (
                <tr key={m.metric}>
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{metricLabel(m.metric)}</td>
                  <td className="py-1.5 pr-3 font-mono">
                    {round(m.value, m.metric === "co2" ? 2 : 1)} {m.unit}
                  </td>
                  <td className="py-1.5 pr-3">
                    <StatusChip status={m.status} text={m.statusLabel} />
                    {m.statusReason && <span className="mt-0.5 block text-[10px] text-slate-600">{m.statusReason}</span>}
                  </td>
                  <td className="py-1.5">
                    <TagChip tag={m.tag} />
                  </td>
                </tr>
              ))}
              {module.infoMetrics.map((m) => (
                <tr key={m.key}>
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{m.label}</td>
                  <td className="py-1.5 pr-3 font-mono">
                    {round(m.value, 1)} {m.unit}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-500">information only</td>
                  <td className="py-1.5">
                    <TagChip tag={m.tag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{V.messages.temperatureHumidity}</p>
    </div>
  );
}

function ForecastCard({ module }: { module: ModuleModel }) {
  const f = module.forecast;
  const co2 = module.reading?.co2Mmhg ?? null;
  const assessment = module.co2;

  if (co2 === null || !assessment) {
    return (
      <article className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{module.moduleName}</p>
          <StatusChip status="none" />
        </div>
        <p className="text-slate-600">{V.messages.noSamples}</p>
      </article>
    );
  }

  const rising = f.state === "ready" && f.trend === "rising";
  const boxStyle =
    assessment.status === "red" ? "bg-red-100 text-red-800" : assessment.status === "yellow" ? "bg-amber-100 text-amber-900" : "bg-white text-slate-700";
  return (
    <article className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{module.moduleName}</p>
        <StatusChip status={assessment.status} text={assessment.label} />
      </div>
      <Co2Chart module={module} />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-slate-500">CO2 now</dt>
        <dd className="flex items-center gap-1.5 font-mono text-slate-900">
          {round(co2, 2)} mmHg <TagChip tag={module.reading?.co2Tag ?? "SIM"} />
        </dd>
        <dt className="text-slate-500">Trend</dt>
        <dd className="flex items-center gap-1 font-mono text-slate-900">
          <TrendIcon module={module} />
          {f.state === "ready" ? `${f.trend} (${formatSlope(f.slopeMmhgPerMin)} mmHg/min)` : V.messages.collecting}
        </dd>
        {rising && f.state === "ready" && f.minutesToLimit !== null && (
          <>
            <dt className="text-slate-500">Time to target (trend estimate)</dt>
            <dd className="font-mono text-slate-900">{Math.round(f.minutesToLimit)} min</dd>
          </>
        )}
      </dl>
      <div className={`space-y-0.5 rounded-md px-2 py-1.5 font-medium ${boxStyle}`}>
        <p>{module.message}</p>
        {assessment.reason && (
          <p>
            {assessment.label}: {assessment.reason}
          </p>
        )}
        {module.headacheOddsText && <p className="font-mono">Headache odds {module.headacheOddsText}</p>}
      </div>
    </article>
  );
}

function LimitsInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
      >
        <Info className="h-3.5 w-3.5" aria-hidden /> Limits of this view
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-700 shadow-lg">
          {V.limitsTooltipLines.map((line) => (
            <p key={line}>• {line}</p>
          ))}
          <p className="text-slate-500">[5] Noise reference: {V.limits.noiseReferenceText}.</p>
        </div>
      )}
    </div>
  );
}

function ledgerMinutes(minutes: number, basis: TimeBasis): string {
  return basis === "tMin" ? `${round(minutes, 1)} min` : `${Math.round(minutes)} min`;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function EnvironmentHazardScreen({
  role,
  activeCharacter,
  snapshot,
  hazardSamples,
  scenarioHazardSamples,
  reentryMode,
}: HazardScreenProps) {
  // Same inputs and status rule as evaluate(), so this view matches snapshot.status.
  const model = useMemo(
    () => buildEnvironmentModel({ hazardSamples, scenarioHazardSamples }),
    [hazardSamples, scenarioHazardSamples]
  );
  const breakdown = environmentStatus(model, activeCharacter.readinessState);

  const [selectedId, setSelectedId] = useState<string>(V.modules[0].id);
  const selected = model.modules.find((m) => m.moduleId === selectedId) ?? model.modules[0];
  const { acked, toggleAcknowledged } = useAcknowledgedAlerts();
  const openAlerts = model.alerts.filter((a) => !acked.includes(a.ackKey)).length;

  return (
    <div className="space-y-4">
      {/* Status source + data source */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Hazard status</span>
            <span className={`rounded-md px-2 py-0.5 font-semibold ${HAZARD_STATUS_CHIP[snapshot.status]}`}>{snapshot.status}</span>
            <span className="text-slate-500">= worse of</span>
            <span className={`rounded-md px-2 py-0.5 ${HAZARD_STATUS_CHIP[breakdown.airStatus]}`}>
              Air: {model.hasData ? breakdown.airStatus : "no data"}
            </span>
            <span className="text-slate-500">and</span>
            <span
              className={`rounded-md px-2 py-0.5 ${HAZARD_STATUS_CHIP[breakdown.readinessStatus]} ${
                breakdown.raisedByReadiness ? "ring-1 ring-current" : ""
              }`}
            >
              Readiness: {breakdown.readinessState}
            </span>
          </div>
          <LimitsInfo />
        </div>
        {breakdown.raisedByReadiness && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
            {breakdown.readinessStatus} comes from {activeCharacter.callsign}&apos;s readiness ({breakdown.readinessState}), not from the module air.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {model.dataBadge && (
            <span className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">{model.dataBadge}</span>
          )}
          {model.dataTag === "REAL" && (
            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">CO2: REAL · NASA OSDR EDA</span>
          )}
          {model.latestLabel && (
            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">latest sample: {model.latestLabel}</span>
          )}
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{role === "lead" ? "Lead view" : "Member view"}</span>
        </div>
        {!model.hasData && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-600">
            No Hazard 5 samples in the database yet. Module values appear when samples are written to{" "}
            {V.modules.map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 && ", "}“{m.streamName}”
              </React.Fragment>
            ))}
            .
          </p>
        )}
      </section>

      {/* Alerts */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">CO2 alerts</h2>
          <span className="text-[11px] text-slate-500">
            {model.alerts.length} active · {openAlerts} not acknowledged
          </span>
        </div>
        {model.alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden /> No CO2 alerts.
          </p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {model.alerts.map((a) => (
              <AlertCard key={a.ackKey} alert={a} acked={acked.includes(a.ackKey)} onToggleAck={() => toggleAcknowledged(a.ackKey)} />
            ))}
          </div>
        )}
        {snapshot.solutions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <p className="font-semibold text-slate-900">Recommended now{reentryMode ? " (re-entry mode: 1 action)" : ""}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-800">
              {snapshot.solutions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Feature 1: Habitat Map */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Habitat map — air layer</h2>
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-700" aria-label={model.banner}>
            <StatusChip status="green" text={`${model.counts.green} green`} />
            <StatusChip status="yellow" text={`${model.counts.yellow} yellow`} />
            <StatusChip status="red" text={`${model.counts.red} red`} />
            {model.counts.noData > 0 && <StatusChip status="none" text={`${model.counts.noData} no data`} />}
          </p>
        </div>
        <p className="sr-only">{model.banner}</p>
        <div className="flex flex-col items-stretch gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:flex-row sm:items-center">
          {model.modules.map((m, i) => (
            <React.Fragment key={m.moduleId}>
              {i > 0 && <span aria-hidden className="mx-auto h-3 w-2 rounded-sm bg-slate-300 sm:mx-0 sm:h-2 sm:w-4" />}
              <ModuleTile module={m} selected={m.moduleId === selected.moduleId} onSelect={() => setSelectedId(m.moduleId)} />
            </React.Fragment>
          ))}
        </div>
        <ModuleDetails module={selected} />
      </section>

      {/* Feature 2: CO2 forecast */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Air risk forecast — CO2 and headache odds</h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-sky-600" /> last 2 h
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dashed border-sky-400" /> trend estimate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-red-500" /> {V.chart.limitLabel} ({V.limits.co2TargetMmhg} mmHg)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dotted border-amber-300" /> {V.chart.earlyWarningLegend}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-slate-500">{V.studyFactsText}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {model.modules.map((m) => (
            <ForecastCard key={m.moduleId} module={m} />
          ))}
        </div>
      </section>

      {/* Ledger */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <h2 className="text-sm font-semibold text-slate-900">CO2 ledger (since the first sample)</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[360px] text-left">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Module</th>
                <th className="py-1 pr-3 font-medium">Minutes above {V.limits.co2TargetMmhg} mmHg</th>
                <th className="py-1 font-medium">Max CO2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {model.modules.map((m) => (
                <tr key={m.moduleId}>
                  <td className="py-1.5 pr-3 font-medium text-slate-800">{m.moduleName}</td>
                  <td className={`py-1.5 pr-3 font-mono ${m.ledger && m.ledger.minutesAboveLimit > 0 ? "text-red-700" : "text-slate-700"}`}>
                    {m.ledger ? ledgerMinutes(m.ledger.minutesAboveLimit, model.timeBasis) : "—"}
                  </td>
                  <td className="py-1.5 font-mono text-slate-700">{m.ledger ? `${round(m.ledger.maxCo2Mmhg, 2)} mmHg` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
