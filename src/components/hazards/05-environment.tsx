"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleCheck,
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
  Co2Level,
  DataTag,
  ENVIRONMENT_PIPELINE_VALUES as V,
  ModuleAlert,
  ModuleModel,
  buildEnvironmentModel,
} from "@/lib/hazards/05-environment";

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN
 * Owner: Teammate 5 — Edit ONLY this file (and src/lib/hazards/05-environment.ts).
 *
 * Read-only, DB-driven view of the shared simulation (docs/hazards/05-hostile-closed-environments.md §4):
 *   Feature 1 — Habitat Map (module status, worst metric, metric table with REAL/SIM tags, banner)
 *   Feature 2 — Air Risk Forecast (per-module risk, CO2 chart + projection, alert cards, ledger)
 * The only interaction is selecting a module and acknowledging an alert (kept in this browser only).
 */

const ACK_STORAGE_KEY = "vitalis.hazard5.acknowledgedAlerts";
const ACK_STORAGE_MAX = 200;

const STATUS_STYLE: Record<AirStatus, { label: string; chip: string; card: string; ring: string; Icon: typeof CircleCheck }> = {
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
};

const LEVEL_TO_STATUS: Record<Co2Level, AirStatus> = { low: "green", elevated: "yellow", high: "red" };

function round(value: number, decimals: number): string {
  return String(Number(value.toFixed(decimals)));
}

