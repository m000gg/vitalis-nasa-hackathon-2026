"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, Play, RotateCcw, Timer } from "lucide-react";
import { useAlerts } from "@/context/AlertContext";
import { ISOLATION_PIPELINE_VALUES } from "@/lib/hazards/02-isolation";
import type { HazardCustomWidgetProps } from "./types";

type TestMode = "60s" | "demo5";
type Phase = "idle" | "waiting" | "stimulus" | "done";

const STREAM_SELF_CHECK = "60-Second Self-Check (Private)";

function computeMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return Math.round(sorted[mid]);
}

export function IsolationPvtWidget({
  activeCharacter,
  role,
  saveActorInput,
  onFillSubfields,
}: HazardCustomWidgetProps) {
  const { pushToast } = useAlerts();
  const [mode, setMode] = useState<TestMode>("demo5");
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState<number>(0);
  const [lastRt, setLastRt] = useState<number | null>(null);
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(60);
  const [fatigueRating, setFatigueRating] = useState<string>("2");
  const [saving, setSaving] = useState<boolean>(false);

  const isiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const stimulusStartRef = useRef<number>(0);
  const sessionEndRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (isiTimerRef.current) {
      clearTimeout(isiTimerRef.current);
      isiTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const finishTest = useCallback(() => {
    clearTimers();
    setPhase("done");
    setLiveElapsedMs(0);
  }, [clearTimers]);

  const scheduleNextStimulus = useCallback(
    (currentMode: TestMode) => {
      if (isiTimerRef.current) clearTimeout(isiTimerRef.current);
      setPhase("waiting");
      // Basner & Dinges PVT-B uses 2–5 s inter-stimulus intervals (shortened slightly in 5-trial demo)
      const minIsi = currentMode === "demo5" ? 1200 : 2000;
      const maxIsi = currentMode === "demo5" ? 2800 : 5000;
      const delay = minIsi + Math.random() * (maxIsi - minIsi);

      isiTimerRef.current = setTimeout(() => {
        if (currentMode === "60s" && Date.now() >= sessionEndRef.current) {
          finishTest();
          return;
        }
        stimulusStartRef.current = performance.now();
        setLiveElapsedMs(0);
        setPhase("stimulus");

        const tick = () => {
          setLiveElapsedMs(Math.round(performance.now() - stimulusStartRef.current));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }, delay);
    },
    [finishTest]
  );

  const startTest = () => {
    clearTimers();
    setReactionTimes([]);
    setFalseStarts(0);
    setLastRt(null);
    setLiveElapsedMs(0);
    setRemainingSec(60);

    if (mode === "60s") {
      sessionEndRef.current = Date.now() + 60_000;
      countdownTimerRef.current = setInterval(() => {
        const secs = Math.max(0, Math.ceil((sessionEndRef.current - Date.now()) / 1000));
        setRemainingSec(secs);
        if (secs <= 0) {
          finishTest();
        }
      }, 250);
    }

    scheduleNextStimulus(mode);
  };

  const handleTap = () => {
    if (phase === "waiting") {
      setFalseStarts((prev) => prev + 1);
      setLastRt(null);
      pushToast({
        title: "PVT-B False Start",
        message: "Wait for the visual target before tapping.",
        variant: "info",
      });
      scheduleNextStimulus(mode);
      return;
    }

    if (phase !== "stimulus") return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const rt = Math.round(performance.now() - stimulusStartRef.current);
    if (rt < 100) {
      setFalseStarts((prev) => prev + 1);
      scheduleNextStimulus(mode);
      return;
    }

    const nextTimes = [...reactionTimes, rt];
    setReactionTimes(nextTimes);
    setLastRt(rt);

    const targetDemoTrials = 5;
    if (
      (mode === "demo5" && nextTimes.length >= targetDemoTrials) ||
      (mode === "60s" && Date.now() >= sessionEndRef.current)
    ) {
      finishTest();
    } else {
      scheduleNextStimulus(mode);
    }
  };

  const medianRt = computeMedian(reactionTimes);
  const lapses = reactionTimes.filter((rt) => rt > ISOLATION_PIPELINE_VALUES.pvtLapseThresholdMs).length;

  const buildPrefillMap = (): Record<string, string> => ({
    pvt_median_rt_ms: String(medianRt),
    pvt_lapses_count: String(lapses),
    subjective_fatigue_1_5: fatigueRating,
  });

  const handlePrefillForm = () => {
    onFillSubfields(STREAM_SELF_CHECK, buildPrefillMap());
    pushToast({
      title: "PVT-B Results Loaded",
      message: `Median RT ${medianRt} ms and ${lapses} lapse(s) filled into ${STREAM_SELF_CHECK}.`,
      variant: "success",
    });
  };

  const handleSaveDirectly = async () => {
    if (reactionTimes.length === 0) return;
    setSaving(true);
    try {
      const summary = `PVT-B Median RT: ${medianRt} ms, PVT-B Lapses (>355 ms): ${lapses} lapses, Subjective Fatigue (1–5): ${fatigueRating} 1–5`;
      await saveActorInput(STREAM_SELF_CHECK, summary, "isolation", {
        payload: {
          pvt_median_rt_ms: medianRt,
          pvt_lapses_count: lapses,
          subjective_fatigue_1_5: Number(fatigueRating),
          pvt_trials_count: reactionTimes.length,
          pvt_false_starts: falseStarts,
        },
        numericValue: medianRt,
        recordSample: true,
      });
      onFillSubfields(STREAM_SELF_CHECK, buildPrefillMap());
      pushToast({
        title: "PVT-B Sample Saved to Supabase",
        message: `${activeCharacter.callsign}: ${medianRt} ms median RT, ${lapses} lapse(s) logged.`,
        variant: "success",
      });
    } catch (err) {
      pushToast({
        title: "Supabase Write Error",
        message: err instanceof Error ? err.message : "Failed to save PVT-B result.",
        variant: "hazard",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
            <Activity className="h-4 w-4 text-sky-600" />
            Interactive NASA Cognition PVT-B Vigilance Check
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Measures sustained attention with randomized inter-stimulus intervals. Trials &gt;{" "}
            <span className="font-semibold text-slate-900">
              {ISOLATION_PIPELINE_VALUES.pvtLapseThresholdMs} ms
            </span>{" "}
            count as cognitive lapses (Basner &amp; Dinges PVT-B).
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
          <button
            type="button"
            disabled={phase === "waiting" || phase === "stimulus"}
            onClick={() => setMode("demo5")}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              mode === "demo5" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Quick 5-Trial (~12s)
          </button>
          <button
            type="button"
            disabled={phase === "waiting" || phase === "stimulus"}
            onClick={() => setMode("60s")}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              mode === "60s" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Standard 60s Check
          </button>
        </div>
      </div>

      {/* Stimulus Pad */}
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <button
          type="button"
          onClick={phase === "idle" || phase === "done" ? startTest : handleTap}
          className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl border-2 p-6 text-center transition select-none ${
            phase === "stimulus"
              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
              : phase === "waiting"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:bg-sky-50/40"
          }`}
        >
          {phase === "idle" && (
            <>
              <Play className="h-7 w-7 text-sky-600" />
              <span className="mt-2 text-sm font-bold text-slate-900">
                Click to Start {mode === "demo5" ? "5-Trial" : "60-Second"} PVT-B Check
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Tap immediately whenever the green millisecond counter appears.
              </span>
            </>
          )}

          {phase === "waiting" && (
            <>
              <Timer className="h-6 w-6 animate-pulse text-amber-600" />
              <span className="mt-2 text-sm font-semibold">Watch and wait for target...</span>
              <span className="mt-1 text-xs text-amber-700">
                {mode === "60s"
                  ? `${remainingSec}s remaining · ${reactionTimes.length} trial(s) logged`
                  : `Trial ${reactionTimes.length + 1} of 5`}
              </span>
            </>
          )}

          {phase === "stimulus" && (
            <>
              <span className="font-mono text-3xl font-extrabold text-emerald-700">
                {liveElapsedMs} ms
              </span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                TAP NOW!
              </span>
            </>
          )}

          {phase === "done" && (
            <>
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              <span className="mt-2 text-sm font-bold text-slate-900">
                Check Complete — Median RT: {medianRt} ms · Lapses (&gt;355 ms): {lapses}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                Click here to re-run test ({reactionTimes.length} valid trials, {falseStarts} false start(s))
              </span>
            </>
          )}
        </button>

        {/* Live Telemetry Readout & Save Controls */}
        <div className="flex flex-col justify-between space-y-3 rounded-2xl bg-slate-50 p-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white p-2.5">
              <p className="text-[11px] text-slate-500">Median RT</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                {reactionTimes.length > 0 ? `${medianRt} ms` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-2.5">
              <p className="text-[11px] text-slate-500">Lapses (&gt;355 ms)</p>
              <p
                className={`mt-0.5 font-mono text-sm font-bold ${
                  lapses >= ISOLATION_PIPELINE_VALUES.pvtLapsesCrit
                    ? "text-red-700"
                    : lapses >= ISOLATION_PIPELINE_VALUES.pvtLapsesElev
                    ? "text-amber-700"
                    : "text-slate-900"
                }`}
              >
                {reactionTimes.length > 0 ? lapses : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-2.5">
              <p className="text-[11px] text-slate-500">Last Trial</p>
              <p className="mt-0.5 font-mono text-xs font-semibold text-slate-700">
                {lastRt !== null ? `${lastRt} ms` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-2.5">
              <p className="text-[11px] text-slate-500">Fatigue (1–5)</p>
              <select
                value={fatigueRating}
                onChange={(e) => setFatigueRating(e.target.value)}
                aria-label="Subjective fatigue rating 1 to 5"
                className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800"
              >
                <option value="1">1 — Rested</option>
                <option value="2">2 — Mild</option>
                <option value="3">3 — Moderate</option>
                <option value="4">4 — High</option>
                <option value="5">5 — Exhausted</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(phase === "waiting" || phase === "stimulus") && (
              <button
                type="button"
                onClick={finishTest}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Stop Early
              </button>
            )}

            <button
              type="button"
              disabled={reactionTimes.length === 0 || saving}
              onClick={handlePrefillForm}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Fill Into Form
            </button>

            <button
              type="button"
              disabled={reactionTimes.length === 0 || saving}
              onClick={handleSaveDirectly}
              className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save & Log PVT-B"}
            </button>
          </div>

          {role === "lead" && (
            <p className="text-[11px] text-slate-500">
              Lead view: personal crewmember journals remain masked; saving here logs only your own slot ({activeCharacter.callsign}).
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
