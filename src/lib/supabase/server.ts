import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CrewSlot, MissionProfile } from "@/lib/domain";
import { HazardDataRecord, HazardSampleRecord, HazardSlug } from "@/lib/hazards/types";

let cachedClient: SupabaseClient | undefined;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export function getSupabaseServerClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

interface ScenarioRow {
  id: string;
  name: string;
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

interface HazardSampleRow {
  id: string;
  scenario_id: string;
  character_id: string;
  hazard_slug: HazardSlug;
  stream_name: string;
  numeric_value: number | null;
  sample_payload: Record<string, unknown>;
  recorded_at: string;
}

function mapCharacterRow(row: CharacterRow): CrewSlot {
  return {
    id: row.id,
    callsign: row.callsign,
    assignedRoleTitle: row.assigned_role_title,
    isLeadSlot: row.is_lead_slot,
    publicStatusSummary: row.public_status_summary,
    privateMemberNotesSlot: row.private_member_notes,
    metrics: row.metrics,
  };
}

export async function fetchScenariosFromDb(): Promise<{ scenarios: MissionProfile[] }> {
  const client = getSupabaseServerClient();

  const { data: scenarioRows, error: sErr } = await client
    .from("scenarios")
    .select("*")
    .order("created_at", { ascending: true });

  if (sErr) {
    throw new Error(`Supabase error fetching public.scenarios: ${sErr.message}`);
  }

  const { data: characterRows, error: cErr } = await client
    .from("characters")
    .select("*")
    .order("created_at", { ascending: true });

  if (cErr) {
    throw new Error(`Supabase error fetching public.characters: ${cErr.message}`);
  }

  const mapped: MissionProfile[] = ((scenarioRows ?? []) as ScenarioRow[]).map((s) => ({
    id: s.id,
    name: s.name,
    durationContext: s.duration_context,
    commsDelayLabel: s.comms_delay_label,
    activeHazardsHighlight: s.active_hazards_highlight ?? [],
    scenarioDescriptionSlot: s.scenario_description,
    environment: s.environment,
    crew: ((characterRows ?? []) as CharacterRow[])
      .filter((c) => c.scenario_id === s.id)
      .map(mapCharacterRow),
  }));

  return { scenarios: mapped };
}

export async function createScenarioInDb(input: {
  id: string;
  name: string;
  durationContext: string;
  scenarioDescriptionSlot: string;
  commsDelayLabel: string;
  leaderCallsign?: string;
}): Promise<{ scenario: MissionProfile }> {
  const client = getSupabaseServerClient();

  const defaultLeader: CrewSlot = {
    id: `${input.id}-lead`,
    callsign: input.leaderCallsign || "Leader — Commander",
    assignedRoleTitle: "Crew Captain / Mission Commander",
    isLeadSlot: true,
    publicStatusSummary: "Mission commander hazard & crew oversight status",
    privateMemberNotesSlot: "",
    metrics: {
      etaSlot: "Pending telemetry",
      doseSlot: "Pending dosimetry",
      sleepSlot: "Pending sleep log",
      fatigueSlot: "Pending self-check",
      exerciseAdherenceSlot: "Pending exercise log",
      blockers: [],
      actions: [
        "Action 1 — Review crew vitals across all 5 NASA hazard zones.",
        "Action 2 — Review module environmental telemetry.",
      ],
    },
  };

  const defaultMembers: CrewSlot[] = [1, 2, 3, 4].map((num) => ({
    id: `${input.id}-m${num}`,
    callsign: `Member ${num}`,
    assignedRoleTitle: `Crew Member ${num}`,
    isLeadSlot: false,
    publicStatusSummary: `Nominal monitoring status for Member ${num}`,
    privateMemberNotesSlot: "",
    metrics: {
      etaSlot: "Pending telemetry",
      doseSlot: "Pending dosimetry",
      sleepSlot: "Pending sleep log",
      fatigueSlot: "Pending self-check",
      exerciseAdherenceSlot: "Pending exercise log",
      blockers: [],
      actions: [
        "Action 1 — Complete 60s guided self-check.",
        "Action 2 — Review habitat & radiation telemetry.",
      ],
    },
  }));

  const defaultCrew = [defaultLeader, ...defaultMembers];

  const scenario: MissionProfile = {
    id: input.id,
    name: input.name,
    durationContext: input.durationContext,
    commsDelayLabel: input.commsDelayLabel,
    activeHazardsHighlight: ["Space Radiation", "Isolation & Confinement", "Distance from Earth"],
    scenarioDescriptionSlot: input.scenarioDescriptionSlot,
    environment: {
      commsDelaySlot: input.commsDelayLabel,
      radiationStatusSlot: "Pending radiation telemetry",
      atmosphereStatusSlot: "Pending atmosphere telemetry",
      acousticsStatusSlot: "Pending acoustic telemetry",
      isolationStatusSlot: "Pending circadian telemetry",
      gravityStatusSlot: "Pending conditioning telemetry",
    },
    crew: defaultCrew,
  };

  const { error: sErr } = await client.from("scenarios").insert({
    id: scenario.id,
    name: scenario.name,
    duration_context: scenario.durationContext,
    comms_delay_label: scenario.commsDelayLabel,
    active_hazards_highlight: scenario.activeHazardsHighlight,
    scenario_description: scenario.scenarioDescriptionSlot,
    environment: scenario.environment,
  });

  if (sErr) {
    throw new Error(`Supabase error inserting into public.scenarios: ${sErr.message}`);
  }

  const { error: cErr } = await client.from("characters").insert(
    defaultCrew.map((member) => ({
      id: member.id,
      scenario_id: scenario.id,
      callsign: member.callsign,
      assigned_role_title: member.assignedRoleTitle,
      is_lead_slot: member.isLeadSlot,
      public_status_summary: member.publicStatusSummary,
      private_member_notes: member.privateMemberNotesSlot,
      metrics: member.metrics,
    }))
  );

  if (cErr) {
    throw new Error(`Supabase error inserting default crew into public.characters: ${cErr.message}`);
  }

  return { scenario };
}

export async function createCharacterInDb(input: {
  scenarioId: string;
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
}): Promise<{ character: CrewSlot }> {
  const client = getSupabaseServerClient();

  const character: CrewSlot = {
    id: input.id,
    callsign: input.callsign,
    assignedRoleTitle: input.assignedRoleTitle,
    isLeadSlot: input.isLeadSlot,
    publicStatusSummary: `Nominal hazard monitoring (${input.assignedRoleTitle})`,
    privateMemberNotesSlot: "",
    metrics: {
      etaSlot: "Pending telemetry",
      doseSlot: "Pending dosimetry",
      sleepSlot: "Pending sleep log",
      fatigueSlot: "Pending self-check",
      exerciseAdherenceSlot: "Pending exercise log",
      blockers: [],
      actions: [
        "Action 1 — Complete 60s guided self-check.",
        "Action 2 — Review daily conditioning and module telemetry.",
      ],
    },
  };

  const { error } = await client.from("characters").insert({
    id: character.id,
    scenario_id: input.scenarioId,
    callsign: character.callsign,
    assigned_role_title: character.assignedRoleTitle,
    is_lead_slot: character.isLeadSlot,
    public_status_summary: character.publicStatusSummary,
    private_member_notes: character.privateMemberNotesSlot,
    metrics: character.metrics,
  });

  if (error) {
    throw new Error(`Supabase error inserting into public.characters: ${error.message}`);
  }

  return { character };
}

export async function updateCharacterInDb(input: {
  id: string;
  callsign?: string;
  assignedRoleTitle?: string;
  isLeadSlot?: boolean;
  publicStatusSummary?: string;
  privateMemberNotesSlot?: string;
  metrics?: CrewSlot["metrics"];
}): Promise<{ character: CrewSlot }> {
  const client = getSupabaseServerClient();

  const updates: Record<string, unknown> = {};
  if (input.callsign !== undefined) updates.callsign = input.callsign;
  if (input.assignedRoleTitle !== undefined) updates.assigned_role_title = input.assignedRoleTitle;
  if (input.isLeadSlot !== undefined) updates.is_lead_slot = input.isLeadSlot;
  if (input.publicStatusSummary !== undefined) updates.public_status_summary = input.publicStatusSummary;
  if (input.privateMemberNotesSlot !== undefined) updates.private_member_notes = input.privateMemberNotesSlot;
  if (input.metrics !== undefined) updates.metrics = input.metrics;

  const { data, error } = await client
    .from("characters")
    .update(updates)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Supabase error updating character '${input.id}' in public.characters: ${error?.message ?? "Not found"}`
    );
  }

  return { character: mapCharacterRow(data as CharacterRow) };
}

export async function fetchHazardDataFromDb(params: {
  scenarioId: string;
  characterId?: string;
  hazardSlug?: HazardSlug;
}): Promise<{ records: HazardDataRecord[] }> {
  const client = getSupabaseServerClient();

  let query = client
    .from("character_hazard_data")
    .select("*")
    .eq("scenario_id", params.scenarioId);

  if (params.characterId) {
    query = query.eq("character_id", params.characterId);
  }

  if (params.hazardSlug) {
    query = query.eq("hazard_slug", params.hazardSlug);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase error fetching public.character_hazard_data: ${error.message}`);
  }

  const records: HazardDataRecord[] = ((data ?? []) as HazardDataRow[]).map((r) => ({
    id: r.id,
    scenarioId: r.scenario_id,
    characterId: r.character_id,
    hazardSlug: r.hazard_slug,
    streamName: r.stream_name,
    rawValue: r.raw_value,
    payload: r.payload ?? {},
    updatedAt: r.updated_at,
  }));

  return { records };
}

