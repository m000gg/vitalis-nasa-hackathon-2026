"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bell, Layers, ShieldCheck, Users } from "lucide-react";
import { HAZARDS } from "@/lib/hazards";
import { useAlerts } from "@/context/AlertContext";

export default function LandingPage() {
  const { pushToast } = useAlerts();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Simple Top Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-base font-bold tracking-tight text-slate-900">Vitalis+</span>
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="#why" className="hover:text-slate-900">
              Why It Matters
            </a>
            <a href="#what" className="hover:text-slate-900">
              What Is It
            </a>
            <a href="#where" className="hover:text-slate-900">
              Use Cases
            </a>
            <a href="#who" className="hover:text-slate-900">
              Who Is It For
            </a>
          </nav>
          <Link
            href="/missions"
            className="shiny-cta inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
          >
            Try our project
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-24 px-6 py-16">
        {/* 1. HERO SECTION */}
        <section className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="inline-block rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-600">
            Add your info: Project tagline / NASA Space Apps 2026 badge here
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Ready-to-Act Space Health System for Crew &amp; Commander
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
            Here is: Unified health monitoring and decision support for long-duration missions with up to 44-minute
            Earth communication delays and no dedicated onboard physician.
          </p>

          <p className="text-xs text-slate-500">
            Add your info: Short one-line mission hook here.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/missions"
              className="shiny-cta inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white"
            >
              Try our project
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() =>
                pushToast({
                  title: "Toast Preview",
                  message: "Here is: Toast notification preview. Click Try our project to enter the app.",
                  variant: "info",
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Bell className="h-4 w-4 text-sky-600" />
              Preview Toast
            </button>
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-900">1. Choose Mission</p>
              <p className="mt-1 text-xs text-slate-500">Select mission &amp; crew composition.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-900">2. Choose Role</p>
              <p className="mt-1 text-xs text-slate-500">Enter as Lead or Crew Member.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-900">3. Open Workspace</p>
              <p className="mt-1 text-xs text-slate-500">5 hazards, toasts &amp; full-screen alarms.</p>
            </div>
          </div>
        </section>

        {/* 2. PROBLEM STATEMENT ("Why This Matters") */}
        <section id="why" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Why This Matters for Human Spaceflight</h2>
            <p className="text-sm text-slate-500">Add your info: Problem statement intro here.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Earth Communication Delays</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Here is: Up to 44-minute round-trip delays prevent real-time Flight Surgeon guidance during emergencies.
              </p>
              <p className="mt-3 text-xs text-slate-400">Add your info: Delay scenario note here</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Fatigued Crew Overload</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Here is: Raw vital charts overwhelm tired crew; Vitalis+ surfaces Estimated Time of Action and 1–2 steps.
              </p>
              <p className="mt-3 text-xs text-slate-400">Add your info: Human factors note here</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Shared Habitat Stressors</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Here is: Cabin CO₂, NC-40 noise, radiation storms, and circadian drift affect the whole crew together.
              </p>
              <p className="mt-3 text-xs text-slate-400">Add your info: Cross-crew example here</p>
            </div>
          </div>
        </section>

        {/* 3. ABOUT ("What Is It?") */}
        <section id="what" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">What Is Vitalis+?</h2>
            <p className="text-sm text-slate-600">
              Here is: A mission-ready platform pairing NASA research standards with Lead and Member dashboards.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Layers className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">Normalized Inputs</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Wearables, habitat telemetry, and 60-second manual self-checks calibrated to mission phase.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">Deterministic + Plain Guidance</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Separates auditable countdowns from concise 1–2 inventory-aware next steps.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Users className="h-5 w-5 text-sky-600" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">Team Buffs &amp; Debuffs</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Shared readiness visibility for the Lead while keeping personal journals strictly private.
              </p>
            </div>
          </div>
        </section>

        {/* 4. USE CASES ("Where Can You Use It?") */}
        <section id="where" className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Where Can You Use Vitalis+?</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Mars Transit &amp; Surface</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Offline-first monitoring, DTN medical queues, and solar storm shelter routing.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">EVA Readiness &amp; Habitat Ops</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Onboard EVA Go/No-Go gates and cabin CO₂ / acoustic safety alerts.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">Earth-Analog Teams</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Transferable to Antarctic stations, submarines, offshore rigs, and remote field teams.
              </p>
            </div>
          </div>
        </section>

        {/* 5. TARGET AUDIENCE ("Who Is It For?") */}
        <section id="who" className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Who Is It For?</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-xs font-semibold text-sky-700">ROLE: LEAD</span>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">Crew Captain / Commander</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Crew readiness matrix, shared buffs/debuffs, shelter tracker, and audit-logged overrides.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-xs font-semibold text-emerald-700">ROLE: MEMBER</span>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">Individual Crew Astronaut</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Personal baselines, 60s check-in, private journal, EVA checklist, and Buddy-Rescue mode.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-xs font-semibold text-slate-500">SUPPORT</span>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">Mission Planners &amp; Surgeons</h3>
              <p className="mt-2 text-sm text-slate-600">
                Here is: Store-and-forward DTN reports, NASA dataset provenance, and incident audit exports.
              </p>
            </div>
          </div>
        </section>

        {/* 6. ALL 5 HAZARDS SUMMARY */}
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Covers All 5 NASA HRP Hazards</h2>
              <p className="text-sm text-slate-500">Add your info: Additional overview note here.</p>
            </div>
            <Link
              href="/missions"
              className="shiny-cta inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white"
            >
              Try our project
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {HAZARDS.map((h) => (
              <div key={h.slug} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-sky-700">Hazard {h.number}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{h.title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-slate-500">
          <p>
            Vitalis+ — Software-only hackathon proof of concept; not a clinically validated medical device. NASA does
            not endorse this project.
          </p>
          <p>Add your info: Team credits here</p>
        </div>
      </footer>
    </div>
  );
}
