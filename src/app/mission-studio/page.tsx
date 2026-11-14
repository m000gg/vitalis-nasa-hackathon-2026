import Link from "next/link";

export default function MissionStudioPage() {
  return <main className="min-h-screen bg-slate-100 p-6 text-slate-900"><div className="mx-auto max-w-5xl border-2 border-slate-900 bg-white p-8 shadow-[8px_8px_0_#4502FF]"><p className="font-mono text-xs font-bold tracking-[0.2em] text-[#4502FF]">VITALIS+ / MISSION STUDIO</p><h1 className="mt-2 text-4xl font-bold">Persistent mission simulation</h1><p className="mt-4 max-w-3xl leading-relaxed text-slate-700">The first Mission Studio surface is the shared Spacecraft Map Engine: generate a deterministic ship, place crew, apply radiation events, compare routes, move the crew, preserve state and branch an alternative mission history.</p><Link href="/mission-studio/map" className="mt-6 inline-block border-2 border-slate-900 bg-[#FFDA14] px-5 py-3 font-bold shadow-[4px_4px_0_#111827]">OPEN SPACECRAFT MAP ENGINE</Link></div></main>;
}
