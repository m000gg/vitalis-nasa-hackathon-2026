import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { restoreMap, serializeMap } from "./state";
import type { MissionBranch, MapSnapshot, SpacecraftBlueprint, SpacecraftMapState } from "./types";

function requireTrustedMapPersistence() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Spacecraft map persistence requires the server-only SUPABASE_SERVICE_ROLE_KEY. Demo Mode remains browser-local.");
  }
  return getSupabaseServerClient();
}

export async function saveSpacecraftMap(input: {
  scenarioId: string;
  blueprint: SpacecraftBlueprint;
  state: SpacecraftMapState;
  snapshots?: MapSnapshot[];
  branches?: MissionBranch[];
}) {
  const client = requireTrustedMapPersistence();
  const bundle = serializeMap(input.blueprint, input.state, input.snapshots ?? [], input.branches ?? []);
  const { error: blueprintError } = await client.from("spacecraft_blueprints").upsert({
    id: input.blueprint.id,
    scenario_id: input.scenarioId,
    seed: input.blueprint.seed,
    generator_version: input.blueprint.generatorVersion,
    configuration: { width: input.blueprint.width, height: input.blueprint.height, createdFor: input.blueprint.createdFor },
    geometry: input.blueprint,
  });
  if (blueprintError) throw new Error(`Unable to persist spacecraft blueprint: ${blueprintError.message}`);
  const { data, error } = await client.from("spacecraft_map_states").insert({
    scenario_id: input.scenarioId,
    blueprint_id: input.blueprint.id,
    branch_id: input.state.branchId,
    simulation_minute: input.state.simulationMinute,
    state_bundle: JSON.parse(bundle),
  }).select("id").single();
  if (error) throw new Error(`Unable to persist spacecraft map state: ${error.message}`);
  return { stateId: String(data.id) };
}

export async function loadLatestSpacecraftMap(scenarioId: string, branchId = "main") {
  const client = requireTrustedMapPersistence();
  const { data, error } = await client
    .from("spacecraft_map_states")
    .select("state_bundle")
    .eq("scenario_id", scenarioId)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Unable to restore spacecraft map state: ${error.message}`);
  if (!data) return null;
  return restoreMap(JSON.stringify(data.state_bundle));
}
