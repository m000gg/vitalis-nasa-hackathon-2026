"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Database, Plus, Shield, UserCheck } from "lucide-react";
import { CrewSlot } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

function CharacterPickerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioQuery = searchParams.get("scenario");

  const { scenarios, dbSource, mission, setMissionId, setActiveCharacterId, createCharacter } = useMission();
  const { pushToast } = useAlerts();

  const [showAddChar, setShowAddChar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [callsign, setCallsign] = useState("");
  const [assignedRoleTitle, setAssignedRoleTitle] = useState("");
  const [isLeadSlot, setIsLeadSlot] = useState(false);
  const [readinessState, setReadinessState] = useState<CrewSlot["readinessState"]>("GO");
  const [evaGateState, setEvaGateState] = useState<CrewSlot["evaGateState"]>("GO");

  useEffect(() => {
    if (scenarioQuery && scenarios.some((m) => m.id === scenarioQuery) && mission.id !== scenarioQuery) {
      setMissionId(scenarioQuery);
    }
  }, [scenarioQuery, scenarios, mission.id, setMissionId]);

  const activeScenario = scenarios.find((m) => m.id === scenarioQuery) ?? mission;
  const leader = activeScenario.crew.find((c) => c.isLeadSlot);
  const members = activeScenario.crew.filter((c) => !c.isLeadSlot);

  const handleSelectCharacter = (character: CrewSlot) => {
    setMissionId(activeScenario.id);
    setActiveCharacterId(character.id);
    pushToast({
      title: `Entered as ${character.isLeadSlot ? "Leader" : "Member"}`,
      message: `Here is: ${character.callsign} active in ${activeScenario.name}.`,
      variant: "success",
    });
    router.push("/dashboard");
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) return;
    setCreating(true);
    const result = await createCharacter({
      scenarioId: activeScenario.id,
      callsign: callsign.trim(),
      assignedRoleTitle: assignedRoleTitle.trim() || "Add your info: Assigned role title here",
      isLeadSlot,
      readinessState,
      evaGateState,
    });
    setCreating(false);

    pushToast({
      title: result.error ? "Character Create Issue" : "Character Added",
      message: result.character
        ? `Here is: ${result.character.callsign} linked to ${activeScenario.name} (${
            result.source === "supabase" ? "Supabase Remote" : "Local Fallback"
          }).`
        : result.error ?? "Unable to create character.",
      variant: result.error ? "warning" : "success",
    });

    if (result.character) {
      setCallsign("");
      setAssignedRoleTitle("");
      setIsLeadSlot(false);
      setReadinessState("GO");
      setEvaGateState("GO");
      setShowAddChar(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Change Scenario
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                dbSource === "supabase"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Database className="h-3 w-3" />
              {dbSource === "supabase" ? "Supabase Remote" : "Local Fallback"}
            </span>
            <span className="text-xs font-medium text-slate-500">Step 2 · Choose Character</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{activeScenario.name}</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose Your Character</h1>
            <p className="text-sm text-slate-600">
              Here is: Every character passes their own role and status into the generalized dashboard components.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddChar((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddChar ? "Close Form" : "Add Character to Scenario"}
          </button>
        </div>

        {showAddChar && (
          <form
            onSubmit={handleCreateCharacter}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 className="text-sm font-bold text-slate-900">
              Add Character Linked to {activeScenario.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Add your info: Callsign here"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
              <input
                type="text"
                value={assignedRoleTitle}
                onChange={(e) => setAssignedRoleTitle(e.target.value)}
                placeholder="Add your info: Assigned role title here"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
              <select
                value={readinessState}
                onChange={(e) => setReadinessState(e.target.value as CrewSlot["readinessState"])}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
              >
                <option value="GO">Readiness: GO</option>
                <option value="CONDITIONAL">Readiness: CONDITIONAL</option>
                <option value="HOLD">Readiness: HOLD</option>
              </select>
              <select
                value={evaGateState}
                onChange={(e) => setEvaGateState(e.target.value as CrewSlot["evaGateState"])}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800"
              >
                <option value="GO">EVA Gate: GO</option>
                <option value="CONDITIONAL">EVA Gate: CONDITIONAL</option>
                <option value="NO-GO">EVA Gate: NO-GO</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isLeadSlot}
                onChange={(e) => setIsLeadSlot(e.target.checked)}
                className="rounded border-slate-300"
              />
              Assign Leader Role Slot
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save Character"}
              </button>
            </div>
          </form>
        )}

        {leader && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Crew Leader</h2>
            <button
              type="button"
              onClick={() => handleSelectCharacter(leader)}
              className="flex w-full flex-col justify-between gap-4 rounded-2xl border border-sky-200 bg-white p-6 text-left shadow-xs transition hover:border-sky-400 sm:flex-row sm:items-center"
            >
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                  <Shield className="h-3.5 w-3.5" />
                  LEADER
                </span>
                <h3 className="text-lg font-bold text-slate-900">{leader.callsign}</h3>
                <p className="text-xs font-medium text-slate-500">{leader.assignedRoleTitle}</p>
                <p className="text-sm text-slate-600">{leader.publicStatusSummary}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white">
                Enter as Leader
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Crew Members ({members.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectCharacter(member)}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-emerald-400"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      <UserCheck className="h-3.5 w-3.5" />
                      MEMBER
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {member.readinessState} · EVA {member.evaGateState}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{member.callsign}</h3>
                  <p className="text-xs text-slate-500">{member.assignedRoleTitle}</p>
                  <p className="text-xs text-slate-600">{member.publicStatusSummary}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-700">
                  <span>Enter as {member.assignedRoleTitle}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CharacterChoosingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-sm text-slate-500">
          Loading characters...
        </div>
      }
    >
      <CharacterPickerContent />
    </Suspense>
  );
}
