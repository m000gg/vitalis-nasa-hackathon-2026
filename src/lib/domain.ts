export type UserRole = "lead" | "member";

export type ReadinessState = "GO" | "CONDITIONAL" | "HOLD";

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
}

export interface MissionProfile {
  id: string;
  name: string;
  phase: string;
  durationContext: string;
  commsDelayLabel: string;
  activeHazardsHighlight: string[];
  scenarioDescriptionSlot: string;
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
    durationContext: "Here is: Long-duration deep-space transit (~3-year round-trip baseline, docs/OUTLINE.md & Hazard 3)",
    commsDelayLabel: "Add your info: One-way light delay (e.g., 4–24 min) / Round-trip (8–48 min) here",
    activeHazardsHighlight: ["Space Radiation", "Distance from Earth", "Hostile/Closed Environments"],
    scenarioDescriptionSlot:
      "Here is: Mission scenario summary — Solar Energetic Particle (SEP) warning, rising cabin CO₂, and offline store-and-forward medical reporting without real-time Earth physician support.",
    crew: [
      {
        id: "mt-cmdr",
        callsign: "Lead Slot — Commander",
        assignedRoleTitle: "Crew Captain / Mission Commander",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Public duty readiness & shelter acknowledgement status",
        privateMemberNotesSlot: "Strictly private to this crew member (hidden from Lead matrix)",
      },
      {
        id: "mt-cmo",
        callsign: "Member Slot 1 — Crew Medical Officer",
        assignedRoleTitle: "Designated Crew Medical Officer (CMO)",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Anonymized duty readiness (e.g., pre-EVA check or fatigue flag)",
        privateMemberNotesSlot: "Add your info: Private journal / personal symptom & mood notes here",
      },
      {
        id: "mt-fe",
        callsign: "Member Slot 2 — Flight Engineer",
        assignedRoleTitle: "ECLSS & Habitat Systems Engineer",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Public duty readiness & compartment assignment",
        privateMemberNotesSlot: "Add your info: Private sleep/journal notes here",
      },
      {
        id: "mt-ps",
        callsign: "Member Slot 3 — Payload Specialist",
        assignedRoleTitle: "Science & BioShield Specialist",
        isLeadSlot: false,
        readinessState: "HOLD",
        evaGateState: "NO-GO",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Non-clinical blocker category (e.g., overdue measurement / shelter check)",
        privateMemberNotesSlot: "Add your info: Private mood/medication notes here",
      },
    ],
  },
  {
    id: "chapea-surface-210",
    name: "Mars Surface / CHAPEA Analog — Sol 210",
    phase: "SURFACE_OPERATIONS",
    durationContext: "Here is: 365-day surface habitat simulation (Sol 24h 39m circadian cycle, Third-Quarter window)",
    commsDelayLabel: "Add your info: Simulated Mars surface comms delay (up to 44 min RTT) here",
    activeHazardsHighlight: ["Isolation & Confinement", "Gravity Fields", "Space Radiation"],
    scenarioDescriptionSlot:
      "Here is: Surface scenario — Martian sol circadian drift, Third-Quarter monotony window, rover vs. habitat shelter routing, and NC-40 sleep-quarter acoustic check.",
    crew: [
      {
        id: "ch-cmdr",
        callsign: "Lead Slot — Habitat Commander",
        assignedRoleTitle: "Surface Operations Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Commander readiness & team rotation oversight",
        privateMemberNotesSlot: "Private journal locked to individual profile",
      },
      {
        id: "ch-bio",
        callsign: "Member Slot 1 — Medical & Bio Officer",
        assignedRoleTitle: "Health & Plant-Module Lead",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Readiness state & Veggie module rotation status",
        privateMemberNotesSlot: "Add your info: Private wellness log here",
      },
      {
        id: "ch-eng",
        callsign: "Member Slot 2 — Rover & EVA Engineer",
        assignedRoleTitle: "Surface Mobility & Suit Lead",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Acoustic/sleep debt flag (no raw personal clinical data)",
        privateMemberNotesSlot: "Add your info: Private sleep & mood reflection here",
      },
      {
        id: "ch-sci",
        callsign: "Member Slot 3 — Geology Specialist",
        assignedRoleTitle: "Field Science & Dosimetry",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Duty readiness & surface EVA gate status",
        privateMemberNotesSlot: "Add your info: Private reflection notes here",
      },
    ],
  },
  {
    id: "artemis-eva-045",
    name: "Artemis Lunar Orbit & EVA Ops — FD 45",
    phase: "EVA_PREP",
    durationContext: "Here is: Cislunar / Orion radiation-belt & EVA readiness operations (Flight Day 45)",
    commsDelayLabel: "Add your info: Cislunar light-time (~1.3s one-way) & contingency blackout window here",
    activeHazardsHighlight: ["Gravity Fields", "Space Radiation", "Distance from Earth"],
    scenarioDescriptionSlot:
      "Here is: EVA preparation scenario — MR087L/MEDB 6.1–6.3 pre-EVA readiness chain, handgrip & arm ergometry condition windows, and compartment radiation orientation.",
    crew: [
      {
        id: "ar-cmdr",
        callsign: "Lead Slot — Mission Commander",
        assignedRoleTitle: "Flight Director Liaison / Crew Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: EVA Flight Note approval & crew gate matrix",
        privateMemberNotesSlot: "Private profile only",
      },
      {
        id: "ar-ev1",
        callsign: "Member Slot 1 — EVA-1 Lead",
        assignedRoleTitle: "Extravehicular Crew Member 1",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: EVA Gate chain status (Grip, Arm Ergometry, Prebreathe, Health Status)",
        privateMemberNotesSlot: "Add your info: Private pre-EVA self-assessment here",
      },
      {
        id: "ar-ev2",
        callsign: "Member Slot 2 — EVA-2 / CMO",
        assignedRoleTitle: "Extravehicular Crew Member 2",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "NO-GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Blocker category — e.g. pre-test condition window or 48h pre-EVA status due",
        privateMemberNotesSlot: "Add your info: Private notes here",
      },
      {
        id: "ar-plt",
        callsign: "Member Slot 3 — Habitat Pilot",
        assignedRoleTitle: "Vehicle Orientation & Intravehicular Lead",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Vehicle support & shelter readiness",
        privateMemberNotesSlot: "Add your info: Private notes here",
      },
    ],
  },
  {
    id: "iss-closed-180",
    name: "ISS Long-Duration Closed Habitat — FD 180",
    phase: "ORBITAL_HABITAT",
    durationContext: "Here is: 6-crew orbital closed-ecosystem baseline (OSDR Environmental Data App telemetry context)",
    commsDelayLabel: "Add your info: Nominal orbital link / simulated loss-of-signal (LOS) window here",
    activeHazardsHighlight: ["Hostile/Closed Environments", "Isolation & Confinement", "Gravity Fields"],
    scenarioDescriptionSlot:
      "Here is: Closed-habitat scenario — Module weather map (CO₂, O₂, pressure, NC-40 noise), morning sleep-to-environment report, and 2.5h daily exercise adherence.",
    crew: [
      {
        id: "is-cmdr",
        callsign: "Lead Slot — Expedition Commander",
        assignedRoleTitle: "Station Lead",
        isLeadSlot: true,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Station-wide buffs/debuffs & module relocation oversight",
        privateMemberNotesSlot: "Private profile only",
      },
      {
        id: "is-fe1",
        callsign: "Member Slot 1 — Flight Engineer 1 (CMO)",
        assignedRoleTitle: "Medical & Atmosphere Monitor",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Module B assignment & readiness status",
        privateMemberNotesSlot: "Add your info: Private health & sleep log here",
      },
      {
        id: "is-fe2",
        callsign: "Member Slot 2 — Flight Engineer 2",
        assignedRoleTitle: "ECLSS & Acoustics Lead",
        isLeadSlot: false,
        readinessState: "CONDITIONAL",
        evaGateState: "CONDITIONAL",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Sleep-quarter acoustic/CO₂ environmental exposure flag",
        privateMemberNotesSlot: "Add your info: Private journal notes here",
      },
      {
        id: "is-sc1",
        callsign: "Member Slot 3 — Science Officer 1",
        assignedRoleTitle: "Life Sciences & Veggie Rack",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Readiness status & exercise compliance",
        privateMemberNotesSlot: "Add your info: Private notes here",
      },
      {
        id: "is-sc2",
        callsign: "Member Slot 4 — Science Officer 2",
        assignedRoleTitle: "Human Research Measures",
        isLeadSlot: false,
        readinessState: "GO",
        evaGateState: "GO",
        shelterConfirmed: true,
        publicStatusSummary: "Here is: Readiness status",
        privateMemberNotesSlot: "Add your info: Private notes here",
      },
      {
        id: "is-vis",
        callsign: "Member Slot 5 — Mission Specialist",
        assignedRoleTitle: "Payload & Robotics",
        isLeadSlot: false,
        readinessState: "HOLD",
        evaGateState: "NO-GO",
        shelterConfirmed: false,
        publicStatusSummary: "Here is: Overdue pre-test check or circadian transition hold",
        privateMemberNotesSlot: "Add your info: Private notes here",
      },
    ],
  },
];

