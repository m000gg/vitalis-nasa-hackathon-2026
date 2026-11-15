"use client";

import React, { useEffect, useId } from "react";
import { ExternalLink, Info, X } from "lucide-react";

export interface ResearchReferenceLink {
  label: string;
  url: string;
}

export interface ResearchInfoEntry {
  id: string;
  title: string;
  explanation: string;
  benchmark: string;
  links: readonly ResearchReferenceLink[];
}

export type ActiveResearchInfoState = { triggerId: string; entry: ResearchInfoEntry } | null;

/**
 * Accessible (i) circle trigger button that opens ResearchModal cleanly above tables and cards.
 */
export function InfoCircle({
  entry,
  activeInfo,
  onSelectInfo,
}: {
  entry: ResearchInfoEntry;
  activeInfo: ActiveResearchInfoState;
  onSelectInfo: (next: ActiveResearchInfoState) => void;
}) {
  const triggerId = useId();
  const isSelected = activeInfo?.triggerId === triggerId;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectInfo(isSelected ? null : { triggerId, entry });
      }}
      aria-label={`Explain ${entry.title} and view NASA sources`}
      aria-expanded={isSelected}
      title={`NASA source & explanation: ${entry.title}`}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
        isSelected
          ? "border-[#3B82F6] bg-[#3B82F6] text-white"
          : "border-slate-700 bg-[#0B111F] text-slate-300 hover:border-[#3B82F6]/70 hover:bg-[#3B82F6]/15 hover:text-blue-300"
      }`}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

/**
 * Modal dialog displaying concise explanation, NASA benchmarks, and verified source links.
 */
export function ResearchModal({
  entry,
  onClose,
}: {
  entry: ResearchInfoEntry | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!entry) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-info-title"
        className="hud-panel w-full max-w-lg rounded-lg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#3B82F6]/40 bg-[#3B82F6]/15 text-[#3B82F6]">
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 id="research-info-title" className="font-display text-sm text-white">
              {entry.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close research details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">{entry.explanation}</p>

          <div className="rounded-md border border-slate-800 bg-[#060A14] p-3 text-xs leading-relaxed text-slate-200">
            <p className="label-caps text-slate-400">NASA Thresholds &amp; Benchmark</p>
            <p className="mt-1">{entry.benchmark}</p>
          </div>

          <div>
            <p className="label-caps text-slate-400">Verified Sources</p>
            <ul className="mt-1.5 space-y-1.5">
              {entry.links.map((link) => (
                <li key={link.url + link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-md border border-[#3B82F6]/30 bg-[#3B82F6]/10 px-3 py-2 text-xs font-medium text-blue-300 transition-colors hover:border-[#3B82F6]/70 hover:bg-[#3B82F6]/20 hover:text-white"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
