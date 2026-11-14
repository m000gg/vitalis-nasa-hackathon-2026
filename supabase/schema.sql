-- Vitalis+ Supabase Schema
-- Split cleanly into:
--   1. scenarios
--   2. characters (linked to a specific scenario via scenario_id)
--   3. character_hazard_data (linked to scenario + character + hazard_slug)
--   4. character_hazard_samples (time-series telemetry per character + hazard_slug)

create table if not exists public.scenarios (
  id text primary key,
  name text not null,
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

-- Hackathon/dev permissions for Supabase Publishable / Anon keys (+ service_role).
-- For production hardening: enable RLS, drop `anon` grants, and use `SUPABASE_SERVICE_ROLE_KEY` strictly on the server.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table
  public.scenarios,
  public.characters,
  public.character_hazard_data,
  public.character_hazard_samples
to anon, authenticated, service_role;

-- Hackathon/dev RLS policies so publishable/anon key can read & write when RLS is enabled.
-- For production hardening: tighten these policies or drop `anon` access and use `SUPABASE_SERVICE_ROLE_KEY` on the server.
alter table public.scenarios enable row level security;
alter table public.characters enable row level security;
alter table public.character_hazard_data enable row level security;
alter table public.character_hazard_samples enable row level security;

drop policy if exists "vitalis_dev_all_scenarios" on public.scenarios;
create policy "vitalis_dev_all_scenarios" on public.scenarios for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_characters" on public.characters;
create policy "vitalis_dev_all_characters" on public.characters for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_hazard_data" on public.character_hazard_data;
create policy "vitalis_dev_all_hazard_data" on public.character_hazard_data for all to anon, authenticated using (true) with check (true);

drop policy if exists "vitalis_dev_all_hazard_samples" on public.character_hazard_samples;
create policy "vitalis_dev_all_hazard_samples" on public.character_hazard_samples for all to anon, authenticated using (true) with check (true);

-- Seed starter scenarios (optional; safe to re-run with ON CONFLICT DO NOTHING)
insert into public.scenarios (id, name, duration_context, comms_delay_label, active_hazards_highlight, scenario_description, environment)
values
  (
    'mars-transit-126',
    'Mars Transit — Mission Day 126',
    'Long-duration deep-space transit (~3-year round-trip baseline)',
    'One-way light delay (4–24 min) / Round-trip (8–48 min)',
    array['Space Radiation', 'Distance from Earth', 'Hostile/Closed Environments'],
    'Deep-space transit scenario with communication light-time latency and shared closed-habitat telemetry.',
    '{"commsDelaySlot":"Earth–Mars RTT light-time delay (min)","radiationStatusSlot":"Transit compartment dose-rate & space-weather context","atmosphereStatusSlot":"Cabin CO₂ (mmHg), O₂ (mmHg), pressure (psia)","acousticsStatusSlot":"Sleep quarter dBA vs NC-40 curve","isolationStatusSlot":"Transit day % & confinement baseline","gravityStatusSlot":"Microgravity conditioning & muscle/bone tracking"}'::jsonb
  ),
  (
    'chapea-surface-210',
    'Mars Surface / CHAPEA Analog — Sol 210',
    '365-day surface habitat simulation (Sol 24h 39m circadian cycle)',
    'Simulated surface light-time delay (up to 44 min RTT)',
    array['Isolation & Confinement', 'Gravity Fields', 'Space Radiation'],
    'Surface habitat scenario monitoring circadian drift, Third-Quarter confinement window, and multi-hazard crew vitals.',
    '{"commsDelaySlot":"Surface RTT comms delay (min)","radiationStatusSlot":"Surface habitat vs. rover dosimeter readings","atmosphereStatusSlot":"Surface habitat CO₂ / O₂ / pressure readings","acousticsStatusSlot":"Crew quarters NC-40 noise reading","isolationStatusSlot":"Sol 210 circadian drift & Third-Quarter flag","gravityStatusSlot":"Daily conditioning, calf volume & grip tracking"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.characters (id, scenario_id, callsign, assigned_role_title, is_lead_slot, public_status_summary, private_member_notes, metrics)
values
  (
    'mt-cmdr',
    'mars-transit-126',
    'Leader — Commander',
    'Crew Captain / Mission Commander',
    true,
    'Mission commander hazard & crew oversight status',
    'Personal private reflection slot',
    '{"etaSlot":"Next command review window ETA","doseSlot":"Personal cumulative dose (mSv)","sleepSlot":"Personal sleep duration & quality","fatigueSlot":"60s self-check / PVT-B baseline","exerciseAdherenceSlot":"Daily 2.5h exercise adherence","blockers":[],"actions":["Action 1 — Review crew vitals across all 5 NASA hazard zones.","Action 2 — Verify module atmosphere & radiation compartment map."]}'::jsonb
  ),
  (
    'mt-cmo',
    'mars-transit-126',
    'Member 1 — Crew Medical Officer',
    'Designated Crew Medical Officer (CMO)',
    false,
    'Medical oversight & onboard kit tracking',
    'Private journal / symptom & mood notes',
    '{"etaSlot":"Next medical check window","doseSlot":"Personal cumulative dose (mSv)","sleepSlot":"Personal sleep duration (h)","fatigueSlot":"Subjective fatigue (1–5) & PVT-B","exerciseAdherenceSlot":"Daily exercise log","blockers":[],"actions":["Action 1 — Complete 60s self-check & review sleep window.","Action 2 — Verify non-expired medical kit items."]}'::jsonb
  ),
  (
    'mt-fe',
    'mars-transit-126',
    'Member 2 — Flight Engineer',
    'ECLSS & Habitat Systems Engineer',
    false,
    'ECLSS module monitoring',
    'Private sleep/journal notes',
    '{"etaSlot":"Next ECLSS / habitat check window","doseSlot":"Personal cumulative dose (mSv)","sleepSlot":"Personal sleep duration (h)","fatigueSlot":"PVT-B vigilance baseline","exerciseAdherenceSlot":"Aerobic + resistance adherence","blockers":[],"actions":["Action 1 — Log daily module CO₂ & acoustic check.","Action 2 — Maintain 2.5h daily exercise schedule."]}'::jsonb
  ),
  (
    'mt-ps',
    'mars-transit-126',
    'Member 3 — Payload Specialist',
    'Science & BioShield Specialist',
    false,
    'Overdue conditioning / circadian watch',
    'Private mood/medication notes',
    '{"etaSlot":"Immediate conditioning review ETA","doseSlot":"Personal cumulative dose (mSv)","sleepSlot":"Personal sleep duration (h)","fatigueSlot":"60s self-check / fatigue score","exerciseAdherenceSlot":"Calf volume & exercise adherence","blockers":["Overdue anthropometric check"],"actions":["Action 1 — Complete overdue calf/handgrip check under valid pre-test conditions.","Action 2 — Log 10-min Veggie module check."]}'::jsonb
  ),
  (
    'mt-ops',
    'mars-transit-126',
    'Member 4 — Habitat & Systems Officer',
    'Operations & Human Factors Specialist',
    false,
    'Nominal habitat & circadian watch status',
    'Private journal & circadian log',
    '{"etaSlot":"Next lights-out window ETA","doseSlot":"Personal cumulative dose (mSv)","sleepSlot":"Personal sleep duration (h) & light exposure","fatigueSlot":"60s self-check","exerciseAdherenceSlot":"Daily exercise adherence","blockers":[],"actions":["Action 1 — Log personal circadian & acoustic check.","Action 2 — Keep aerobic & resistance logs synced."]}'::jsonb
  ),
  (
    'ch-cmdr',
    'chapea-surface-210',
    'Leader — Habitat Commander',
    'Surface Operations Lead',
    true,
    'Commander surface hazard & schedule oversight',
    'Private reflection slot',
    '{"etaSlot":"Next sol crew briefing window","doseSlot":"Cumulative surface dose","sleepSlot":"Sol sleep alignment","fatigueSlot":"PVT-B check","exerciseAdherenceSlot":"Daily exercise","blockers":[],"actions":["Action 1 — Review Third-Quarter crew vitals & acoustic compliance.","Action 2 — Verify compartment CO₂ and radiation readings."]}'::jsonb
  ),
  (
    'ch-bio',
    'chapea-surface-210',
    'Member 1 — Medical & Bio Officer',
    'Health & Plant-Module Lead',
    false,
    'Veggie module & medical monitoring',
    'Private wellness log',
    '{"etaSlot":"Next Veggie / biomarker window","doseSlot":"Personal dose","sleepSlot":"Sleep duration","fatigueSlot":"Fatigue score","exerciseAdherenceSlot":"Exercise log","blockers":[],"actions":["Action 1 — Complete habitat plant-module sensory care.","Action 2 — Verify onboard Med Kit expiry log."]}'::jsonb
  ),
  (
    'ch-eng',
    'chapea-surface-210',
    'Member 2 — Mobility & Habitat Engineer',
    'Surface Mobility & ECLSS Lead',
    false,
    'Sleep/acoustic exposure flag (clinical details private)',
    'Private sleep & mood reflection',
    '{"etaSlot":"Acoustic mitigation ETA","doseSlot":"Rover vs. base dose","sleepSlot":"Sleep quarter duration & noise","fatigueSlot":"PVT-B reaction delta","exerciseAdherenceSlot":"Resistance/aerobic log","blockers":["Sleep-quarter acoustic check flagged"],"actions":["Action 1 — Use acoustic protection or relocate sleep bay tonight.","Action 2 — Run 3-min vigilance check before rover task."]}'::jsonb
  ),
  (
    'ch-sci',
    'chapea-surface-210',
    'Member 3 — Geology Specialist',
    'Field Science & Dosimetry',
    false,
    'Field dosimetry & conditioning active',
    'Private reflection notes',
    '{"etaSlot":"Next field dosimetry check","doseSlot":"Personal dosimeter","sleepSlot":"Sleep log","fatigueSlot":"60s self-check","exerciseAdherenceSlot":"Daily conditioning","blockers":[],"actions":["Action 1 — Verify onboard dosimeter sample continuity.","Action 2 — Log daily conditioning exercise."]}'::jsonb
  ),
  (
    'ch-ops',
    'chapea-surface-210',
    'Member 4 — Autonomous Systems Specialist',
    'Life Support & Telemetry Analyst',
    false,
    'Closed-environment watch status',
    'Private reflection notes',
    '{"etaSlot":"Next habitat atmosphere audit window","doseSlot":"Personal dosimeter","sleepSlot":"Sol sleep log","fatigueSlot":"60s self-check","exerciseAdherenceSlot":"Daily conditioning","blockers":[],"actions":["Action 1 — Audit surface CO₂, O₂ & pressure telemetry.","Action 2 — Review local onboard checklists."]}'::jsonb
  )
on conflict (id) do nothing;