export const TEAM_BUFFS_SLOTS = [
  {
    id: "buff-exercise",
    name: "Exercise Discipline Buff",
    source: "Hazard 4 (MEDB 5.2) & Hazard 2",
    description: "Here is: Share of crew meeting daily aerobic + resistance prescription (without exposing raw personal data).",
    inputSlot: "Add your info: Weekly completed vs. prescribed crew exercise minutes here",
  },
  {
    id: "buff-sleep",
    name: "Synchronized Sleep & Lighting Hygiene Buff",
    source: "Hazard 2 (NASA-STD-3001 Vol. 2)",
    description: "Here is: Crew-wide compliance with sleep window & dynamic circadian lighting schedule.",
    inputSlot: "Add your info: Crew % meeting sleep & pre-sleep lighting target here",
  },
  {
    id: "buff-biophilia",
    name: "Biophilia / Space Garden (Veggie) Buff",
    source: "Hazard 2 (ISS Veggie Research)",
    description: "Here is: Sensory enrichment & mood stabilization rotation using onboard plant-growth hardware.",
    inputSlot: "Add your info: Plant-care rotation completion status here",
  },
  {
    id: "buff-shelter",
    name: "Storm Shelter & Inventory Readiness Buff",
    source: "Hazard 1 & Hazard 3",
    description: "Here is: Verified shelter water/power/comms status + non-expired medical kit coverage.",
    inputSlot: "Add your info: Shelter readiness checklist & supply status here",
  },
];

