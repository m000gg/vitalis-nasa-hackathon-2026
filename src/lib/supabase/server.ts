import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CrewSlot, MISSIONS, MissionProfile } from "@/lib/domain";
import { HazardDataRecord, HazardSlug } from "@/lib/hazards/types";

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

interface ScenarioRow {
  id: string;
  name: string;
  phase: string;
  duration_context: string;
  comms_delay_label: string;
  active_hazards_highlight: string[];
  scenario_description: string;
  environment: MissionProfile["environment"];
}

interface CharacterRow {
  id: string;
  scenario_id: string;
  callsign: string;
  assigned_role_title: string;
  is_lead_slot: boolean;
  readiness_state: CrewSlot["readinessState"];
  eva_gate_state: CrewSlot["evaGateState"];
  shelter_confirmed: boolean;
  public_status_summary: string;
  private_member_notes: string;
  metrics: CrewSlot["metrics"];
}

interface HazardDataRow {
  id: string;
  scenario_id: string;
  character_id: string;
  hazard_slug: HazardSlug;
  stream_name: string;
  raw_value: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

function mapCharacterRow(row: CharacterRow): CrewSlot {
  return {
    id: row.id,
    callsign: row.callsign,
    assignedRoleTitle: row.assigned_role_title,
    isLeadSlot: row.is_lead_slot,
    readinessState: row.readiness_state,
    evaGateState: row.eva_gate_state,
    shelterConfirmed: row.shelter_confirmed,
    publicStatusSummary: row.public_status_summary,
    privateMemberNotesSlot: row.private_member_notes,
    metrics: row.metrics,
  };
}

export async function fetchScenariosFromDb(): Promise<{ source: "supabase" | "local"; scenarios: MissionProfile[] }> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { source: "local", scenarios: MISSIONS };
  }

  const { data: scenarioRows, error: sErr } = await client
    .from("scenarios")
    .select("*")
    .order("created_at", { ascending: true });

  if (sErr || !scenarioRows || scenarioRows.length === 0) {
    return { source: "local", scenarios: MISSIONS };
  }

  const { data: characterRows, error: cErr } = await client
    .from("characters")
    .select("*")
    .order("created_at", { ascending: true });

  if (cErr || !characterRows) {
    return { source: "local", scenarios: MISSIONS };
  }

  const mapped: MissionProfile[] = (scenarioRows as ScenarioRow[]).map((s) => ({
    id: s.id,
    name: s.name,
    phase: s.phase,
    durationContext: s.duration_context,
    commsDelayLabel: s.comms_delay_label,
    activeHazardsHighlight: s.active_hazards_highlight ?? [],
    scenarioDescriptionSlot: s.scenario_description,
    environment: s.environment,
    crew: (characterRows as CharacterRow[])
      .filter((c) => c.scenario_id === s.id)
      .map(mapCharacterRow),
  }));

  return { source: "supabase", scenarios: mapped };
}

export async function createScenarioInDb(input: {
  id: string;
  name: string;
  phase: string;
  scenarioDescriptionSlot: string;
  commsDelayLabel: string;
  leaderCallsign?: string;
}): Promise<{ source: "supabase" | "local"; scenario: MissionProfile; error?: string }> {
  const defaultLeader: CrewSlot = {
    id: `${input.id}-lead`,
    callsign: input.leaderCallsign || "Leader — Commander",
    assignedRoleTitle: "Crew Captain / Mission Commander",
    isLeadSlot: true,
    readinessState: "GO",
    evaGateState: "GO",
    shelterConfirmed: true,
    publicStatusSummary: "Here is: Duty readiness & shelter oversight status",
    privateMemberNotesSlot: "Add your info: Personal private reflection slot here",
    metrics: {
      etaSlot: "Add your info: Next command review / shelter window ETA here",
      doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
      sleepSlot: "Add your info: Personal sleep duration slot here",
      fatigueSlot: "Add your info: 60s self-check slot here",
      exerciseAdherenceSlot: "Add your info: Daily 2.5h exercise adherence slot here",
      blockers: [],
      actions: [
        "Here is: Action 1 — Verify crew readiness & shelter status.",
        "Here is: Action 2 — Review module environmental telemetry.",
      ],
    },
  };

  const scenario: MissionProfile = {
    id: input.id,
    name: input.name,
    phase: input.phase,
    durationContext: `Here is: Custom scenario (${input.phase})`,
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
    crew: [defaultLeader],
  };

  const client = getSupabaseServerClient();
  if (!client) {
    return { source: "local", scenario };
  }

  const { error: sErr } = await client.from("scenarios").insert({
    id: scenario.id,
    name: scenario.name,
    phase: scenario.phase,
    duration_context: scenario.durationContext,
    comms_delay_label: scenario.commsDelayLabel,
    active_hazards_highlight: scenario.activeHazardsHighlight,
    scenario_description: scenario.scenarioDescriptionSlot,
    environment: scenario.environment,
  });

  if (sErr) {
    return { source: "local", scenario, error: sErr.message };
  }

  await client.from("characters").insert({
    id: defaultLeader.id,
    scenario_id: scenario.id,
    callsign: defaultLeader.callsign,
    assigned_role_title: defaultLeader.assignedRoleTitle,
    is_lead_slot: defaultLeader.isLeadSlot,
    readiness_state: defaultLeader.readinessState,
    eva_gate_state: defaultLeader.evaGateState,
    shelter_confirmed: defaultLeader.shelterConfirmed,
    public_status_summary: defaultLeader.publicStatusSummary,
    private_member_notes: defaultLeader.privateMemberNotesSlot,
    metrics: defaultLeader.metrics,
  });

  return { source: "supabase", scenario };
}

