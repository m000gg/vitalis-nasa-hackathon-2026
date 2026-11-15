"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  LayoutDashboard,
  Orbit,
  Radio,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS } from "@/lib/hazards";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    mission,
    activeCharacter,
    setActiveCharacterId,
    dbStatus,
    dbError,
    refreshScenarios,
    role,
  } = useMission();
  const { pushToast } = useAlerts();

  const navItems = [
    {
      href: "/dashboard",
      label: "Command Deck",
      icon: LayoutDashboard,
    },
    ...(role === "lead"
      ? [
          {
            href: "/dashboard/members",
            label: "Crew Roster",
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen text-[#F8FAFC]">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070B16]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-md px-1 py-0.5 transition hover:text-[#3B82F6]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#3B82F6] shadow-[0_0_14px_rgba(59,130,246,0.28)]">
                <Orbit className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-sm tracking-wider text-white">VITALIS+</span>
            </Link>

            <span className="text-slate-600">/</span>

            <span className="inline-flex items-center gap-1.5 font-mono-tech text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shadow-[0_0_8px_#16A34A]" />
              {mission ? mission.name : "NO SCENARIO"}
            </span>

            <div className="flex items-center gap-1.5">
              <Link
                href="/"
                className="rounded-md border border-slate-700/80 bg-[#0F172A] px-2.5 py-1 font-mono-tech text-xs text-slate-300 transition hover:border-[#3B82F6]/60 hover:text-white"
              >
                Scenarios
              </Link>
              {mission && (
                <Link
                  href={`/character?scenario=${encodeURIComponent(mission.id)}`}
                  className="rounded-md border border-slate-700/80 bg-[#0F172A] px-2.5 py-1 font-mono-tech text-xs text-slate-300 transition hover:border-[#3B82F6]/60 hover:text-white"
                >
                  Characters
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeCharacter && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono-tech text-xs font-bold ${
                  role === "lead"
                    ? "border-[#3B82F6]/45 bg-[#3B82F6]/15 text-blue-300"
                    : "border-[#16A34A]/45 bg-[#16A34A]/15 text-emerald-300"
                }`}
              >
                <Radio className="h-3 w-3" aria-hidden="true" />
                {role === "lead" ? "LEAD · ALL CREW" : "MEMBER · OWN STATS"}
              </span>
            )}
            {mission && activeCharacter && (
              <select
                value={activeCharacter.id}
                onChange={(e) => {
                  const next = mission.crew.find((c) => c.id === e.target.value);
                  setActiveCharacterId(e.target.value);
                  if (next) {
                    pushToast({
                      title: `Switched Character (${next.isLeadSlot ? "Lead" : "Member"})`,
                      message: `Viewing telemetry as ${next.callsign}.`,
                      variant: "info",
                    });
                  }
                }}
                aria-label="Active character"
                className="rounded-md border border-slate-700 bg-[#0B111F] px-2.5 py-1.5 font-mono-tech text-xs font-medium text-slate-100 transition hover:border-[#3B82F6]/60"
              >
                {mission.crew.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0B111F] text-slate-100">
                    {c.callsign} ({c.isLeadSlot ? "Lead" : "Member"})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[248px_1fr]">
        <aside className="space-y-6">
          <div className="hud-panel rounded-lg p-3">
            <nav className="space-y-1" aria-label="Primary workspace navigation">
              <p className="label-caps px-2.5 pb-1.5 text-slate-400">
                {role === "lead" ? "Commander Console" : "Personal Console"}
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm font-medium transition ${
                      active
                        ? "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-white shadow-[inset_3px_0_0_#3B82F6]"
                        : "border-transparent text-slate-300 hover:border-slate-700/70 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? "text-[#3B82F6]" : "text-slate-400"}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <nav className="mt-5 space-y-1 border-t border-slate-800/80 pt-4" aria-label="NASA HRP Hazards">
              <p className="label-caps px-2.5 pb-1.5 text-slate-400">HRP Channels</p>
              {HAZARDS.map((h) => {
                const href = `/dashboard/hazards/${h.slug}`;
                const active = pathname === href;
                return (
                  <Link
                    key={h.slug}
                    href={href}
                    className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs font-medium transition ${
                      active
                        ? "border-[#3B82F6]/50 bg-[#3B82F6]/15 text-white shadow-[inset_3px_0_0_#3B82F6]"
                        : "border-transparent text-slate-300 hover:border-slate-700/70 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={`font-mono-tech text-[11px] font-bold ${
                          active ? "text-[#3B82F6]" : "text-slate-400"
                        }`}
                      >
                        0{h.number}
                      </span>
                      <span className="truncate">{h.shortTitle}</span>
                    </span>
                    <Shield
                      className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#8B5CF6]" : "text-slate-500"}`}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </nav>

            {mission && (
              <div className="mt-5 rounded-md border border-slate-800/90 bg-[#060A14] p-2.5 font-mono-tech text-[11px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="uppercase text-slate-400">Link</span>
                  <span className="text-emerald-400">NOMINAL</span>
                </div>
                <p className="mt-1 truncate text-slate-300">{mission.commsDelayLabel}</p>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          {dbError && (
            <div className="rounded-lg border border-[#DC2626]/50 bg-[#DC2626]/10 p-4 text-red-100">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    Telemetry Connection Error
                  </p>
                  <p className="font-mono-tech text-xs text-red-200">{dbError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshScenarios()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {dbStatus === "loading" ? (
            <div className="hud-panel rounded-lg p-8 text-center font-mono-tech text-sm text-slate-400">
              Syncing orbital telemetry streams...
            </div>
          ) : !mission || !activeCharacter ? (
            <div className="rounded-lg border border-[#D97706]/50 bg-[#D97706]/10 p-6 text-sm text-amber-200">
              No active scenario or character selected.{" "}
              <Link href="/" className="font-semibold text-white underline hover:text-[#3B82F6]">
                Go to Scenarios
              </Link>
              .
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
