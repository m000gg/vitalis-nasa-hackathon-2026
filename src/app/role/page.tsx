"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Shield, UserCheck } from "lucide-react";
import { MISSIONS, UserRole } from "@/lib/domain";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";

function RoleSelectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const missionQuery = searchParams.get("mission");

  const { mission, setMissionId, setRole, setSelectedMemberId } = useMission();
  const { pushToast } = useAlerts();

  useEffect(() => {
    if (missionQuery && MISSIONS.some((m) => m.id === missionQuery) && mission.id !== missionQuery) {
      setMissionId(missionQuery);
    }
  }, [missionQuery, mission.id, setMissionId]);

  const activeMission = MISSIONS.find((m) => m.id === missionQuery) ?? mission;
  const memberSlots = activeMission.crew.filter((c) => !c.isLeadSlot);
  const [pickedMemberSlot, setPickedMemberSlot] = useState<string>(memberSlots[0]?.id ?? activeMission.crew[0].id);

  useEffect(() => {
    const first = activeMission.crew.find((c) => !c.isLeadSlot) ?? activeMission.crew[0];
    setPickedMemberSlot(first.id);
  }, [activeMission]);

  const handleChooseRole = (chosenRole: UserRole) => {
    setMissionId(activeMission.id);
    setRole(chosenRole);
    if (chosenRole === "member") {
      setSelectedMemberId(pickedMemberSlot);
    }
    pushToast({
      title: `Opening ${chosenRole === "lead" ? "Lead" : "Member"} Workspace`,
      message: `Here is: ${activeMission.name} loaded in ${chosenRole.toUpperCase()} mode.`,
      variant: "success",
    });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Change Mission
          </Link>
          <span className="text-xs font-medium text-slate-500">Step 2 of 2 — Choose Role</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{activeMission.name}</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose Your Role</h1>
          <p className="text-sm text-slate-600">
            Here is: Your workspace opens as a dedicated dashboard tailored to Lead or Member permissions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* LEAD CARD */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                <Shield className="h-4 w-4" />
                Lead (Commander / Captain)
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Here is: Crew-wide readiness matrix, shared buffs &amp; debuffs, shelter confirmations, task rotation,
                and audit-logged overrides. Private crew journals stay hidden.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleChooseRole("lead")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Enter Dashboard as Lead
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* MEMBER CARD */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <UserCheck className="h-4 w-4" />
                Member (Crew Astronaut)
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Here is: Personal baselines, 60-second check-in, strictly private journal, EVA readiness checklist, 1–2
                solutions, and Buddy-Rescue mode.
              </p>

              <div className="pt-1">
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Crew Composition Slot</label>
                <select
                  value={pickedMemberSlot}
                  onChange={(e) => setPickedMemberSlot(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
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
              onClick={() => handleChooseRole("member")}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Enter Dashboard as Member
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] text-sm text-slate-500">
          Loading role selection...
        </div>
      }
    >
      <RoleSelectorContent />
    </Suspense>
  );
}
