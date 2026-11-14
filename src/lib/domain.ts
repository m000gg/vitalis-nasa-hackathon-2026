export type UserRole = "lead" | "member";

export type ReadinessState = "GO" | "CONDITIONAL" | "HOLD";

export interface CharacterMetrics {
  etaSlot: string;
  doseSlot: string;
  sleepSlot: string;
  fatigueSlot: string;
  exerciseAdherenceSlot: string;
  blockers: string[];
  actions: string[];
}

export interface CrewSlot {
  id: string;
  callsign: string;
  assignedRoleTitle: string;
  isLeadSlot: boolean;
  readinessState: ReadinessState;
  evaGateState: "GO" | "CONDITIONAL" | "NO-GO";
  shelterConfirmed: boolean;
  publicStatusSummary: string;
  privateMemberNotesSlot: string;
  metrics: CharacterMetrics;
}

export interface ScenarioEnvironment {
  commsDelaySlot: string;
  linkOnlineDefault: boolean;
  radiationStatusSlot: string;
  atmosphereStatusSlot: string;
  acousticsStatusSlot: string;
  isolationStatusSlot: string;
  gravityStatusSlot: string;
}

export interface MissionProfile {
  id: string;
  name: string;
  phase: string;
  durationContext: string;
  commsDelayLabel: string;
  activeHazardsHighlight: string[];
  scenarioDescriptionSlot: string;
  environment: ScenarioEnvironment;
  crew: CrewSlot[];
}

export interface DtnMessage {
  id: string;
  reportTitle: string;
  senderCallsign: string;
  hazardSlug: string;
  status: "PENDING" | "SENT" | "ACKNOWLEDGED";
  createdAt: string;
  sentAt?: string;
  acknowledgedAt?: string;
  retryCount: number;
  payloadSummary: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorRole: UserRole;
  targetCallsign: string;
  reason: string;
  action: string;
}

