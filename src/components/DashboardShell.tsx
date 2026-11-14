"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertOctagon,
  Bell,
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
      label: role === "lead" ? "Crew Matrix" : "60s Check-In & EVA",
      icon: Users,
    },
    {
      href: "/dashboard/comms",
      label: `DTN Comms (${pendingDtnCount})`,
      icon: Radio,
    },
    {
      href: "/dashboard/alerts",
      label: "Alarms & Buddy-Rescue",
      icon: Bell,
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
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900">
      {/* Standalone App Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard" className="text-sm font-bold tracking-tight text-slate-900">
              Vitalis+ App
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-700">{mission.name}</span>
            <Link
              href="/"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Scenarios
            </Link>
            <Link
              href={`/character?scenario=${encodeURIComponent(mission.id)}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Characters
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setRole("lead");
                  pushToast({
                    title: "Role: Lead",
                    message: "Here is: Commander Matrix & privacy firewall active.",
                    variant: "info",
                  });
                }}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  role === "lead" ? "bg-white text-sky-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole("member");
                  pushToast({
                    title: "Role: Member",
                    message: "Here is: Personal dashboard & private logs active.",
                    variant: "info",
                  });
                }}
                className={`rounded-md px-3 py-1 font-medium transition ${
                  role === "member" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Member
              </button>
            </div>

            {role === "member" && (
              <select
                value={activeMember.id}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                aria-label="Select crew member slot"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
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

            <button
              type="button"
              onClick={() => {
                const next = !linkOnline;
                setLinkOnline(next);
                pushToast({
                  title: next ? "Earth Link Online" : "Earth Link Blackout",
                  message: next ? "Here is: DTN sync available." : "Here is: Offline-first local mode active.",
                  variant: next ? "success" : "warning",
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                linkOnline
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {linkOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {linkOnline ? "Online" : "Blackout"}
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !reentryMode;
                setReentryMode(next);
                pushToast({
                  title: next ? "Re-Entry Mode" : "Operational Mode",
                  message: next ? "Here is: 1-step action cap enabled." : "Here is: Standard 1–2 action mode.",
                  variant: "info",
                });
              }}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                reentryMode
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {reentryMode ? "Phase: Re-Entry" : "Phase: Ops"}
            </button>

            <button
              type="button"
              onClick={handleQuickAlarm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              Screen Alarm
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Body */}
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

        <main className="min-w-0 space-y-6">{children}</main>
      </div>
    </div>
  );
}
