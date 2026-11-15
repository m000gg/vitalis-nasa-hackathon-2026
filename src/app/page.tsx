"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Plus, RefreshCw, Users } from "lucide-react";
import { MissionProfile } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

export default function GreetingScenarioPage() {
  const router = useRouter();
  const { scenarios, dbStatus, dbError, refreshScenarios, setMissionId, createScenario } = useMission();
  const { pushToast } = useAlerts();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [durationContext, setDurationContext] = useState("");
  const [scenarioDescriptionSlot, setScenarioDescriptionSlot] = useState("");
  const [commsDelayLabel, setCommsDelayLabel] = useState("");
  const [leaderCallsign, setLeaderCallsign] = useState("");

  const handleSelectScenario = (m: MissionProfile) => {
    setMissionId(m.id);
    pushToast({
      title: "Scenario Selected",
      message: `${m.name} loaded. Choose a character next.`,
      variant: "info",
    });
    router.push(`/character?scenario=${encodeURIComponent(m.id)}`);
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await createScenario({
        name: name.trim(),
        durationContext: durationContext.trim() || "Standard transit",
        scenarioDescriptionSlot:
          scenarioDescriptionSlot.trim() || "Custom mission scenario",
        commsDelayLabel: commsDelayLabel.trim() || "Nominal light-time delay",
        leaderCallsign: leaderCallsign.trim() || undefined,
      });
      pushToast({
        title: "Scenario Created",
        message: `${created.name} created.`,
        variant: "success",
      });
      setName("");
      setDurationContext("");
      setScenarioDescriptionSlot("");
      setCommsDelayLabel("");
      setLeaderCallsign("");
      setShowCreateForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save scenario";
      pushToast({
        title: "Error",
        message: msg,
        variant: "hazard",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight text-slate-900">Vitalis+ App</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Step 1 · Choose Scenario</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vitalis+</h1>
            <p className="text-sm text-slate-600">Select a mission scenario.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {showCreateForm ? "Close Form" : "Create Scenario"}
          </button>
        </section>

        {dbError && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2 text-sm font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Connection Error
                </p>
                <p className="font-mono text-xs text-red-800">{dbError}</p>
              </div>
              <button
                type="button"
                onClick={() => refreshScenarios()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateScenario}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 className="text-sm font-bold text-slate-900">New Mission Scenario</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Scenario name (e.g., Mars Transit Day 126)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
              <input
                type="text"
                value={durationContext}
                onChange={(e) => setDurationContext(e.target.value)}
                placeholder="Mission duration (e.g., 180-day cruise)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
              <input
                type="text"
                value={commsDelayLabel}
                onChange={(e) => setCommsDelayLabel(e.target.value)}
                placeholder="Comms delay label (e.g., 12 min one-way)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
              <input
                type="text"
                value={leaderCallsign}
                onChange={(e) => setLeaderCallsign(e.target.value)}
                placeholder="Leader callsign (optional)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <input
              type="text"
              value={scenarioDescriptionSlot}
              onChange={(e) => setScenarioDescriptionSlot(e.target.value)}
              placeholder="Scenario description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save Scenario"}
              </button>
            </div>
          </form>
        )}

        {dbStatus === "loading" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading scenarios...
          </div>
        )}

        {dbStatus === "connected" && scenarios.length === 0 && !dbError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
            No scenarios yet. Click <strong>Create Scenario</strong> above.
          </div>
        )}

        {scenarios.length > 0 && (
          <section className="grid gap-5 md:grid-cols-2">
            {scenarios.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectScenario(m)}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xs transition hover:border-sky-400 hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-sky-700">{m.durationContext}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {m.crew.length} Characters
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{m.name}</h2>
                  <p className="text-sm text-slate-600">{m.scenarioDescriptionSlot}</p>
                  <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">{m.commsDelayLabel}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900">
                  <span>Choose Character in Scenario</span>
                  <ArrowRight className="h-4 w-4 text-sky-600" />
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