export const MISSIONS: MissionProfile[] = [
  {
    id: "mars-transit-126",
    name: "Mars Transit — Mission Day 126",
    phase: "TRANSIT_MICROGRAVITY",
    durationContext: "Here is: Long-duration deep-space transit (~3-year round-trip baseline)",
    commsDelayLabel: "Add your info: One-way light delay (4–24 min) / Round-trip (8–48 min) here",
    activeHazardsHighlight: ["Space Radiation", "Distance from Earth", "Hostile/Closed Environments"],
    scenarioDescriptionSlot:
      "Here is: Deep-space transit scenario with communication latency and shared closed-habitat telemetry.",
    environment: {
      commsDelaySlot: "Add your info: Current Earth–Mars RTT delay (min) here",
      linkOnlineDefault: false,
      radiationStatusSlot: "Add your info: Transit compartment dose-rate & DONKI SEP status here",
      atmosphereStatusSlot: "Add your info: Cabin CO₂ (mmHg), O₂ (mmHg), pressure (psia) here",
      acousticsStatusSlot: "Add your info: Sleep quarter dBA vs NC-40 curve here",
      isolationStatusSlot: "Add your info: Transit day % & confinement baseline here",
      gravityStatusSlot: "Add your info: Microgravity conditioning & EVA schedule status here",
    },
    crew: [
      {
        id: "mt-cmdr",
        callsign: "Leader — Commander",
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
          sleepSlot: "Add your info: Personal sleep duration & quality slot here",
          fatigueSlot: "Add your info: 60s self-check / PVT-B baseline slot here",
          exerciseAdherenceSlot: "Add your info: Daily 2.5h exercise adherence slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Verify crew shelter confirmations & DTN outbound queue.",
            "Here is: Action 2 — Review module atmosphere & radiation compartment map.",
          ],
        },
      },
      {
        id: "mt-cmo",
        callsign: "Member 1 — Crew Medical Officer",
        assignedRoleTitle: "Designated Crew Medical Officer (CMO)",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Anonymized duty readiness (pre-EVA / fatigue check pending)",
        privateMemberNotesSlot: "Add your info: Private journal / symptom & mood notes here",
        metrics: {
          etaSlot: "Add your info: Estimated Time of Action for pre-EVA / symptom check here",
          doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
          sleepSlot: "Add your info: Personal sleep duration (h) & quality slot here",
          fatigueSlot: "Add your info: Subjective fatigue (1–5) & PVT-B slot here",
          exerciseAdherenceSlot: "Add your info: Daily exercise log slot here",
          blockers: ["Here is: Pending shelter confirmation", "Here is: Pre-EVA health status check due"],
          actions: [
            "Here is: Action 1 — Complete 60s self-check and confirm shelter route.",
            "Here is: Action 2 — Verify non-expired medical kit items for autonomous care.",
          ],
        },
      },
      {
        id: "mt-fe",
        callsign: "Member 2 — Flight Engineer",
        assignedRoleTitle: "ECLSS & Habitat Systems Engineer",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Duty readiness & ECLSS module assignment",
        privateMemberNotesSlot: "Add your info: Private sleep/journal notes here",
        metrics: {
          etaSlot: "Add your info: Next ECLSS / habitat check window here",
          doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
          sleepSlot: "Add your info: Personal sleep duration (h) slot here",
          fatigueSlot: "Add your info: PVT-B vigilance baseline slot here",
          exerciseAdherenceSlot: "Add your info: Aerobic + resistance adherence slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Log daily module CO₂ & acoustic check.",
            "Here is: Action 2 — Maintain 2.5h daily exercise schedule.",
          ],
        },
      },
      {
        id: "mt-ps",
        callsign: "Member 3 — Payload Specialist",
        assignedRoleTitle: "Science & BioShield Specialist",
        isLeadSlot: false,
        readinessState: "HOLD",
        evaGateState: "NO-GO",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Non-clinical blocker category (overdue check / shelter pending)",
        privateMemberNotesSlot: "Add your info: Private mood/medication notes here",
        metrics: {
          etaSlot: "Add your info: Immediate action countdown before task hold review here",
          doseSlot: "Add your info: Personal cumulative dose (Gy / Sv) here",
          sleepSlot: "Add your info: Personal sleep duration (h) slot here",
          fatigueSlot: "Add your info: 60s self-check / fatigue score slot here",
          exerciseAdherenceSlot: "Add your info: Calf volume & exercise adherence slot here",
          blockers: ["Here is: Overdue measurement / EVA gate hold", "Here is: Shelter confirmation pending"],
          actions: [
            "Here is: Action 1 — Complete overdue pre-test check under valid conditions.",
            "Here is: Action 2 — Confirm shelter assignment & log 10-min Veggie module check.",
          ],
        },
      },
    ],
  },
  {
    id: "chapea-surface-210",
    name: "Mars Surface / CHAPEA Analog — Sol 210",
    phase: "SURFACE_OPERATIONS",
    durationContext: "Here is: 365-day surface habitat simulation (Sol 24h 39m circadian cycle)",
    commsDelayLabel: "Add your info: Simulated surface comms delay (up to 44 min RTT) here",
    activeHazardsHighlight: ["Isolation & Confinement", "Gravity Fields", "Space Radiation"],
    scenarioDescriptionSlot:
      "Here is: Surface habitat scenario with circadian drift, Third-Quarter confinement window, and surface EVA gates.",
    environment: {
      commsDelaySlot: "Add your info: Surface RTT comms delay (min) here",
      linkOnlineDefault: false,
      radiationStatusSlot: "Add your info: Surface habitat vs. rover dosimeter readings here",
      atmosphereStatusSlot: "Add your info: Surface habitat CO₂ / O₂ / pressure readings here",
      acousticsStatusSlot: "Add your info: Crew quarters NC-40 noise reading here",
      isolationStatusSlot: "Add your info: Sol 210 circadian drift & Third-Quarter flag here",
      gravityStatusSlot: "Add your info: Surface EVA readiness & conditioning log here",
    },
    crew: [
      {
        id: "ch-cmdr",
        callsign: "Leader — Habitat Commander",
        assignedRoleTitle: "Surface Operations Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Commander readiness & team schedule oversight",
        privateMemberNotesSlot: "Add your info: Private reflection slot here",
        metrics: {
          etaSlot: "Add your info: Next sol crew briefing window here",
          doseSlot: "Add your info: Cumulative surface dose slot here",
          sleepSlot: "Add your info: Sol sleep alignment slot here",
          fatigueSlot: "Add your info: PVT-B check slot here",
          exerciseAdherenceSlot: "Add your info: Daily exercise slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Review Third-Quarter team buffs & acoustic compliance.",
            "Here is: Action 2 — Verify surface EVA gate statuses across crew.",
          ],
        },
      },
      {
        id: "ch-bio",
        callsign: "Member 1 — Medical & Bio Officer",
        assignedRoleTitle: "Health & Plant-Module Lead",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Duty readiness & Veggie module rotation",
        privateMemberNotesSlot: "Add your info: Private wellness log here",
        metrics: {
          etaSlot: "Add your info: Next Veggie / biomarker window here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep duration slot here",
          fatigueSlot: "Add your info: Fatigue score slot here",
          exerciseAdherenceSlot: "Add your info: Exercise log slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Complete habitat plant-module sensory care.",
            "Here is: Action 2 — Verify onboard Med Kit expiry log.",
          ],
        },
      },
      {
        id: "ch-eng",
        callsign: "Member 2 — Rover & EVA Engineer",
        assignedRoleTitle: "Surface Mobility & Suit Lead",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Sleep/acoustic exposure flag (clinical details private)",
        privateMemberNotesSlot: "Add your info: Private sleep & mood reflection here",
        metrics: {
          etaSlot: "Add your info: Pre-EVA rest / acoustic mitigation ETA here",
          doseSlot: "Add your info: Rover vs. base dose slot here",
          sleepSlot: "Add your info: Sleep quarter duration & noise note here",
          fatigueSlot: "Add your info: PVT-B reaction delta slot here",
          exerciseAdherenceSlot: "Add your info: Resistance/aerobic log slot here",
          blockers: ["Here is: Sleep-quarter acoustic check flagged"],
          actions: [
            "Here is: Action 1 — Use acoustic protection or relocate sleep bay tonight.",
            "Here is: Action 2 — Run 3-min vigilance check before rover EVA.",
          ],
        },
      },
      {
        id: "ch-sci",
        callsign: "Member 3 — Geology Specialist",
        assignedRoleTitle: "Field Science & Dosimetry",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Duty readiness & surface EVA status",
        privateMemberNotesSlot: "Add your info: Private reflection notes here",
        metrics: {
          etaSlot: "Add your info: Next field EVA gate check here",
          doseSlot: "Add your info: Personal dosimeter slot here",
          sleepSlot: "Add your info: Sleep log slot here",
          fatigueSlot: "Add your info: 60s self-check slot here",
          exerciseAdherenceSlot: "Add your info: Daily conditioning slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Log pre-EVA health status within 48h window.",
            "Here is: Action 2 — Sync field dosimetry notes locally.",
          ],
        },
      },
    ],
  },
  {
    id: "artemis-eva-045",
    name: "Artemis Lunar Orbit & EVA Ops — FD 45",
    phase: "EVA_PREP",
    durationContext: "Here is: Cislunar EVA readiness & radiation-belt passage operations",
    commsDelayLabel: "Add your info: Cislunar delay (~1.3s) & contingency blackout window here",
    activeHazardsHighlight: ["Gravity Fields", "Space Radiation", "Distance from Earth"],
    scenarioDescriptionSlot:
      "Here is: EVA preparation scenario tracking MR087L/MEDB readiness gates and spacecraft radiation orientation.",
    environment: {
      commsDelaySlot: "Add your info: Cislunar link / blackout status here",
      linkOnlineDefault: true,
      radiationStatusSlot: "Add your info: Compartment spatial dose variation here",
      atmosphereStatusSlot: "Add your info: Cabin & suit pressure / CO₂ check here",
      acousticsStatusSlot: "Add your info: Cabin acoustic level here",
      isolationStatusSlot: "Add your info: Crew sleep & workload window here",
      gravityStatusSlot: "Add your info: Active pre-EVA gate schedule (FD 45) here",
    },
    crew: [
      {
        id: "ar-cmdr",
        callsign: "Leader — Mission Commander",
        assignedRoleTitle: "Flight Director Liaison / Crew Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: EVA Flight Note approval & crew gate matrix",
        privateMemberNotesSlot: "Add your info: Private log slot here",
        metrics: {
          etaSlot: "Add your info: EVA suit-donning gate deadline here",
          doseSlot: "Add your info: Cumulative dose slot here",
          sleepSlot: "Add your info: Sleep duration slot here",
          fatigueSlot: "Add your info: Self-check slot here",
          exerciseAdherenceSlot: "Add your info: Conditioning log slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Verify all EVA crew members pass readiness chain.",
            "Here is: Action 2 — Review compartment dose map prior to EVA.",
          ],
        },
      },
      {
        id: "ar-ev1",
        callsign: "Member 1 — EVA-1 Lead",
        assignedRoleTitle: "Extravehicular Crew Member 1",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: EVA Gate chain satisfied",
        privateMemberNotesSlot: "Add your info: Private pre-EVA self-assessment here",
        metrics: {
          etaSlot: "Add your info: Suit donning / prebreathe window here",
          doseSlot: "Add your info: Personal dosimeter slot here",
          sleepSlot: "Add your info: Pre-EVA sleep slot here",
          fatigueSlot: "Add your info: 60s check-in slot here",
          exerciseAdherenceSlot: "Add your info: Grip & arm ergometry verification slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Complete final 48h pre-EVA health status confirmation.",
            "Here is: Action 2 — Avoid handgrip testing within 24h of EVA.",
          ],
        },
      },
      {
        id: "ar-ev2",
        callsign: "Member 2 — EVA-2 / CMO",
        assignedRoleTitle: "Extravehicular Crew Member 2",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "NO-GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Blocker category — pre-test condition window / 48h check due",
        privateMemberNotesSlot: "Add your info: Private notes here",
        metrics: {
          etaSlot: "Add your info: Deadline before EVA gate closes here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep log slot here",
          fatigueSlot: "Add your info: Fatigue check slot here",
          exerciseAdherenceSlot: "Add your info: Pre-test condition verification slot here",
          blockers: ["Here is: Pre-EVA health status / arm ergometry condition pending"],
          actions: [
            "Here is: Action 1 — Complete missing pre-EVA verification after pre-test window clears.",
            "Here is: Action 2 — Log personal baseline readiness before suit-up.",
          ],
        },
      },
      {
        id: "ar-plt",
        callsign: "Member 3 — Habitat Pilot",
        assignedRoleTitle: "Vehicle Orientation & Intravehicular Lead",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Vehicle orientation & shelter support ready",
        privateMemberNotesSlot: "Add your info: Private notes here",
        metrics: {
          etaSlot: "Add your info: IVA support window here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep slot here",
          fatigueSlot: "Add your info: Vigilance check slot here",
          exerciseAdherenceSlot: "Add your info: Daily exercise slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Monitor IVA compartment dosimetry during EVA.",
            "Here is: Action 2 — Keep shelter checklist verified.",
          ],
        },
      },
    ],
  },
  {
    id: "iss-closed-180",
    name: "ISS Long-Duration Closed Habitat — FD 180",
    phase: "ORBITAL_HABITAT",
    durationContext: "Here is: 6-crew orbital closed-ecosystem baseline (OSDR EDA context)",
    commsDelayLabel: "Add your info: Nominal orbital link / simulated LOS window here",
    activeHazardsHighlight: ["Hostile/Closed Environments", "Isolation & Confinement", "Gravity Fields"],
    scenarioDescriptionSlot:
      "Here is: Closed-habitat scenario monitoring cabin CO₂, acoustics, sleep-environment correlation, and daily exercise.",
    environment: {
      commsDelaySlot: "Add your info: Orbital link / LOS status here",
      linkOnlineDefault: true,
      radiationStatusSlot: "Add your info: Daily GCR + SAA dose slot here",
      atmosphereStatusSlot: "Add your info: Module CO₂ (mmHg), temp, RH from OSDR EDA here",
      acousticsStatusSlot: "Add your info: Module acoustic dBA / NC-40 check here",
      isolationStatusSlot: "Add your info: FD 180 sleep & monotony index here",
      gravityStatusSlot: "Add your info: 2.5h daily exercise & calf volume cadence here",
    },
    crew: [
      {
        id: "is-cmdr",
        callsign: "Leader — Expedition Commander",
        assignedRoleTitle: "Station Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Station-wide buffs/debuffs & module relocation oversight",
        privateMemberNotesSlot: "Add your info: Private log slot here",
        metrics: {
          etaSlot: "Add your info: Next station environmental review here",
          doseSlot: "Add your info: Accumulated orbital dose slot here",
          sleepSlot: "Add your info: Sleep slot here",
          fatigueSlot: "Add your info: Self-check slot here",
          exerciseAdherenceSlot: "Add your info: Crew exercise compliance slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Review module weather map for CO₂ or noise flags.",
            "Here is: Action 2 — Coordinate sleep relocation if a module turns amber.",
          ],
        },
      },
      {
        id: "is-fe1",
        callsign: "Member 1 — Flight Engineer 1 (CMO)",
        assignedRoleTitle: "Medical & Atmosphere Monitor",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Module B assignment & readiness status",
        privateMemberNotesSlot: "Add your info: Private health & sleep log here",
        metrics: {
          etaSlot: "Add your info: Next atmosphere & med check here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep duration slot here",
          fatigueSlot: "Add your info: 60s check-in slot here",
          exerciseAdherenceSlot: "Add your info: Exercise log slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Verify Module CO₂ scrubbers & Med Kit stock.",
            "Here is: Action 2 — Log morning sleep-environment report.",
          ],
        },
      },
      {
        id: "is-fe2",
        callsign: "Member 2 — Flight Engineer 2",
        assignedRoleTitle: "ECLSS & Acoustics Lead",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Sleep-quarter acoustic/CO₂ exposure flag",
        privateMemberNotesSlot: "Add your info: Private journal notes here",
        metrics: {
          etaSlot: "Add your info: Acoustic / CO₂ mitigation window here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep hours & noise note here",
          fatigueSlot: "Add your info: Fatigue score slot here",
          exerciseAdherenceSlot: "Add your info: Exercise adherence slot here",
          blockers: ["Here is: Elevated module noise / CO₂ exposure"],
          actions: [
            "Here is: Action 1 — Relocate sleep bay per Where-to-Go advice.",
            "Here is: Action 2 — Inspect ECLSS fan muffler.",
          ],
        },
      },
      {
        id: "is-sc1",
        callsign: "Member 3 — Science Officer 1",
        assignedRoleTitle: "Life Sciences & Veggie Rack",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Readiness status & exercise compliance",
        privateMemberNotesSlot: "Add your info: Private notes here",
        metrics: {
          etaSlot: "Add your info: Next Veggie rack & fitness check here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep slot here",
          fatigueSlot: "Add your info: Self-check slot here",
          exerciseAdherenceSlot: "Add your info: Daily exercise slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Log Veggie plant-care rotation.",
            "Here is: Action 2 — Complete daily 2.5h exercise target.",
          ],
        },
      },
      {
        id: "is-sc2",
        callsign: "Member 4 — Science Officer 2",
        assignedRoleTitle: "Human Research Measures",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Readiness status",
        privateMemberNotesSlot: "Add your info: Private notes here",
        metrics: {
          etaSlot: "Add your info: Weekly measures window here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep slot here",
          fatigueSlot: "Add your info: Self-check slot here",
          exerciseAdherenceSlot: "Add your info: Exercise slot here",
          blockers: [],
          actions: [
            "Here is: Action 1 — Log bi-weekly calf volume & body mass.",
            "Here is: Action 2 — Run 60s check-in.",
          ],
        },
      },
      {
        id: "is-vis",
        callsign: "Member 5 — Mission Specialist",
        assignedRoleTitle: "Payload & Robotics",
        isLeadSlot: false,
        readinessState: "HOLD",
        evaGateState: "NO-GO",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Overdue pre-test check or circadian hold",
        privateMemberNotesSlot: "Add your info: Private notes here",
        metrics: {
          etaSlot: "Add your info: Hold clearance ETA here",
          doseSlot: "Add your info: Personal dose slot here",
          sleepSlot: "Add your info: Sleep slot here",
          fatigueSlot: "Add your info: Fatigue check slot here",
          exerciseAdherenceSlot: "Add your info: Conditioning check slot here",
          blockers: ["Here is: Overdue check / shelter unconfirmed"],
          actions: [
            "Here is: Action 1 — Complete overdue check and confirm shelter status.",
            "Here is: Action 2 — Follow 60s guided self-check.",
          ],
        },
      },
    ],
  },
];