export async function upsertHazardDataInDb(input: {
  scenarioId: string;
  characterId: string;
  hazardSlug: HazardSlug;
  streamName: string;
  rawValue: string;
  payload?: Record<string, unknown>;
}): Promise<{ record: HazardDataRecord }> {
  const client = getSupabaseServerClient();

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
    throw new Error(`Supabase error upserting public.character_hazard_data: ${error.message}`);
  }

  return { record };
}

export async function fetchHazardSamplesFromDb(params: {
  scenarioId: string;
  characterId?: string;
  hazardSlug?: HazardSlug;
  streamName?: string;
}): Promise<{ samples: HazardSampleRecord[] }> {
  const client = getSupabaseServerClient();

  let query = client
    .from("character_hazard_samples")
    .select("*")
    .eq("scenario_id", params.scenarioId);

  if (params.characterId) {
    query = query.eq("character_id", params.characterId);
  }

  if (params.hazardSlug) {
    query = query.eq("hazard_slug", params.hazardSlug);
  }
  if (params.streamName) {
    query = query.eq("stream_name", params.streamName);
  }

  const { data, error } = await query.order("recorded_at", { ascending: true });
  if (error) {
    throw new Error(`Supabase error fetching public.character_hazard_samples: ${error.message}`);
  }

  const samples: HazardSampleRecord[] = ((data ?? []) as HazardSampleRow[]).map((r) => ({
    id: r.id,
    scenarioId: r.scenario_id,
    characterId: r.character_id,
    hazardSlug: r.hazard_slug,
    streamName: r.stream_name,
    numericValue: typeof r.numeric_value === "number" ? r.numeric_value : null,
    samplePayload: r.sample_payload ?? {},
    recordedAt: r.recorded_at,
  }));

  return { samples };
}

