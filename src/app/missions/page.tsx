"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { MISSIONS, MissionProfile } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

export default function SelectMissionPage() {
  const router = useRouter();
  const { setMissionId } = useMission();
  const { pushToast } = useAlerts();

  const handleChooseMission = (m: MissionProfile) => {
    setMissionId(m.id);
    pushToast({
      title: "Mission Chosen",
      message: `Here is: ${m.name} selected. Now choose your role.`,
      variant: "info",
    });
    router.push(`/role?mission=${encodeURIComponent(m.id)}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-xs font-medium text-slate-500">Step 1 of 2 — Choose Mission</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose a Mission</h1>
          <p className="text-sm text-slate-600">
            Here is: Select an example mission and crew composition. You will choose your role (Lead or Member) on the
            next page.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {MISSIONS.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-sky-300"
            >
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-sky-700">{m.phase}</span>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">{m.name}</h2>
                </div>

                <p className="text-sm text-slate-600">{m.scenarioDescriptionSlot}</p>

                <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">{m.commsDelayLabel}</p>

                <div className="pt-1">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    Astronaut Composition ({m.crew.length} Crew)
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {m.crew.map((c) => (
                      <li key={c.id} className="flex items-center justify-between rounded bg-slate-50 px-2.5 py-1.5">
                        <span className={c.isLeadSlot ? "font-semibold text-sky-800" : ""}>{c.callsign}</span>
                        <span className="text-[11px] text-slate-400">{c.assignedRoleTitle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleChooseMission(m)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Select Mission &amp; Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