function StatusChip({ status, text }: { status: AirStatus; text?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.chip}`}>
      <s.Icon className="h-3.5 w-3.5" aria-hidden />
      {text ?? s.label}
    </span>
  );
}

function TagChip({ tag, note }: { tag: DataTag; note?: string }) {
  return (
    <span
      title={note}
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
        tag === "REAL" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {tag}
      {note ? "*" : ""}
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

  const acknowledge = (ackKey: string) => {
    setAcked((prev) => {
      if (prev.includes(ackKey)) return prev;
      const next = [...prev, ackKey].slice(-ACK_STORAGE_MAX);
      try {
        window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore, see above
      }
      return next;
    });
  };

  return { acked, acknowledge };
}

// ---------------------------------------------------------------------------
// CO2 chart: last 2 h (solid), projection next 2 h (dashed), NASA limit line at 4 mmHg
// ---------------------------------------------------------------------------

function Co2Chart({ module, nowMin }: { module: ModuleModel; nowMin: number }) {
  const width = 320;
  const height = 130;
  const pad = { left: 30, right: 10, top: 10, bottom: 18 };
  const horizon = V.demoSettings.forecastHorizonMin;
  const limit = V.limits.co2TargetMmhg;

  const values = [...module.history, ...module.projection].map((s) => s.co2Mmhg).concat(limit);
  let minY = Math.min(...values);
  let maxY = Math.max(...values);
  const spanPad = Math.max((maxY - minY) * 0.12, 0.1);
  minY -= spanPad;
  maxY += spanPad;

  const x = (t: number) => pad.left + ((t - (nowMin - horizon)) / (2 * horizon)) * (width - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - minY) / (maxY - minY)) * (height - pad.top - pad.bottom);
  const toPoints = (samples: { tMin: number; co2Mmhg: number }[]) =>
    samples.map((s) => `${x(s.tMin).toFixed(1)},${y(s.co2Mmhg).toFixed(1)}`).join(" ");

  const last = module.history[module.history.length - 1];
  const limitY = y(limit);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full rounded-lg bg-white"
      role="img"
      aria-label={`${module.moduleName} CO2, last 2 hours and 2 hour projection, NASA limit ${limit} mmHg`}
    >
      {/* y-axis ticks */}
      {[minY + spanPad, maxY - spanPad].map((v, i) => (
        <text key={i} x={pad.left - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fill="#64748b">
          {round(v, 1)}
        </text>
      ))}
      {/* now marker */}
      <line x1={x(nowMin)} x2={x(nowMin)} y1={pad.top} y2={height - pad.bottom} stroke="#cbd5e1" strokeWidth="1" />
      {/* NASA limit */}
      <line x1={pad.left} x2={width - pad.right} y1={limitY} y2={limitY} stroke="#ef4444" strokeWidth="1.25" strokeDasharray="4 3" />
      <text x={width - pad.right} y={Math.max(9, limitY - 3)} textAnchor="end" fontSize="8" fontWeight="600" fill="#ef4444">
        {V.chart.limitLabel} ({limit} mmHg)
      </text>
      {/* history */}
      {module.history.length > 1 && (
        <polyline fill="none" stroke="#0284c7" strokeWidth="2.25" strokeLinejoin="round" points={toPoints(module.history)} />
      )}
      {/* projection */}
      {module.projection.length > 1 && (
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
          points={toPoints(module.projection)}
        />
      )}
      {last && <circle cx={x(last.tMin)} cy={y(last.co2Mmhg)} r="3.5" fill="#0f172a" />}
      {/* x-axis labels */}
      <text x={pad.left} y={height - 4} fontSize="8" fill="#64748b">
        −2 h
      </text>
      <text x={x(nowMin)} y={height - 4} textAnchor="middle" fontSize="8" fill="#64748b">
        now (min {nowMin})
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

function AlertCard({ alert, acked, onAck }: { alert: ModuleAlert; acked: boolean; onAck: () => void }) {
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
              ETA: {critical ? "now (already above the limit)" : `about ${alert.etaMin} min`} · since simulated minute {alert.startedAtMin}
            </p>
          </div>
        </div>
        {acked ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
            <Check className="h-3.5 w-3.5" aria-hidden /> Acknowledged
          </span>
        ) : (
          <button
            type="button"
            onClick={onAck}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
          >
            Acknowledge
          </button>
        )}
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
  const s = STATUS_STYLE[module.air.status];
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
        {module.air.status === "green" ? "All metrics in limits" : module.air.worstMetric.text}
      </span>
    </button>
  );
}

function ModuleDetails({ module }: { module: ModuleModel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{module.moduleName}</p>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Worst metric:</span>
          <StatusChip status={module.air.worstMetric.status} text={module.air.worstMetric.text} />
        </div>
      </div>
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
            {module.air.metrics.map((m) => (
              <tr key={m.metric}>
                <td className="py-1.5 pr-3 font-medium text-slate-800">{m.metric === "co2" ? "CO2" : m.metric === "o2" ? "O2" : m.metric[0].toUpperCase() + m.metric.slice(1)}</td>
                <td className="py-1.5 pr-3 font-mono">
                  {round(m.value, m.metric === "co2" ? 2 : 1)} {m.unit}
                </td>
                <td className="py-1.5 pr-3">
                  <StatusChip status={m.status} />
                </td>
                <td className="py-1.5">
                  <TagChip tag={m.tag} note={m.tagNote} />
                </td>
              </tr>
            ))}
            {module.infoMetrics.map((m) => (
              <tr key={m.key}>
                <td className="py-1.5 pr-3 font-medium text-slate-800">{m.label}</td>
                <td className="py-1.5 pr-3 font-mono">
                  {round(m.value, 1)} {m.unit}
                </td>
                <td className="py-1.5 pr-3 text-slate-500">info only</td>
                <td className="py-1.5">
                  <TagChip tag={m.tag} />
                </td>
              </tr>
            ))}
            {module.infoMetrics.length === 0 && (
              <tr>
                <td className="py-1.5 pr-3 font-medium text-slate-800">Temperature, humidity</td>
                <td colSpan={3} className="py-1.5 text-slate-500">
                  Here is: cabin temperature and humidity from the OSDR EDA CSV when present (info only, no NASA health limit).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {module.air.metrics[0].tagNote && (
        <p className="mt-2 text-[10px] text-slate-500">* {module.air.metrics[0].tagNote}</p>
      )}
    </div>
  );
}

function ForecastCard({ module, nowMin }: { module: ModuleModel; nowMin: number }) {
  const f = module.forecast;
  return (
    <article className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{module.moduleName}</p>
        <StatusChip status={LEVEL_TO_STATUS[module.level]} text={`CO2 ${module.level}`} />
      </div>
      <Co2Chart module={module} nowMin={nowMin} />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-slate-500">CO2 now</dt>
        <dd className="font-mono text-slate-900">{round(module.reading.co2Mmhg, 2)} mmHg</dd>
        <dt className="text-slate-500">Headache odds</dt>
        <dd className="font-mono text-slate-900">{module.multiplierText}</dd>
        <dt className="text-slate-500">Weekly risk</dt>
        <dd className="font-mono text-slate-900">{(module.weeklyRisk * 100).toFixed(1)}% (illustrative)</dd>
        <dt className="text-slate-500">Trend</dt>
        <dd className="flex items-center gap-1 font-mono text-slate-900">
          <TrendIcon module={module} />
          {f.state === "ready" ? `${f.trend} (${f.slopeMmhgPerMin > 0 ? "+" : ""}${round(f.slopeMmhgPerMin, 3)} mmHg/min)` : "—"}
        </dd>
        <dt className="text-slate-500">Minutes to limit</dt>
        <dd className="font-mono text-slate-900">
          {f.state === "ready" && f.minutesToLimit !== null ? `${Math.round(f.minutesToLimit)} min` : "—"}
        </dd>
        <dt className="text-slate-500">In 2 h (projected)</dt>
        <dd className="font-mono text-slate-900">{f.state === "ready" ? `${round(f.projectedCo2Mmhg, 2)} mmHg` : "—"}</dd>
      </dl>
      <p
        className={`rounded-md px-2 py-1.5 font-medium ${
          module.level === "high" ? "bg-red-100 text-red-800" : module.level === "elevated" ? "bg-amber-100 text-amber-800" : "bg-white text-slate-700"
        }`}
      >
        {module.message}
      </p>
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
          <p className="border-t border-slate-100 pt-1.5 text-slate-500">[2] {V.studyFactsText}</p>
          <p className="text-slate-500">[5] Noise reference: {V.limits.noiseReferenceText}.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function EnvironmentHazardScreen({
  role,
  snapshot,
  hazardRecords,
  hazardSamples,
  scenarioHazardRecords,
  scenarioHazardSamples,
  reentryMode,
}: HazardScreenProps) {
  // Same inputs as evaluate() (actor overrides + DB records/samples), so this view matches snapshot.status.
  const model = useMemo(
    () =>
      buildEnvironmentModel({
        actorInputs: snapshot.actorInputOverrides,
        hazardRecords,
        hazardSamples,
        scenarioHazardRecords,
        scenarioHazardSamples,
      }),
    [snapshot.actorInputOverrides, hazardRecords, hazardSamples, scenarioHazardRecords, scenarioHazardSamples]
  );

  const [selectedId, setSelectedId] = useState<string>(V.modules[0].id);
  const selected = model.modules.find((m) => m.moduleId === selectedId) ?? model.modules[0];
  const { acked, acknowledge } = useAcknowledgedAlerts();

  const hasStreams =
    [...hazardRecords, ...scenarioHazardRecords].some((r) => r.hazardSlug === "environment") ||
    [...hazardSamples, ...scenarioHazardSamples].some((s) => s.hazardSlug === "environment");
  const openAlerts = model.alerts.filter((a) => !acked.includes(a.ackKey)).length;

  return (
    <div className="space-y-4">
      {/* Data source + simulation state */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {model.dataBadge ? (
            <span className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">{model.dataBadge}</span>
          ) : (
            <span className="rounded-md bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
              Cabin CO2: REAL · NASA OSDR EDA replay
            </span>
          )}
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">simulated minute {model.nowMin}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">Demo: {model.scenarioLabel}</span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{role === "lead" ? "Lead view" : "Member view"}</span>
        </div>
        <LimitsInfo />
        {!hasStreams && (
          <p className="w-full rounded-md bg-slate-50 px-3 py-2 text-slate-600">
            Here is: no Hazard 5 streams in Supabase yet (“{V.streams.cabinCo2}”, “{V.streams.demoScenario}”, “
            {V.streams.simulatedMinutes}”). Showing the demo replay at minute 0.
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
          <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CircleCheck className="h-4 w-4" aria-hidden /> No CO2 alerts. {V.messages.low}
          </p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {model.alerts.map((a) => (
              <AlertCard key={a.ackKey} alert={a} acked={acked.includes(a.ackKey)} onAck={() => acknowledge(a.ackKey)} />
            ))}
          </div>
        )}
        {snapshot.solutions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
            <p className="font-semibold text-slate-900">
              Recommended now{reentryMode ? " (re-entry mode: 1 action)" : ""}
            </p>
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
          </p>
        </div>
        <p className="sr-only">{model.banner}</p>
        {/* Schematic: modules joined by hatches */}
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

      {/* Feature 2: Air Risk Forecast */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Air risk forecast — CO2 and headache odds</h2>
          <p className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-sky-600" /> last 2 h
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-amber-500" /> projection
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-red-500" /> {V.chart.limitLabel}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Each +1 mmHg of CO2 doubles headache odds [2]. Weekly risk is illustrative, anchored at 1.6% for 4 mmHg.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {model.modules.map((m) => (
            <ForecastCard key={m.moduleId} module={m} nowMin={model.nowMin} />
          ))}
        </div>
      </section>

      {/* Ledger */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <h2 className="text-sm font-semibold text-slate-900">CO2 ledger (since replay start)</h2>
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
                  <td className={`py-1.5 pr-3 font-mono ${m.ledger.minutesAboveLimit > 0 ? "text-red-700" : "text-slate-700"}`}>
                    {m.ledger.minutesAboveLimit} min
                  </td>
                  <td className="py-1.5 font-mono text-slate-700">{round(m.ledger.maxCo2Mmhg, 2)} mmHg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
