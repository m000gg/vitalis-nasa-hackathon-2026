"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Orbit,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  UserCheck,
  X,
} from "lucide-react";
import { CrewSlot } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

function CharacterPickerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioQuery = searchParams.get("scenario");

  const {
    scenarios,
    dbStatus,
    dbError,
    refreshScenarios,
    mission,
    setMissionId,
    setActiveCharacterId,
    createCharacter,
    updateCharacter,
  } = useMission();
  const { pushToast } = useAlerts();

  const [showAddChar, setShowAddChar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [callsign, setCallsign] = useState("");
  const [assignedRoleTitle, setAssignedRoleTitle] = useState("");
  const [isLeadSlot, setIsLeadSlot] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editCallsign, setEditCallsign] = useState("");
  const [editRoleTitle, setEditRoleTitle] = useState("");
  const [editIsLead, setEditIsLead] = useState(false);
  const [editSummary, setEditSummary] = useState("");

  useEffect(() => {
    if (scenarioQuery && scenarios.some((m) => m.id === scenarioQuery) && mission?.id !== scenarioQuery) {
      setMissionId(scenarioQuery);
    }
  }, [scenarioQuery, scenarios, mission?.id, setMissionId]);

  const activeScenario = scenarios.find((m) => m.id === scenarioQuery) ?? mission;
  const leaders = activeScenario?.crew.filter((c) => c.isLeadSlot) ?? [];
  const members = activeScenario?.crew.filter((c) => !c.isLeadSlot) ?? [];

  const handleSelectCharacter = (character: CrewSlot) => {
    if (!activeScenario) return;
    setMissionId(activeScenario.id);
    setActiveCharacterId(character.id);
    pushToast({
      title: `Entered as ${character.isLeadSlot ? "Leader" : "Member"}`,
      message: `${character.callsign} active in ${activeScenario.name}.`,
      variant: "success",
    });
    router.push("/dashboard");
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim() || !activeScenario) return;
    setCreating(true);
    try {
      const created = await createCharacter({
        scenarioId: activeScenario.id,
        callsign: callsign.trim(),
        assignedRoleTitle: assignedRoleTitle.trim() || "Crew Specialist",
        isLeadSlot,
      });
      pushToast({
        title: "Character Added",
        message: `${created.callsign} linked to ${activeScenario.name}.`,
        variant: "success",
      });
      setCallsign("");
      setAssignedRoleTitle("");
      setIsLeadSlot(false);
      setShowAddChar(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save character";
      pushToast({
        title: "Error",
        message: msg,
        variant: "hazard",
      });
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (character: CrewSlot) => {
    setEditingId(character.id);
    setEditCallsign(character.callsign);
    setEditRoleTitle(character.assignedRoleTitle);
    setEditIsLead(character.isLeadSlot);
    setEditSummary(character.publicStatusSummary);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScenario || !editingId || !editCallsign.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await updateCharacter({
        scenarioId: activeScenario.id,
        id: editingId,
        callsign: editCallsign.trim(),
        assignedRoleTitle: editRoleTitle.trim() || "Crew Specialist",
        isLeadSlot: editIsLead,
        publicStatusSummary: editSummary.trim() || "Updated character status",
      });
      pushToast({
        title: "Character Updated",
        message: `${updated.callsign} updated.`,
        variant: "success",
      });
      setEditingId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update character";
      pushToast({
        title: "Update Error",
        message: msg,
        variant: "hazard",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const renderEditForm = () => (
    <form
      onSubmit={handleSaveEdit}
      className="hud-panel space-y-3 rounded-lg border-[#3B82F6]/50 p-5 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-sm text-white">Edit Character</span>
        <button
          type="button"
          onClick={() => setEditingId(null)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#060A14] px-2.5 py-1 text-slate-300 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          value={editCallsign}
          onChange={(e) => setEditCallsign(e.target.value)}
          placeholder="Callsign"
          className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-slate-100"
        />
        <input
          type="text"
          value={editRoleTitle}
          onChange={(e) => setEditRoleTitle(e.target.value)}
          placeholder="Assigned role title"
          className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-slate-100"
        />
      </div>
      <input
        type="text"
        value={editSummary}
        onChange={(e) => setEditSummary(e.target.value)}
        placeholder="Public status summary"
        className="w-full rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-slate-100"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={editIsLead}
            onChange={(e) => setEditIsLead(e.target.checked)}
            className="rounded border-slate-600 bg-[#060A14]"
          />
          Leader Role
        </label>
        <button
          type="submit"
          disabled={savingEdit}
          className="rounded-md bg-[#3B82F6] px-4 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {savingEdit ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen text-[#F8FAFC]">
      <header className="border-b border-slate-800/80 bg-[#070B16]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
          >
            <Orbit className="h-4 w-4 text-[#3B82F6]" />
            <ArrowLeft className="h-4 w-4" />
            Change Scenario
          </Link>
          <span className="label-caps rounded border border-[#8B5CF6]/35 bg-[#8B5CF6]/12 px-2.5 py-1 text-violet-300">
            Step 02 · Crew Identity
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        {dbError && (
          <div className="rounded-lg border border-[#DC2626]/55 bg-[#DC2626]/12 p-5 text-red-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  Connection Error
                </p>
                <p className="font-mono-tech text-xs text-red-200">{dbError}</p>
              </div>
              <button
                type="button"
                onClick={() => refreshScenarios()}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {dbStatus === "loading" && (
          <div className="hud-panel rounded-lg p-8 text-center font-mono-tech text-sm text-slate-400">
            Loading crew roster...
          </div>
        )}

        {!activeScenario && dbStatus !== "loading" && !dbError && (
          <div className="rounded-lg border border-[#D97706]/50 bg-[#D97706]/10 p-6 text-sm text-amber-200">
            Scenario not found.{" "}
            <Link href="/" className="font-semibold text-white underline">
              Return to Scenarios
            </Link>
            .
          </div>
        )}

        {activeScenario && (
          <>
            <section className="hud-panel flex flex-wrap items-end justify-between gap-4 rounded-lg p-6">
              <div className="space-y-1.5">
                <p className="label-caps text-[#3B82F6]">{activeScenario.name}</p>
                <h1 className="font-display text-2xl tracking-tight text-white sm:text-3xl">
                  Select Crew Profile
                </h1>
                <p className="text-xs text-slate-400">
                  Commander view shows all crew operational vitals; Member view isolates personal stats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChar((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#3B82F6]/45 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-[#3B82F6]/25 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {showAddChar ? "Close Form" : "Add Character"}
              </button>
            </section>

            {showAddChar && (
              <form onSubmit={handleCreateCharacter} className="hud-panel space-y-4 rounded-lg p-6">
                <h2 className="font-display text-sm text-white">
                  Add Character to {activeScenario.name}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="Callsign"
                    className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    value={assignedRoleTitle}
                    onChange={(e) => setAssignedRoleTitle(e.target.value)}
                    placeholder="Assigned role title"
                    className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isLeadSlot}
                    onChange={(e) => setIsLeadSlot(e.target.checked)}
                    className="rounded border-slate-600 bg-[#060A14]"
                  />
                  Assign Leader Role Slot
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-md bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {creating ? "Saving..." : "Save Character"}
                  </button>
                </div>
              </form>
            )}

            {leaders.length > 0 && (
              <section className="space-y-3">
                <h2 className="label-caps text-slate-400">Crew Leader ({leaders.length})</h2>
                <div className="space-y-3">
                  {leaders.map((leader) =>
                    editingId === leader.id ? (
                      <div key={leader.id}>{renderEditForm()}</div>
                    ) : (
                      <div
                        key={leader.id}
                        className="hud-panel flex flex-col justify-between gap-4 rounded-lg border-[#3B82F6]/35 p-6 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded border border-[#3B82F6]/40 bg-[#3B82F6]/15 px-2.5 py-0.5 font-mono-tech text-xs font-bold text-blue-300">
                            <Shield className="h-3.5 w-3.5" />
                            LEADER
                          </span>
                          <h3 className="font-display text-lg text-white">{leader.callsign}</h3>
                          <p className="font-mono-tech text-xs text-slate-400">{leader.assignedRoleTitle}</p>
                          <p className="text-sm text-slate-300">{leader.publicStatusSummary}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(leader)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectCharacter(leader)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            Enter as Leader
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="label-caps text-slate-400">Crew Members ({members.length})</h2>
              {members.length === 0 && (
                <p className="hud-panel rounded-lg p-4 text-xs text-slate-400">
                  No member characters found for this scenario yet.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {members.map((member) =>
                  editingId === member.id ? (
                    <div key={member.id} className="md:col-span-2">
                      {renderEditForm()}
                    </div>
                  ) : (
                    <div key={member.id} className="hud-panel flex flex-col justify-between rounded-lg p-5">
                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1 rounded border border-[#16A34A]/40 bg-[#16A34A]/15 px-2 py-0.5 font-mono-tech text-xs font-bold text-emerald-300">
                          <UserCheck className="h-3.5 w-3.5" />
                          MEMBER
                        </span>
                        <h3 className="font-display text-base text-white">{member.callsign}</h3>
                        <p className="font-mono-tech text-xs text-slate-400">{member.assignedRoleTitle}</p>
                        <p className="text-xs text-slate-300">{member.publicStatusSummary}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={() => startEditing(member)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#060A14] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCharacter(member)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-[#16A34A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                        >
                          Enter Member
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function CharacterChoosingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center font-mono-tech text-sm text-slate-400">
          Loading characters...
        </div>
      }
    >
      <CharacterPickerContent />
    </Suspense>
  );
}
