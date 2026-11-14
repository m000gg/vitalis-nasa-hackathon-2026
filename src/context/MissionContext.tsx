"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuditLogEntry, CrewSlot, DtnMessage, MissionProfile, UserRole } from "@/lib/domain";
import { HAZARDS, HazardDataRecord, HazardSampleRecord, HazardSlug } from "@/lib/hazards";
import { evaluateHazardForActor } from "@/lib/evaluator";
import { useAlerts } from "@/context/AlertContext";

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
  scenarioHazardRecords: HazardDataRecord[];
  scenarioHazardSamples: HazardSampleRecord[];
  lastTelemetrySyncAt: string | null;
  refreshHazardTelemetry: () => Promise<void>;
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
  addPrivateCheckIn: (entry: Omit<PrivateCheckIn, "id" | "actorId" | "timestamp">) => Promise<void>;
}

const MissionContext = createContext<MissionContextValue | null>(null);

const STORAGE_KEY = "vitalis_session_v2";
const TELEMETRY_POLL_INTERVAL_MS = 12_000;

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isFinite(direct)) return direct;
  const match = trimmed.match(/^-?\d+(\.\d+)?/);
  if (match) {
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

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
  const { pushToast, triggerAlarm } = useAlerts();
  const [scenarios, setScenarios] = useState<MissionProfile[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus>("loading");
  const [dbError, setDbError] = useState<string | null>(null);
  const [missionId, setMissionIdState] = useState<string>("");
  const [activeCharacterId, setActiveCharacterIdState] = useState<string>("");
  const [linkOnline, setLinkOnline] = useState<boolean>(false);
  const [reentryMode, setReentryMode] = useState<boolean>(false);
  const [actorInputs, setActorInputs] = useState<Record<string, Record<string, string>>>({});
  const [scenarioHazardRecords, setScenarioHazardRecords] = useState<HazardDataRecord[]>([]);
  const [scenarioHazardSamples, setScenarioHazardSamples] = useState<HazardSampleRecord[]>([]);
  const [lastTelemetrySyncAt, setLastTelemetrySyncAt] = useState<string | null>(null);
  const [dtnQueue, setDtnQueue] = useState<DtnMessage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [shelterConfirmations, setShelterConfirmations] = useState<Record<string, boolean>>({});
  const hasLoadedScenarioTelemetryRef = useRef<string | null>(null);
  const evaluatedBaselineRef = useRef<{
    actorKey: string;
    statuses: Record<string, "NOMINAL" | "ELEVATED" | "CRITICAL">;
  } | null>(null);

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

  const missionIdLoaded = mission?.id ?? "";

  const fetchScenarioTelemetry = useCallback(
    async (targetMissionId: string, isCancelled?: () => boolean) => {
      const qs = `scenarioId=${encodeURIComponent(targetMissionId)}`;
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

        if (isCancelled?.()) return;

        if (!dataRes.ok) {
          throw new Error(data.error || `HTTP ${dataRes.status} loading hazard_data from Supabase`);
        }
        if (!sampleRes.ok) {
          throw new Error(
            sampleData.error || `HTTP ${sampleRes.status} loading hazard_samples from Supabase`
          );
        }

        const recs = Array.isArray(data.records) ? data.records : [];
        const samples = Array.isArray(sampleData.samples) ? sampleData.samples : [];

        setScenarioHazardRecords(recs);
        setScenarioHazardSamples(samples);

        const nextInputs: Record<string, Record<string, string>> = {};
        recs.forEach((rec) => {
          if (rec.rawValue) {
            nextInputs[rec.characterId] = {
              ...(nextInputs[rec.characterId] ?? {}),
              [rec.streamName]: rec.rawValue,
            };
          }
        });
        setActorInputs(nextInputs);

        hasLoadedScenarioTelemetryRef.current = targetMissionId;
        setLastTelemetrySyncAt(new Date().toLocaleTimeString());
        setDbStatus("connected");
        setDbError(null);
      } catch (err) {
        if (isCancelled?.()) return;
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load scenario hazard telemetry from Supabase";
        setDbStatus("error");
        setDbError(message);
      }
    },
    []
  );

  const refreshHazardTelemetry = useCallback(async () => {
    if (!missionIdLoaded) return;
    await fetchScenarioTelemetry(missionIdLoaded);
  }, [missionIdLoaded, fetchScenarioTelemetry]);

  useEffect(() => {
    if (!missionIdLoaded) {
      hasLoadedScenarioTelemetryRef.current = null;
      evaluatedBaselineRef.current = null;
      setScenarioHazardRecords([]);
      setScenarioHazardSamples([]);
      setActorInputs({});
      setLastTelemetrySyncAt(null);
      return;
    }

    let active = true;
    hasLoadedScenarioTelemetryRef.current = null;
    evaluatedBaselineRef.current = null;

    void fetchScenarioTelemetry(missionIdLoaded, () => !active);

    const intervalId = setInterval(() => {
      void fetchScenarioTelemetry(missionIdLoaded, () => !active);
    }, TELEMETRY_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [missionIdLoaded, fetchScenarioTelemetry]);

  const hazardRecords = useMemo(
    () =>
      activeCharacter
        ? scenarioHazardRecords.filter((r) => r.characterId === activeCharacter.id)
        : [],
    [scenarioHazardRecords, activeCharacter]
  );

  const hazardSamples = useMemo(
    () =>
      activeCharacter
        ? scenarioHazardSamples.filter((s) => s.characterId === activeCharacter.id)
        : [],
    [scenarioHazardSamples, activeCharacter]
  );

  useEffect(() => {
    if (!mission || !activeCharacter) return;
    if (hasLoadedScenarioTelemetryRef.current !== mission.id) return;

    const actorKey = `${mission.id}::${activeCharacter.id}::${role}`;
    const currentActorInputs = actorInputs[activeCharacter.id] ?? {};
    const nextStatuses: Record<string, "NOMINAL" | "ELEVATED" | "CRITICAL"> = {};
    const snapshots = HAZARDS.map((h) => {
      const snap = evaluateHazardForActor(mission, activeCharacter, h, {
        actorInputs: currentActorInputs,
        hazardRecords,
        hazardSamples,
        scenarioHazardRecords,
        scenarioHazardSamples,
        role,
        linkOnline,
        reentryMode,
      });
      nextStatuses[h.slug] = snap.status;
      return { hazard: h, snap };
    });

    const prev = evaluatedBaselineRef.current;
    if (!prev || prev.actorKey !== actorKey) {
      evaluatedBaselineRef.current = { actorKey, statuses: nextStatuses };
      return;
    }

    for (const { hazard, snap } of snapshots) {
      const prevStatus = prev.statuses[hazard.slug];
      if (snap.status === "CRITICAL" && prevStatus !== "CRITICAL") {
        pushToast({
          title: `${hazard.shortTitle}: CRITICAL Threshold Triggered`,
          message: snap.immediateHorizon,
          variant: "hazard",
        });
        triggerAlarm({
          hazardNumber: hazard.number,
          hazardTitle: hazard.title,
          ...hazard.alarmPreset,
        });
      } else if (snap.status === "ELEVATED" && prevStatus !== "ELEVATED") {
        pushToast({
          title: `${hazard.shortTitle}: ELEVATED Status`,
          message: snap.immediateHorizon,
          variant: "warning",
        });
      }
    }

    evaluatedBaselineRef.current = { actorKey, statuses: nextStatuses };
  }, [
    mission,
    activeCharacter,
    role,
    linkOnline,
    reentryMode,
    actorInputs,
    hazardRecords,
    hazardSamples,
    scenarioHazardRecords,
    scenarioHazardSamples,
    pushToast,
    triggerAlarm,
  ]);

  const privateCheckIns = useMemo<PrivateCheckIn[]>(() => {
    if (!activeCharacter) return [];

    const fromSamples = hazardSamples
      .filter(
        (s) =>
          s.hazardSlug === "isolation" &&
          s.streamName === "60-Second Self-Check (Private)" &&
          s.samplePayload &&
          (s.samplePayload.source === "crew-60s-checkin" ||
            s.samplePayload.fatigueScore !== undefined ||
            s.samplePayload.sleepHoursInput !== undefined ||
            s.samplePayload.privateJournalNote !== undefined)
      )
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .map((s) => ({
        id: s.id,
        actorId: s.characterId,
        timestamp: new Date(s.recordedAt).toLocaleTimeString(),
        fatigueScore: String(s.samplePayload.fatigueScore ?? ""),
        sleepHoursInput: String(s.samplePayload.sleepHoursInput ?? ""),
        privateJournalNote: String(s.samplePayload.privateJournalNote ?? ""),
      }));

    if (fromSamples.length > 0) return fromSamples;

    const fallbackRecord = hazardRecords.find(
      (r) =>
        r.hazardSlug === "isolation" &&
        r.streamName === "60-Second Self-Check (Private)" &&
        r.payload &&
        (r.payload.source === "crew-60s-checkin" ||
          r.payload.fatigueScore !== undefined ||
          r.payload.sleepHoursInput !== undefined ||
          r.payload.privateJournalNote !== undefined)
    );

    if (!fallbackRecord) return [];

    return [
      {
        id: fallbackRecord.id,
        actorId: fallbackRecord.characterId,
        timestamp: new Date(fallbackRecord.updatedAt).toLocaleTimeString(),
        fatigueScore: String(fallbackRecord.payload.fatigueScore ?? ""),
        sleepHoursInput: String(fallbackRecord.payload.sleepHoursInput ?? ""),
        privateJournalNote: String(fallbackRecord.payload.privateJournalNote ?? ""),
      },
    ];
  }, [activeCharacter, hazardRecords, hazardSamples]);

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
      setScenarioHazardSamples((prev) => [...prev, savedSample]);
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
      setScenarioHazardRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              r.characterId === savedRecord.characterId &&
              r.hazardSlug === savedRecord.hazardSlug &&
              r.streamName === savedRecord.streamName
            )
        );
        return [...filtered, savedRecord];
      });
      if (data.sample) {
        const savedSample = data.sample;
        setScenarioHazardSamples((prev) => [...prev, savedSample]);
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
    async (entry: Omit<PrivateCheckIn, "id" | "actorId" | "timestamp">) => {
      if (!mission || !activeCharacter) {
        throw new Error("Cannot save private check-in: no active scenario or character loaded.");
      }

      const fatigueNum = parseOptionalNumber(entry.fatigueScore);
      const sleepNum = parseOptionalNumber(entry.sleepHoursInput);
      const summaryParts: string[] = [];
      if (entry.fatigueScore.trim()) {
        summaryParts.push(`Fatigue: ${entry.fatigueScore.trim()}`);
      }
      if (entry.sleepHoursInput.trim()) {
        summaryParts.push(`Sleep: ${entry.sleepHoursInput.trim()}`);
      }
      const summaryVal = summaryParts.join(", ") || "60s Self-Check logged";

      await saveActorInput("60-Second Self-Check (Private)", summaryVal, "isolation", {
        payload: {
          source: "crew-60s-checkin",
          fatigueScore: entry.fatigueScore,
          sleepHoursInput: entry.sleepHoursInput,
          privateJournalNote: entry.privateJournalNote,
          ...(sleepNum !== null ? { sleepHours: sleepNum } : {}),
        },
        numericValue: fatigueNum,
        recordSample: true,
      });
    },
    [activeCharacter, mission, saveActorInput]
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
        scenarioHazardRecords,
        scenarioHazardSamples,
        lastTelemetrySyncAt,
        refreshHazardTelemetry,
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