export const TEAM_BUFFS_SLOTS = [
  {
    id: "buff-exercise",
    name: "Exercise Discipline Buff",
    source: "Hazard 4 & Hazard 2",
    description: "Here is: Share of crew meeting daily aerobic + resistance prescription (anonymized).",
    inputSlot: "Add your info: Crew exercise compliance % here",
  },
  {
    id: "buff-sleep",
    name: "Synchronized Sleep & Lighting Hygiene Buff",
    source: "Hazard 2 (NASA-STD-3001 Vol. 2)",
    description: "Here is: Crew-wide compliance with sleep window & circadian lighting schedule.",
    inputSlot: "Add your info: Crew sleep hygiene compliance % here",
  },
  {
    id: "buff-biophilia",
    name: "Biophilia / Space Garden (Veggie) Buff",
    source: "Hazard 2",
    description: "Here is: Sensory enrichment rotation using onboard plant-growth hardware.",
    inputSlot: "Add your info: Plant-care rotation completion status here",
  },
  {
    id: "buff-shelter",
    name: "Storm Shelter & Inventory Readiness Buff",
    source: "Hazard 1 & Hazard 3",
    description: "Here is: Verified shelter water/power/comms + non-expired medical kit coverage.",
    inputSlot: "Add your info: Shelter readiness & supply status here",
  },
];

