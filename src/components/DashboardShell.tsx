"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertOctagon,
  BellRing,
  Compass,
  LayoutDashboard,
  Radio,
  Shield,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { HAZARDS } from "@/lib/hazards";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    mission,
    role,
    setRole,
    selectedMemberId,
    setSelectedMemberId,
    linkOnline,
    setLinkOnline,
    reentryMode,
    setReentryMode,
    dtnQueue,
  } = useMission();
  const { pushToast, triggerAlarm } = useAlerts();

  const pendingDtnCount = dtnQueue.filter((m) => m.status === "PENDING").length;
  const activeMember = mission.crew.find((c) => c.id === selectedMemberId) ?? mission.crew[1] ?? mission.crew[0];

  const navItems = [
    {
      href: "/dashboard",
      label: role === "lead" ? "Lead Overview" : "Member Overview",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/crew",
      label: role === "lead" ? "Crew Matrix & Privacy" : "60s Check-In & Private Log",
      icon: Users,
    },
    {
      href: "/dashboard/comms",
      label: `DTN Comms & Med Kit (${pendingDtnCount})`,
      icon: Radio,
    },
    {
      href: "/dashboard/alerts",
      label: "Toasts, Alarms & Buddy-Rescue",
      icon: BellRing,
    },
  ];

  const handleQuickAlarm = () => {
    const h = HAZARDS[0];
    triggerAlarm({
      hazardNumber: h.number,
      hazardTitle: h.title,
      ...h.alarmPreset,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100">
      {/* Top Operational Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0d1017]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="font-mono text-sm font-bold tracking-wider text-sky-400">
              VITALIS+
            </Link>
            <span className="text-slate-700">|</span>
            <div>
              <p className="text-xs font-semibold text-white">{mission.name}</p>
              <p className="text-[11px] text-slate-400">Phase: {reentryMode ? "POST_ISOLATION_REENTRY" : mission.phase}</p>
            </div>
            <Link
              href="/missions"
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-white"
            >
              Change Mission
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Switcher */}
            <div className="flex items-center rounded-md border border-slate-700 bg-slate-900 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRole("lead");
                  pushToast({
                    title: "Role Switched: LEAD",
                    message: "Here is: Commander Readiness Matrix & privacy firewall active.",
                    variant: "info",
                  });
                }}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  role === "lead" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Lead (Commander)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("member");
                  pushToast({
                    title: "Role Switched: MEMBER",
                    message: "Here is: Personal Ready-to-Act view & private logs active.",
                    variant: "info",
                  });
                }}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  role === "member" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Member (Crew)
              </button>
            </div>

            {role === "member" && (
              <select
                value={activeMember.id}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                aria-label="Select crew member slot"
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              >
                {mission.crew
                  .filter((c) => !c.isLeadSlot)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.callsign}
                    </option>
                  ))}
              </select>
            )}

            {/* Earth Link Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !linkOnline;
                setLinkOnline(next);
                pushToast({
                  title: next ? "Earth Link Restored" : "Earth Link Blackout",
                  message: next
                    ? "Here is: Deep Space Network link available for DTN sync."
                    : "Here is: Offline-first mode active. Reports will queue locally.",
                  variant: next ? "success" : "warning",
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs ${
                linkOnline
                  ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
                  : "border-amber-700/60 bg-amber-950/40 text-amber-300"
              }`}
            >
              {linkOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {linkOnline ? "Link: Online" : "Link: Blackout"}
            </button>

            {/* Re-Entry Phase Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !reentryMode;
                setReentryMode(next);
                pushToast({
                  title: next ? "Re-Entry Mode Enabled" : "Standard Ops Mode",
                  message: next
                    ? "Here is: Non-critical notifications throttled & actions capped to 1 step (Hazard 2 rule)."
                    : "Here is: Full operational telemetry & 1–2 solution cards restored.",
                  variant: "info",
                });
              }}
              className={`rounded border px-2.5 py-1 text-xs ${
                reentryMode
                  ? "border-indigo-500 bg-indigo-950/60 text-indigo-200"
                  : "border-slate-700 bg-slate-900 text-slate-300"
              }`}
            >
              {reentryMode ? "Phase: Re-Entry" : "Phase: Ops"}
            </button>

            {/* Quick Toast & Full-Screen Alarm Buttons */}
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: "Sample Toast Popup",
                  message: "Here is: Dual-horizon local notification slot (toast mechanism).",
                  variant: "warning",
                })
              }
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Test Toast
            </button>
            <button
              type="button"
              onClick={handleQuickAlarm}
              className="inline-flex items-center gap-1 rounded border border-red-500/70 bg-red-950/60 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-900/70"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              Trigger Screen Alarm
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar Navigation */}
        <aside className="space-y-6">
          <nav className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {role === "lead" ? "Commander Workspace" : "Crew Member Workspace"}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-medium transition ${
                    active
                      ? "border-sky-500/60 bg-sky-950/40 text-white"
                      : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <nav className="space-y-1">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              All 5 NASA HRP Hazards
            </p>
            {HAZARDS.map((h) => {
              const href = `/dashboard/hazards/${h.slug}`;
              const active = pathname === href;
              return (
                <Link
                  key={h.slug}
                  href={href}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
                    active
                      ? "border-sky-500/60 bg-sky-950/40 font-semibold text-white"
                      : "border-transparent text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <span className="truncate">
                    {h.number}. {h.title}
                  </span>
                  <Shield className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Link>
              );
            })}
          </nav>

          <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Compass className="h-3.5 w-3.5 text-sky-400" />
              Role Scope Note
            </div>
            <p className="mt-1 leading-relaxed">
              {role === "lead"
                ? "Lead view displays crew readiness, shared buffs/debuffs, and overrides while blocking private personal notes."
                : "Member view displays your personal baselines, 60s self-check, private journal, and 1–2 constrained actions."}
            </p>
          </div>
        </aside>

        {/* Page Content */}
        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
