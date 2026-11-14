"use client";

import React, { useState } from "react";
import { CheckSquare, Database, Lock, RefreshCw, ShieldCheck, Unlock } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { evaluateLeaderDashboard } from "@/lib/evaluator";

export default function CrewOrCheckInPage() {
  const {
    mission,
    activeCharacter,
    role,
    linkOnline,
    reentryMode,
    actorInputs,
    hazardRecords,
    scenarioHazardRecords,
    scenarioHazardSamples,
    lastTelemetrySyncAt,
    refreshHazardTelemetry,
    shelterConfirmations,
    toggleCrewShelter,
    auditLog,
    addAuditEntry,
    privateCheckIns,
  } = useMission();
  const { pushToast } = useAlerts();

  const [unlockTarget, setUnlockTarget] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [rotationNote, setRotationNote] = useState("");

  if (!mission || !activeCharacter) {
    return <DashboardShell>{null}</DashboardShell>;
  }

  const effectiveUnlockTarget =
    unlockTarget ||
    mission.crew.find((c) => !c.isLeadSlot)?.callsign ||
    mission.crew[0]?.callsign ||
    "";

  const leaderModel = evaluateLeaderDashboard(mission, shelterConfirmations, {
    actorInputs,
    scenarioHazardRecords,
    scenarioHazardSamples,
    linkOnline,
    reentryMode,
  });
  const myPrivateCheckIns = privateCheckIns.filter((entry) => entry.actorId === activeCharacter.id);
  const evaChainRecord = hazardRecords.find(
    (r) => r.hazardSlug === "gravity" && r.streamName === "EVA Readiness Chain"
  );
  const evaPayload = evaChainRecord?.payload ?? {};

  const handleSaveRotation = (e: React.FormEvent) => {
    e.preventDefault();
    const note = rotationNote.trim() || "Add your info: Proposed crew rotation / sleep bay reassignment plan here";
    setRotationNote("");
    pushToast({
      title: "Rotation Advisory Dispatched",
      message: `Here is: "${note}" queued for crew.`,
      variant: "info",
    });
  };

  const handleEmergencyUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const reasonText = unlockReason.trim() || "Add your info: Justification for emergency detail unlock here";
    addAuditEntry(effectiveUnlockTarget, reasonText, "Emergency Medical Detail Unlock");
    try {
      await fetch("/api/emergency/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EMERGENCY_UNLOCK",
          actorRole: "lead",
          detail: `${effectiveUnlockTarget} — ${reasonText}`,
        }),
      });
    } catch {
      // Local log preserved
    }
    setUnlockReason("");
    pushToast({
      title: "Emergency Unlock Logged",
      message: `Here is: Audit entry recorded for ${effectiveUnlockTarget} and member notified.`,
      variant: "warning",
    });
  };

  return (
    <DashboardShell>
      {role === "lead" ? (
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Lead Crew Matrix &amp; Privacy Firewall</h1>
              <p className="mt-1 text-sm text-slate-600">
                Here is: Duty readiness, EVA gate status, and shelter confirmations derived from {mission.name}. Raw
                personal journals stay private.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Crew Slot</th>
                    <th className="py-2.5 pr-4 font-medium">Readiness</th>
                    <th className="py-2.5 pr-4 font-medium">EVA Gate</th>
                    <th className="py-2.5 pr-4 font-medium">Shelter</th>
                    <th className="py-2.5 font-medium">Privacy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderModel.crewMatrix.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{c.callsign}</p>
                        <p className="text-slate-500">{c.assignedRoleTitle}</p>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">{c.readinessState}</td>
                      <td className="py-3 pr-4 text-slate-600">{c.evaGateState}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => toggleCrewShelter(c.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            c.shelterConfirmed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {c.shelterConfirmed ? "Confirmed" : "Pending"}
                        </button>
                      </td>
                      <td className="py-3 text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Private
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-slate-900">Task Rotation &amp; Sleep Relocation</h2>
              <p className="text-xs text-slate-600">
                Here is: Lower-exposure rotation (Hazard 1) and module relocation advice (Hazard 5).
              </p>
              <form onSubmit={handleSaveRotation} className="space-y-2.5 text-xs">
                <input
                  type="text"
                  value={rotationNote}
                  onChange={(e) => setRotationNote(e.target.value)}
                  placeholder="Add your info: Proposed crew rotation / sleep bay reassignment plan here"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
                >
                  Issue Rotation Advisory
                </button>
              </form>
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-amber-700">
                <Unlock className="h-4 w-4" />
                <h2 className="text-sm font-bold">Emergency Detail Unlock (Audit-Logged)</h2>
              </div>
              <p className="text-xs text-slate-600">
                Here is: Unlocking details requires a logged reason and notifies the crew member.
              </p>

              <form onSubmit={handleEmergencyUnlock} className="space-y-2.5 text-xs">
                <select
                  value={effectiveUnlockTarget}
                  onChange={(e) => setUnlockTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800"
                >
                  {mission.crew
                    .filter((c) => !c.isLeadSlot)
                    .map((c) => (
                      <option key={c.id} value={c.callsign}>
                        {c.callsign}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Add your info: Emergency unlock justification here"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700"
                >
                  Execute Audit-Logged Unlock
                </button>
              </form>

              {auditLog.length > 0 && (
                <div className="space-y-1.5 pt-2 text-xs">
                  {auditLog.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
                      [{entry.timestamp}] {entry.targetCallsign}: {entry.reason}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                Readiness &amp; EVA Status ({activeCharacter.callsign})
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void refreshHazardTelemetry();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className="h-3 w-3" />
                  {lastTelemetrySyncAt ? `Synced ${lastTelemetrySyncAt}` : "Refresh DB Sync"}
                </button>
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <Lock className="h-3 w-3" /> Private to {activeCharacter.callsign}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Here is: Read-only readiness, biometrics, and EVA gate status synced automatically from
              Supabase. Private notes stay hidden from the Lead matrix.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Synced Private Readiness &amp; Telemetry
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <Database className="h-3 w-3" /> DB Read-Only
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Sleep &amp; Actigraphy</p>
                  <p className="mt-0.5 text-slate-600">{activeCharacter.metrics.sleepSlot}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Vigilance &amp; Fatigue</p>
                  <p className="mt-0.5 text-slate-600">{activeCharacter.metrics.fatigueSlot}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700">Private Member Notes</p>
                  <p className="mt-0.5 text-emerald-800">{activeCharacter.privateMemberNotesSlot}</p>
                </div>
              </div>

              {myPrivateCheckIns.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Synced Supabase Private Check-In History
                  </p>
                  {myPrivateCheckIns.map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                      <p className="text-slate-400">{item.timestamp}</p>
                      <p className="mt-0.5 text-slate-700">Fatigue: {item.fatigueScore}</p>
                      <p className="text-slate-700">Sleep: {item.sleepHoursInput}</p>
                      <p className="text-emerald-800">Private Note: {item.privateJournalNote}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  No synced private check-in records in public.character_hazard_data yet.
                </p>
              )}

              {hazardRecords.length > 0 && (
                <div className="space-y-1.5 pt-1 text-xs">
                  <p className="font-semibold text-slate-700">
                    Synced Hazard Streams ({hazardRecords.length})
                  </p>
                  {hazardRecords.map((rec) => (
                    <div key={rec.id} className="rounded-lg bg-slate-50 p-2.5 text-slate-600">
                      <span className="font-semibold text-slate-800">{rec.streamName}:</span>{" "}
                      {rec.rawValue || "(structured payload synced)"}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sky-700">
                  <ShieldCheck className="h-4 w-4" />
                  <h2 className="text-sm font-bold">Personal EVA Readiness Chain</h2>
                </div>
                <span className="text-[11px] text-slate-400">Synced from DB</span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { key: "pfe", label: "Periodic Fitness Evaluation (PFE) current" },
                  { key: "grip", label: "Handgrip test in 10–14d window (blocked <24h before EVA)" },
                  { key: "ergometry", label: "Arm ergometry completed (pre-test conditions met)" },
                  { key: "prebreathe", label: "EVA prebreathe practice verified (MR087L)" },
                  { key: "health48h", label: "Pre-EVA health status within 48h (MEDB 6.1)" },
                  { key: "isle", label: "ISLE pre-launch training completed (MR090L)" },
                ].map((item) => {
                  const syncedVal = evaPayload[item.key];
                  const verified =
                    syncedVal === true ||
                    syncedVal === "true" ||
                    activeCharacter.evaGateState === "GO";
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between gap-2.5 rounded-xl p-3 ${
                        verified ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <CheckSquare
                          className={`h-4 w-4 shrink-0 ${
                            verified ? "text-emerald-600" : "text-slate-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {verified ? "Verified" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-800">
                  DB Gate Status: {activeCharacter.evaGateState} · Readiness:{" "}
                  {activeCharacter.readinessState}
                </p>
                {evaChainRecord?.rawValue && (
                  <p className="text-slate-600">Synced Chain: {evaChainRecord.rawValue}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