export async function createCharacterInDb(input: {
  scenarioId: string;
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  readinessState: CrewSlot["readinessState"];
  evaGateState: CrewSlot["evaGateState"];
}): Promise<{ source: "supabase" | "local"; character: CrewSlot; error?: string }> {
  const character: CrewSlot = {
    id: input.id,
    callsign: input.callsign,
    assignedRoleTitle: input.assignedRoleTitle,
    isLeadSlot: input.isLeadSlot,
    readinessState: input.readinessState,
    evaGateState: input.evaGateState,
    shelterConfirmed: false,
    publicStatusSummary: `Here is: Duty readiness (${input.readinessState}) & EVA (${input.evaGateState})`,
    privateMemberNotesSlot: "Add your info: Private journal / personal notes here",
    metrics: {
      etaSlot: "Add your info: Character Estimated Time of Action here",
      doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
      sleepSlot: "Add your info: Sleep duration (h) & quality slot here",
      fatigueSlot: "Add your info: Subjective fatigue (1–5) & PVT-B slot here",
      exerciseAdherenceSlot: "Add your info: Daily exercise log slot here",
      blockers: input.readinessState === "GO" ? [] : ["Here is: Readiness or EVA check pending"],
      actions: [
        "Here is: Action 1 — Complete 60s guided self-check.",
        "Here is: Action 2 — Confirm shelter & habitat readiness.",
      ],
    },
  };

  const client = getSupabaseServerClient();
  if (!client) {
    return { source: "local", character };
  }

  const { error } = await client.from("characters").insert({
    id: character.id,
    scenario_id: input.scenarioId,
    callsign: character.callsign,
    assigned_role_title: character.assignedRoleTitle,
    is_lead_slot: character.isLeadSlot,
    readiness_state: character.readinessState,
    eva_gate_state: character.evaGateState,
    shelter_confirmed: character.shelterConfirmed,
    public_status_summary: character.publicStatusSummary,
    private_member_notes: character.privateMemberNotesSlot,
    metrics: character.metrics,
  });

  if (error) {
    return { source: "local", character, error: error.message };
  }

  return { source: "supabase", character };
}

export async function fetchHazardDataFromDb(params: {
  scenarioId: string;
  characterId: string;
  hazardSlug?: HazardSlug;
}): Promise<{ source: "supabase" | "local"; records: HazardDataRecord[] }> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { source: "local", records: [] };
  }

  let query = client
    .from("character_hazard_data")
    .select("*")
    .eq("scenario_id", params.scenarioId)
    .eq("character_id", params.characterId);

  if (params.hazardSlug) {
    query = query.eq("hazard_slug", params.hazardSlug);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error || !data) {
    return { source: "local", records: [] };
  }

  const records: HazardDataRecord[] = (data as HazardDataRow[]).map((r) => ({
    id: r.id,
    scenarioId: r.scenario_id,
    characterId: r.character_id,
    hazardSlug: r.hazard_slug,
    streamName: r.stream_name,
    rawValue: r.raw_value,
    payload: r.payload ?? {},
    updatedAt: r.updated_at,
  }));

  return { source: "supabase", records };
}

export async function upsertHazardDataInDb(input: {
  scenarioId: string;
  characterId: string;
  hazardSlug: HazardSlug;
  streamName: string;
  rawValue: string;
  payload?: Record<string, unknown>;
}): Promise<{ source: "supabase" | "local"; record: HazardDataRecord; error?: string }> {
  const record: HazardDataRecord = {
    id: `${input.scenarioId}__${input.characterId}__${input.hazardSlug}__${input.streamName}`.replace(/\s+/g, "_"),
    scenarioId: input.scenarioId,
    characterId: input.characterId,
    hazardSlug: input.hazardSlug,
    streamName: input.streamName,
    rawValue: input.rawValue,
    payload: input.payload ?? { rawValue: input.rawValue },
    updatedAt: new Date().toISOString(),
  };

  const client = getSupabaseServerClient();
  if (!client) {
    return { source: "local", record };
  }

  const { error } = await client.from("character_hazard_data").upsert(
    {
      id: record.id,
      scenario_id: record.scenarioId,
      character_id: record.characterId,
      hazard_slug: record.hazardSlug,
      stream_name: record.streamName,
      raw_value: record.rawValue,
      payload: record.payload,
      updated_at: record.updatedAt,
    },
    { onConflict: "scenario_id,character_id,hazard_slug,stream_name" }
  );

  if (error) {
    return { source: "local", record, error: error.message };
  }

  return { source: "supabase", record };
}
