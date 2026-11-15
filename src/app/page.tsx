"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Orbit, Plus, RefreshCw, Users } from "lucide-react";
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
        scenarioDescriptionSlot: scenarioDescriptionSlot.trim() || "Custom mission scenario",
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
    <div className="min-h-screen text-[#F8FAFC]">
      <header className="border-b border-slate-800/80 bg-[#070B16]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#3B82F6] shadow-[0_0_16px_rgba(59,130,246,0.3)]">
              <Orbit className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-display text-sm tracking-wider text-white">VITALIS+</span>
          </div>
          <span className="label-caps rounded border border-[#8B5CF6]/35 bg-[#8B5CF6]/12 px-2.5 py-1 text-violet-300">
            Step 01 · Scenario Link
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <section className="hud-panel relative overflow-hidden rounded-lg p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#3B82F6]/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="label-caps inline-flex items-center gap-2 text-[#3B82F6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                NASA HRP 5-Hazard Flight Console
              </span>
              <h1 className="font-display text-3xl tracking-tight text-white sm:text-5xl">
                VITALIS+
              </h1>
              <p className="text-sm text-slate-400">Select a mission scenario.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3B82F6]/45 bg-[#3B82F6]/15 px-3.5 py-2 text-xs font-semibold text-blue-200 transition hover:bg-[#3B82F6]/25 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {showCreateForm ? "Close Form" : "Create Scenario"}
            </button>
          </div>
        </section>

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
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateScenario} className="hud-panel space-y-4 rounded-lg p-6">
            <h2 className="font-display text-sm text-white">New Mission Scenario</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Scenario name (e.g., Mars Transit Day 126)"
                className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                value={durationContext}
                onChange={(e) => setDurationContext(e.target.value)}
                placeholder="Mission duration (e.g., 180-day cruise)"
                className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                value={commsDelayLabel}
                onChange={(e) => setCommsDelayLabel(e.target.value)}
                placeholder="Comms delay label (e.g., 12 min one-way)"
                className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                value={leaderCallsign}
                onChange={(e) => setLeaderCallsign(e.target.value)}
                placeholder="Leader callsign (optional)"
                className="rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <input
              type="text"
              value={scenarioDescriptionSlot}
              onChange={(e) => setScenarioDescriptionSlot(e.target.value)}
              placeholder="Scenario description"
              className="w-full rounded-md border border-slate-700 bg-[#060A14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {creating ? "Saving..." : "Save Scenario"}
              </button>
            </div>
          </form>
        )}

        {dbStatus === "loading" && (
          <div className="hud-panel rounded-lg p-8 text-center font-mono-tech text-sm text-slate-400">
            Loading mission scenarios...
          </div>
        )}

        {dbStatus === "connected" && scenarios.length === 0 && !dbError && (
          <div className="rounded-lg border border-[#D97706]/50 bg-[#D97706]/10 p-6 text-sm text-amber-200">
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
                className="hud-panel group flex flex-col justify-between rounded-lg p-6 text-left transition hover:border-[#3B82F6]/65 hover:shadow-[0_0_24px_rgba(59,130,246,0.16)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded border border-[#3B82F6]/35 bg-[#3B82F6]/12 px-2 py-0.5 font-mono-tech text-xs font-bold text-blue-300">
                      {m.durationContext}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono-tech text-xs text-slate-400">
                      <Users className="h-3.5 w-3.5 text-[#8B5CF6]" />
                      {m.crew.length} Crew
                    </span>
                  </div>
                  <h2 className="font-display text-lg text-white group-hover:text-blue-200">
                    {m.name}
                  </h2>
                  <p className="text-sm text-slate-300">{m.scenarioDescriptionSlot}</p>
                  <p className="rounded-md border border-slate-800 bg-[#060A14] px-3 py-2 font-mono-tech text-xs text-slate-400">
                    {m.commsDelayLabel}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs font-semibold text-blue-300 group-hover:text-white">
                  <span className="label-caps">Enter Character Deck</span>
                  <ArrowRight className="h-4 w-4 text-[#3B82F6] transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
