"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuditLogEntry, CrewSlot, DtnMessage, MISSIONS, MissionProfile, UserRole } from "@/lib/domain";
import { HazardDataRecord, HazardSampleRecord, HazardSlug } from "@/lib/hazards";

export interface SaveActorInputOptions {
  payload?: Record<string, unknown>;
  numericValue?: number | null;
  recordSample?: boolean;
}

export interface PrivateCheckIn {
  id: string;
  actorId: string;
  timestamp: string;
  fatigueScore: string;
  sleepHoursInput: string;
  privateJournalNote: string;
}

export interface CreateScenarioInput {
  name: string;
  phase: string;
  scenarioDescriptionSlot: string;
  commsDelayLabel: string;
  leaderCallsign?: string;
}

export interface CreateCharacterInput {
  scenarioId: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  readinessState?: CrewSlot["readinessState"];
  evaGateState?: CrewSlot["evaGateState"];
}

interface MissionContextValue {
  scenarios: MissionProfile[];
  dbSource: "supabase" | "local";
  createScenario: (
    input: CreateScenarioInput
  ) => Promise<{ scenario: MissionProfile; source: "supabase" | "local"; error?: string }>;
  createCharacter: (
    input: CreateCharacterInput
  ) => Promise<{ character?: CrewSlot; source: "supabase" | "local"; error?: string }>;
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
  hazardRecords: HazardDataRecord[];
  hazardSamples: HazardSampleRecord[];
  saveActorInput: (
    streamName: string,
    value: string,
    hazardSlug?: HazardSlug,
    options?: SaveActorInputOptions
  ) => Promise<void>;
  appendHazardSample: (input: {
    hazardSlug: HazardSlug;
    streamName: string;
    numericValue?: number | null;
    samplePayload?: Record<string, unknown>;
  }) => Promise<void>;
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
  const [scenarios, setScenarios] = useState<MissionProfile[]>(MISSIONS);
  const [dbSource, setDbSource] = useState<"supabase" | "local">("local");
  const [missionId, setMissionIdState] = useState<string>(MISSIONS[0].id);
  const [activeCharacterId, setActiveCharacterIdState] = useState<string>(MISSIONS[0].crew[0].id);
  const [linkOnline, setLinkOnline] = useState<boolean>(MISSIONS[0].environment.linkOnlineDefault);
  const [reentryMode, setReentryMode] = useState<boolean>(false);
  const [actorInputs, setActorInputs] = useState<Record<string, Record<string, string>>>({});
  const [hazardRecords, setHazardRecords] = useState<HazardDataRecord[]>([]);
  const [hazardSamples, setHazardSamples] = useState<HazardSampleRecord[]>([]);
  const [dtnQueue, setDtnQueue] = useState<DtnMessage[]>(() => buildInitialDtnForMission(MISSIONS[0]));
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [shelterConfirmations, setShelterConfirmations] = useState<Record<string, boolean>>({});
  const [privateCheckIns, setPrivateCheckIns] = useState<PrivateCheckIn[]>([]);

