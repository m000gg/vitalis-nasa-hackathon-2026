"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Info,
  Lock,
  MoveRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  Wind,
} from "lucide-react";
import {
  InfoCircle,
  ResearchModal,
  type ActiveResearchInfoState,
} from "@/components/ResearchInfoModal";
import type { HazardScreenProps } from "./types";
import {
  AirStatus,
  DataTag,
  ENVIRONMENT_PIPELINE_VALUES as V,
  ENVIRONMENT_RESEARCH_METADATA,
  ModuleAlert,
  ModuleModel,
  TimeBasis,
  buildEnvironmentModel,
  environmentStatus,
  formatSlope,
  resolveActorReadiness,
} from "@/lib/hazards/05-environment";

/**
 * HAZARD 5: HOSTILE / CLOSED ENVIRONMENTS SCREEN
 * Spec: docs/hazards/05-hostile-closed-environments.md §4 (Feature 1 Habitat Map, Feature 2 CO2 forecast)
 * Adapted to the Vitalis Dark Space HUD palette.
 */

const ACK_STORAGE_KEY = "vitalis.hazard5.acknowledgedAlerts";
const ACK_STORAGE_MAX = 200;

type TileStatus = AirStatus | "none";

const STATUS_STYLE: Record<
  TileStatus,
  { label: string; chip: string; card: string; ring: string; iconColor: string; Icon: typeof CircleCheck }
> = {
  green: {
    label: "Green",
    chip: "border border-[#16A34A]/40 bg-[#16A34A]/15 text-emerald-300",
    card: "border-[#16A34A]/45 bg-[#16A34A]/10",
    ring: "ring-2 ring-[#16A34A] ring-offset-2 ring-offset-[#060A14]",
    iconColor: "text-emerald-400",
    Icon: CircleCheck,
  },
  yellow: {
    label: "Yellow",
    chip: "border border-[#D97706]/45 bg-[#D97706]/15 text-amber-200",
    card: "border-[#D97706]/45 bg-[#D97706]/12",
    ring: "ring-2 ring-[#D97706] ring-offset-2 ring-offset-[#060A14]",
    iconColor: "text-amber-400",
    Icon: TriangleAlert,
  },
  red: {
    label: "Red",
    chip: "border border-[#DC2626]/50 bg-[#DC2626]/15 text-red-200",
    card: "border-[#DC2626]/50 bg-[#DC2626]/12",
    ring: "ring-2 ring-[#DC2626] ring-offset-2 ring-offset-[#060A14]",
    iconColor: "text-red-400",
    Icon: CircleX,
  },
  none: {
    label: "No data",
    chip: "border border-slate-700 bg-slate-800/70 text-slate-300",
    card: "border-slate-700 bg-[#0B111F]",
    ring: "ring-2 ring-slate-500 ring-offset-2 ring-offset-[#060A14]",
    iconColor: "text-slate-400",
    Icon: CircleDashed,
  },
};

/** SVG colors for the dark chart canvas, keyed by the same status the chips use. */
const STATUS_HEX: Record<AirStatus, string> = {
  green: "#22C55E",
  yellow: "#F59E0B",
  red: "#EF4444",
};

const HAZARD_STATUS_CHIP: Record<"NOMINAL" | "ELEVATED" | "CRITICAL", string> = {
  NOMINAL: "border border-[#16A34A]/40 bg-[#16A34A]/15 text-emerald-300",
  ELEVATED: "border border-[#D97706]/45 bg-[#D97706]/15 text-amber-200",
  CRITICAL: "border border-[#DC2626]/50 bg-[#DC2626]/15 text-red-200",
};

