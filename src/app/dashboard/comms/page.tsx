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
    const summary = payloadSummary.trim() || "Add your info: Symptoms & local stabilization steps here";
    await queueDtnReport(title, hazardSlug, summary);
    setReportTitle("");
    setPayloadSummary("");
    pushToast({
      title: linkOnline ? "Report Sent & Acknowledged" : "Report Queued Locally",
      message: linkOnline
        ? "Here is: Earth link online — receipt recorded."
        : "Here is: Stored in local DTN queue until link restores.",
      variant: linkOnline ? "success" : "warning",
    });
  };

  const handleSync = async () => {
    if (!linkOnline) {
      pushToast({
        title: "Link Offline",
        message: "Here is: Switch Earth Link to Online to sync pending reports.",
        variant: "warning",
      });
      return;
    }
    await syncDtnQueue();
    pushToast({
      title: "DTN Queue Synced",
      message: "Here is: Pending reports transmitted and acknowledged.",
      variant: "success",
    });
  };

  return (
    <DashboardShell>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">DTN Store-and-Forward &amp; Medical Kit</h1>
            <p className="mt-1 text-sm text-slate-600">
              Here is: Hazard 3 communication delay context, offline medical report queue, and onboard supply slots.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLinkOnline(!linkOnline)}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              linkOnline ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
            }`}
          >
            {linkOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {linkOnline ? "Earth Link: Online" : "Earth Link: Blackout"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4 text-xs">
            <p className="font-semibold text-slate-900">Mission Comms Delay</p>
            <p className="mt-1 text-slate-600">{mission.commsDelayLabel}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-xs">
            <p className="font-semibold text-slate-900">JPL Horizons Ephemeris Slot</p>
            <input
              type="text"
              value={ephemerisSlot}
              onChange={(e) => setEphemerisSlot(e.target.value)}
              placeholder="Add your info: Date, Earth–Mars distance (km) & light-time here"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sky-700">
            <Radio className="h-4 w-4" />
            <h2 className="text-sm font-bold">Create Store-and-Forward Report</h2>
          </div>
          <form onSubmit={handleQueue} className="space-y-3 text-xs">
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Add your info: Report title here"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400"
            />
            <select
              value={hazardSlug}
              onChange={(e) => setHazardSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800"
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
              placeholder="Add your info: Structured measurements & checklist notes here"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
              >
                <Send className="h-3.5 w-3.5" />
                Queue Report
              </button>
              <button
                type="button"
                onClick={handleSync}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Queue
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">Outbound Queue ({dtnQueue.length})</h2>
          <div className="space-y-2.5 text-xs">
            {dtnQueue.map((item) => (
              <div key={item.id} className="space-y-1 rounded-xl bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{item.reportTitle}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      item.status === "ACKNOWLEDGED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-slate-500">
                  {item.senderCallsign} · {item.hazardSlug} · {item.createdAt}
                </p>
                <p className="text-slate-600">{item.payloadSummary}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-emerald-700">
          <Package className="h-4 w-4" />
          <h2 className="text-sm font-bold">Onboard Medical Inventory Slots</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {MEDICAL_INVENTORY_SLOTS.map((slot) => (
            <div key={slot.id} className="space-y-1 rounded-xl bg-slate-50 p-4 text-xs">
              <p className="font-medium text-sky-700">{slot.hazardRef}</p>
              <p className="font-semibold text-slate-900">{slot.itemSlot}</p>
              <p className="text-slate-600">{slot.quantitySlot}</p>
              <p className="text-slate-400">{slot.expirySlot}</p>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
