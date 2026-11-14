"use client";

import Link from "next/link";
import { RadiationHazardScreen } from "@/components/hazards/01-radiation";
import { radiationHazard } from "@/lib/hazards/01-radiation";
import type { CrewSlot, MissionProfile } from "@/lib/domain";

const commander: CrewSlot = {
  id: "radiation-demo-commander",
  callsign: "Demo Commander",
  assignedRoleTitle: "Mission Lead / Demo Operator",
  isLeadSlot: true,
  readinessState: "GO",
  evaGateState: "GO",
  shelterConfirmed: false,
  publicStatusSummary: "Standalone radiation demonstration",
  privateMemberNotesSlot: "",
  metrics: {
    etaSlot: "Demo Mode",
    doseSlot: "No live crew dose",
    sleepSlot: "Demo Mode",
    fatigueSlot: "Demo Mode",
    exerciseAdherenceSlot: "Demo Mode",
    blockers: [],
    actions: [],
  },
};

const mission: MissionProfile = {
  id: "radiation-demo-local",
  name: "Standalone Radiation Demo",
  phase: "DEMO_MODE",
  durationContext: "Deterministic local simulation",
  commsDelayLabel: "No external mission link required",
  activeHazardsHighlight: ["Space Radiation"],
  scenarioDescriptionSlot: "Interactive scenarios A–S without live astronaut telemetry.",
  environment: {
    commsDelaySlot: "Offline demo",
    linkOnlineDefault: false,
    radiationStatusSlot: "Demo Mode",
    atmosphereStatusSlot: "Not connected",
    acousticsStatusSlot: "Not connected",
    isolationStatusSlot: "Not connected",
    gravityStatusSlot: "Not connected",
  },
  crew: [commander],
};

export default function RadiationDemoPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-2 border-slate-900 bg-[#FFDA14] p-4 shadow-[5px_5px_0_#111827]">
          <div>
            <p className="font-mono text-xs font-bold tracking-wider">VITALIS+ / STANDALONE DEMO</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Space Radiation Safety</h1>
            <p className="mt-1 text-sm text-slate-700">No Supabase, NASA API or physical sensor is required for the Scenario Workbench and Fixture Verification Lab.</p>
          </div>
          <Link href="/" className="border-2 border-slate-900 bg-white px-4 py-2 text-sm font-bold hover:bg-[#4502FF] hover:text-white">BACK TO APP</Link>
        </header>
        <RadiationHazardScreen
          hazard={radiationHazard}
          mission={mission}
          activeCharacter={commander}
          role="lead"
          snapshot={{
            hazardSlug: "radiation",
            actorStatusLabel: "Standalone demo operator",
            actorInputOverrides: {},
            status: "NOMINAL",
            scenarioStatusSlot: "Standalone Demo Mode",
            immediateHorizon: "Run a documented scenario below to calculate a deterministic response.",
            prolongedHorizon: "No live mission forecast is calculated on this standalone page.",
            eta: "Scenario-specific timing appears after each run.",
            solutions: ["Select a scenario and adjust inputs.", "Run it and complete the response protocol."],
            charts: [],
          }}
          hazardRecords={[]}
          hazardSamples={[]}
          scenarioHazardRecords={[]}
          scenarioHazardSamples={[]}
          linkOnline={false}
          reentryMode={false}
        />
      </div>
    </main>
  );
}
