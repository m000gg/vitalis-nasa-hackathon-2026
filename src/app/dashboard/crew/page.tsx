"use client";

import React, { useState } from "react";
import { CheckSquare, Lock, ShieldCheck, Unlock } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

export default function CrewOrCheckInPage() {
  const {
    mission,
    role,
    selectedMemberId,
    shelterConfirmations,
    toggleCrewShelter,
    auditLog,
    addAuditEntry,
    privateCheckIns,
    addPrivateCheckIn,
  } = useMission();
  const { pushToast } = useAlerts();

  // Lead state: Emergency unlock reason
  const [unlockTarget, setUnlockTarget] = useState(mission.crew[1]?.callsign ?? "Member Slot");
  const [unlockReason, setUnlockReason] = useState("");

  // Member state: 60s self-check + private journal
  const [fatigueScore, setFatigueScore] = useState("");
  const [sleepHoursInput, setSleepHoursInput] = useState("");
  const [privateJournalNote, setPrivateJournalNote] = useState("");
  const [evaChecks, setEvaChecks] = useState<Record<string, boolean>>({
    pfe: false,
    grip: false,
    ergometry: false,
    prebreathe: false,
    health48h: false,
    isle: true,
  });

  const activeMember = mission.crew.find((c) => c.id === selectedMemberId) ?? mission.crew[1] ?? mission.crew[0];

  const handleEmergencyUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const reasonText = unlockReason.trim() || "Add your info: Justification for emergency detail unlock here";
    addAuditEntry(unlockTarget, reasonText, "Emergency Medical Detail Unlock");
    try {
      await fetch("/api/emergency/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EMERGENCY_UNLOCK",
          actorRole: "lead",
          detail: `${unlockTarget} — ${reasonText}`,
        }),
      });
    } catch {
      // Local log still preserved
    }
    setUnlockReason("");
    pushToast({
      title: "Emergency Unlock Audit-Logged",
      message: `Here is: Detail access logged for ${unlockTarget}. Crew member notified per RBAC policy.`,
      variant: "warning",
    });
  };

  const handleSubmitPrivateCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    addPrivateCheckIn({
      fatigueScore: fatigueScore.trim() || "Add your info: Fatigue 1–5 here",
      sleepHoursInput: sleepHoursInput.trim() || "Add your info: Sleep hours here",
      privateJournalNote: privateJournalNote.trim() || "Add your info: Private mood/journal note here",
    });
    setFatigueScore("");
    setSleepHoursInput("");
    setPrivateJournalNote("");
    pushToast({
      title: "60-Second Check-In Saved Privately",
      message: "Here is: Raw journal & mood remain private to you; only anonymized readiness updates Lead view.",
      variant: "success",
    });
  };

  return (
    <DashboardShell>
      {role === "lead" ? (
        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <h1 className="text-xl font-bold text-white">Lead Crew Readiness Matrix &amp; Privacy Firewall</h1>
            <p className="text-xs text-slate-300">
              Here is: Commander view grounded in docs/OUTLINE.md, Hazard 2, and Hazard 4 — displays readiness states,
              EVA gate categories, and shelter confirmations while blocking raw private crew journals.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                    <th className="py-2 pr-3">Crew Slot</th>
                    <th className="py-2 pr-3">Duty Readiness</th>
                    <th className="py-2 pr-3">EVA Gate</th>
                    <th className="py-2 pr-3">Shelter Status</th>
                    <th className="py-2">Private Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {mission.crew.map((c) => {
                    const sheltered = !!shelterConfirmations[c.id];
                    return (
                      <tr key={c.id}>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-white">{c.callsign}</p>
                          <p className="text-[11px] text-slate-400">{c.assignedRoleTitle}</p>
                        </td>
                        <td className="py-3 pr-3">
                          <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-semibold">
                            {c.readinessState}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-slate-300">{c.evaGateState}</td>
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => toggleCrewShelter(c.id)}
                            className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                              sheltered
                                ? "border-emerald-600/60 bg-emerald-950/40 text-emerald-300"
                                : "border-amber-600/60 bg-amber-950/40 text-amber-300"
                            }`}
                          >
                            {sheltered ? "Confirmed" : "Pending"}
                          </button>
                        </td>
                        <td className="py-3 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Restricted (Member Only)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Task Rotation & Emergency Unlock */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">
                Task Rotation &amp; Sleep Relocation Slot
              </h2>
              <p className="text-xs text-slate-300">
                Here is: Lower-exposure task rotation (Hazard 1) and module sleep relocation orders (Hazard 5) without
                exposing personal clinical logs.
              </p>
              <div className="rounded border border-dashed border-slate-700 bg-slate-950 p-3 text-xs text-slate-400">
                Add your info: Proposed crew rotation / sleep bay reassignment plan here.
              </div>
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Rotation Plan Dispatched",
                    message: "Here is: Task rotation & module sleep advisory sent to affected crew slots.",
                    variant: "info",
                  })
                }
                className="rounded bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Dispatch Rotation Advisory (Toast)
              </button>
            </section>

            <section className="space-y-3 rounded-lg border border-amber-800/50 bg-slate-900/40 p-5">
              <div className="flex items-center gap-2 text-amber-300">
                <Unlock className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Emergency Medical Detail Unlock (Audit-Logged)
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                Here is: Per Hazard 4 RBAC rules, Lead cannot view raw member values by default. An explicit emergency
                unlock records an audit entry and notifies the member.
              </p>

              <form onSubmit={handleEmergencyUnlock} className="space-y-2.5 text-xs">
                <select
                  value={unlockTarget}
                  onChange={(e) => setUnlockTarget(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
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
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="rounded border border-amber-600 bg-amber-600/20 px-3.5 py-2 font-semibold text-amber-200 hover:bg-amber-600/30"
                >
                  Execute Audit-Logged Unlock
                </button>
              </form>

              {auditLog.length > 0 && (
                <div className="space-y-1.5 pt-2 text-[11px]">
                  <p className="font-semibold text-slate-400">Recent Audit Entries:</p>
                  {auditLog.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="rounded border border-slate-800 bg-slate-950 p-2 text-slate-300">
                      [{entry.timestamp}] {entry.targetCallsign}: {entry.reason}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        /* MEMBER VIEW: 60s Self-Check + Private Journal + Personal EVA Gate */
        <div className="space-y-6">
          <section className="space-y-2 rounded-lg border border-emerald-800/50 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-white">
                60-Second Self-Check &amp; Private Log ({activeMember.callsign})
              </h1>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-950 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <Lock className="h-3 w-3" /> Strictly Private to Member
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Here is: Raw journal entries, mood valence, and sleep-aid usage stay strictly private on your profile
              (Hazard 2 privacy rule). Only anonymized readiness feeds the Lead matrix.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Private Self-Check Form */}
            <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                Guided Self-Check &amp; Private Journal Slot
              </h2>
              <form onSubmit={handleSubmitPrivateCheckIn} className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block text-slate-400">Subjective Fatigue / PVT-B Check</label>
                  <input
                    type="text"
                    value={fatigueScore}
                    onChange={(e) => setFatigueScore(e.target.value)}
                    placeholder="Add your info: Subjective fatigue (1–5) & PVT-B reaction note here"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">Sleep Duration &amp; Quality</label>
                  <input
                    type="text"
                    value={sleepHoursInput}
                    onChange={(e) => setSleepHoursInput(e.target.value)}
                    placeholder="Add your info: Sleep duration (h) & noise/CO₂ sleep note here"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-400">Private Reflection / Journal (Never Shown to Lead)</label>
                  <textarea
                    rows={3}
                    value={privateJournalNote}
                    onChange={(e) => setPrivateJournalNote(e.target.value)}
                    placeholder="Add your info: Private mood/reflection text here"
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
                >
                  Save Private Check-In
                </button>
              </form>

              {privateCheckIns.length > 0 && (
                <div className="space-y-2 pt-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Your Local Private Entries</p>
                  {privateCheckIns.map((item) => (
                    <div key={item.id} className="rounded border border-slate-800 bg-slate-950 p-2.5 text-[11px]">
                      <p className="text-slate-400">{item.timestamp}</p>
                      <p className="mt-0.5 text-slate-200">Fatigue/PVT: {item.fatigueScore}</p>
                      <p className="text-slate-200">Sleep: {item.sleepHoursInput}</p>
                      <p className="text-emerald-300">Private Note: {item.privateJournalNote}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Personal EVA Readiness Gate (Hazard 4) */}
            <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <div className="flex items-center gap-2 text-sky-300">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Personal EVA Readiness Chain (Hazard 4)
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Here is: Pre-EVA gate items from MR087L, MEDB 6.1–6.3, and MR081L. An EVA gate is GO only when all
                applicable checks &amp; pre-test conditions are satisfied.
              </p>

              <div className="space-y-2 text-xs">
                {[
                  { key: "pfe", label: "Periodic Fitness Evaluation (PFE) current (configurable rule)" },
                  { key: "grip", label: "Handgrip test completed in 10–14d pre-EVA window (blocked within 24h)" },
                  { key: "ergometry", label: "Arm ergometry completed (with pre-test caffeine/meal/exercise conditions met)" },
                  { key: "prebreathe", label: "EVA prebreathe practice verified (MR087L)" },
                  { key: "health48h", label: "Pre-EVA health status completed within 48h of suit donning (MEDB 6.1)" },
                  { key: "isle", label: "Prerequisite: ISLE training completed before launch (MR090L)" },
                ].map((item) => {
                  const checked = !!evaChecks[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEvaChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`flex w-full items-center gap-2.5 rounded border p-2.5 text-left ${
                        checked
                          ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-200"
                          : "border-slate-800 bg-slate-950 text-slate-300"
                      }`}
                    >
                      <CheckSquare className={`h-4 w-4 shrink-0 ${checked ? "text-emerald-400" : "text-slate-600"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                <span className="text-slate-400">Evaluated Personal Gate Slot: </span>
                <span className="font-bold text-white">
                  {Object.values(evaChecks).every(Boolean) ? "GO (All Checks Satisfied)" : "CONDITIONAL / HOLD (See Unchecked Items)"}
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