export async function insertHazardSampleInDb(input: {
  scenarioId: string;
  characterId: string;
  hazardSlug: HazardSlug;
  streamName: string;
  numericValue?: number | null;
  samplePayload?: Record<string, unknown>;
}): Promise<{ sample: HazardSampleRecord }> {
  const client = getSupabaseServerClient();

  const now = new Date().toISOString();
  const sample: HazardSampleRecord = {
    id: `${input.scenarioId}__${input.characterId}__${input.hazardSlug}__${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    scenarioId: input.scenarioId,
    characterId: input.characterId,
    hazardSlug: input.hazardSlug,
    streamName: input.streamName,
    numericValue:
      typeof input.numericValue === "number" && Number.isFinite(input.numericValue)
        ? input.numericValue
        : null,
    samplePayload: input.samplePayload ?? {},
    recordedAt: now,
  };

  const { error } = await client.from("character_hazard_samples").insert({
    id: sample.id,
    scenario_id: sample.scenarioId,
    character_id: sample.characterId,
    hazard_slug: sample.hazardSlug,
    stream_name: sample.streamName,
    numeric_value: sample.numericValue,
    sample_payload: sample.samplePayload,
    recorded_at: sample.recordedAt,
  });

  if (error) {
    throw new Error(`Supabase error inserting into public.character_hazard_samples: ${error.message}`);
  }

  return { sample };
}
