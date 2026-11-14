"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, ShieldAlert, Users } from "lucide-react";
import { MISSIONS, MissionProfile } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS } from "@/lib/hazards";

export default function GreetingScenarioPage() {
  const router = useRouter();
  const { setMissionId } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  const handleSelectScenario = (m: MissionProfile) => {
    setMissionId(m.id);
    pushToast({
      title: "Scenario Selected",
      message: `Here is: ${m.name} loaded. Choose a character (Leader or Member) next.`,
      variant: "info",
    });
    router.push(`/character?scenario=${encodeURIComponent(m.id)}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-sm font-bold tracking-tight text-slate-900">Vitalis+ App</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: "Toast Check",
                  message: "Here is: Toast notification mechanism active.",
                  variant: "info",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Bell className="h-3.5 w-3.5 text-sky-600" />
              Test Toast
            </button>
            <button
              type="button"
              onClick={() => {
                const h = HAZARDS[0];
                triggerAlarm({
                  hazardNumber: h.number,
                  hazardTitle: h.title,
                  ...h.alarmPreset,
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Test Alarm
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        {/* Greeting */}
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Step 1 · Choose Scenario</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to Vitalis+</h1>
          <p className="text-sm text-slate-600">
            Here is: Select a mission scenario below to pick your character (Leader or Crew Member) and enter the
            5-hazard space health dashboard.
          </p>
        </section>

        {/* Direct Scenario Choosing */}
        <section className="grid gap-5 md:grid-cols-2">
          {MISSIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectScenario(m)}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xs transition hover:border-sky-400 hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-sky-700">{m.phase}</span>
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
      </main>
    </div>
  );
}
