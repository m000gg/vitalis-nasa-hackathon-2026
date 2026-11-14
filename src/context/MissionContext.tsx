"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuditLogEntry, DtnMessage, MISSIONS, MissionProfile, UserRole } from "@/lib/domain";

export interface PrivateCheckIn {
  id: string;
  timestamp: string;
  fatigueScore: string;
  sleepHoursInput: string;
  privateJournalNote: string;
}

interface MissionContextValue {
  mission: MissionProfile;
  setMissionId: (id: string) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  linkOnline: boolean;
  setLinkOnline: (online: boolean) => void;
  reentryMode: boolean;
  setReentryMode: (enabled: boolean) => void;
  dtnQueue: DtnMessage[];
  queueDtnReport: (reportTitle: string, hazardSlug: string, payloadSummary: string) => Promise<void>;
  syncDtnQueue: () => Promise<void>;
  auditLog: AuditLogEntry[];
  addAuditEntry: (targetCallsign: string, reason: string, action: string) => void;
  shelterConfirmations: Record<string, boolean>;
  toggleCrewShelter: (crewId: string) => void;
  privateCheckIns: PrivateCheckIn[];
  addPrivateCheckIn: (entry: Omit<PrivateCheckIn, "id" | "timestamp">) => void;
}

const MissionContext = createContext<MissionContextValue | null>(null);

const STORAGE_KEY = "vitalis_session_v1";

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [missionId, setMissionIdState] = useState<string>(MISSIONS[0].id);
  const [role, setRoleState] = useState<UserRole>("lead");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(MISSIONS[0].crew[1].id);
  const [linkOnline, setLinkOnline] = useState<boolean>(false);
  const [reentryMode, setReentryMode] = useState<boolean>(false);
  const [dtnQueue, setDtnQueue] = useState<DtnMessage[]>([
    {
      id: "dtn-init-1",
      reportTitle: "Here is: Baseline Crew Incident Report (Mission Day 126)",
      senderCallsign: "Member Slot 1 — Crew Medical Officer",
      hazardSlug: "distance",
      status: "PENDING",
      createdAt: "Initial Queue Slot",
      retryCount: 1,
      payloadSummary: "Add your info: Structured symptom & vital baseline delta summary here",
    },
  ]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [shelterConfirmations, setShelterConfirmations] = useState<Record<string, boolean>>({});
  const [privateCheckIns, setPrivateCheckIns] = useState<PrivateCheckIn[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.missionId && MISSIONS.some((m) => m.id === parsed.missionId)) {
          setMissionIdState(parsed.missionId);
        }
        if (parsed.role === "lead" || parsed.role === "member") {
          setRoleState(parsed.role);
        }
        if (parsed.selectedMemberId) {
          setSelectedMemberId(parsed.selectedMemberId);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const persistSession = (nextMissionId: string, nextRole: UserRole, nextMemberId: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ missionId: nextMissionId, role: nextRole, selectedMemberId: nextMemberId })
      );
    } catch {
      // Ignore storage write errors
    }
  };

  const mission = MISSIONS.find((m) => m.id === missionId) ?? MISSIONS[0];

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    mission.crew.forEach((c) => {
      initial[c.id] = c.shelterConfirmed;
    });
    setShelterConfirmations(initial);
  }, [mission]);

  const setMissionId = useCallback(
    (id: string) => {
      const found = MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
      const defaultMember = found.crew.find((c) => !c.isLeadSlot)?.id ?? found.crew[0].id;
      setMissionIdState(found.id);
      setSelectedMemberId(defaultMember);
      persistSession(found.id, role, defaultMember);
    },
    [role]
  );

  const setRole = useCallback(
    (nextRole: UserRole) => {
      setRoleState(nextRole);
      persistSession(missionId, nextRole, selectedMemberId);
    },
    [missionId, selectedMemberId]
  );

  const queueDtnReport = useCallback(
    async (reportTitle: string, hazardSlug: string, payloadSummary: string) => {
      const activeMember =
        role === "lead"
          ? mission.crew.find((c) => c.isLeadSlot)?.callsign ?? "Lead"
          : mission.crew.find((c) => c.id === selectedMemberId)?.callsign ?? "Member";

      try {
        const res = await fetch("/api/communications/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportTitle,
            senderCallsign: activeMember,
            hazardSlug,
            payloadSummary,
            linkOnline,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setDtnQueue((prev) => [data.message, ...prev]);
          return;
        }
      } catch {
        // Fallback to local queue when offline
      }

      const localMsg: DtnMessage = {
        id: `dtn-${Date.now()}`,
        reportTitle,
        senderCallsign: activeMember,
        hazardSlug,
        status: linkOnline ? "ACKNOWLEDGED" : "PENDING",
        createdAt: new Date().toLocaleTimeString(),
        sentAt: linkOnline ? new Date().toLocaleTimeString() : undefined,
        acknowledgedAt: linkOnline ? new Date().toLocaleTimeString() : undefined,
        retryCount: linkOnline ? 0 : 1,
        payloadSummary,
      };
      setDtnQueue((prev) => [localMsg, ...prev]);
    },
    [linkOnline, mission.crew, role, selectedMemberId]
  );

  const syncDtnQueue = useCallback(async () => {
    try {
      await fetch("/api/communications/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: dtnQueue.filter((m) => m.status === "PENDING").length }),
      });
    } catch {
      // Proceed locally
    }
    const now = new Date().toLocaleTimeString();
    setDtnQueue((prev) =>
      prev.map((m) =>
        m.status === "PENDING"
          ? { ...m, status: "ACKNOWLEDGED", sentAt: now, acknowledgedAt: now }
          : m
      )
    );
  }, [dtnQueue]);

  const addAuditEntry = useCallback(
    (targetCallsign: string, reason: string, action: string) => {
      setAuditLog((prev) => [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          actorRole: role,
          targetCallsign,
          reason,
          action,
        },
        ...prev,
      ]);
    },
    [role]
  );

  const toggleCrewShelter = useCallback((crewId: string) => {
    setShelterConfirmations((prev) => ({
      ...prev,
      [crewId]: !prev[crewId],
    }));
  }, []);

  const addPrivateCheckIn = useCallback((entry: Omit<PrivateCheckIn, "id" | "timestamp">) => {
    setPrivateCheckIns((prev) => [
      {
        ...entry,
        id: `priv-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }, []);

  return (
    <MissionContext.Provider
      value={{
        mission,
        setMissionId,
        role,
        setRole,
        selectedMemberId,
        setSelectedMemberId,
        linkOnline,
        setLinkOnline,
        reentryMode,
        setReentryMode,
        dtnQueue,
        queueDtnReport,
        syncDtnQueue,
        auditLog,
        addAuditEntry,
        shelterConfirmations,
        toggleCrewShelter,
        privateCheckIns,
        addPrivateCheckIn,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionProvider");
  return ctx;
}
