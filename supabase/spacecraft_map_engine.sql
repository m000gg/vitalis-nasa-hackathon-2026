-- Spacecraft Map Engine persistence proposal.
-- REVIEW AND APPLY MANUALLY after team approval. This file has not been run against the shared project.

create table if not exists public.spacecraft_blueprints (
  id text primary key,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  seed text not null,
  generator_version text not null,
  configuration jsonb not null,
  geometry jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, seed, generator_version)
);

create index if not exists idx_spacecraft_blueprints_scenario
  on public.spacecraft_blueprints(scenario_id, created_at desc);

create table if not exists public.spacecraft_map_states (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null references public.scenarios(id) on delete cascade,
  blueprint_id text not null references public.spacecraft_blueprints(id) on delete restrict,
  branch_id text not null,
  simulation_minute integer not null check (simulation_minute >= 0),
  state_bundle jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_spacecraft_map_states_restore
  on public.spacecraft_map_states(scenario_id, branch_id, created_at desc);

alter table public.spacecraft_blueprints enable row level security;
alter table public.spacecraft_map_states enable row level security;

-- Map writes are intentionally server-only until Vitalis+ has user-bound mission authorization.
revoke all on table public.spacecraft_blueprints from anon, authenticated;
revoke all on table public.spacecraft_map_states from anon, authenticated;
grant select, insert, update, delete on table public.spacecraft_blueprints to service_role;
grant select, insert, update, delete on table public.spacecraft_map_states to service_role;