export const TEAM_DEBUFFS_SLOTS = [
  {
    id: "debuff-co2",
    name: "Shared Cabin CO₂ / Atmosphere Debuff",
    source: "Hazard 5",
    description: "Here is: Cross-crew symptom attribution when shared module CO₂ rises above target.",
    inputSlot: "Add your info: Cabin ppCO₂ (mmHg), ppO₂ (mmHg), total pressure (psia) here",
  },
  {
    id: "debuff-noise",
    name: "Shared Sleep-Quarter Acoustic Debuff",
    source: "Hazard 2 & Hazard 5",
    description: "Here is: Flags shared ECLSS noise breach (> NC-40) rather than individual insomnia.",
    inputSlot: "Add your info: Continuous noise level (dBA / NC) per module here",
  },
  {
    id: "debuff-radiation",
    name: "Solar Particle / Compartment Radiation Debuff",
    source: "Hazard 1",
    description: "Here is: Space weather event + local compartment dose-rate elevation.",
    inputSlot: "Add your info: DONKI event status & compartment dose rate here",
  },
  {
    id: "debuff-comms",
    name: "Deep-Space Comms Delay & Isolation Drift Debuff",
    source: "Hazard 2 & Hazard 3",
    description: "Here is: Autonomy strain during comms delays or confinement midpoint.",
    inputSlot: "Add your info: Current RTT comms delay (min) & mission day % here",
  },
];