const HAZARD_STATUS_PANEL: Record<"NOMINAL" | "ELEVATED" | "CRITICAL", string> = {
  NOMINAL: "border-[#16A34A]/40 bg-[#16A34A]/10",
  ELEVATED: "border-[#D97706]/45 bg-[#D97706]/12",
  CRITICAL: "border-[#DC2626]/50 bg-[#DC2626]/12",
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
        tag === "REAL"
          ? "border border-[#3B82F6]/35 bg-[#3B82F6]/15 text-blue-300"
          : "border border-slate-700 bg-slate-800/80 text-slate-300"
      }`}
    >
      {tag}
    </span>
  );
}

function TrendIcon({ module }: { module: ModuleModel }) {
  if (module.forecast.state !== "ready") return null;
  const cls = "h-3.5 w-3.5";
  if (module.forecast.trend === "rising") return <TrendingUp className={`${cls} text-red-400`} aria-hidden />;
  if (module.forecast.trend === "falling") return <TrendingDown className={`${cls} text-emerald-400`} aria-hidden />;
  return <MoveRight className={`${cls} text-slate-400`} aria-hidden />;
}

function useAcknowledgedAlerts() {
  const [acked, setAcked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setAcked(parsed.filter((x): x is string => typeof x === "string"));
    } catch {
      // Storage unavailable
    }
  }, []);

  const toggleAcknowledged = (ackKey: string) => {
    setAcked((prev) => {
      const next = prev.includes(ackKey)
        ? prev.filter((k) => k !== ackKey)
        : [...prev, ackKey].slice(-ACK_STORAGE_MAX);
      try {
        window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { acked, toggleAcknowledged };
}

// ---------------------------------------------------------------------------
// CO2 chart (dark HUD adaptation of db1980d):
// last 2 h (solid), next 2 h trend estimate (dashed), NASA limit (4.00) + early warning (3.80)
// ---------------------------------------------------------------------------

const TICK_MIN_GAP_PX = 9;
const EARLY_WARNING_TEXT = "#FBBF24";
const HISTORY_LINE = { color: "#3B82F6", width: 2.25 };
const TREND_LINE = { color: "#8B5CF6", width: 1.5, dash: "4 4" };

function Co2Chart({ module }: { module: ModuleModel }) {
  const width = 320;
  const height = 136;
  const pad = { left: 32, right: 10, top: 12, bottom: 20 };
  const horizon = V.trendSettings.historyWindowMin;
  const limit = V.limits.co2TargetMmhg;
  const early = V.co2Warning.co2EarlyWarningMmhg;
  const last = module.history[module.history.length - 1];
  if (!last || !module.co2) return null;
  const latestMin = last.tMin;
  const statusColor = STATUS_HEX[module.co2.status];

  const data = [...module.history, ...module.trendLine].map((s) => s.co2Mmhg);
  const dataMin = Math.min(...data, limit, early);
  const dataMax = Math.max(...data, limit, early);
  const spanPad = Math.max((dataMax - dataMin) * 0.12, 0.1);
  const minY = dataMin - spanPad;
  const maxY = dataMax + spanPad;

  const x = (t: number) =>
    pad.left + ((t - (latestMin - horizon)) / (2 * horizon)) * (width - pad.left - pad.right);
  const y = (v: number) =>
    pad.top + (1 - (v - minY) / (maxY - minY)) * (height - pad.top - pad.bottom);
  const toPoints = (samples: { tMin: number; co2Mmhg: number }[]) =>
    samples.map((s) => `${x(s.tMin).toFixed(1)},${y(s.co2Mmhg).toFixed(1)}`).join(" ");
  const limitY = y(limit);
  const earlyY = y(early);

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
      className="h-36 w-full rounded-lg border border-slate-800 bg-[#060A14]"
      role="img"
      aria-label={`${module.moduleName} CO2 ${module.co2.label}: last 2 hours of samples and trend estimate, NASA limit ${limit} mmHg, early warning ${early} mmHg`}
    >
      {ticks.map((t) => (
        <text key={t.label} x={pad.left - 4} y={t.y + 3} textAnchor="end" fontSize="8" fill="#94A3B8">
          {t.label}
        </text>
      ))}
      <line
        x1={x(latestMin)}
        x2={x(latestMin)}
        y1={pad.top}
        y2={height - pad.bottom}
        stroke="#334155"
        strokeWidth="1"
      />
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={earlyY}
        y2={earlyY}
        stroke={V.chart.earlyWarningColor}
        strokeWidth="0.9"
        strokeDasharray="2 3"
      />
      <text
        x={pad.left + 3}
        y={earlyY + 9}
        fontSize="7"
        fill={EARLY_WARNING_TEXT}
        stroke="#060A14"
        strokeWidth="2.5"
        paintOrder="stroke"
      >
        {V.chart.earlyWarningLabel} ({early} mmHg)
      </text>
      <line
        x1={pad.left}
        x2={width - pad.right}
        y1={limitY}
        y2={limitY}
        stroke={V.chart.limitColor}
        strokeWidth="1.25"
        strokeDasharray="4 3"
      />
      <text
        x={width - pad.right}
        y={Math.max(10, limitY - 3)}
        textAnchor="end"
        fontSize="8"
        fontWeight="600"
        fill="#F87171"
        stroke="#060A14"
        strokeWidth="2.5"
        paintOrder="stroke"
      >
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
      <circle cx={x(last.tMin)} cy={y(last.co2Mmhg)} r="4" fill={statusColor} stroke="#060A14" strokeWidth="1.2" />
      <text x={pad.left + 3} y={pad.top + 6} fontSize="8" fontWeight="600" fill={statusColor}>
        {module.co2.label}
      </text>
      <text x={pad.left} y={height - 5} fontSize="8" fill="#94A3B8">
        −2 h
      </text>
      <text x={x(latestMin)} y={height - 5} textAnchor="middle" fontSize="8" fill="#94A3B8">
        latest sample
      </text>
      <text x={width - pad.right} y={height - 5} textAnchor="end" fontSize="8" fill="#94A3B8">
        +2 h
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function AlertCard({
  alert,
  acked,
  onToggleAck,
}: {
  alert: ModuleAlert;
  acked: boolean;
  onToggleAck: () => void;
}) {
  const critical = alert.severity === "critical";
  return (
    <article
      className={`rounded-xl border p-4 text-xs transition ${
        acked
          ? "border-slate-800 bg-[#0B111F]/60 opacity-70"
          : critical
          ? "border-[#DC2626]/45 bg-[#DC2626]/12"
          : "border-[#D97706]/45 bg-[#D97706]/12"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {critical ? (
            <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          )}
          <div>
            <p className="font-semibold text-slate-100">
              <span className={critical ? "text-red-300" : "text-amber-300"}>
                {critical ? "CRITICAL" : "WARNING"}
              </span>{" "}
              · {alert.title}
            </p>
            <p className="mt-0.5 text-slate-400">
              {critical ? "ETA: now (already above the target)" : `Reason: ${alert.reason ?? "—"}`} · since{" "}
              {alert.startedAtLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleAck}
          aria-pressed={acked}
          title={acked ? "Click to undo the acknowledgement" : undefined}
          className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
            acked
              ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
              : "border-slate-700 bg-[#060A14] text-slate-100 hover:border-slate-500"
          }`}
        >
          {acked && <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />}
          {acked ? "Acknowledged" : "Acknowledge"}
        </button>
      </div>
      <ol className="mt-2 list-decimal space-y-0.5 pl-9 text-slate-300">
        {alert.actions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ol>
      <p className="mt-1.5 pl-6 text-[10px] text-slate-500">Demo placeholder actions, not NASA procedures.</p>
    </article>
  );
}

function ModuleTile({
  module,
  selected,
  onSelect,
}: {
  module: ModuleModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const status: TileStatus = module.air?.status ?? "none";
  const s = STATUS_STYLE[status];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-24 flex-1 cursor-pointer flex-col items-start justify-between rounded-xl border p-3 text-left text-xs transition ${s.card} ${
        selected ? s.ring : "hover:brightness-110"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-100">{module.moduleName}</span>
        <s.Icon className={`h-5 w-5 ${s.iconColor}`} aria-label={s.label} />
      </span>
      <span className="font-mono text-[11px] text-slate-200">
        {!module.air
          ? "No data"
          : module.air.status === "green"
          ? "All metrics in limits"
          : module.air.worstMetric.statusLabel
          ? `${module.air.worstMetric.text} · ${module.air.worstMetric.statusLabel}`
          : module.air.worstMetric.text}
        {module.air && module.air.status !== "green" && module.air.worstMetric.statusReason && (
          <span className="mt-0.5 block font-sans text-[10px] text-slate-400">
            {module.air.worstMetric.statusReason}
          </span>
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
    <div className="rounded-xl border border-slate-800 bg-[#060A14] p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold text-slate-100">
          {module.moduleName}
          {module.latestLabel && (
            <span className="ml-2 font-sans text-xs font-normal text-slate-400">
              latest sample: {module.latestLabel}
            </span>
          )}
        </p>
        {module.air && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Worst metric:</span>
            <StatusChip status={module.air.worstMetric.status} text={module.air.worstMetric.text} />
          </div>
        )}
      </div>
      {!module.hasData ? (
        <p className="mt-3 text-slate-400">
          {V.messages.noSamples} Stream: “{module.streamName}”.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-[#0B111F]">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-[#060A14] text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3.5 py-2.5">Metric</th>
                <th className="px-3 py-2.5">Value</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(module.air?.metrics ?? []).map((m) => (
                <tr key={m.metric}>
                  <td className="px-3.5 py-2.5 font-medium text-slate-200">{metricLabel(m.metric)}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-100">
                    {round(m.value, m.metric === "co2" ? 2 : 1)} {m.unit}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={m.status} text={m.statusLabel} />
                    {m.statusReason && (
                      <span className="mt-0.5 block text-[10px] text-slate-400">{m.statusReason}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <TagChip tag={m.tag} />
                  </td>
                </tr>
              ))}
              {module.infoMetrics.map((m) => (
                <tr key={m.key}>
                  <td className="px-3.5 py-2.5 font-medium text-slate-200">{m.label}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-300">
                    {round(m.value, 1)} {m.unit}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">information only</td>
                  <td className="px-3.5 py-2.5">
                    <TagChip tag={m.tag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2.5 text-[11px] text-slate-400">{V.messages.temperatureHumidity}</p>
    </div>
  );
}

function ForecastCard({ module }: { module: ModuleModel }) {
  const f = module.forecast;
  const co2 = module.reading?.co2Mmhg ?? null;
  const assessment = module.co2;

  if (co2 === null || !assessment) {
    return (
      <article className="space-y-2 rounded-xl border border-slate-800 bg-[#060A14] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm font-semibold text-slate-100">{module.moduleName}</p>
          <StatusChip status="none" />
        </div>
        <p className="text-slate-400">{V.messages.noSamples}</p>
      </article>
    );
  }

  const rising = f.state === "ready" && f.trend === "rising";
  const boxStyle =
    assessment.status === "red"
      ? "border border-[#DC2626]/40 bg-[#DC2626]/15 text-red-200"
      : assessment.status === "yellow"
      ? "border border-[#D97706]/40 bg-[#D97706]/15 text-amber-200"
      : "border border-slate-800 bg-[#0B111F] text-slate-300";

  return (
    <article className="space-y-2.5 rounded-xl border border-slate-800 bg-[#060A14] p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold text-slate-100">{module.moduleName}</p>
        <StatusChip status={assessment.status} text={assessment.label} />
      </div>
      <Co2Chart module={module} />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <dt className="text-slate-400">CO2 now</dt>
        <dd className="flex items-center gap-1.5 font-mono text-slate-100">
          {round(co2, 2)} mmHg <TagChip tag={module.reading?.co2Tag ?? "SIM"} />
        </dd>
        <dt className="text-slate-400">Trend</dt>
        <dd className="flex items-center gap-1 font-mono text-slate-100">
          <TrendIcon module={module} />
          {f.state === "ready"
            ? `${f.trend} (${formatSlope(f.slopeMmhgPerMin)} mmHg/min)`
            : V.messages.collecting}
        </dd>
        {rising && f.state === "ready" && f.minutesToLimit !== null && (
          <>
            <dt className="text-slate-400">Time to target (trend estimate)</dt>
            <dd className="font-mono text-amber-300">{Math.round(f.minutesToLimit)} min</dd>
          </>
        )}
      </dl>
      <div className={`space-y-0.5 rounded-md px-2.5 py-2 font-medium ${boxStyle}`}>
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
        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-700 bg-[#060A14] px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-slate-500"
      >
        <Info className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden /> Limits of this view
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-lg border border-slate-700 bg-[#0B111F] p-3 text-[11px] text-slate-300 shadow-2xl">
          {V.limitsTooltipLines.map((line) => (
            <p key={line}>• {line}</p>
          ))}
          <p className="text-slate-400">[5] Noise reference: {V.limits.noiseReferenceText}.</p>
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
}: HazardScreenProps) {
  const model = useMemo(
    () => buildEnvironmentModel({ hazardSamples, scenarioHazardSamples }),
    [hazardSamples, scenarioHazardSamples]
  );
  const breakdown = environmentStatus(model, resolveActorReadiness(activeCharacter));

  const [selectedId, setSelectedId] = useState<string>(V.modules[0].id);
  const selected = model.modules.find((m) => m.moduleId === selectedId) ?? model.modules[0];
  const { acked, toggleAcknowledged } = useAcknowledgedAlerts();
  const [activeInfo, setActiveInfo] = useState<ActiveResearchInfoState>(null);
  const openAlerts = model.alerts.filter((a) => !acked.includes(a.ackKey)).length;

  return (
    <div className="space-y-6">
      {/* 1. Closed-Habitat Atmosphere Briefing */}
      <section className={`hud-panel rounded-lg border p-5 ${HAZARD_STATUS_PANEL[snapshot.status]}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${HAZARD_STATUS_CHIP[snapshot.status]}`}
            >
              <Wind className="h-3.5 w-3.5" aria-hidden="true" />
              {snapshot.status}
            </span>
            <h2 className="font-display text-base font-bold text-slate-100">
              Closed-Habitat Atmosphere Briefing
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.habitat_air_briefing}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
            <span className="inline-flex items-center gap-1 rounded-md bg-[#3B82F6]/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
              {role === "lead" ? (
                <>
                  <Users className="h-3 w-3" /> Commander View (All Crew)
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" /> Personal View ({activeCharacter.callsign})
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <LimitsInfo />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0B111F] px-2.5 py-1 text-xs font-medium text-slate-300">
              <Clock className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
              {snapshot.eta}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-md px-2 py-0.5 font-medium ${HAZARD_STATUS_CHIP[breakdown.airStatus]}`}>
            Air: {model.hasData ? breakdown.airStatus : "no data"}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 font-medium ${HAZARD_STATUS_CHIP[breakdown.readinessStatus]} ${
              breakdown.raisedByReadiness ? "ring-1 ring-current" : ""
            }`}
          >
            Readiness: {breakdown.readinessState}
          </span>
          {model.dataBadge && (
            <span className="rounded-md border border-[#DC2626]/50 bg-[#DC2626]/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-red-200">
              {model.dataBadge}
            </span>
          )}
          {model.dataTag === "REAL" && (
            <span className="rounded-md border border-[#3B82F6]/35 bg-[#3B82F6]/15 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
              CO2: REAL · NASA OSDR EDA
            </span>
          )}
          {model.latestLabel && (
            <span className="rounded-md border border-slate-800 bg-[#0B111F] px-2.5 py-0.5 font-mono text-[11px] text-slate-300">
              latest sample: {model.latestLabel}
            </span>
          )}
        </div>

        {breakdown.raisedByReadiness && (
          <p className="mt-3 rounded-lg border border-[#D97706]/35 bg-[#D97706]/12 px-3 py-2 text-xs text-amber-200">
            {breakdown.readinessStatus} comes from {activeCharacter.callsign}&apos;s readiness (
            {breakdown.readinessState}), not from the module air.
          </p>
        )}

        {!model.hasData && (
          <p className="mt-3 rounded-lg border border-slate-800 bg-[#0B111F] px-3 py-2 text-xs text-slate-400">
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

      {/* 2. Alerts & Recommended Actions */}
      <section className="hud-panel space-y-3 rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-bold text-slate-100">CO2 Alerts</h2>
          <span className="font-mono text-[11px] text-slate-400">
            {model.alerts.length} active · {openAlerts} not acknowledged
          </span>
        </div>
        {model.alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#060A14] p-3 text-xs text-slate-300">
            <CircleCheck className="h-4 w-4 text-emerald-400" aria-hidden /> No CO2 alerts.
          </p>
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {model.alerts.map((a) => (
              <AlertCard
                key={a.ackKey}
                alert={a}
                acked={acked.includes(a.ackKey)}
                onToggleAck={() => toggleAcknowledged(a.ackKey)}
              />
            ))}
          </div>
        )}
        {snapshot.solutions.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-[#060A14] p-3.5 text-xs">
            <p className="font-display font-semibold text-slate-100">Recommended now</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-slate-300">
              {snapshot.solutions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* 3. Habitat Map */}
      <section className="hud-panel space-y-3 rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">Habitat Map — Air Layer</h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.module_acoustics}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-300" aria-label={model.banner}>
            <StatusChip status="green" text={`${model.counts.green} green`} />
            <StatusChip status="yellow" text={`${model.counts.yellow} yellow`} />
            <StatusChip status="red" text={`${model.counts.red} red`} />
            {model.counts.noData > 0 && <StatusChip status="none" text={`${model.counts.noData} no data`} />}
          </p>
        </div>
        <p className="sr-only">{model.banner}</p>
        <div className="flex flex-col items-stretch gap-2 rounded-xl border border-dashed border-slate-700 bg-[#060A14] p-3 sm:flex-row sm:items-center">
          {model.modules.map((m, i) => (
            <React.Fragment key={m.moduleId}>
              {i > 0 && <span aria-hidden className="mx-auto h-3 w-2 rounded-sm bg-slate-700 sm:mx-0 sm:h-2 sm:w-4" />}
              <ModuleTile
                module={m}
                selected={m.moduleId === selected.moduleId}
                onSelect={() => setSelectedId(m.moduleId)}
              />
            </React.Fragment>
          ))}
        </div>
        <ModuleDetails module={selected} />
      </section>

      {/* 4. CO2 Forecast */}
      <section className="hud-panel space-y-3 rounded-lg border border-slate-800 bg-[#0B111F] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-sm font-bold text-slate-100">
              Air Risk Forecast — CO2 &amp; Headache Odds
            </h2>
            <InfoCircle
              entry={ENVIRONMENT_RESEARCH_METADATA.co2_headache_risk}
              activeInfo={activeInfo}
              onSelectInfo={setActiveInfo}
            />
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-[#3B82F6]" /> last 2 h
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dashed border-[#8B5CF6]" /> trend estimate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-red-500" /> {V.chart.limitLabel} (
              {V.limits.co2TargetMmhg} mmHg)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-4 border-t border-dotted border-amber-400" /> {V.chart.earlyWarningLegend}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-slate-400">{V.studyFactsText}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {model.modules.map((m) => (
            <ForecastCard key={m.moduleId} module={m} />
          ))}
        </div>
      </section>

      {/* 5. Ledger */}
      <section className="hud-panel rounded-lg border border-slate-800 bg-[#0B111F] p-5 text-xs">
        <h2 className="font-display text-sm font-bold text-slate-100">
          CO2 Ledger (Since First Sample)
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[360px] text-left text-xs">
            <thead className="bg-[#060A14] text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3.5 py-2.5">Module</th>
                <th className="px-3 py-2.5">Minutes above {V.limits.co2TargetMmhg} mmHg</th>
                <th className="px-3.5 py-2.5">Max CO2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {model.modules.map((m) => (
                <tr key={m.moduleId} className="bg-[#0B111F]">
                  <td className="px-3.5 py-2.5 font-medium text-slate-200">{m.moduleName}</td>
                  <td
                    className={`px-3 py-2.5 font-mono ${
                      m.ledger && m.ledger.minutesAboveLimit > 0 ? "text-red-300" : "text-slate-300"
                    }`}
                  >
                    {m.ledger ? ledgerMinutes(m.ledger.minutesAboveLimit, model.timeBasis) : "—"}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-slate-200">
                    {m.ledger ? `${round(m.ledger.maxCo2Mmhg, 2)} mmHg` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ResearchModal entry={activeInfo?.entry ?? null} onClose={() => setActiveInfo(null)} />
    </div>
  );
}
