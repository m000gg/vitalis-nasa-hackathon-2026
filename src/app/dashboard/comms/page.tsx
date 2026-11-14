"use client";

import React, { useState } from "react";
import { Package, Radio, RefreshCw, Send, Wifi, WifiOff } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useMission } from "@/context/MissionContext";
import { useAlerts } from "@/context/AlertContext";
import { MEDICAL_INVENTORY_SLOTS } from "@/lib/domain";

export default function CommsAndInventoryPage() {
  const { linkOnline, setLinkOnline, dtnQueue, queueDtnReport, syncDtnQueue, mission } = useMission();
  const { pushToast } = useAlerts();

  const [reportTitle, setReportTitle] = useState("");
  const [hazardSlug, setHazardSlug] = useState("distance");
  const [payloadSummary, setPayloadSummary] = useState("");
  const [ephemerisSlot, setEphemerisSlot] = useState("");

  const handleQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = reportTitle.trim() || "Add your info: Medical / Incident Report Title here";
    const summary = payloadSummary.trim() || "Add your info: Symptoms, baseline delta & local actions here";
    await queueDtnReport(title, hazardSlug, summary);
    setReportTitle("");
    setPayloadSummary("");
    pushToast({
      title: linkOnline ? "Report Sent & Acknowledged" : "Report Queued Locally (PENDING)",
      message: linkOnline
        ? "Here is: Earth link online — receipt acknowledgment recorded."
        : "Here is: Saved in Store-and-Forward DTN queue until link restores.",
      variant: linkOnline ? "success" : "warning",
    });
  };

  const handleSync = async () => {
    if (!linkOnline) {
      pushToast({
        title: "Cannot Sync While Earth Link Is Down",
        message: "Here is: Toggle Earth Link to ONLINE to simulate DSN transmission.",
        variant: "warning",
      });
      return;
    }
    await syncDtnQueue();
    pushToast({
      title: "DTN Queue Synced",
      message: "Here is: Pending outbound reports transmitted and acknowledged.",
      variant: "success",
    });
  };

  return (
    <DashboardShell>
      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">
              Deep-Space DTN Store-and-Forward &amp; Medical Inventory
            </h1>
            <p className="text-xs text-slate-400">
              Here is: Hazard 3 (Distance from Earth) communication delay simulator, offline medical report queue, and
              resource-constrained onboard kit slots.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLinkOnline(!linkOnline)}
            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold ${
              linkOnline
                ? "border-emerald-600/60 bg-emerald-950/50 text-emerald-300"
                : "border-amber-600/60 bg-amber-950/50 text-amber-300"
            }`}
          >
            {linkOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {linkOnline ? "Earth Link: ONLINE" : "Earth Link: BLACKOUT"}
          </button>
        </div>

        <div className="grid gap-3 pt-2 md:grid-cols-2">
          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="font-semibold text-sky-300">Active Mission Delay Context</p>
            <p className="mt-1 text-slate-300">{mission.commsDelayLabel}</p>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="font-semibold text-sky-300">JPL Horizons Ephemeris Slot</p>
            <input
              type="text"
              value={ephemerisSlot}
              onChange={(e) => setEphemerisSlot(e.target.value)}
              placeholder="Add your info: Selected date, Earth–Mars distance (km) & light-time here"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Queue Medical Report */}
        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-2 text-sky-300">
            <Radio className="h-4 w-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Create Store-and-Forward Medical Report</h2>
          </div>
          <form onSubmit={handleQueue} className="space-y-3 text-xs">
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Add your info: Report title (e.g., Mission Day 126 Dizziness Incident) here"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
            />
            <select
              value={hazardSlug}
              onChange={(e) => setHazardSlug(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="radiation">Hazard 1 — Space Radiation</option>
              <option value="isolation">Hazard 2 — Isolation &amp; Confinement</option>
              <option value="distance">Hazard 3 — Distance from Earth</option>
              <option value="gravity">Hazard 4 — Gravity Fields</option>
              <option value="environment">Hazard 5 — Hostile/Closed Environments</option>
            </select>
            <textarea
              rows={3}
              value={payloadSummary}
              onChange={(e) => setPayloadSummary(e.target.value)}
              placeholder="Add your info: Structured measurements, baseline delta & local stabilization checklist used here"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded bg-sky-600 px-3.5 py-2 font-semibold text-white hover:bg-sky-500"
              >
                <Send className="h-3.5 w-3.5" />
                Queue Report (POST /api/communications/queue)
              </button>
              <button
                type="button"
                onClick={handleSync}
                className="inline-flex items-center gap-1.5 rounded border border-emerald-600/60 bg-emerald-950/40 px-3.5 py-2 font-semibold text-emerald-200 hover:bg-emerald-900/50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Pending Queue
              </button>
            </div>
          </form>
        </section>

        {/* Outbound Queue List */}
        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Outbound DTN Queue ({dtnQueue.length})
          </h2>
          <div className="space-y-2.5 text-xs">
            {dtnQueue.map((item) => (
              <div key={item.id} className="space-y-1 rounded border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{item.reportTitle}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      item.status === "ACKNOWLEDGED"
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-amber-950 text-amber-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  From: {item.senderCallsign} • Hazard: {item.hazardSlug} • Created: {item.createdAt}
                </p>
                <p className="text-slate-300">{item.payloadSummary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Onboard Medical Inventory & Expiry Slots */}
      <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Package className="h-4 w-4" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Onboard Medical Inventory &amp; Expiry Slots
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Here is: 1–2 actionable solutions are constrained to available, non-expired supplies tracked here (no
          autonomous prescribing).
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {MEDICAL_INVENTORY_SLOTS.map((slot) => (
            <div key={slot.id} className="space-y-1.5 rounded border border-slate-800 bg-slate-950 p-3.5 text-xs">
              <span className="font-mono text-[10px] text-sky-400">{slot.hazardRef}</span>
              <p className="font-semibold text-white">{slot.itemSlot}</p>
              <p className="text-slate-400">{slot.quantitySlot}</p>
              <p className="text-slate-500">{slot.expirySlot}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
