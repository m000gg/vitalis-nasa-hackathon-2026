"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuditLogEntry, CrewSlot, DtnMessage, MISSIONS, MissionProfile, UserRole } from "@/lib/domain";

export interface PrivateCheckIn {
  id: string;
  actorId: string;
  timestamp: string;
  fatigueScore: string;
  sleepHoursInput: string;
  privateJournalNote: string;
}

interface MissionContextValue {
  mission: MissionProfile;
  setMissionId: (id: string) => void;
  activeCharacter: CrewSlot;
  setActiveCharacterId: (id: string) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  linkOnline: boolean;
  setLinkOnline: (online: boolean) => void;
  reentryMode: boolean;
  setReentryMode: (enabled: boolean) => void;
  actorInputs: Record<string, Record<string, string>>;
  saveActorInput: (streamName: string, value: string) => void;
  dtnQueue: DtnMessage[];
  queueDtnReport: (reportTitle: string, hazardSlug: string, payloadSummary: string) => Promise<void>;
  syncDtnQueue: () => Promise<void>;
  auditLog: AuditLogEntry[];
  addAuditEntry: (targetCallsign: string, reason: string, action: string) => void;
  shelterConfirmations: Record<string, boolean>;
  toggleCrewShelter: (crewId: string) => void;
  privateCheckIns: PrivateCheckIn[];
  addPrivateCheckIn: (entry: Omit<PrivateCheckIn, "id" | "actorId" | "timestamp">) => void;
}

const MissionContext = createContext<MissionContextValue | null>(null);

const STORAGE_KEY = "vitalis_session_v2";

function buildInitialDtnForMission(m: MissionProfile): DtnMessage[] {
  const firstMember = m.crew.find((c) => !c.isLeadSlot) ?? m.crew[0];
  return [
    {
      id: `dtn-init-${m.id}`,
      reportTitle: `Here is: Baseline Crew Report (${m.name})`,
      senderCallsign: firstMember.callsign,
      hazardSlug: "distance",
      status: m.environment.linkOnlineDefault ? "ACKNOWLEDGED" : "PENDING",
      createdAt: "Scenario Initialized",
      retryCount: m.environment.linkOnlineDefault ? 0 : 1,
      payloadSummary: "Add your info: Structured symptom & vital baseline delta summary here",
    },
  ];
}

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [missionId, setMissionIdState] = useState<string>(MISSIONS[0].id);
  const [activeCharacterId, setActiveCharacterIdState] = useState<string>(MISSIONS[0].crew[0].id);
  const [linkOnline, setLinkOnline] = useState<boolean>(MISSIONS[0].environment.linkOnlineDefault);
  const [reentryMode, setReentryMode] = useState<boolean>(false);
  const [actorInputs, setActorInputs] = useState<Record<string, Record<string, string>>>({});
  const [dtnQueue, setDtnQueue] = useState<DtnMessage[]>(() => buildInitialDtnForMission(MISSIONS[0]));
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [shelterConfirmations, setShelterConfirmations] = useState<Record<string, boolean>>({});
  const [privateCheckIns, setPrivateCheckIns] = useState<PrivateCheckIn[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.missionId && MISSIONS.some((m) => m.id === parsed.missionId)) {
          const found = MISSIONS.find((m) => m.id === parsed.missionId) ?? MISSIONS[0];
          setMissionIdState(found.id);
          setLinkOnline(found.environment.linkOnlineDefault);
          setDtnQueue(buildInitialDtnForMission(found));
          if (parsed.activeCharacterId && found.crew.some((c) => c.id === parsed.activeCharacterId)) {
            setActiveCharacterIdState(parsed.activeCharacterId);
          } else {
            setActiveCharacterIdState(found.crew[0].id);
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  const persistSession = (nextMissionId: string, nextCharacterId: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ missionId: nextMissionId, activeCharacterId: nextCharacterId })
      );
    } catch {
      // Ignore storage write errors
    }
  };

  const mission = MISSIONS.find((m) => m.id === missionId) ?? MISSIONS[0];
  const activeCharacter = mission.crew.find((c) => c.id === activeCharacterId) ?? mission.crew[0];
  const role: UserRole = activeCharacter.isLeadSlot ? "lead" : "member";
  const selectedMemberId = activeCharacter.isLeadSlot
    ? (mission.crew.find((c) => !c.isLeadSlot)?.id ?? mission.crew[0].id)
    : activeCharacter.id;

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    mission.crew.forEach((c) => {
      initial[c.id] = c.shelterConfirmed;
    });
    setShelterConfirmations(initial);
  }, [mission]);

  const setMissionId = useCallback((id: string) => {
    const found = MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
    const defaultChar = found.crew[0];
    setMissionIdState(found.id);
    setActiveCharacterIdState(defaultChar.id);
    setLinkOnline(found.environment.linkOnlineDefault);
    setDtnQueue(buildInitialDtnForMission(found));
    persistSession(found.id, defaultChar.id);
  }, []);

  const setActiveCharacterId = useCallback(
    (charId: string) => {
      const exists = mission.crew.some((c) => c.id === charId);
      const nextId = exists ? charId : mission.crew[0].id;
      setActiveCharacterIdState(nextId);
      persistSession(mission.id, nextId);
    },
    [mission]
  );

  const setRole = useCallback(
    (nextRole: UserRole) => {
      const target =
        nextRole === "lead"
          ? mission.crew.find((c) => c.isLeadSlot) ?? mission.crew[0]
          : mission.crew.find((c) => !c.isLeadSlot) ?? mission.crew[0];
      setActiveCharacterIdState(target.id);
      persistSession(mission.id, target.id);
    },
    [mission]
  );

  const setSelectedMemberId = useCallback(
    (memberId: string) => {
      setActiveCharacterId(memberId);
    },
    [setActiveCharacterId]
  );

  const saveActorInput = useCallback(
    (streamName: string, value: string) => {
      setActorInputs((prev) => ({
        ...prev,
        [activeCharacter.id]: {
          ...(prev[activeCharacter.id] ?? {}),
          [streamName]: value,
        },
      }));
    },
    [activeCharacter.id]
  );

  const queueDtnReport = useCallback(
    async (reportTitle: string, hazardSlug: string, payloadSummary: string) => {
      try {
        const res = await fetch("/api/communications/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportTitle,
            senderCallsign: activeCharacter.callsign,
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
        senderCallsign: activeCharacter.callsign,
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
    [activeCharacter.callsign, linkOnline]
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
        m.status === "PENDING" ? { ...m, status: "ACKNOWLEDGED", sentAt: now, acknowledgedAt: now } : m
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

  const addPrivateCheckIn = useCallback(
    (entry: Omit<PrivateCheckIn, "id" | "actorId" | "timestamp">) => {
      setPrivateCheckIns((prev) => [
        {
          ...entry,
          id: `priv-${Date.now()}`,
          actorId: activeCharacter.id,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    },
    [activeCharacter.id]
  );

  return (
    <MissionContext.Provider
      value={{
        mission,
        setMissionId,
        activeCharacter,
        setActiveCharacterId,
        role,
        setRole,
        selectedMemberId,
        setSelectedMemberId,
        linkOnline,
        setLinkOnline,
        reentryMode,
        setReentryMode,
        actorInputs,
        saveActorInput,
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
