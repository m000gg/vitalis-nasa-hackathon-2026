import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";

export default function MissionStudioPage() {
  return <DashboardShell allowWithoutMission><div className="rounded-2xl border border-slate-200 bg-white p-8"><p className="font-mono text-xs font-bold tracking-[0.2em] text-[#4502FF]">VITALIS+ / MISSION STUDIO</p><h1 className="mt-2 text-3xl font-bold">Persistent mission simulation</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Generate a spacecraft, inspect hazard overlays, compare routes and preserve alternative mission branches.</p><Link href="/mission-studio/map" className="mt-6 inline-block rounded-lg bg-[#4502FF] px-5 py-3 font-bold text-white">OPEN SPACECRAFT MAP ENGINE</Link></div></DashboardShell>;
}
