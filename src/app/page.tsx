"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bell, Layers, ShieldCheck, Sparkles, Users } from "lucide-react";
import { HAZARDS } from "@/lib/hazards";
import { useAlerts } from "@/context/AlertContext";

export default function LandingPage() {
  const { pushToast } = useAlerts();

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100">
      {/* Minimal Barebones Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0a0c10]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold tracking-widest text-sky-400">VITALIS+</span>
            <span className="hidden rounded border border-slate-800 px-2 py-0.5 text-[11px] text-slate-400 sm:inline-block">
              Add your info: Hackathon / Challenge subtitle here
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-xs text-slate-400 md:flex">
            <a href="#why" className="hover:text-white">
              Why This Matters
            </a>
            <a href="#what" className="hover:text-white">
              What Is It
            </a>
            <a href="#where" className="hover:text-white">
              Use Cases
            </a>
            <a href="#who" className="hover:text-white">
              Who Is It For
            </a>
            <a href="#hazards" className="hover:text-white">
              5 Hazards
            </a>
          </nav>
          <Link
            href="/missions"
            className="shiny-cta inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold text-slate-950"
          >
            Try our project
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-14">
        {/* 1. HERO SECTION (Modeled on SpaceGenes+ layout & logic, barebones slots) */}
        <section className="grid gap-8 border-b border-slate-800/80 pb-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Here is: Crew & Commander Ready-to-Act Space Health System (docs/OUTLINE.md)</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Autonomous Space Health &amp; Hazard Decision Support
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-300">
              Here is: Unified monitoring and ready-to-act guidance built for long-duration missions where Earth
              communication delays reach up to 44 minutes round-trip and no dedicated physician is on board.
            </p>

            <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-400">
              <strong className="text-slate-200">Hero Copy Slot:</strong> Add your info: One-sentence mission hook /
              team pitch statement here.
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/missions"
                className="shiny-cta inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-slate-950"
              >
                Try our project
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Notification Mechanism Ready",
                    message: "Here is: Live Toast popup preview. Enter a mission to test full-screen alarms too.",
                    variant: "info",
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-medium text-slate-200 hover:border-slate-500"
              >
                <Bell className="h-4 w-4 text-sky-400" />
                Preview Toast Popup
              </button>
            </div>
          </div>

          {/* Right-side Structural Summary Box (Zero fake charts/formulas) */}
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">
              System Flow Overview
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="font-semibold text-white">1. Select Mission &amp; Crew Composition</p>
                <p className="mt-1 text-slate-400">
                  Here is: Choose from example missions (Mars Transit, CHAPEA Surface, Artemis EVA, ISS Closed Habitat).
                </p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="font-semibold text-white">2. Choose Role: Lead or Member</p>
                <p className="mt-1 text-slate-400">
                  Here is: Deep role separation — Commander Readiness Matrix vs. Individual Crew Personal View &amp;
                  Private Logs.
                </p>
              </div>
              <div className="rounded border border-slate-800 bg-slate-950 p-3">
                <p className="font-semibold text-white">3. Act Across All 5 NASA HRP Hazards</p>
                <p className="mt-1 text-slate-400">
                  Here is: Dedicated pages, dual-horizon toasts, full-screen alarms, and Buddy-Rescue workflows.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PROBLEM STATEMENT ("Why This Matters for Human Spaceflight") */}
        <section id="why" className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">01 / Problem Statement</p>
            <h2 className="text-2xl font-bold text-white">Why This Matters for Human Spaceflight</h2>
            <p className="text-sm text-slate-400">
              Add your info: Context paragraph explaining why isolated vital charts fail deep-space crews here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Communication Delays &amp; Autonomy</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Up to 44-minute round-trip Earth–Mars signal delay means real-time flight-surgeon guidance is
                unavailable during acute emergencies.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Specific delay scenario / citation here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Alert &amp; Chart Fatigue</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Fatigued astronauts cannot parse raw multi-channel vitals; they need Estimated Time of Action
                and 1–2 constrained solutions.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Human factors / workload example here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Combined &amp; Shared Habitat Stressors</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Cabin CO₂, NC-40 noise, radiation storms, and circadian drift hit the entire crew together
                rather than as isolated illnesses.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Cross-hazard correlation note here
              </p>
            </div>
          </div>
        </section>

        {/* 3. ABOUT ("What Is Vitalis+?") */}
        <section id="what" className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">02 / About the System</p>
            <h2 className="text-2xl font-bold text-white">What Is Vitalis+?</h2>
            <p className="max-w-3xl text-sm text-slate-300">
              Here is: A barebones mission-ready platform pairing NASA research standards with normalized telemetry
              ingestion and role-based Lead / Member dashboards.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <Layers className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Normalized Input Abstraction</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Accepts wearable sensors, habitat life-support telemetry, and 60-second manual self-checks
                calibrated to mission phase.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Supported device / sensor stream list here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Two-Layer Intelligence Model</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Separates deterministic NASA-grounded rules &amp; countdowns from plain-language briefings and
                1–2 inventory-aware steps.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Deterministic rule / model provenance details here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <Users className="h-5 w-5 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Team-Wide Buffs &amp; Debuffs</h3>
              <p className="text-xs leading-relaxed text-slate-300">
                Here is: Surfaces shared habitat stressors (debuffs) and protective countermeasures (buffs) to the Lead
                without leaking private crew journals.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Privacy firewall &amp; buff/debuff logic summary here
              </p>
            </div>
          </div>
        </section>

        {/* 4. USE CASES ("Where Can You Use Vitalis+?") */}
        <section id="where" className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">03 / Applications</p>
            <h2 className="text-2xl font-bold text-white">Where Can You Use Vitalis+?</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Deep-Space Transit &amp; Surface Ops</h3>
              <p className="text-xs text-slate-300">
                Here is: Offline-first local monitoring, DTN store-and-forward medical queues, and solar-storm shelter
                coordination.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Transit / Mars surface mission use case here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Pre-EVA Readiness &amp; Habitat Safety</h3>
              <p className="text-xs text-slate-300">
                Here is: On-board EVA Go/No-Go readiness gates (MR087L/MEDB 6.1–6.3) and cabin CO₂ / acoustic alerts.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: EVA or habitat operational workflow here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <h3 className="text-sm font-semibold text-white">Earth-Analog Isolated Teams</h3>
              <p className="text-xs text-slate-300">
                Here is: Direct transferability to Antarctic winter-over stations, submarines, offshore rigs, and remote
                expeditions without on-site physicians.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Terrestrial analog impact story here
              </p>
            </div>
          </div>
        </section>

        {/* 5. TARGET AUDIENCE ("Who Is It For?") */}
        <section id="who" className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-wider text-sky-400">04 / Roles</p>
            <h2 className="text-2xl font-bold text-white">Who Is It For?</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-lg border border-sky-900/60 bg-slate-900/40 p-5">
              <span className="inline-block rounded bg-sky-950 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                ROLE: LEAD
              </span>
              <h3 className="text-sm font-semibold text-white">Crew Captain / Mission Commander</h3>
              <p className="text-xs text-slate-300">
                Here is: Crew-wide readiness matrix, shared buffs/debuffs, shelter tracker, task rotation, and
                audit-logged emergency overrides.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Lead responsibilities &amp; privacy limits here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-emerald-900/60 bg-slate-900/40 p-5">
              <span className="inline-block rounded bg-emerald-950 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                ROLE: MEMBER
              </span>
              <h3 className="text-sm font-semibold text-white">Individual Crew Astronaut</h3>
              <p className="text-xs text-slate-300">
                Here is: Personal baselines, 60-second check-in, private mood/journal log, EVA pre-test checklist, 1–2
                solutions, and Buddy-Rescue mode.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Crew member workflow summary here
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                SUPPORT
              </span>
              <h3 className="text-sm font-semibold text-white">Flight Surgeons &amp; Mission Planners</h3>
              <p className="text-xs text-slate-300">
                Here is: Store-and-forward DTN medical reports, transparent NASA dataset provenance, and post-incident
                audit exports.
              </p>
              <p className="rounded border border-dashed border-slate-700 p-2 text-[11px] text-slate-400">
                Add your info: Ground support &amp; dataset citation notes here
              </p>
            </div>
          </div>
        </section>

        {/* 6. ALL 5 HAZARDS OVERVIEW */}
        <section id="hazards" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-wider text-sky-400">05 / NASA HRP Taxonomy</p>
              <h2 className="text-2xl font-bold text-white">All 5 Spaceflight Hazards Integrated</h2>
            </div>
            <Link
              href="/missions"
              className="shiny-cta inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold text-slate-950"
            >
              Try our project
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {HAZARDS.map((h) => (
              <div key={h.slug} className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <p className="font-mono text-[11px] text-sky-400">HAZARD {h.number}</p>
                <h3 className="text-sm font-semibold text-white">{h.title}</h3>
                <p className="text-[11px] leading-relaxed text-slate-400">{h.overviewSlot}</p>
                <p className="text-[10px] text-slate-500">Source: {h.sourceDoc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-slate-500">
          <p>
            Vitalis+ Barebones Fullstack Skeleton — Software-only hackathon proof of concept; not a clinically
            validated medical device. NASA does not endorse this project.
          </p>
          <p>Add your info: Team name &amp; repository link here</p>
        </div>
      </footer>
    </div>
  );
}
