"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Database, Lock, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { HazardTelemetryChart } from "@/components/HazardTelemetryChart";
import { getHazardWidget } from "@/components/hazards";
import {
  getHazardBySlug,
  HazardDataRecord,
  HazardFieldType,
  HazardInputSlot,
  HazardSampleRecord,
  HAZARDS,
} from "@/lib/hazards";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { evaluateHazardForActor } from "@/lib/evaluator";

function renderFieldControl(options: {
  fieldType?: HazardFieldType;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const { fieldType = "text", value, placeholder, onChange } = options;

  if (fieldType === "textarea") {
    return (
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
      />
    );
  }

  if (fieldType === "boolean") {
    const checked = value === "true";
    return (
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-slate-600">{checked ? "Yes (Confirmed)" : placeholder || "No"}</span>
      </label>
    );
  }

  return (
    <input
      type={fieldType === "number" ? "number" : "text"}
      step="any"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
    />
  );
}

export default function HazardDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const hazard = getHazardBySlug(slug);
  const {
    mission,
    activeCharacter,
    role,
    dbStatus,
    linkOnline,
    reentryMode,
    actorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    saveActorInput,
  } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [subfieldDrafts, setSubfieldDrafts] = useState<Record<string, Record<string, string>>>({});

  if (!hazard) {
    notFound();
  }

  if (!mission || !activeCharacter) {
    return <DashboardShell>{null}</DashboardShell>;
  }

  const currentActorInputs = actorInputs[activeCharacter.id] ?? {};

  const scopedRecords = hazardRecords.filter((r) => r.hazardSlug === hazard.slug);
  const scopedSamples = hazardSamples.filter((s) => s.hazardSlug === hazard.slug);
  const roleConfig = role === "lead" ? hazard.leadView : hazard.memberView;
  const snapshot = evaluateHazardForActor(mission, activeCharacter, hazard, {
    actorInputs: currentActorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    role,
    linkOnline,
    reentryMode,
  });

  const CustomWidget = getHazardWidget(hazard.slug);

  const handleFillSubfields = (streamName: string, values: Record<string, string>) => {
    const slot = hazard.inputSlots.find((s) => s.streamName === streamName);
    if (slot && (!slot.subfields || slot.subfields.length === 0) && typeof values.rawValue === "string") {
      setDraftValues((prev) => ({ ...prev, [streamName]: values.rawValue }));
      return;
    }
    setSubfieldDrafts((prev) => ({
      ...prev,
      [streamName]: {
        ...(prev[streamName] ?? {}),
        ...values,
      },
    }));
  };

  const checkEvaluationTransition = (
    streamName: string,
    rawValue: string,
    payloadObj: Record<string, unknown>,
    numericValue: number | null,
    shouldSample: boolean,
    savedRec?: HazardDataRecord
  ) => {
    const nowIso = new Date().toISOString();
    const syntheticRecord: HazardDataRecord = {
      id: savedRec?.id ?? `${mission.id}__${activeCharacter.id}__${hazard.slug}__${streamName}`,
      scenarioId: mission.id,
      characterId: activeCharacter.id,
      hazardSlug: hazard.slug,
      streamName,
      rawValue,
      payload: payloadObj,
      updatedAt: nowIso,
    };

    const nextActorInputs = { ...currentActorInputs, [streamName]: rawValue };
    const nextHazardRecords = [
      ...hazardRecords.filter((r) => !(r.hazardSlug === hazard.slug && r.streamName === streamName)),
      syntheticRecord,
    ];
    const nextScenarioRecords = [
      ...scenarioHazardRecords.filter(
        (r) =>
          !(
            r.characterId === activeCharacter.id &&
            r.hazardSlug === hazard.slug &&
            r.streamName === streamName
          )
      ),
      syntheticRecord,
    ];

    let nextHazardSamples = hazardSamples;
    let nextScenarioSamples = scenarioHazardSamples;
    if (shouldSample) {
      const syntheticSample: HazardSampleRecord = {
        id: `pending-${Date.now()}`,
        scenarioId: mission.id,
        characterId: activeCharacter.id,
        hazardSlug: hazard.slug,
        streamName,
        numericValue,
        samplePayload: payloadObj,
        recordedAt: nowIso,
      };
      nextHazardSamples = [...hazardSamples, syntheticSample];
      nextScenarioSamples = [...scenarioHazardSamples, syntheticSample];
    }

    const nextSnapshot = evaluateHazardForActor(mission, activeCharacter, hazard, {
      actorInputs: nextActorInputs,
      hazardRecords: nextHazardRecords,
      hazardSamples: nextHazardSamples,
      scenarioHazardRecords: nextScenarioRecords,
      scenarioHazardSamples: nextScenarioSamples,
      role,
      linkOnline,
      reentryMode,
    });

    if (nextSnapshot.status === "CRITICAL" && snapshot.status !== "CRITICAL") {
      pushToast({
        title: `${hazard.shortTitle}: CRITICAL Threshold Triggered`,
        message: nextSnapshot.immediateHorizon,
        variant: "hazard",
      });
      triggerAlarm({
        hazardNumber: hazard.number,
        hazardTitle: hazard.title,
        ...hazard.alarmPreset,
      });
    } else if (nextSnapshot.status === "ELEVATED" && snapshot.status !== "ELEVATED") {
      pushToast({
        title: `${hazard.shortTitle}: ELEVATED Status`,
        message: nextSnapshot.immediateHorizon,
        variant: "warning",
      });
    }
  };

  const handleSaveSlot = async (slot: HazardInputSlot, forceSample = false) => {
    const { streamName, subfields, recordSample } = slot;
    if (role === "lead" && slot.isPrivate) {
      return;
    }

    const savedRec = scopedRecords.find((r) => r.streamName === streamName);
    const shouldSample = Boolean(recordSample || forceSample);

    try {
      if (subfields && subfields.length > 0) {
        const savedPayload = savedRec?.payload ?? {};
        const currentDrafts = subfieldDrafts[streamName] ?? {};
        const payloadObj: Record<string, unknown> = {};
        const summaryParts: string[] = [];
        let hasAnyFilledNonBoolean = false;
        let hasAnyTouchedBoolean = false;
        let hasPrivateValue = false;
        let firstNumeric: number | null = null;

        subfields.forEach((sf) => {
          if (role === "lead" && sf.isPrivate) {
            if (savedPayload[sf.key] !== undefined) {
              payloadObj[sf.key] = savedPayload[sf.key];
            }
            return;
          }

          const rawSaved = savedPayload[sf.key];
          const prevVal =
            typeof rawSaved === "boolean"
              ? rawSaved
                ? "true"
                : "false"
              : typeof rawSaved === "string" || typeof rawSaved === "number"
              ? String(rawSaved)
              : "";

          if (sf.fieldType === "boolean") {
            const val = currentDrafts[sf.key] ?? (prevVal || "false");
            if (currentDrafts[sf.key] !== undefined || rawSaved !== undefined) {
              hasAnyTouchedBoolean = true;
            }
            payloadObj[sf.key] = val === "true";
            if (!sf.isPrivate) {
              summaryParts.push(`${sf.label}: ${val === "true" ? "Yes" : "No"}`);
            } else {
              hasPrivateValue = true;
            }
            return;
          }

          const val = (currentDrafts[sf.key] ?? prevVal).trim();
          if (val) {
            hasAnyFilledNonBoolean = true;
            const num = Number(val);
            const isNum = sf.fieldType === "number" && Number.isFinite(num);
            payloadObj[sf.key] = isNum ? num : val;
            if (isNum && firstNumeric === null) {
              firstNumeric = num;
            }
            if (!sf.isPrivate) {
              summaryParts.push(`${sf.label}: ${val}${sf.unit ? ` ${sf.unit}` : ""}`);
            } else {
              hasPrivateValue = true;
            }
          }
        });

        const onlyBooleans = subfields.every((sf) => sf.fieldType === "boolean");
        if (!hasAnyFilledNonBoolean && !hasAnyTouchedBoolean && !onlyBooleans) {
          pushToast({
            title: `${hazard.shortTitle}: No Input`,
            message: `Here is: Add your info to ${streamName} to save to Supabase.`,
            variant: "info",
          });
          return;
        }

        const summaryVal =
          summaryParts.join(", ") || (hasPrivateValue ? "Private entry logged" : "");
        if (!summaryVal) {
          pushToast({
            title: `${hazard.shortTitle}: No Input`,
            message: `Here is: Add your info to ${streamName} to save to Supabase.`,
            variant: "info",
          });
          return;
        }

        await saveActorInput(streamName, summaryVal, hazard.slug, {
          payload: payloadObj,
          numericValue: firstNumeric,
          recordSample: shouldSample,
        });

        pushToast({
          title: `${hazard.shortTitle}: ${shouldSample ? "Sample Logged to Supabase" : "Structured Input Saved"}`,
          message: `Here is: ${summaryVal} saved for ${activeCharacter.callsign}.`,
          variant: "success",
        });

        checkEvaluationTransition(
          streamName,
          summaryVal,
          payloadObj,
          firstNumeric,
          shouldSample,
          savedRec
        );
        return;
      }

      const persisted =
        slot.fieldType === "boolean"
          ? savedRec?.payload?.value === true
            ? "true"
            : savedRec?.rawValue ?? "false"
          : savedRec?.rawValue ?? "";
      const val = (draftValues[streamName] ?? currentActorInputs[streamName] ?? persisted).trim();
      if (!val && slot.fieldType !== "boolean") {
        pushToast({
          title: `${hazard.shortTitle}: No Input`,
          message: `Here is: Add your info to ${streamName} to save to Supabase.`,
          variant: "info",
        });
        return;
      }

      const finalVal = slot.fieldType === "boolean" ? (val === "true" ? "true" : "false") : val;
      const numericCandidate = Number(finalVal);
      const numericValue =
        slot.fieldType !== "boolean" && Number.isFinite(numericCandidate) ? numericCandidate : null;
      const payloadObj =
        slot.fieldType === "boolean"
          ? { rawValue: finalVal, value: finalVal === "true" }
          : numericValue !== null
          ? { rawValue: finalVal, value: numericValue, unit: slot.unit }
          : { rawValue: finalVal };

      await saveActorInput(streamName, finalVal, hazard.slug, {
        payload: payloadObj,
        numericValue,
        recordSample: shouldSample,
      });

      pushToast({
        title: `${hazard.shortTitle}: ${shouldSample ? "Sample Logged to Supabase" : "Input Saved"}`,
        message: `Here is: "${finalVal}" saved for ${activeCharacter.callsign} in ${streamName}.`,
        variant: "success",
      });

      checkEvaluationTransition(
        streamName,
        finalVal,
        payloadObj,
        numericValue,
        shouldSample,
        savedRec
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save telemetry to Supabase";
      pushToast({
        title: "Supabase Write Error",
        message: msg,
        variant: "hazard",
      });
    }
  };

  const charts = snapshot.charts ?? [];

  return (
    <DashboardShell>
      {/* Info-Agnostic Hazard Header */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Overview
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                dbStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <Database className="h-3 w-3" />
              {dbStatus === "connected" ? "Supabase Connected" : "Supabase Error"} · {scopedRecords.length} saved ·{" "}
              {scopedSamples.length} samples
            </span>
            <span className="font-mono text-xs text-slate-400">
              Logic: {hazard.ownerSlot} · Doc: {hazard.sourceDoc}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              Hazard {hazard.number} of 5 · {role.toUpperCase()} View
            </span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                snapshot.status === "CRITICAL"
                  ? "bg-red-100 text-red-800"
                  : snapshot.status === "ELEVATED"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              Status: {snapshot.status}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
              {snapshot.actorStatusLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{hazard.title}</h1>
          <p className="max-w-3xl text-sm text-slate-600">{hazard.overviewSlot}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Active Scenario Slot ({mission.name}): </span>
          {snapshot.scenarioStatusSlot}
        </div>
      </section>

      {/* Role-Specific Modules */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            {role === "lead" ? "Lead Controls & Matrix" : "Member Controls & Personal View"}
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <Lock className="h-3.5 w-3.5 text-sky-600" />
            {roleConfig.privacyRule}
          </span>
        </div>

        <p className="text-sm text-slate-600">{roleConfig.summary}</p>

        <div className="grid gap-4 md:grid-cols-2">
          {roleConfig.modules.map((mod) => (
            <div key={mod.title} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
              <h3 className="text-sm font-semibold text-slate-900">{mod.title}</h3>
              <p className="text-slate-600">{mod.detail}</p>
              <p className="text-slate-400">{mod.actionSlot}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Optional Per-Hazard Interactive Widget */}
      {CustomWidget && (
        <CustomWidget
          mission={mission}
          activeCharacter={activeCharacter}
          role={role}
          saveActorInput={saveActorInput}
          onFillSubfields={handleFillSubfields}
        />
      )}

      {/* Telemetry Graphs (auto-rendered from snapshot.charts or character_hazard_samples) */}
      {charts.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Telemetry Graphs ({activeCharacter.callsign})
            </h2>
            <span className="text-xs text-slate-500">
              Persisted in public.character_hazard_samples ({hazard.slug})
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {charts.map((chart) => (
              <HazardTelemetryChart key={chart.id} chart={chart} />
            ))}
          </div>
        </section>
      )}

      {/* Input Slots + Evaluated Output Slots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Input Ingestion Slots</h2>
          <div className="space-y-3">
            {hazard.inputSlots.map((slot) => {
              const savedRec = scopedRecords.find((r) => r.streamName === slot.streamName);
              const streamSamplesCount = scopedSamples.filter((s) => s.streamName === slot.streamName).length;
              const isSlotMaskedForLead = role === "lead" && Boolean(slot.isPrivate);

              if (isSlotMaskedForLead) {
                return (
                  <div key={slot.streamName} className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{slot.streamName}</span>
                      <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        <Lock className="h-3 w-3" /> Privacy Firewall
                      </span>
                    </div>
                    <p className="text-slate-500">
                      Private member telemetry is masked and hidden in Lead view.
                    </p>
                  </div>
                );
              }

              const persistedSlotVal =
                slot.fieldType === "boolean"
                  ? savedRec?.payload?.value === true
                    ? "true"
                    : savedRec?.rawValue ?? "false"
                  : savedRec?.rawValue ?? "";
              const displayValue =
                draftValues[slot.streamName] ??
                currentActorInputs[slot.streamName] ??
                persistedSlotVal;
              const allSubfieldsMasked =
                role === "lead" &&
                Boolean(slot.subfields?.length) &&
                slot.subfields!.every((sf) => sf.isPrivate);

              return (
                <div key={slot.streamName} className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">
                      {slot.streamName}
                      {slot.unit ? ` (${slot.unit})` : ""}
                    </span>
                    <span className="text-slate-400">
                      {savedRec ? `Saved (${new Date(savedRec.updatedAt).toLocaleTimeString()})` : slot.sourceRef}
                      {streamSamplesCount > 0 ? ` · ${streamSamplesCount} pts` : ""}
                    </span>
                  </div>

                  {slot.subfields && slot.subfields.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {slot.subfields.map((sf) => {
                        if (role === "lead" && sf.isPrivate) {
                          return (
                            <div key={sf.key} className="space-y-1">
                              <span className="block text-[11px] font-medium text-slate-500">
                                {sf.label}
                              </span>
                              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">
                                <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>Masked in Lead view</span>
                              </div>
                            </div>
                          );
                        }

                        const rawSaved = savedRec?.payload?.[sf.key];
                        const savedSubVal =
                          typeof rawSaved === "boolean"
                            ? rawSaved
                              ? "true"
                              : "false"
                            : rawSaved !== undefined
                            ? String(rawSaved)
                            : "";
                        const subVal = subfieldDrafts[slot.streamName]?.[sf.key] ?? savedSubVal;
                        return (
                          <label
                            key={sf.key}
                            className={`space-y-1 ${sf.fieldType === "textarea" ? "sm:col-span-2" : ""}`}
                          >
                            <span className="block text-[11px] font-medium text-slate-600">
                              {sf.label}
                              {sf.unit ? ` (${sf.unit})` : ""}
                            </span>
                            {renderFieldControl({
                              fieldType: sf.fieldType,
                              value: subVal,
                              placeholder: sf.prompt,
                              onChange: (nextVal) =>
                                setSubfieldDrafts((prev) => ({
                                  ...prev,
                                  [slot.streamName]: {
                                    ...(prev[slot.streamName] ?? {}),
                                    [sf.key]: nextVal,
                                  },
                                })),
                            })}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    renderFieldControl({
                      fieldType: slot.fieldType,
                      value: displayValue,
                      placeholder: slot.inputPrompt,
                      onChange: (nextVal) =>
                        setDraftValues((prev) => ({ ...prev, [slot.streamName]: nextVal })),
                    })
                  )}

                  {!allSubfieldsMasked && (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveSlot(slot, false)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        {slot.recordSample ? "Save & Log to Graph" : "Save Input"}
                      </button>
                      {!slot.recordSample && (
                        <button
                          type="button"
                          onClick={() => handleSaveSlot(slot, true)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Log Graph Point
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Evaluated Outputs &amp; Guidance</h2>
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-red-700">Immediate Horizon</p>
              <p className="mt-1 text-slate-600">{snapshot.immediateHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-amber-700">Prolonged Horizon</p>
              <p className="mt-1 text-slate-600">{snapshot.prolongedHorizon}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-sky-700">Estimated Time of Action</p>
              <p className="mt-1 text-slate-600">{snapshot.eta}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <p className="font-semibold text-emerald-700">
                {reentryMode ? "1 Actionable Solution (Re-Entry Cap)" : "1–2 Actionable Solutions"}
              </p>
              <div className="mt-1 space-y-1 text-slate-600">
                {snapshot.solutions.map((sol, idx) => (
                  <p key={idx}>{sol}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-xs font-semibold text-slate-500">Proposed API Endpoints</p>
            {hazard.proposedEndpoints.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
              >
                <span className="font-mono text-sky-700">
                  {ep.method} {ep.path}
                </span>
                <span className="text-slate-500">{ep.purpose}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Switcher */}
      <div className="flex flex-wrap gap-2">
        {HAZARDS.map((h) => (
          <Link
            key={h.slug}
            href={`/dashboard/hazards/${h.slug}`}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              h.slug === hazard.slug
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {h.number}. {h.shortTitle}
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}
