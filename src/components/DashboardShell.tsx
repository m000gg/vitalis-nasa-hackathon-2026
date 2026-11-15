"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  LayoutDashboard,
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
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    ...(role === "lead"
      ? [
          {
            href: "/dashboard/members",
            label: "Members",
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard" className="text-sm font-bold tracking-tight text-slate-900">
              Vitalis+ App
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-700">
              {mission ? mission.name : "No Scenario Loaded"}
            </span>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Scenarios
            </Link>
            {mission && (
              <Link
                href={`/character?scenario=${encodeURIComponent(mission.id)}`}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Characters
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mission && activeCharacter && (
              <select
                value={activeCharacter.id}
                onChange={(e) => {
                  const next = mission.crew.find((c) => c.id === e.target.value);
                  setActiveCharacterId(e.target.value);
                  if (next) {
                    pushToast({
                      title: `Switched Character (${next.isLeadSlot ? "Lead" : "Member"})`,
                      message: `Viewing dashboard as ${next.callsign}.`,
                      variant: "info",
                    });
                  }
                }}
                aria-label="Active character"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
              >
                {mission.crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.callsign} ({c.isLeadSlot ? "Lead" : "Member"})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[230px_1fr]">
        <aside className="space-y-6">
          <nav className="space-y-1">
            <p className="px-3 pb-1.5 text-xs font-semibold text-slate-400">
              {role === "lead" ? "Lead Workspace" : "Member Workspace"}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <nav className="space-y-1">
            <p className="px-3 pb-1.5 text-xs font-semibold text-slate-400">5 NASA HRP Hazards</p>
            {HAZARDS.map((h) => {
              const href = `/dashboard/hazards/${h.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={h.slug}
                  href={href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-white font-semibold text-slate-900 shadow-2xs ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">
                    {h.number}. {h.shortTitle}
                  </span>
                  <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-6">
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
                  Retry
                </button>
              </div>
            </div>
          )}

          {dbStatus === "loading" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading mission telemetry...
            </div>
          ) : !mission || !activeCharacter ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
              No active scenario or character selected.{" "}
              <Link href="/" className="font-semibold underline">
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