export const TEAM_DEBUFFS_SLOTS = [
  {
    id: "debuff-co2",
    name: "Shared Cabin CO₂ / Atmosphere Debuff",
    source: "Hazard 5 (NASA OCHMO CO₂ & Atmosphere Briefs)",
    description: "Here is: Cross-crew headache/fatigue attribution when shared module CO₂ rises above target.",
    inputSlot: "Add your info: Cabin ppCO₂ (mmHg), ppO₂ (mmHg), total pressure (psia) here",
  },
  {
    id: "debuff-noise",
    name: "Shared Sleep-Quarter Acoustic Debuff",
    source: "Hazard 2 & Hazard 5 (NASA-STD-3001 NC-40)",
    description: "Here is: Flags environmental fan/ECLSS noise breach as shared habitat debuff rather than individual insomnia.",
    inputSlot: "Add your info: Continuous noise level (dBA / NC curve) per module here",
  },
  {
    id: "debuff-radiation",
    name: "Solar Particle / Compartment Radiation Debuff",
    source: "Hazard 1 (DONKI SEP + Onboard Dosimetry)",
    description: "Here is: Space weather event + local compartment dose-rate elevation requiring shelter routing.",
    inputSlot: "Add your info: DONKI event status & compartment dose rate (Gy/h or Sv/h) here",
  },
  {
    id: "debuff-comms",
    name: "Deep-Space Comms Delay & Isolation Drift Debuff",
    source: "Hazard 2 & Hazard 3 (JPL Horizons + CHAPEA/Mars500)",
    description: "Here is: Autonomy strain during 8–48 min RTT delays or Third-Quarter mission midpoint dip.",
    inputSlot: "Add your info: Current RTT comms delay (min) & mission day % here",
  },
];

export const BUDDY_RESCUE_STEPS = [
  {
    step: 1,
    title: "Check Responsiveness & Immediate Environment",
    detail: "Here is: Verify crewmate responsiveness and check local module CO₂ / O₂ / pressure / radiation readings before entering.",
  },
  {
    step: 2,
    title: "Trigger Local Alarm & Notify Crew / Lead",
    detail: "Here is: Activate onboard crew alert (works offline without Earth link) and summon Crew Medical Officer.",
  },
  {
    step: 3,
    title: "Open Pre-Approved Stabilization Checklist",
    detail: "Here is: Follow locally cached NASA-grounded stabilization steps constrained to available non-expired onboard medical kit items.",
  },
  {
    step: 4,
    title: "Log & Queue DTN Medical Report",
    detail: "Here is: Record observations in the Store-and-Forward outbound queue for ground Flight Surgeon receipt when link opens.",
  },
];

export const MEDICAL_INVENTORY_SLOTS = [
  {
    id: "inv-1",
    itemSlot: "Add your info: Onboard medical supply / kit item name here (e.g., Acoustic Protection / Hydration Salts)",
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
