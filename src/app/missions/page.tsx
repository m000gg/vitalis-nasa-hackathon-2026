"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Shield, UserCheck, Users } from "lucide-react";
import { MISSIONS, MissionProfile, UserRole } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

export default function MissionsPage() {
  const router = useRouter();
  const { mission: currentMission, setMissionId, setRole, setSelectedMemberId } = useMission();
  const { pushToast } = useAlerts();

  const [pickedMission, setPickedMission] = useState<MissionProfile>(currentMission);
  const memberSlots = pickedMission.crew.filter((c) => !c.isLeadSlot);
  const [pickedMemberSlot, setPickedMemberSlot] = useState<string>(memberSlots[0]?.id ?? pickedMission.crew[0].id);

  const handleSelectMission = (m: MissionProfile) => {
    setPickedMission(m);
    const firstMember = m.crew.find((c) => !c.isLeadSlot) ?? m.crew[0];
    setPickedMemberSlot(firstMember.id);
    pushToast({
      title: "Mission Selected",
      message: `Here is: ${m.name} (${m.crew.length} crew slots). Choose Lead or Member below.`,
      variant: "info",
    });
  };

  const handleEnterDashboard = (chosenRole: UserRole) => {
    setMissionId(pickedMission.id);
    setRole(chosenRole);
    if (chosenRole === "member") {
      setSelectedMemberId(pickedMemberSlot);
    }
    pushToast({
      title: `Entered Mission as ${chosenRole.toUpperCase()}`,
      message: `Here is: Active session — ${pickedMission.name} (${chosenRole === "lead" ? "Commander Matrix" : "Personal Crew View"}).`,
      variant: "success",
    });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100">
      <header className="border-b border-slate-800 bg-[#0d1017]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Landing Page
          </Link>
          <span className="font-mono text-xs font-bold tracking-wider text-sky-400">
            VITALIS+ / MISSION &amp; ROLE SELECTOR
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {/* Step 1: Mission & Crew Compositions */}
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">Step 1 / Select Mission Profile</p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Missions &amp; Example Astronaut Compositions
            </h1>
            <p className="text-sm text-slate-400">
              Here is: Select a mission scenario grounded in docs/OUTLINE.md and docs/hazards/*.md, or add your custom
              mission parameters in the slots below.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {MISSIONS.map((m) => {
              const isSelected = pickedMission.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMission(m)}
                  className={`flex flex-col justify-between rounded-lg border p-5 text-left transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-950/25 ring-1 ring-sky-500/40"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-600"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[11px] text-sky-400">{m.phase}</span>
                        <h2 className="text-base font-bold text-white">{m.name}</h2>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-400" />}
                    </div>

                    <p className="text-xs text-slate-300">{m.durationContext}</p>
                    <p className="rounded border border-dashed border-slate-700 bg-slate-950/60 p-2 text-[11px] text-slate-400">
                      {m.commsDelayLabel}
                    </p>
                    <p className="text-xs text-slate-400">{m.scenarioDescriptionSlot}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.activeHazardsHighlight.map((hz) => (
                        <span
                          key={hz}
                          className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300"
                        >
                          {hz}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Crew Composition Preview */}
                  <div className="mt-4 border-t border-slate-800 pt-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      Crew Composition ({m.crew.length} Slots)
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {m.crew.map((c) => (
                        <div
                          key={c.id}
                          className="rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[11px]"
                        >
                          <p className={c.isLeadSlot ? "font-semibold text-sky-300" : "font-medium text-slate-200"}>
                            {c.callsign}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">{c.assignedRoleTitle}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Role Choice (Lead vs Member) */}
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="space-y-1">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">
              Step 2 / Choose Your Role for {pickedMission.name}
            </p>
            <h2 className="text-xl font-bold text-white">Enter as Lead or Crew Member</h2>
            <p className="text-xs text-slate-400">
              Here is: Both roles operate on the same mission telemetry with strict RBAC and privacy separation. You
              can also switch roles later inside the dashboard.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* LEAD ROLE CARD */}
            <div className="flex flex-col justify-between space-y-4 rounded-lg border border-sky-700/60 bg-slate-950 p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded bg-sky-950 px-2.5 py-1 text-xs font-bold text-sky-300">
                    <Shield className="h-3.5 w-3.5" />
                    ROLE: LEAD (COMMANDER)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {pickedMission.crew.find((c) => c.isLeadSlot)?.assignedRoleTitle}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Here is: What Lead unlocks in this mission:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li>• Crew-Wide Readiness Matrix (Green / Amber / Red) &amp; EVA Gate summary</li>
                  <li>• Team-Wide Buffs &amp; Debuffs (shared CO₂, NC-40 acoustics, exercise compliance)</li>
                  <li>• Captain Approval, Emergency Override &amp; Crew Shelter Arrival Tracker</li>
                  <li>• Privacy Firewall: raw personal journals &amp; private mood logs stay hidden</li>
                  <li>• Audit-Logged Emergency Medical Unlock (notifies crew member)</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleEnterDashboard("lead")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500"
              >
                Enter Dashboard as Lead
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* MEMBER ROLE CARD */}
            <div className="flex flex-col justify-between space-y-4 rounded-lg border border-emerald-700/60 bg-slate-950 p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-300">
                    <UserCheck className="h-3.5 w-3.5" />
                    ROLE: MEMBER (CREW ASTRONAUT)
                  </span>
                  <span className="text-[11px] text-slate-400">Individual Ready-to-Act View</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300">
                  Here is: What Member unlocks in this mission:
                </p>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li>• Personal Health &amp; Baseline Readiness + Estimated Time of Action</li>
                  <li>• 60-Second Self-Check &amp; Strictly Private Mood/Journal Log</li>
                  <li>• Personal EVA Gate &amp; Pre-Test Condition Verification (MR087L/MEDB)</li>
                  <li>• 1–2 Inventory-Aware Actionable Solutions &amp; Sleep Relocation Advice</li>
                  <li>• Offline Buddy-Rescue Stabilization Mode for unresponsive crewmates</li>
                </ul>

                <div className="pt-1">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                    Choose Crew Member Composition Slot:
                  </label>
                  <select
                    value={pickedMemberSlot}
                    onChange={(e) => setPickedMemberSlot(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  >
                    {memberSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.callsign} — {slot.assignedRoleTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEnterDashboard("member")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Enter Dashboard as Member
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