export const BUDDY_RESCUE_STEPS = [
  {
    step: 1,
    title: "Check Responsiveness & Immediate Environment",
    detail: "Here is: Verify crewmate responsiveness and check local CO₂ / O₂ / pressure / radiation readings.",
  },
  {
    step: 2,
    title: "Trigger Local Alarm & Notify Crew / Lead",
    detail: "Here is: Activate onboard crew alert (works offline) and summon Crew Medical Officer.",
  },
  {
    step: 3,
    title: "Open Pre-Approved Stabilization Checklist",
    detail: "Here is: Follow locally cached stabilization steps constrained to non-expired onboard supplies.",
  },
  {
    step: 4,
    title: "Log & Queue DTN Medical Report",
    detail: "Here is: Record observations in the Store-and-Forward outbound queue.",
  },
];

export const MEDICAL_INVENTORY_SLOTS = [
  {
    id: "inv-1",
    itemSlot: "Add your info: Onboard medical supply / kit item name here",
    quantitySlot: "Add your info: Available quantity & unit here",
    expirySlot: "Add your info: Expiration date / shelf-life status here",
    hazardRef: "Hazard 2 / Hazard 3 / Hazard 5",
  },
  {
    id: "inv-2",
    itemSlot: "Add your info: Emergency stabilization kit item here",
    quantitySlot: "Add your info: Available quantity & storage bay here",
    expirySlot: "Add your info: Inspection & expiry date here",
    hazardRef: "Hazard 3 — Distance from Earth",
  },
  {
    id: "inv-3",
    itemSlot: "Add your info: Radiation shelter & EVA readiness consumable here",
    quantitySlot: "Add your info: Available quantity here",
    expirySlot: "Add your info: Status (In Stock / Low / Expired) here",
    hazardRef: "Hazard 1 & Hazard 4",
  },
];
