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
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none ${
        isSelected
          ? "border-sky-600 bg-sky-600 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-info-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Info className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 id="research-info-title" className="text-sm font-bold text-slate-900">
              {entry.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close research details"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">{entry.explanation}</p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              NASA Thresholds &amp; Dataset Benchmark
            </p>
            <p className="mt-1">{entry.benchmark}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              Verified Research Papers &amp; Datasets
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {entry.links.map((link) => (
                <li key={link.url + link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs font-medium text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
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
