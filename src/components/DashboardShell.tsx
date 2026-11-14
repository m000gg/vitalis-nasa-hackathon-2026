"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Database,
  LayoutDashboard,
  Radio,
  RefreshCw,
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
    activeCharacter,
    setActiveCharacterId,
    dbStatus,
    dbError,
    refreshScenarios,
    lastTelemetrySyncAt,
    refreshHazardTelemetry,
    role,
    linkOnline,
    setLinkOnline,
    reentryMode,
    setReentryMode,
    dtnQueue,
  } = useMission();
  const { pushToast } = useAlerts();

  const pendingDtnCount = dtnQueue.filter((m) => m.status === "PENDING").length;

  const navItems = [
    {
      href: "/dashboard",
      label: role === "lead" ? "Lead Overview" : "Member Overview",
      icon: LayoutDashboard,
    },
    {
      href: "/dashboard/crew",
      label: role === "lead" ? "Crew Matrix" : "Readiness & EVA",
      icon: Users,
    },
    {
      href: "/dashboard/comms",
      label: `DTN Comms (${pendingDtnCount})`,
      icon: Radio,
    },
    {
      href: "/dashboard/alerts",
      label: "Alerts & Buddy-Rescue",
      icon: Bell,
    },
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
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                dbStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : dbStatus === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              {dbStatus === "connected"
                ? "Supabase"
                : dbStatus === "error"
                ? "DB Error"
                : "Loading..."}
            </span>

            <button
              type="button"
              onClick={() => {
                void refreshHazardTelemetry();
              }}
              title={lastTelemetrySyncAt ? `Last synced at ${lastTelemetrySyncAt}` : "Sync telemetry from Supabase"}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{lastTelemetrySyncAt ? `Sync (${lastTelemetrySyncAt})` : "Sync DB"}</span>
            </button>

            {mission && activeCharacter && (
              <select
                value={activeCharacter.id}
                onChange={(e) => {
                  const next = mission.crew.find((c) => c.id === e.target.value);
                  setActiveCharacterId(e.target.value);
                  if (next) {
                    pushToast({
                      title: `Switched Character (${next.isLeadSlot ? "Lead" : "Member"})`,
                      message: `Here is: Viewing dashboard as ${next.callsign}.`,
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

          {dbStatus === "loading" ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading mission telemetry from Supabase...
            </div>
          ) : !mission || !activeCharacter ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
              No active scenario or character loaded from Supabase.{" "}
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
