"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { UserRole } from "@/lib/domain";

export type ToastVariant = "info" | "success" | "warning" | "hazard";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  createdAt: string;
}

export interface ScreenAlarm {
  id: string;
  hazardNumber: number;
  hazardTitle: string;
  title: string;
  severity: "CRITICAL" | "WARNING";
  etaLabel: string;
  descriptionSlot: string;
  leadActions: string[];
  memberActions: string[];
  acknowledgedByLead: boolean;
  acknowledgedByMember: boolean;
  captainOverrideActive: boolean;
  buddyRescueActive: boolean;
  triggeredAt: string;
}

interface AlertContextValue {
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
  activeAlarm: ScreenAlarm | null;
  triggerAlarm: (
    payload: Omit<
      ScreenAlarm,
      "id" | "acknowledgedByLead" | "acknowledgedByMember" | "captainOverrideActive" | "buddyRescueActive" | "triggeredAt"
    >
  ) => void;
  acknowledgeAlarm: (role: UserRole) => void;
  activateCaptainOverride: () => void;
  toggleBuddyRescue: () => void;
  dismissAlarm: () => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<ScreenAlarm | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, "id" | "createdAt">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = {
        ...toast,
        id,
        createdAt: new Date().toLocaleTimeString(),
      };
      setToasts((prev) => [item, ...prev].slice(0, 5));
      setTimeout(() => {
        dismissToast(id);
      }, 6000);
    },
    [dismissToast]
  );

  const playBeep = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 250);
    } catch {
      // Audio playback blocked or unavailable in current browser policy
    }
  }, []);

  useEffect(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (activeAlarm && audioEnabled) {
      playBeep();
      audioIntervalRef.current = setInterval(playBeep, 2400);
    }
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    };
  }, [activeAlarm, audioEnabled, playBeep]);

  const triggerAlarm = useCallback(
    (
      payload: Omit<
        ScreenAlarm,
        "id" | "acknowledgedByLead" | "acknowledgedByMember" | "captainOverrideActive" | "buddyRescueActive" | "triggeredAt"
      >
    ) => {
      setActiveAlarm({
        ...payload,
        id: `alarm-${Date.now()}`,
        acknowledgedByLead: false,
        acknowledgedByMember: false,
        captainOverrideActive: false,
        buddyRescueActive: false,
        triggeredAt: new Date().toLocaleTimeString(),
      });
    },
    []
  );

  const acknowledgeAlarm = useCallback(
    (role: UserRole) => {
      setActiveAlarm((prev) => {
        if (!prev) return null;
        return role === "lead"
          ? { ...prev, acknowledgedByLead: true }
          : { ...prev, acknowledgedByMember: true };
      });
      pushToast({
        title: role === "lead" ? "Lead Acknowledgement Logged" : "Member Safety Confirmed",
        message:
          role === "lead"
            ? "Here is: Commander acknowledgement recorded for active alarm."
            : "Here is: Crew member shelter/safety confirmation recorded.",
        variant: "success",
      });
    },
    [pushToast]
  );

  const activateCaptainOverride = useCallback(() => {
    setActiveAlarm((prev) => (prev ? { ...prev, captainOverrideActive: true, acknowledgedByLead: true } : null));
    pushToast({
      title: "Captain Emergency Override Broadcast",
      message: "Here is: Local shelter route lights & crew override notification dispatched offline.",
      variant: "hazard",
    });
  }, [pushToast]);

  const toggleBuddyRescue = useCallback(() => {
    setActiveAlarm((prev) => (prev ? { ...prev, buddyRescueActive: !prev.buddyRescueActive } : null));
  }, []);

  const dismissAlarm = useCallback(() => {
    setActiveAlarm(null);
    pushToast({
      title: "Full-Screen Alarm Cleared",
      message: "Here is: Event remains logged in Alerts & Audit History.",
      variant: "info",
    });
  }, [pushToast]);

  return (
    <AlertContext.Provider
      value={{
        toasts,
        pushToast,
        dismissToast,
        activeAlarm,
        triggerAlarm,
        acknowledgeAlarm,
        activateCaptainOverride,
        toggleBuddyRescue,
        dismissAlarm,
        audioEnabled,
        setAudioEnabled,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used inside AlertProvider");
  return ctx;
}
