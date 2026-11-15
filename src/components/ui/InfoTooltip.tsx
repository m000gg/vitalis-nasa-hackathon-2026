"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";

export function InfoTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const trigger = buttonRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const width = Math.min(320, window.innerWidth - 24);
      const estimatedHeight = tooltipRef.current?.offsetHeight ?? 150;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, trigger.left));
      const below = trigger.bottom + 8;
      const top = below + estimatedHeight <= window.innerHeight - 12
        ? below
        : Math.max(12, trigger.top - estimatedHeight - 8);
      setPosition({ left, top });
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !tooltipRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <span className="inline-flex">
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-describedby={open ? tooltipId : undefined}
      onClick={() => setOpen((current) => !current)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(event) => {
        if (!tooltipRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onFocus={() => setOpen(true)}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#4502FF] hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDA14]"
    >
      <CircleHelp className="h-4 w-4" aria-hidden="true" />
    </button>
    {mounted && open && createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        onMouseLeave={() => setOpen(false)}
        className="fixed z-[100] w-[min(320px,calc(100vw-24px))] rounded-lg border border-slate-300 bg-white p-3 text-left text-sm font-normal normal-case leading-relaxed text-slate-700 shadow-xl"
        style={{ left: position.left, top: position.top }}
      >
        {children}
      </div>,
      document.body,
    )}
  </span>;
}
