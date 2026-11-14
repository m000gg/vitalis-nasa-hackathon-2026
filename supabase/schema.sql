-- Vitalis+ Supabase Schema
-- Split cleanly into:
--   1. scenarios
--   2. characters (linked to a specific scenario via scenario_id)
--   3. character_hazard_data (linked to scenario + character + hazard_slug)
--   4. dtn_messages & emergency_audit_logs (operational logs)

create table if not exists public.scenarios (
  id text primary key,
  name text not null,
  phase text not null,
  duration_context text not null,
  comms_delay_label text not null,
  active_hazards_highlight text[] not null default '{}',
  scenario_description text not null,
  environment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.characters (
  id text primary key,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  callsign text not null,
  assigned_role_title text not null,
  is_lead_slot boolean not null default false,
  readiness_state text not null default 'GO' check (readiness_state in ('GO', 'CONDITIONAL', 'HOLD')),
  eva_gate_state text not null default 'GO' check (eva_gate_state in ('GO', 'CONDITIONAL', 'NO-GO')),
  shelter_confirmed boolean not null default false,
  public_status_summary text not null default '',
  private_member_notes text not null default '',
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_characters_scenario_id on public.characters(scenario_id);

create table if not exists public.character_hazard_data (
  id text primary key,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  hazard_slug text not null check (hazard_slug in ('radiation', 'isolation', 'distance', 'gravity', 'environment')),
  stream_name text not null,
  raw_value text not null default '',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (scenario_id, character_id, hazard_slug, stream_name)
);

create index if not exists idx_hazard_data_lookup
  on public.character_hazard_data(scenario_id, character_id, hazard_slug);

create table if not exists public.character_hazard_samples (
  id text primary key,
  scenario_id text not null references public.scenarios(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  hazard_slug text not null check (hazard_slug in ('radiation', 'isolation', 'distance', 'gravity', 'environment')),
  stream_name text not null,
  numeric_value double precision,
  sample_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_hazard_samples_lookup
  on public.character_hazard_samples(scenario_id, character_id, hazard_slug, stream_name, recorded_at);

create table if not exists public.dtn_messages (
  id text primary key,
  scenario_id text references public.scenarios(id) on delete set null,
  report_title text not null,
  sender_callsign text not null,
  hazard_slug text not null,
  status text not null check (status in ('PENDING', 'SENT', 'ACKNOWLEDGED')),
  payload_summary text not null,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  acknowledged_at timestamptz
);

create table if not exists public.emergency_audit_logs (
  id text primary key,
  scenario_id text references public.scenarios(id) on delete set null,
  event_type text not null,
  actor_role text not null,
  target_callsign text not null default '',
  detail text not null,
  created_at timestamptz not null default now()
);

-- Hackathon/dev permissions for Supabase Publishable / Anon keys (+ service_role).
-- For production hardening: enable RLS, drop `anon` grants, and use `SUPABASE_SERVICE_ROLE_KEY` strictly on the server.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table
  public.scenarios,
  public.characters,
  public.character_hazard_data,
  public.character_hazard_samples,
  public.dtn_messages,
  public.emergency_audit_logs
to anon, authenticated, service_role;

-- Seed starter scenarios (optional; safe to re-run with ON CONFLICT DO NOTHING)
insert into public.scenarios (id, name, phase, duration_context, comms_delay_label, active_hazards_highlight, scenario_description, environment)
values
  (
    'mars-transit-126',
    'Mars Transit — Mission Day 126',
    'TRANSIT_MICROGRAVITY',
    'Here is: Long-duration deep-space transit (~3-year round-trip baseline)',
    'Add your info: One-way light delay (4–24 min) / Round-trip (8–48 min) here',
    array['Space Radiation', 'Distance from Earth', 'Hostile/Closed Environments'],
    'Here is: Deep-space transit scenario with communication latency and shared closed-habitat telemetry.',
    '{"commsDelaySlot":"Add your info: Current Earth–Mars RTT delay (min) here","linkOnlineDefault":false,"radiationStatusSlot":"Add your info: Transit compartment dose-rate & DONKI SEP status here","atmosphereStatusSlot":"Add your info: Cabin CO₂ (mmHg), O₂ (mmHg), pressure (psia) here","acousticsStatusSlot":"Add your info: Sleep quarter dBA vs NC-40 curve here","isolationStatusSlot":"Add your info: Transit day % & confinement baseline here","gravityStatusSlot":"Add your info: Microgravity conditioning & EVA schedule status here"}'::jsonb
  ),
  (
    'chapea-surface-210',
    'Mars Surface / CHAPEA Analog — Sol 210',
    'SURFACE_OPERATIONS',
    'Here is: 365-day surface habitat simulation (Sol 24h 39m circadian cycle)',
    'Add your info: Simulated surface comms delay (up to 44 min RTT) here',
    array['Isolation & Confinement', 'Gravity Fields', 'Space Radiation'],
    'Here is: Surface habitat scenario with circadian drift, Third-Quarter confinement window, and surface EVA gates.',
    '{"commsDelaySlot":"Add your info: Surface RTT comms delay (min) here","linkOnlineDefault":false,"radiationStatusSlot":"Add your info: Surface habitat vs. rover dosimeter readings here","atmosphereStatusSlot":"Add your info: Surface habitat CO₂ / O₂ / pressure readings here","acousticsStatusSlot":"Add your info: Crew quarters NC-40 noise reading here","isolationStatusSlot":"Add your info: Sol 210 circadian drift & Third-Quarter flag here","gravityStatusSlot":"Add your info: Surface EVA readiness & conditioning log here"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.characters (id, scenario_id, callsign, assigned_role_title, is_lead_slot, readiness_state, eva_gate_state, shelter_confirmed, public_status_summary, private_member_notes, metrics)
values
  (
    'mt-cmdr',
    'mars-transit-126',
    'Leader — Commander',
    'Crew Captain / Mission Commander',
    true,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & shelter oversight status',
    'Add your info: Personal private reflection slot here',
    '{"etaSlot":"Add your info: Next command review / shelter window ETA here","doseSlot":"Add your info: Personal cumulative dose (Gy / Sv) here","sleepSlot":"Add your info: Personal sleep duration & quality slot here","fatigueSlot":"Add your info: 60s self-check / PVT-B baseline slot here","exerciseAdherenceSlot":"Add your info: Daily 2.5h exercise adherence slot here","blockers":[],"actions":["Here is: Action 1 — Verify crew shelter confirmations & DTN outbound queue.","Here is: Action 2 — Review module atmosphere & radiation compartment map."]}'::jsonb
  ),
  (
    'mt-cmo',
    'mars-transit-126',
    'Member 1 — Crew Medical Officer',
    'Designated Crew Medical Officer (CMO)',
    false,
    'CONDITIONAL',
    'CONDITIONAL',
    false,
    'Here is: Anonymized duty readiness (pre-EVA / fatigue check pending)',
    'Add your info: Private journal / symptom & mood notes here',
    '{"etaSlot":"Add your info: Estimated Time of Action for pre-EVA / symptom check here","doseSlot":"Add your info: Personal cumulative dose (Gy / Sv) here","sleepSlot":"Add your info: Personal sleep duration (h) & quality slot here","fatigueSlot":"Add your info: Subjective fatigue (1–5) & PVT-B slot here","exerciseAdherenceSlot":"Add your info: Daily exercise log slot here","blockers":["Here is: Pending shelter confirmation","Here is: Pre-EVA health status check due"],"actions":["Here is: Action 1 — Complete 60s self-check and confirm shelter route.","Here is: Action 2 — Verify non-expired medical kit items for autonomous care."]}'::jsonb
  )
on conflict (id) do nothing;
