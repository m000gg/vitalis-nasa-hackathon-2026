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

  const [unlockTarget, setUnlockTarget] = useState(mission.crew[1]?.callsign ?? "Member Slot");
  const [unlockReason, setUnlockReason] = useState("");

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
      // Local log preserved
    }
    setUnlockReason("");
    pushToast({
      title: "Emergency Unlock Logged",
      message: `Here is: Audit entry recorded for ${unlockTarget} and member notified.`,
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
      title: "Private Check-In Saved",
      message: "Here is: Raw mood & journal remain private to you.",
      variant: "success",
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
                Here is: Duty readiness, EVA gate status, and shelter confirmations. Raw personal journals stay private.
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
                  {mission.crew.map((c) => {
                    const sheltered = !!shelterConfirmations[c.id];
                    return (
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
                              sheltered ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {sheltered ? "Confirmed" : "Pending"}
                          </button>
                        </td>
                        <td className="py-3 text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Private
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
              <p className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-500">
                Add your info: Proposed crew rotation / sleep bay reassignment plan here.
              </p>
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Rotation Advisory Sent",
                    message: "Here is: Crew rotation & relocation notice dispatched.",
                    variant: "info",
                  })
                }
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Send Rotation Toast
              </button>
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
                  value={unlockTarget}
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
                60-Second Self-Check &amp; EVA Gate ({activeMember.callsign})
              </h1>
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <Lock className="h-3 w-3" /> Private to Member
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Here is: Your mood notes and private reflection stay hidden from the Lead matrix.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-bold text-slate-900">Guided Self-Check &amp; Private Journal</h2>
              <form onSubmit={handleSubmitPrivateCheckIn} className="space-y-3 text-xs">
                <input
                  type="text"
                  value={fatigueScore}
                  onChange={(e) => setFatigueScore(e.target.value)}
                  placeholder="Add your info: Subjective fatigue (1–5) & PVT-B note here"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  value={sleepHoursInput}
                  onChange={(e) => setSleepHoursInput(e.target.value)}
                  placeholder="Add your info: Sleep duration (h) & environment note here"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400"
                />
                <textarea
                  rows={3}
                  value={privateJournalNote}
                  onChange={(e) => setPrivateJournalNote(e.target.value)}
                  placeholder="Add your info: Private mood/reflection text here (hidden from Lead)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700"
                >
                  Save Private Check-In
                </button>
              </form>

              {privateCheckIns.length > 0 && (
                <div className="space-y-2 pt-2">
                  {privateCheckIns.map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                      <p className="text-slate-400">{item.timestamp}</p>
                      <p className="mt-0.5 text-slate-700">Fatigue: {item.fatigueScore}</p>
                      <p className="text-slate-700">Sleep: {item.sleepHoursInput}</p>
                      <p className="text-emerald-800">Private Note: {item.privateJournalNote}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-sky-700">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-sm font-bold">Personal EVA Readiness Chain</h2>
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
                  const checked = !!evaChecks[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEvaChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`flex w-full items-center gap-2.5 rounded-xl p-3 text-left ${
                        checked ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <CheckSquare className={`h-4 w-4 shrink-0 ${checked ? "text-emerald-600" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-800">
                Gate Status: {Object.values(evaChecks).every(Boolean) ? "GO" : "CONDITIONAL / HOLD"}
              </p>
            </section>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