  useEffect(() => {
    let active = true;
    async function loadScenarios() {
      let loadedScenarios = MISSIONS;
      try {
        const res = await fetch("/api/scenarios");
        if (res.ok) {
          const data = (await res.json()) as {
            source?: "supabase" | "local";
            scenarios?: MissionProfile[];
          };
          if (active && Array.isArray(data.scenarios) && data.scenarios.length > 0) {
            loadedScenarios = data.scenarios;
            setScenarios(data.scenarios);
            setDbSource(data.source === "supabase" ? "supabase" : "local");
          }
        }
      } catch {
        // Keep local MISSIONS fallback
      }

      if (!active) return;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.missionId && loadedScenarios.some((m) => m.id === parsed.missionId)) {
            const found = loadedScenarios.find((m) => m.id === parsed.missionId) ?? loadedScenarios[0];
            setMissionIdState(found.id);
            setLinkOnline(found.environment.linkOnlineDefault);
            setDtnQueue(buildInitialDtnForMission(found));
            if (parsed.activeCharacterId && found.crew.some((c) => c.id === parsed.activeCharacterId)) {
              setActiveCharacterIdState(parsed.activeCharacterId);
            } else if (found.crew[0]) {
              setActiveCharacterIdState(found.crew[0].id);
            }
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    loadScenarios();
    return () => {
      active = false;
    };
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

  const mission = scenarios.find((m) => m.id === missionId) ?? scenarios[0];
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

  useEffect(() => {
    let active = true;
    async function loadHazardData() {
      const qs = `scenarioId=${encodeURIComponent(mission.id)}&characterId=${encodeURIComponent(
        activeCharacter.id
      )}`;
      try {
        const [dataRes, sampleRes] = await Promise.all([
          fetch(`/api/hazard-data?${qs}`),
          fetch(`/api/hazard-samples?${qs}`),
        ]);
        if (!active) return;

        if (dataRes.ok) {
          const data = (await dataRes.json()) as {
            source?: "supabase" | "local";
            records?: HazardDataRecord[];
          };
          if (!active) return;
          if (data.source) {
            setDbSource(data.source);
          }
          const recs = Array.isArray(data.records) ? data.records : [];
          setHazardRecords(recs);
          if (recs.length > 0) {
            setActorInputs((prev) => {
              const existing = prev[activeCharacter.id] ?? {};
              const hydrated: Record<string, string> = { ...existing };
              recs.forEach((rec) => {
                if (!hydrated[rec.streamName] && rec.rawValue) {
                  hydrated[rec.streamName] = rec.rawValue;
                }
              });
              return { ...prev, [activeCharacter.id]: hydrated };
            });
          }
        }

        if (sampleRes.ok) {
          const sampleData = (await sampleRes.json()) as {
            samples?: HazardSampleRecord[];
          };
          if (!active) return;
          setHazardSamples(Array.isArray(sampleData.samples) ? sampleData.samples : []);
        }
      } catch {
        // Fallback to local state when offline
      }
    }
    loadHazardData();
    return () => {
      active = false;
    };
  }, [mission.id, activeCharacter.id]);

  const setMissionId = useCallback(
    (id: string) => {
      const found = scenarios.find((m) => m.id === id) ?? scenarios[0];
      const defaultChar = found.crew[0];
      setMissionIdState(found.id);
      if (defaultChar) {
        setActiveCharacterIdState(defaultChar.id);
        persistSession(found.id, defaultChar.id);
      }
      setLinkOnline(found.environment.linkOnlineDefault);
      setDtnQueue(buildInitialDtnForMission(found));
    },
    [scenarios]
  );

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

  const createScenario = useCallback(async (input: CreateScenarioInput) => {
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        source?: "supabase" | "local";
        scenario?: MissionProfile;
        error?: string;
      };
      if (data.scenario) {
        setScenarios((prev) =>
          prev.some((s) => s.id === data.scenario!.id) ? prev : [...prev, data.scenario!]
        );
        if (data.source) setDbSource(data.source);
        const nextSource: "supabase" | "local" =
          data.source === "supabase" ? "supabase" : "local";
        return {
          scenario: data.scenario,
          source: nextSource,
          error: data.error,
        };
      }
      throw new Error(data.error || "Failed to create scenario");
    } catch (err) {
      const fallbackId = `local-${Date.now().toString(36)}`;
      const fallbackScenario: MissionProfile = {
        id: fallbackId,
        name: input.name,
        phase: input.phase,
        durationContext: `Here is: Local scenario (${input.phase})`,
        commsDelayLabel: input.commsDelayLabel,
        activeHazardsHighlight: ["Space Radiation", "Isolation & Confinement", "Distance from Earth"],
        scenarioDescriptionSlot: input.scenarioDescriptionSlot,
        environment: {
          commsDelaySlot: input.commsDelayLabel,
          linkOnlineDefault: false,
          radiationStatusSlot: "Add your info: Compartment radiation status here",
          atmosphereStatusSlot: "Add your info: Cabin CO₂ / O₂ / pressure here",
          acousticsStatusSlot: "Add your info: Sleep quarter acoustic level here",
          isolationStatusSlot: "Add your info: Confinement / circadian status here",
          gravityStatusSlot: "Add your info: Conditioning / EVA schedule status here",
        },
        crew: [
          {
            id: `${fallbackId}-lead`,
            callsign: input.leaderCallsign || "Leader — Commander",
            assignedRoleTitle: "Crew Captain / Mission Commander",
            isLeadSlot: true,
            readinessState: "GO",
            evaGateState: "GO",
            shelterConfirmed: true,
            publicStatusSummary: "Here is: Duty readiness & shelter oversight status",
            privateMemberNotesSlot: "Add your info: Personal private reflection slot here",
            metrics: {
              etaSlot: "Add your info: Next command review ETA here",
              doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
              sleepSlot: "Add your info: Personal sleep duration slot here",
              fatigueSlot: "Add your info: 60s self-check slot here",
              exerciseAdherenceSlot: "Add your info: Daily 2.5h exercise adherence slot here",
              blockers: [],
              actions: ["Here is: Action 1 — Verify crew readiness."],
            },
          },
        ],
      };
      setScenarios((prev) => [...prev, fallbackScenario]);
      return {
        scenario: fallbackScenario,
        source: "local" as const,
        error: err instanceof Error ? err.message : "Offline local fallback",
      };
    }
  }, []);

  const createCharacter = useCallback(async (input: CreateCharacterInput) => {
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as {
        source?: "supabase" | "local";
        character?: CrewSlot;
        error?: string;
      };
      if (data.character) {
        setScenarios((prev) =>
          prev.map((s) =>
            s.id === input.scenarioId
              ? {
                  ...s,
                  crew: s.crew.some((c) => c.id === data.character!.id)
                    ? s.crew
                    : [...s.crew, data.character!],
                }
              : s
          )
        );
        if (data.source) setDbSource(data.source);
        const nextSource: "supabase" | "local" =
          data.source === "supabase" ? "supabase" : "local";
        return {
          character: data.character,
          source: nextSource,
          error: data.error,
        };
      }
      return {
        source: "local" as const,
        error: data.error || "Failed to create character",
      };
    } catch (err) {
      return {
        source: "local" as const,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }, []);

  const appendHazardSample = useCallback(
    async (input: {
      hazardSlug: HazardSlug;
      streamName: string;
      numericValue?: number | null;
      samplePayload?: Record<string, unknown>;
    }) => {
      const localFallback: HazardSampleRecord = {
        id: `local-sample-${Date.now()}`,
        scenarioId: mission.id,
        characterId: activeCharacter.id,
        hazardSlug: input.hazardSlug,
        streamName: input.streamName,
        numericValue:
          typeof input.numericValue === "number" && Number.isFinite(input.numericValue)
            ? input.numericValue
            : null,
        samplePayload: input.samplePayload ?? {},
        recordedAt: new Date().toISOString(),
      };

      try {
        const res = await fetch("/api/hazard-samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: mission.id,
            characterId: activeCharacter.id,
            ...input,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            source?: "supabase" | "local";
            sample?: HazardSampleRecord;
          };
          if (data.source) setDbSource(data.source);
          setHazardSamples((prev) => [...prev, data.sample ?? localFallback]);
          return;
        }
      } catch {
        // Fall through to local sample push
      }
      setHazardSamples((prev) => [...prev, localFallback]);
    },
    [activeCharacter.id, mission.id]
  );

  const saveActorInput = useCallback(
    async (
      streamName: string,
      value: string,
      hazardSlug?: HazardSlug,
      options?: SaveActorInputOptions
    ) => {
      setActorInputs((prev) => ({
        ...prev,
        [activeCharacter.id]: {
          ...(prev[activeCharacter.id] ?? {}),
          [streamName]: value,
        },
      }));

      if (!hazardSlug) return;

      const parsedNumeric =
        typeof options?.numericValue === "number" && Number.isFinite(options.numericValue)
          ? options.numericValue
          : Number.isFinite(Number(value)) && value.trim() !== ""
          ? Number(value)
          : null;

      try {
        const res = await fetch("/api/hazard-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: mission.id,
            characterId: activeCharacter.id,
            hazardSlug,
            streamName,
            rawValue: value,
            payload: options?.payload,
            recordSample: Boolean(options?.recordSample),
            numericValue: parsedNumeric,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            source?: "supabase" | "local";
            record?: HazardDataRecord;
            sample?: HazardSampleRecord;
          };
          if (data.source) setDbSource(data.source);
          if (data.record) {
            const savedRecord = data.record;
            setHazardRecords((prev) => {
              const filtered = prev.filter(
                (r) => !(r.hazardSlug === savedRecord.hazardSlug && r.streamName === savedRecord.streamName)
              );
              return [...filtered, savedRecord];
            });
          }
          if (data.sample) {
            const savedSample = data.sample;
            setHazardSamples((prev) => [...prev, savedSample]);
          }
          return;
        }
      } catch {
        // Fallback below if offline
      }

      if (options?.recordSample) {
        setHazardSamples((prev) => [
          ...prev,
          {
            id: `local-sample-${Date.now()}`,
            scenarioId: mission.id,
            characterId: activeCharacter.id,
            hazardSlug,
            streamName,
            numericValue: parsedNumeric,
            samplePayload: options.payload ?? { rawValue: value },
            recordedAt: new Date().toISOString(),
          },
        ]);
      }
    },
    [activeCharacter.id, mission.id]
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
        scenarios,
        dbSource,
        createScenario,
        createCharacter,
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
        hazardRecords,
        hazardSamples,
        saveActorInput,
        appendHazardSample,
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
