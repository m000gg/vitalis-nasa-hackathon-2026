"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuditLogEntry, CrewSlot, DtnMessage, MissionProfile, UserRole } from "@/lib/domain";
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

export interface UpdateCharacterInput {
  scenarioId: string;
  id: string;
  callsign?: string;
  assignedRoleTitle?: string;
  isLeadSlot?: boolean;
  readinessState?: CrewSlot["readinessState"];
  evaGateState?: CrewSlot["evaGateState"];
  shelterConfirmed?: boolean;
  publicStatusSummary?: string;
}

export type DbStatus = "loading" | "connected" | "error";

interface MissionContextValue {
  scenarios: MissionProfile[];
  dbStatus: DbStatus;
  dbError: string | null;
  refreshScenarios: () => Promise<void>;
  createScenario: (input: CreateScenarioInput) => Promise<MissionProfile>;
  createCharacter: (input: CreateCharacterInput) => Promise<CrewSlot>;
  updateCharacter: (input: UpdateCharacterInput) => Promise<CrewSlot>;
  mission: MissionProfile | null;
  setMissionId: (id: string) => void;
  activeCharacter: CrewSlot | null;
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
  if (!firstMember) return [];
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
  const [scenarios, setScenarios] = useState<MissionProfile[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus>("loading");
  const [dbError, setDbError] = useState<string | null>(null);
  const [missionId, setMissionIdState] = useState<string>("");
  const [activeCharacterId, setActiveCharacterIdState] = useState<string>("");
  const [linkOnline, setLinkOnline] = useState<boolean>(false);
  const [reentryMode, setReentryMode] = useState<boolean>(false);
  const [actorInputs, setActorInputs] = useState<Record<string, Record<string, string>>>({});
  const [hazardRecords, setHazardRecords] = useState<HazardDataRecord[]>([]);
  const [hazardSamples, setHazardSamples] = useState<HazardSampleRecord[]>([]);
  const [dtnQueue, setDtnQueue] = useState<DtnMessage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [shelterConfirmations, setShelterConfirmations] = useState<Record<string, boolean>>({});
  const [privateCheckIns, setPrivateCheckIns] = useState<PrivateCheckIn[]>([]);

  const persistSession = (nextMissionId: string, nextCharacterId: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ missionId: nextMissionId, activeCharacterId: nextCharacterId })
      );
    } catch {
      // Ignore browser storage errors
    }
  };

  const refreshScenarios = useCallback(async () => {
    setDbStatus("loading");
    setDbError(null);

    try {
      const res = await fetch("/api/scenarios");
      const data = (await res.json()) as {
        scenarios?: MissionProfile[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status} loading scenarios from Supabase`);
      }

      if (!Array.isArray(data.scenarios)) {
        throw new Error("Invalid response from /api/scenarios: missing scenarios array");
      }

      const loadedScenarios = data.scenarios;
      setScenarios(loadedScenarios);
      setDbStatus("connected");
      setDbError(null);

      if (loadedScenarios.length === 0) {
        setMissionIdState("");
        setActiveCharacterIdState("");
        setDtnQueue([]);
        return;
      }

      let targetMission = loadedScenarios[0];
      let savedCharId = "";

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.missionId) {
            const matched = loadedScenarios.find((m) => m.id === parsed.missionId);
            if (matched) {
              targetMission = matched;
              savedCharId = typeof parsed.activeCharacterId === "string" ? parsed.activeCharacterId : "";
            }
          }
        }
      } catch {
        // Ignore storage read errors
      }

      const targetChar =
        targetMission.crew.find((c) => c.id === savedCharId) ?? targetMission.crew[0] ?? null;

      setMissionIdState(targetMission.id);
      setActiveCharacterIdState(targetChar ? targetChar.id : "");
      setLinkOnline(targetMission.environment.linkOnlineDefault);
      setDtnQueue(buildInitialDtnForMission(targetMission));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to Supabase (/api/scenarios)";
      setScenarios([]);
      setMissionIdState("");
      setActiveCharacterIdState("");
      setDbStatus("error");
      setDbError(message);
    }
  }, []);

  useEffect(() => {
    refreshScenarios();
  }, [refreshScenarios]);

  const mission = scenarios.find((m) => m.id === missionId) ?? scenarios[0] ?? null;
  const activeCharacter = mission
    ? mission.crew.find((c) => c.id === activeCharacterId) ?? mission.crew[0] ?? null
    : null;
  const role: UserRole = activeCharacter?.isLeadSlot ? "lead" : "member";
  const selectedMemberId = activeCharacter
    ? activeCharacter.isLeadSlot
      ? mission?.crew.find((c) => !c.isLeadSlot)?.id ?? mission?.crew[0]?.id ?? ""
      : activeCharacter.id
    : "";

  useEffect(() => {
    if (!mission) {
      setShelterConfirmations({});
      return;
    }
    const initial: Record<string, boolean> = {};
    mission.crew.forEach((c) => {
      initial[c.id] = c.shelterConfirmed;
    });
    setShelterConfirmations(initial);
  }, [mission]);

  useEffect(() => {
    if (!mission || !activeCharacter) {
      setHazardRecords([]);
      setHazardSamples([]);
      return;
    }

    const currentMissionId = mission.id;
    const currentCharacterId = activeCharacter.id;
    let active = true;

    async function loadHazardData() {
      const qs = `scenarioId=${encodeURIComponent(currentMissionId)}&characterId=${encodeURIComponent(
        currentCharacterId
      )}`;
      try {
        const [dataRes, sampleRes] = await Promise.all([
          fetch(`/api/hazard-data?${qs}`),
          fetch(`/api/hazard-samples?${qs}`),
        ]);

        const data = (await dataRes.json()) as {
          records?: HazardDataRecord[];
          error?: string;
        };
        const sampleData = (await sampleRes.json()) as {
          samples?: HazardSampleRecord[];
          error?: string;
        };

        if (!active) return;

        if (!dataRes.ok) {
          throw new Error(data.error || `HTTP ${dataRes.status} loading hazard_data from Supabase`);
        }
        if (!sampleRes.ok) {
          throw new Error(
            sampleData.error || `HTTP ${sampleRes.status} loading hazard_samples from Supabase`
          );
        }

        const recs = Array.isArray(data.records) ? data.records : [];
        setHazardRecords(recs);
        if (recs.length > 0) {
          setActorInputs((prev) => {
            const existing = prev[currentCharacterId] ?? {};
            const hydrated: Record<string, string> = { ...existing };
            recs.forEach((rec) => {
              if (!hydrated[rec.streamName] && rec.rawValue) {
                hydrated[rec.streamName] = rec.rawValue;
              }
            });
            return { ...prev, [currentCharacterId]: hydrated };
          });
        }

        setHazardSamples(Array.isArray(sampleData.samples) ? sampleData.samples : []);
        setDbStatus("connected");
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load character hazard telemetry from Supabase";
        setDbStatus("error");
        setDbError(message);
        setHazardRecords([]);
        setHazardSamples([]);
      }
    }

    loadHazardData();
    return () => {
      active = false;
    };
  }, [mission, activeCharacter]);

  const setMissionId = useCallback(
    (id: string) => {
      const found = scenarios.find((m) => m.id === id);
      if (!found) return;
      const defaultChar = found.crew[0] ?? null;
      setMissionIdState(found.id);
      setActiveCharacterIdState(defaultChar ? defaultChar.id : "");
      if (defaultChar) {
        persistSession(found.id, defaultChar.id);
      }
      setLinkOnline(found.environment.linkOnlineDefault);
      setDtnQueue(buildInitialDtnForMission(found));
    },
    [scenarios]
  );

  const setActiveCharacterId = useCallback(
    (charId: string) => {
      if (!mission) return;
      const exists = mission.crew.some((c) => c.id === charId);
      const nextId = exists ? charId : mission.crew[0]?.id ?? "";
      setActiveCharacterIdState(nextId);
      if (nextId) {
        persistSession(mission.id, nextId);
      }
    },
    [mission]
  );

  const setRole = useCallback(
    (nextRole: UserRole) => {
      if (!mission || mission.crew.length === 0) return;
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
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      scenario?: MissionProfile;
      error?: string;
    };
    if (!res.ok || !data.scenario) {
      const msg = data.error || `HTTP ${res.status} creating scenario in Supabase`;
      setDbStatus("error");
      setDbError(msg);
      throw new Error(msg);
    }

    const created = data.scenario;
    setScenarios((prev) => (prev.some((s) => s.id === created.id) ? prev : [...prev, created]));
    setDbStatus("connected");
    setDbError(null);
    return created;
  }, []);

  const createCharacter = useCallback(async (input: CreateCharacterInput) => {
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      character?: CrewSlot;
      error?: string;
    };
    if (!res.ok || !data.character) {
      const msg = data.error || `HTTP ${res.status} creating character in Supabase`;
      setDbStatus("error");
      setDbError(msg);
      throw new Error(msg);
    }

    const created = data.character;
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === input.scenarioId
          ? {
              ...s,
              crew: s.crew.some((c) => c.id === created.id) ? s.crew : [...s.crew, created],
            }
          : s
      )
    );
    setDbStatus("connected");
    setDbError(null);
    return created;
  }, []);

  const updateCharacter = useCallback(async (input: UpdateCharacterInput) => {
    const res = await fetch("/api/characters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      character?: CrewSlot;
      error?: string;
    };
    if (!res.ok || !data.character) {
      const msg = data.error || `HTTP ${res.status} updating character in Supabase`;
      setDbStatus("error");
      setDbError(msg);
      throw new Error(msg);
    }

    const updated = data.character;
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === input.scenarioId
          ? {
              ...s,
              crew: s.crew.map((c) => (c.id === updated.id ? updated : c)),
            }
          : s
      )
    );
    setDbStatus("connected");
    setDbError(null);
    return updated;
  }, []);

  const appendHazardSample = useCallback(
    async (input: {
      hazardSlug: HazardSlug;
      streamName: string;
      numericValue?: number | null;
      samplePayload?: Record<string, unknown>;
    }) => {
      if (!mission || !activeCharacter) {
        throw new Error("Cannot log sample: no active scenario or character loaded from Supabase.");
      }

      const res = await fetch("/api/hazard-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: mission.id,
          characterId: activeCharacter.id,
          ...input,
        }),
      });
      const data = (await res.json()) as {
        sample?: HazardSampleRecord;
        error?: string;
      };
      if (!res.ok || !data.sample) {
        const msg = data.error || `HTTP ${res.status} inserting hazard sample in Supabase`;
        setDbStatus("error");
        setDbError(msg);
        throw new Error(msg);
      }

      const savedSample = data.sample;
      setHazardSamples((prev) => [...prev, savedSample]);
      setDbStatus("connected");
      setDbError(null);
    },
    [activeCharacter, mission]
  );

  const saveActorInput = useCallback(
    async (
      streamName: string,
      value: string,
      hazardSlug?: HazardSlug,
      options?: SaveActorInputOptions
    ) => {
      if (!mission || !activeCharacter) {
        throw new Error("Cannot save input: no active scenario or character loaded from Supabase.");
      }

      if (!hazardSlug) {
        throw new Error("Cannot save input to Supabase without a hazardSlug.");
      }

      const parsedNumeric =
        typeof options?.numericValue === "number" && Number.isFinite(options.numericValue)
          ? options.numericValue
          : Number.isFinite(Number(value)) && value.trim() !== ""
          ? Number(value)
          : null;

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

      const data = (await res.json()) as {
        record?: HazardDataRecord;
        sample?: HazardSampleRecord;
        error?: string;
      };

      if (!res.ok || !data.record) {
        const msg = data.error || `HTTP ${res.status} saving hazard data to Supabase`;
        setDbStatus("error");
        setDbError(msg);
        throw new Error(msg);
      }

      const savedRecord = data.record;
      setActorInputs((prev) => ({
        ...prev,
        [activeCharacter.id]: {
          ...(prev[activeCharacter.id] ?? {}),
          [streamName]: value,
        },
      }));
      setHazardRecords((prev) => {
        const filtered = prev.filter(
          (r) => !(r.hazardSlug === savedRecord.hazardSlug && r.streamName === savedRecord.streamName)
        );
        return [...filtered, savedRecord];
      });
      if (data.sample) {
        const savedSample = data.sample;
        setHazardSamples((prev) => [...prev, savedSample]);
      }
      setDbStatus("connected");
      setDbError(null);
    },
    [activeCharacter, mission]
  );

  const queueDtnReport = useCallback(
    async (reportTitle: string, hazardSlug: string, payloadSummary: string) => {
      const senderCallsign = activeCharacter?.callsign ?? "Unknown";
      const res = await fetch("/api/communications/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportTitle,
          senderCallsign,
          hazardSlug,
          payloadSummary,
          linkOnline,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} queueing DTN report`);
      }
      const data = await res.json();
      setDtnQueue((prev) => [data.message, ...prev]);
    },
    [activeCharacter, linkOnline]
  );

  const syncDtnQueue = useCallback(async () => {
    const res = await fetch("/api/communications/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: dtnQueue.filter((m) => m.status === "PENDING").length }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} syncing DTN queue`);
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
      if (!activeCharacter) return;
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
    [activeCharacter]
  );

  return (
    <MissionContext.Provider
      value={{
        scenarios,
        dbStatus,
        dbError,
        refreshScenarios,
        createScenario,
        createCharacter,
        updateCharacter,
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
