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

-- Hackathon/dev RLS policies so publishable/anon key can read & write when RLS is enabled.
-- For production hardening: tighten these policies or drop `anon` access and use `SUPABASE_SERVICE_ROLE_KEY` on the server.
alter table public.scenarios enable row level security;
alter table public.characters enable row level security;
alter table public.character_hazard_data enable row level security;
alter table public.character_hazard_samples enable row level security;
alter table public.dtn_messages enable row level security;
alter table public.emergency_audit_logs enable row level security;

drop policy if exists "vitalis_dev_all_scenarios" on public.scenarios;
create policy "vitalis_dev_all_scenarios" on public.scenarios for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_characters" on public.characters;
create policy "vitalis_dev_all_characters" on public.characters for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_hazard_data" on public.character_hazard_data;
create policy "vitalis_dev_all_hazard_data" on public.character_hazard_data for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_hazard_samples" on public.character_hazard_samples;
create policy "vitalis_dev_all_hazard_samples" on public.character_hazard_samples for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_dtn" on public.dtn_messages;
create policy "vitalis_dev_all_dtn" on public.dtn_messages for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_audit" on public.emergency_audit_logs;
create policy "vitalis_dev_all_audit" on public.emergency_audit_logs for all to anon, authenticated using (true) with check (true);

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
  -- ==========================================================================
  -- SCENARIO 1: mars-transit-126 (1 Leader + 4 Members)
  -- ==========================================================================
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
  ),
  (
    'mt-fe',
    'mars-transit-126',
    'Member 2 — Flight Engineer',
    'ECLSS & Habitat Systems Engineer',
    false,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & ECLSS module assignment',
    'Add your info: Private sleep/journal notes here',
    '{"etaSlot":"Add your info: Next ECLSS / habitat check window here","doseSlot":"Add your info: Personal cumulative dose (Gy / Sv) here","sleepSlot":"Add your info: Personal sleep duration (h) slot here","fatigueSlot":"Add your info: PVT-B vigilance baseline slot here","exerciseAdherenceSlot":"Add your info: Aerobic + resistance adherence slot here","blockers":[],"actions":["Here is: Action 1 — Log daily module CO₂ & acoustic check.","Here is: Action 2 — Maintain 2.5h daily exercise schedule."]}'::jsonb
  ),
  (
    'mt-ps',
    'mars-transit-126',
    'Member 3 — Payload Specialist',
    'Science & BioShield Specialist',
    false,
    'HOLD',
    'NO-GO',
    false,
    'Here is: Non-clinical blocker category (overdue check / shelter pending)',
    'Add your info: Private mood/medication notes here',
    '{"etaSlot":"Add your info: Immediate action countdown before task hold review here","doseSlot":"Add your info: Personal cumulative dose (Gy / Sv) here","sleepSlot":"Add your info: Personal sleep duration (h) slot here","fatigueSlot":"Add your info: 60s self-check / fatigue score slot here","exerciseAdherenceSlot":"Add your info: Calf volume & exercise adherence slot here","blockers":["Here is: Overdue measurement / EVA gate hold","Here is: Shelter confirmation pending"],"actions":["Here is: Action 1 — Complete overdue pre-test check under valid conditions.","Here is: Action 2 — Confirm shelter assignment & log 10-min Veggie module check."]}'::jsonb
  ),
  (
    'mt-ops',
    'mars-transit-126',
    'Member 4 — Habitat & Comms Officer',
    'DTN Relay & Human Factors Specialist',
    false,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & DTN queue watch status',
    'Add your info: Private journal & circadian log here',
    '{"etaSlot":"Add your info: Next DTN sync & lights-out window ETA here","doseSlot":"Add your info: Personal cumulative dose (Gy / Sv) here","sleepSlot":"Add your info: Personal sleep duration (h) & light exposure slot here","fatigueSlot":"Add your info: 60s self-check / mood slot here","exerciseAdherenceSlot":"Add your info: Daily exercise adherence slot here","blockers":[],"actions":["Here is: Action 1 — Monitor DTN outbound queue during link windows.","Here is: Action 2 — Log personal circadian & acoustic check."]}'::jsonb
  ),

  -- ==========================================================================
  -- SCENARIO 2: chapea-surface-210 (1 Leader + 4 Members)
  -- ==========================================================================
  (
    'ch-cmdr',
    'chapea-surface-210',
    'Leader — Habitat Commander',
    'Surface Operations Lead',
    true,
    'GO',
    'GO',
    true,
    'Here is: Commander readiness & team schedule oversight',
    'Add your info: Private reflection slot here',
    '{"etaSlot":"Add your info: Next sol crew briefing window here","doseSlot":"Add your info: Cumulative surface dose slot here","sleepSlot":"Add your info: Sol sleep alignment slot here","fatigueSlot":"Add your info: PVT-B check slot here","exerciseAdherenceSlot":"Add your info: Daily exercise slot here","blockers":[],"actions":["Here is: Action 1 — Review Third-Quarter team buffs & acoustic compliance.","Here is: Action 2 — Verify surface EVA gate statuses across crew."]}'::jsonb
  ),
  (
    'ch-bio',
    'chapea-surface-210',
    'Member 1 — Medical & Bio Officer',
    'Health & Plant-Module Lead',
    false,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & Veggie module rotation',
    'Add your info: Private wellness log here',
    '{"etaSlot":"Add your info: Next Veggie / biomarker window here","doseSlot":"Add your info: Personal dose slot here","sleepSlot":"Add your info: Sleep duration slot here","fatigueSlot":"Add your info: Fatigue score slot here","exerciseAdherenceSlot":"Add your info: Exercise log slot here","blockers":[],"actions":["Here is: Action 1 — Complete habitat plant-module sensory care.","Here is: Action 2 — Verify onboard Med Kit expiry log."]}'::jsonb
  ),
  (
    'ch-eng',
    'chapea-surface-210',
    'Member 2 — Rover & EVA Engineer',
    'Surface Mobility & Suit Lead',
    false,
    'CONDITIONAL',
    'CONDITIONAL',
    false,
    'Here is: Sleep/acoustic exposure flag (clinical details private)',
    'Add your info: Private sleep & mood reflection here',
    '{"etaSlot":"Add your info: Pre-EVA rest / acoustic mitigation ETA here","doseSlot":"Add your info: Rover vs. base dose slot here","sleepSlot":"Add your info: Sleep quarter duration & noise note here","fatigueSlot":"Add your info: PVT-B reaction delta slot here","exerciseAdherenceSlot":"Add your info: Resistance/aerobic log slot here","blockers":["Here is: Sleep-quarter acoustic check flagged"],"actions":["Here is: Action 1 — Use acoustic protection or relocate sleep bay tonight.","Here is: Action 2 — Run 3-min vigilance check before rover EVA."]}'::jsonb
  ),
  (
    'ch-sci',
    'chapea-surface-210',
    'Member 3 — Geology Specialist',
    'Field Science & Dosimetry',
    false,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & surface EVA status',
    'Add your info: Private reflection notes here',
    '{"etaSlot":"Add your info: Next field EVA gate check here","doseSlot":"Add your info: Personal dosimeter slot here","sleepSlot":"Add your info: Sleep log slot here","fatigueSlot":"Add your info: 60s self-check slot here","exerciseAdherenceSlot":"Add your info: Daily conditioning slot here","blockers":[],"actions":["Here is: Action 1 — Log pre-EVA health status within 48h window.","Here is: Action 2 — Sync field dosimetry notes locally."]}'::jsonb
  ),
  (
    'ch-ops',
    'chapea-surface-210',
    'Member 4 — Autonomous Systems Specialist',
    'Life Support & Telemetry Analyst',
    false,
    'GO',
    'GO',
    true,
    'Here is: Duty readiness & closed-environment watch status',
    'Add your info: Private reflection notes here',
    '{"etaSlot":"Add your info: Next habitat atmosphere audit window here","doseSlot":"Add your info: Personal dosimeter slot here","sleepSlot":"Add your info: Sol sleep log slot here","fatigueSlot":"Add your info: 60s self-check slot here","exerciseAdherenceSlot":"Add your info: Daily conditioning slot here","blockers":[],"actions":["Here is: Action 1 — Audit surface CO₂, O₂ & pressure telemetry.","Here is: Action 2 — Verify Buddy-Rescue offline cache integrity."]}'::jsonb
  )
on conflict (id) do nothing;
