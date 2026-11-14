"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Database,
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
      message: `Here is: ${character.callsign} active in ${activeScenario.name}.`,
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
        assignedRoleTitle: assignedRoleTitle.trim() || "Add your info: Assigned role title here",
        isLeadSlot,
      });
      pushToast({
        title: "Character Added in Supabase",
        message: `Here is: ${created.callsign} linked to ${activeScenario.name}.`,
        variant: "success",
      });
      setCallsign("");
      setAssignedRoleTitle("");
      setIsLeadSlot(false);
      setShowAddChar(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save character to Supabase";
      pushToast({
        title: "Supabase Error",
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
        assignedRoleTitle: editRoleTitle.trim() || "Add your info: Assigned role title here",
        isLeadSlot: editIsLead,
        publicStatusSummary: editSummary.trim() || "Here is: Updated character status",
      });
      pushToast({
        title: "Character Updated in Supabase",
        message: `Here is: ${updated.callsign} saved to public.characters.`,
        variant: "success",
      });
      setEditingId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update character in Supabase";
      pushToast({
        title: "Supabase Update Error",
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
      className="space-y-3 rounded-2xl border border-sky-300 bg-sky-50/40 p-5 text-xs"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-900">Edit Character in Supabase (public.characters)</span>
        <button
          type="button"
          onClick={() => setEditingId(null)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50"
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
          placeholder="Add your info: Callsign here"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
        />
        <input
          type="text"
          value={editRoleTitle}
          onChange={(e) => setEditRoleTitle(e.target.value)}
          placeholder="Add your info: Assigned role title here"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
        />
      </div>
      <input
        type="text"
        value={editSummary}
        onChange={(e) => setEditSummary(e.target.value)}
        placeholder="Add your info: Public status summary here"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-slate-700">
            <input
              type="checkbox"
              checked={editIsLead}
              onChange={(e) => setEditIsLead(e.target.checked)}
              className="rounded border-slate-300"
            />
            Leader Role
          </label>
        </div>
        <button
          type="submit"
          disabled={savingEdit}
          className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {savingEdit ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );

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
                dbStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : dbStatus === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Database className="h-3 w-3" />
              {dbStatus === "connected"
                ? "Supabase Connected"
                : dbStatus === "error"
                ? "Supabase Error"
                : "Connecting..."}
            </span>
            <span className="text-xs font-medium text-slate-500">Step 2 · Choose or Edit Character</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        {dbError && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Supabase Database Error
                </p>
                <p className="font-mono text-xs text-red-800">{dbError}</p>
              </div>
              <button
                type="button"
                onClick={() => refreshScenarios()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {dbStatus === "loading" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading characters from Supabase...
          </div>
        )}

        {!activeScenario && dbStatus !== "loading" && !dbError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            Scenario not found in Supabase.{" "}
            <Link href="/" className="font-semibold underline">
              Return to Scenarios
            </Link>
            .
          </div>
        )}

        {activeScenario && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{activeScenario.name}</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose Your Character</h1>
                <p className="text-sm text-slate-600">
                  Here is: Pick any character (Leader or Member) to enter the dashboard, or click Edit to customize
                  callsign or role in Supabase.
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
                  Add Character Linked to {activeScenario.name} (public.characters)
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
                    {creating ? "Saving to Supabase..." : "Save Character"}
                  </button>
                </div>
              </form>
            )}

            {leaders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Crew Leader ({leaders.length})
                </h2>
                <div className="space-y-3">
                  {leaders.map((leader) =>
                    editingId === leader.id ? (
                      <div key={leader.id}>{renderEditForm()}</div>
                    ) : (
                      <div
                        key={leader.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                              <Shield className="h-3.5 w-3.5" />
                              LEADER
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">{leader.callsign}</h3>
                          <p className="text-xs font-medium text-slate-500">{leader.assignedRoleTitle}</p>
                          <p className="text-sm text-slate-600">{leader.publicStatusSummary}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(leader)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectCharacter(leader)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
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
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Crew Members ({members.length})
              </h2>
              {members.length === 0 && (
                <p className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
                  No member characters found in public.characters for this scenario yet.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {members.map((member) =>
                  editingId === member.id ? (
                    <div key={member.id} className="md:col-span-2">
                      {renderEditForm()}
                    </div>
                  ) : (
                    <div
                      key={member.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <UserCheck className="h-3.5 w-3.5" />
                            MEMBER
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{member.callsign}</h3>
                        <p className="text-xs text-slate-500">{member.assignedRoleTitle}</p>
                        <p className="text-xs text-slate-600">{member.publicStatusSummary}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => startEditing(member)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCharacter(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
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
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-sm text-slate-500">
          Loading characters...
        </div>
      }
    >
      <CharacterPickerContent />
    </Suspense>
  );
}
