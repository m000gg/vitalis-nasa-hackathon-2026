export interface HazardInputSlot {
  streamName: string;
  inputPrompt: string;
  sourceRef: string;
}

export interface HazardSpec {
  slug: "radiation" | "isolation" | "distance" | "gravity" | "environment";
  number: number;
  title: string;
  shortTitle: string;
  sourceDoc: string;
  nasaReferences: string[];
  overviewSlot: string;
  inputSlots: HazardInputSlot[];
  outputSlots: {
    immediateHorizon: string;
    prolongedHorizon: string;
    etaSlot: string;
    solutionsSlot: string;
  };
  leadView: {
    summary: string;
    privacyRule: string;
    modules: { title: string; detail: string; actionSlot: string }[];
  };
  memberView: {
    summary: string;
    privacyRule: string;
    modules: { title: string; detail: string; actionSlot: string }[];
  };
  proposedEndpoints: { method: string; path: string; purpose: string }[];
  alarmPreset: {
    title: string;
    severity: "CRITICAL" | "WARNING";
    etaLabel: string;
    descriptionSlot: string;
    leadActions: string[];
    memberActions: string[];
  };
}

export const HAZARDS: HazardSpec[] = [
  {
    slug: "radiation",
    number: 1,
    title: "Space Radiation",
    shortTitle: "Radiation",
    sourceDoc: "docs/hazards/01-space-radiation.md",
    nasaReferences: [
      "NASA HRP Space Radiation",
      "NASA DONKI (SEP / FLR / RBE)",
      "Mars RAD / PDS",
      "Artemis I Orion Measurements",
      "NASA OLTARIS & OSDR / BioSentinel",
    ],
    overviewSlot:
      "Here is: Individual and crew-wide radiation exposure tracking, space-weather event replay, storm-shelter routing, and experimental shielding research — clearly separating measured observations, modeled estimates, and experimental concepts.",
    inputSlots: [
      {
        streamName: "Personal Dosimeter",
        inputPrompt: "Add your info: crew_id, dose_rate (Gy/h or Sv/h), cumulative_dose, instrument & uncertainty here",
        sourceRef: "01-space-radiation.md §3C",
      },
      {
        streamName: "Compartment Sensors",
        inputPrompt: "Add your info: compartment_id, local dose_rate, detector_status, orientation/position here",
        sourceRef: "Artemis I / Orion spatial map",
      },
      {
        streamName: "Space Weather (DONKI)",
        inputPrompt: "Add your info: SEP / FLR / RBE event_id, start_time, confidence (event ≠ direct internal dose) here",
        sourceRef: "NASA DONKI API",
      },
      {
        streamName: "Shielding & BioShield Lab (Experimental)",
        inputPrompt: "Add your info: shield material/thickness or experimental fungal/control specimen data here",
        sourceRef: "OLTARIS / ISS Cladosporium study",
      },
    ],
    outputSlots: {
      immediateHorizon: "Here is: Immediate SEP / belt entry alert, EVA abort/return guidance, and Captain approval countdown.",
      prolongedHorizon: "Here is: Mission-end exposure forecast with uncertainty interval and radiation-budget comparison.",
      etaSlot: "Here is: Estimated Time of Action before shelter threshold or EVA exposure limit.",
      solutionsSlot: "Here is: 1–2 feasible countermeasures (e.g., Move to designated storm shelter; Suspend/reassess EVA per flight rules).",
    },
    leadView: {
      summary: "Crew-wide dosimetry comparison, shelter arrival tracker, compartment heatmap, Captain Approval / Emergency Override, and lower-exposure task rotation.",
      privacyRule: "Privacy rule: Mission safety telemetry is visible to Lead; clinical blood/DNA-damage findings require authorization.",
      modules: [
        {
          title: "Crew Radiation Comparison & Budget",
          detail: "Here is: Comparative cumulative dose & task-rotation proposals across crew without exposing unauthorized clinical labs.",
          actionSlot: "Add your info: Mission-policy exposure limit & rotation plan here",
        },
        {
          title: "Captain Approval & Emergency Override",
          detail: "Here is: Request Captain acknowledgement on confirmed hazard; auto-escalates alarm & route lights if procedure timeout expires.",
          actionSlot: "Add your info: Procedure acknowledgement timeout window here",
        },
        {
          title: "Crew Evacuation & Shelter Occupancy Tracker",
          detail: "Here is: Track who reached designated storm shelter, shelter capacity constraints, and inside vs. outside sensor readings.",
          actionSlot: "Add your info: Shelter capacity & compartment assignment here",
        },
      ],
    },
    memberView: {
      summary: "Personal accumulated dose (keeping Gy and Sv distinct), mission exposure forecast, radiation-aware sleep area advice, and shortest safe shelter route.",
      privacyRule: "Privacy rule: Your personal medical/biomarker context stays restricted unless authorized.",
      modules: [
        {
          title: "Personal Radiation Profile & Budget",
          detail: "Here is: Personal cumulative dose, uncertainty interval, and scheduled EVA exposure check.",
          actionSlot: "Add your info: Personal dosimeter reading & activity log here",
        },
        {
          title: "Radiation Escape Route & Sleep Planner",
          detail: "Here is: Route minimizing expected added exposure to storm shelter + lower-exposure sleeping compartment suggestions.",
          actionSlot: "Add your info: Current compartment location here",
        },
        {
          title: "BioShield & What-If Simulator (Experimental)",
          detail: "Here is: Clearly labeled experimental/what-if comparison (remain vs. shelter vs. cargo rearrangement).",
          actionSlot: "Add your info: What-if scenario selection here",
        },
      ],
    },
    proposedEndpoints: [
      { method: "GET", path: "/api/hazards", purpose: "Fetch hazard metadata and input/output schema slots" },
      { method: "POST", path: "/api/emergency/events", purpose: "Trigger or record simulated SEP / radiation alarm event" },
    ],
    alarmPreset: {
      title: "SOLAR ENERGETIC PARTICLE (SEP) EVENT — SHELTER PROTOCOL",
      severity: "CRITICAL",
      etaLabel: "Here is: Procedure-defined Estimated Time of Action (e.g., Shelter window countdown)",
      descriptionSlot:
        "Here is: Elevated onboard compartment dose-rate + simulated DONKI SEP warning. Auto-escalation active if Captain acknowledgement times out.",
      leadActions: [
        "1. Issue Captain Approval / Emergency Override to illuminate shelter routes.",
        "2. Verify all crew shelter arrival confirmations & suspend active EVA per flight rules.",
      ],
      memberActions: [
        "1. Proceed via lowest-exposure route to pre-designated storm shelter.",
        "2. Confirm arrival on crew tracker; initiate Buddy-Rescue if a crewmate is unresponsive.",
      ],
    },
  },
  {
    slug: "isolation",
    number: 2,
    title: "Isolation & Confinement",
    shortTitle: "Isolation",
    sourceDoc: "docs/hazards/02-isolation-and-confinement.md",
    nasaReferences: [
      "NASA HRP Isolation & Confinement",
      "NASA-STD-3001 Vol. 2 (NC-40 / Lighting / Privacy)",
      "HERA, CHAPEA & Mars500",
      "Cognition (PVT-B) & CONNECT Framework",
      "ISS Veggie Space Gardening & Journaling",
    ],
    overviewSlot:
      "Here is: Sleep/circadian drift tracking, acoustic habitability correlation, 60-second neurobehavioral self-checks, privacy-protected journaling, and CONNECT/biophilia countermeasures.",
    inputSlots: [
      {
        streamName: "Wearable / Actigraphy",
        inputPrompt: "Add your info: sleep_duration_h, sleep_efficiency_pct, circadian_phase_shift_min, daytime_activity_counts here",
        sourceRef: "ARCHeR / Mars500 / Concordia",
      },
      {
        streamName: "Habitat Acoustics & Lighting",
        inputPrompt: "Add your info: sleep_quarter_noise (NC / dBA vs NC-40), ambient_lux_schedule_match, mission_day_pct here",
        sourceRef: "NASA-STD-3001 Vol. 2",
      },
      {
        streamName: "60-Second Self-Check (Private)",
        inputPrompt: "Add your info: pvt_median_rt_ms, pvt_lapses_count, subjective_fatigue_1_5, private mood/journal here",
        sourceRef: "Cognition PVT-B / Journaling",
      },
    ],
    outputSlots: {
      immediateHorizon: "Here is: Pre-EVA / precision-task vigilance alert when sleep debt or PVT lapses spike.",
      prolongedHorizon: "Here is: Martian sol (24h 39m) circadian drift, NC-40 acoustic sleep debt, or Third-Quarter monotony window.",
      etaSlot: "Here is: Estimated Time of Action before critical vigilance threshold or circadian desynchronization.",
      solutionsSlot: "Here is: 1–2 CONNECT / Veggie / acoustic-mitigation actions constrained by onboard kit & schedule.",
    },
    leadView: {
      summary: "Anonymized Crew-Wide Sleep Readiness Index, shared NC-40 acoustic/lighting debuffs, Third-Quarter banner, and Re-Entry UI throttling.",
      privacyRule: "STRICT PRIVACY FIREWALL: Raw journal entries, personal mood/depression scores, and sleep-aid usage are NEVER shown to Lead.",
      modules: [
        {
          title: "Crew-Wide Readiness Matrix (Anonymized)",
          detail: "Here is: Aggregate % below sleep threshold & non-clinical Green/Amber/Red duty readiness without clinical text.",
          actionSlot: "Add your info: Crew schedule adjustment or protected sleep window here",
        },
        {
          title: "Shared Habitat Debuff Attribution",
          detail: "Here is: Distinguishes shared ECLSS fan noise (> NC-40) or comms-lag strain from individual insomnia.",
          actionSlot: "Add your info: Affected crew quarters / acoustic inspection note here",
        },
        {
          title: "Post-Isolation Re-Entry Mode Toggle",
          detail: "Here is: Reduces non-essential alerts & caps action cards to 1 step to prevent decision/sensory overload.",
          actionSlot: "Add your info: Mission phase toggle (Operational vs. Re-entry) here",
        },
      ],
    },
    memberView: {
      summary: "60-second PVT-B/fatigue self-check, strictly private reflection/journal log, Martian sol circadian guidance, and Veggie plant-care sensory reset.",
      privacyRule: "PRIVATE TO YOU: Your journal text, mood valence, and sleep-medication logs remain local to your profile.",
      modules: [
        {
          title: "60-Second Guided Self-Check & Private Journal",
          detail: "Here is: Quick fatigue/vigilance check + private encrypted reflection slot (only anonymized readiness contributes to team view).",
          actionSlot: "Add your info: Subjective fatigue (1–5), PVT-B check, or private journal note here",
        },
        {
          title: "CONNECT & Biophilia Countermeasures",
          detail: "Here is: 1–2 actions (e.g., 10-min Veggie plant-module care; scheduled aerobic/resistance session with crewmate).",
          actionSlot: "Add your info: Completed countermeasure log here",
        },
      ],
    },
    proposedEndpoints: [
      { method: "GET", path: "/api/hazards", purpose: "Load Hazard 2 privacy boundaries & CONNECT countermeasure slots" },
    ],
    alarmPreset: {
      title: "CIRCADIAN & VIGILANCE DEBUFF — PRE-TASK HOLD",
      severity: "WARNING",
      etaLabel: "Here is: Estimated Time of Action prior to scheduled precision task / EVA",
      descriptionSlot:
        "Here is: Shared sleep-quarter acoustic breach (> NC-40) + multi-night sleep debt pattern detected across >= 2 quarters.",
      leadActions: [
        "1. Order ECLSS fan muffler inspection & issue ANC/earplugs from Med Kit.",
        "2. Shift non-critical maintenance to restore protected 8h sleep window.",
      ],
      memberActions: [
        "1. Complete 3-min vigilance check before precision operations.",
        "2. Use temporary acoustic mitigation or relocate per habitat sleep advisory.",
      ],
    },
  },
  {
    slug: "distance",
    number: 3,
    title: "Distance from Earth",
    shortTitle: "Distance",
    sourceDoc: "docs/hazards/03-distance-from-earth.md",
    nasaReferences: [
      "NASA HRP Distance From Earth",
      "NASA Delay/Disruption Tolerant Networking (DTN)",
      "NASA JPL Horizons API",
      "NASA Integrated Medical Model (IMM)",
      "NASA Deep Space Network (DSN Now)",
    ],
    overviewSlot:
      "Here is: Deep Space Autonomy Mode — Earth–Mars light-time delay calculation, offline-first medical checklists, onboard supply/expiry tracking, and Store-and-Forward report queuing.",
    inputSlots: [
      {
        streamName: "Earth–Mars Ephemeris (JPL Horizons)",
        inputPrompt: "Add your info: Selected mission date, Earth–Mars distance (km), calculated one-way & RTT delay here",
        sourceRef: "03-distance-from-earth.md §6",
      },
      {
        streamName: "DTN Outbound Medical Queue",
        inputPrompt: "Add your info: Symptom/incident report title, severity, sender callsign, link state (ONLINE/BLACKOUT) here",
        sourceRef: "DTN Store-and-Forward §5",
      },
      {
        streamName: "Onboard Medical Inventory",
        inputPrompt: "Add your info: Supply item, remaining quantity, expiration date, low-stock threshold here",
        sourceRef: "IMM / §4 Limited Medical Supplies",
      },
    ],
    outputSlots: {
      immediateHorizon: "Here is: Offline-first approved checklist & Buddy-Rescue flow while Earth is unreachable.",
      prolongedHorizon: "Here is: Pending DTN medical reports awaiting transmission & upcoming supply expirations.",
      etaSlot: "Here is: Current Earth–Mars round-trip communication delay vs. local action window.",
      solutionsSlot: "Here is: 1–2 locally executable steps filtered by non-expired onboard supplies (never autonomous prescribing).",
    },
    leadView: {
      summary: "Store-and-Forward DTN queue oversight, link blackout simulation, onboard supply readiness, and CMO escalation coordination.",
      privacyRule: "Authorized operational medical queue status & inventory alerts; raw personal notes remain protected.",
      modules: [
        {
          title: "DTN Store-and-Forward Queue & Link Control",
          detail: "Here is: View PENDING / SENT / ACKNOWLEDGED reports and simulate link outage vs. sync.",
          actionSlot: "Add your info: Earth link state & retry policy here",
        },
        {
          title: "Medical Inventory & Expiry Oversight",
          detail: "Here is: Track onboard medical kit stock, expiring consumables, and mission-duration sufficiency.",
          actionSlot: "Add your info: Inventory audit / restock note here",
        },
      ],
    },
    memberView: {
      summary: "Personal baseline comparison, offline approved medical guide, quick symptom report submission to local DTN queue, and Buddy-Rescue mode.",
      privacyRule: "Reports queued to Flight Surgeon/CMO respect medical confidentiality rules.",
      modules: [
        {
          title: "Offline Medical Guide & Self-Report Queue",
          detail: "Here is: Submit a structured symptom/incident report locally when Earth link is down (stays in PENDING queue).",
          actionSlot: "Add your info: Observed symptoms & baseline deviation notes here",
        },
        {
          title: "Earth Delay Context & Autonomy Guidance",
          detail: "Here is: Shows why local crew action is required before a 40+ min Earth round-trip reply can arrive.",
          actionSlot: "Add your info: Current mission link latency check here",
        },
      ],
    },
    proposedEndpoints: [
      { method: "GET", path: "/api/communications/queue", purpose: "Inspect Store-and-Forward outbound medical queue" },
      { method: "POST", path: "/api/communications/queue", purpose: "Queue a medical report locally while Earth link is unavailable" },
      { method: "POST", path: "/api/communications/sync", purpose: "Transmit pending reports and record receipts when link restores" },
    ],
    alarmPreset: {
      title: "EARTH LINK BLACKOUT + MEDICAL INCIDENT — DEEP SPACE AUTONOMY",
      severity: "CRITICAL",
      etaLabel: "Here is: Earliest Earth round-trip reply unavailable (> 40 min delay / LOS)",
      descriptionSlot:
        "Here is: Crew member reported acute dizziness/fatigue while Earth link is unavailable. Local onboard protocol & DTN queue activated.",
      leadActions: [
        "1. Assign Crew Medical Officer (CMO) to open pre-approved local stabilization checklist.",
        "2. Verify medical report is persisted in local DTN queue (PENDING) for next DSN window.",
      ],
      memberActions: [
        "1. Follow offline pre-approved checklist using verified in-stock Med Kit items.",
        "2. Launch Buddy-Rescue mode immediately if crewmate becomes unresponsive.",
      ],
    },
  },
  {
    slug: "gravity",
    number: 4,
    title: "Gravity Fields",
    shortTitle: "Gravity",
    sourceDoc: "docs/hazards/04-gravity-fields-enviroments.md",
    nasaReferences: [
      "MR081L (Handgrip / Pinch Dynamometry)",
      "MEDB 5.4 (Calf Volume EZOG)",
      "MEDB 5.2 (Daily Exercise 2.5h)",
      "MEDB 6.1 / 6.2 / 6.3 & MR087L (EVA Readiness Chain)",
      "MR026L (Postflight R+0 to R+45 Reconditioning)",
    ],
    overviewSlot:
      "Here is: On-board EVA Readiness Gate (compensating for ~22 min delay where ground real-time EVA monitoring cannot run), muscle/bone atrophy trend slots, and pre-test condition tracking.",
    inputSlots: [
      {
        streamName: "Handgrip & Calf Volume",
        inputPrompt: "Add your info: grip_strength, calf_volume (manual calibrated entry), taken_at, conditions_met (bool) here",
        sourceRef: "MR081L / MEDB 5.4",
      },
      {
        streamName: "Daily Exercise Log",
        inputPrompt: "Add your info: aerobic_min (1h target), resistance_min (1.5h target), prescribed vs. dialled load here",
        sourceRef: "MEDB 5.2",
      },
      {
        streamName: "EVA Readiness Chain",
        inputPrompt: "Add your info: PFE status, pre-EVA grip window (10–14d), arm ergometry, prebreathe practice, 48h health status here",
        sourceRef: "MR087L / MEDB 6.1–6.3",
      },
    ],
    outputSlots: {
      immediateHorizon: "Here is: EVA Gate output — GO / CONDITIONAL / NO-GO, active blockers, and nearest schedule deadline.",
      prolongedHorizon: "Here is: Personal-baseline atrophy/adherence trend (clearly labeled low-N & team ASSUMPTION thresholds).",
      etaSlot: "Here is: Nearest EVA schedule deadline (e.g., 48h pre-EVA health status window or 24h grip blockout).",
      solutionsSlot: "Here is: 1–2 schedule/pre-test actions (e.g., Complete morning calf check before breakfast; Defer grip test >24h before EVA).",
    },
    leadView: {
      summary: "Per-crew EVA Gate status (GO / CONDITIONAL / NO-GO), blocker categories, team exercise discipline buff, and audit-logged Emergency Medical Detail Unlock.",
      privacyRule: "RBAC: Lead sees gate status & blocker categories only (e.g., 'test overdue') — no raw values or private notes unless Emergency Unlock is triggered & logged.",
      modules: [
        {
          title: "Crew EVA Readiness Gate (Flight Note View)",
          detail: "Here is: Summary gate status (GO/CONDITIONAL/NO-GO) & blocker categories per astronaut.",
          actionSlot: "Add your info: Planned EVA date & suit type (EMU/other) here",
        },
        {
          title: "Emergency Detail Unlock (Audit-Logged)",
          detail: "Here is: Explicit emergency unlock revealing details only with logged justification + automatic crew member notification.",
          actionSlot: "Add your info: Emergency unlock reason & authorization here",
        },
      ],
    },
    memberView: {
      summary: "Personal EVA gate checklist, pre-test condition rules (no caffeine/meal/strenuous exercise windows), personal baseline trend, and R+0..R+45 reconditioning card.",
      privacyRule: "All own measurements, notes, and trends stay private unless an audit-logged emergency unlock occurs.",
      modules: [
        {
          title: "Personal EVA Readiness Chain & Pre-Test Conditions",
          detail: "Here is: Checklist covering PFE, Grip window, Arm Ergometry, Prebreathe verification, ISLE training, and 48h Pre-EVA Health Status.",
          actionSlot: "Add your info: Test completion & conditions_met verification here",
        },
        {
          title: "Atrophy, Exercise & Return-to-Gravity Card",
          detail: "Here is: Daily 2.5h exercise adherence slot + postflight 120 min/day reconditioning card (note: in-flight bone loss is estimated, DXA is pre/post only).",
          actionSlot: "Add your info: Daily aerobic/resistance session log here",
        },
      ],
    },
    proposedEndpoints: [
      { method: "GET", path: "/api/hazards", purpose: "Retrieve EVA gate schedule rules and ASSUMPTION parameter labels" },
      { method: "POST", path: "/api/emergency/events", purpose: "Record audit-logged Commander emergency unlock event" },
    ],
    alarmPreset: {
      title: "EVA READINESS GATE HOLD — SCHEDULE / PRE-TEST BLOCKER",
      severity: "WARNING",
      etaLabel: "Here is: Nearest EVA gate deadline (e.g., <= 48h Pre-EVA health status window)",
      descriptionSlot:
        "Here is: EVA gate evaluated NO-GO/CONDITIONAL due to missing pre-EVA verification or pre-test condition violation.",
      leadActions: [
        "1. Hold EVA suit donning for affected crew slot or rotate EVA assignment.",
        "2. Use Audit-Logged Emergency Unlock only if mission-critical medical review is needed.",
      ],
      memberActions: [
        "1. Complete missing pre-EVA health status / verification under valid pre-test conditions.",
        "2. Do not perform handgrip test within 24h prior to EVA.",
      ],
    },
  },
  {
    slug: "environment",
    number: 5,
    title: "Hostile/Closed Environments",
    shortTitle: "Environment",
    sourceDoc: "docs/hazards/05-hostile-closed-environments.md",
    nasaReferences: [
      "NASA HRP Hostile/Closed Environments",
      "NASA OCHMO CO₂ Technical Brief",
      "NASA OCHMO Habitable Atmosphere Technical Brief",
      "NASA OCHMO Acoustics Technical Brief",
      "NASA OSDR Environmental Data App (EDA)",
    ],
    overviewSlot:
      "Here is: Closed-ecosystem habitat telemetry linking cabin CO₂, O₂, pressure, humidity, acoustics, and microbial contact context to early crew symptom prevention.",
    inputSlots: [
      {
        streamName: "Cabin Atmosphere & Pressure",
        inputPrompt: "Add your info: Module CO₂ (mmHg vs 4 mmHg target), O₂ (mmHg vs 122 mmHg floor), total pressure (5.0–15.0 psia) here",
        sourceRef: "OCHMO CO₂ & Habitable Atmosphere",
      },
      {
        streamName: "Module Acoustics & Thermal",
        inputPrompt: "Add your info: Noise level (dBA vs 85 dBA hazardous / NC-40 sleep limit), temperature, relative humidity here",
        sourceRef: "OCHMO Acoustics / OSDR EDA",
      },
      {
        streamName: "OSDR EDA Telemetry Replay",
        inputPrompt: "Add your info: ISS EDA mission_id & replay speed for cabin environment stream here",
        sourceRef: "05-hostile-closed-environments.md §3 & §5",
      },
    ],
    outputSlots: {
      immediateHorizon: "Here is: Acute hypoxia / rapid pressure-change / hazardous noise alarm & module evacuation advice.",
      prolongedHorizon: "Here is: CO₂ headache risk forecast, module weather map (green/yellow/red), and morning sleep-environment report.",
      etaSlot: "Here is: Projected time until module CO₂ or O₂ crosses NASA OCHMO operational limit.",
      solutionsSlot: "Here is: 1–2 actions (e.g., Sleep relocation to Module B tonight; Inspect CO₂ scrubber / ECLSS ducting).",
    },
    leadView: {
      summary: "Module Weather Map (green/yellow/red across all spacecraft modules), crew-wide CO₂ headache forecast, and sleep-relocation orders.",
      privacyRule: "Environmental module telemetry is crew-wide; contact tracing / contagion views are flagged as future work with limited public data.",
      modules: [
        {
          title: "Module Weather Map & Replay Control",
          detail: "Here is: Live or OSDR-EDA replayed green/yellow/red status per module for CO₂, O₂, pressure, temp, and noise.",
          actionSlot: "Add your info: Module telemetry override or EDA replay mission_id here",
        },
        {
          title: "Crew Headache Forecast & Relocation Orders",
          detail: "Here is: Cross-crew headache odds alert (e.g., CO₂ rising across shared sleeping bay) + relocation plan.",
          actionSlot: "Add your info: Crew module reassignment plan here",
        },
      ],
    },
    memberView: {
      summary: "Personal 'Where to go' relocation advice, morning Sleep & Environment report (linking sleep quality to night noise & CO₂), and personal local readings.",
      privacyRule: "Personal symptom logs remain private while shared module alerts warn the whole crew early.",
      modules: [
        {
          title: "Where-to-Go & Sleep Environment Report",
          detail: "Here is: Plain-language morning briefing & relocation advice (e.g., 'Module A CO₂ elevated — sleep in Module B tonight').",
          actionSlot: "Add your info: Morning symptom check (headache / dizziness / sleep) here",
        },
        {
          title: "Module Safety Limits Reference",
          detail: "Here is: Displays NASA OCHMO operational context (CO₂ <= 4 mmHg target, O₂ >= 122 mmHg floor, 5–15 psia, <85 dBA / NC-40).",
          actionSlot: "Add your info: Local handheld sensor check here",
        },
      ],
    },
    proposedEndpoints: [
      { method: "POST", path: "/api/environment/replay/start", purpose: "Start OSDR EDA cabin telemetry replay" },
      { method: "GET", path: "/api/environment/modules", purpose: "Module weather map (green/yellow/red)" },
      { method: "GET", path: "/api/environment/headache-risk", purpose: "CO₂ headache risk forecast slot" },
      { method: "GET", path: "/api/environment/recommendations/relocation", purpose: "Where-to-go crew relocation advice" },
    ],
    alarmPreset: {
      title: "CLOSED HABITAT ATMOSPHERE BREACH — CO₂ / O₂ / PRESSURE ALERT",
      severity: "CRITICAL",
      etaLabel: "Here is: Estimated Time of Action before 1-hour TWA O₂ floor or CO₂ headache/hypercapnia threshold",
      descriptionSlot:
        "Here is: Module A atmospheric telemetry breached operational bounds. Multiple crew members at risk of shared environmental debuff.",
      leadActions: [
        "1. Evacuate/isolate affected module and redistribute crew to green-status compartments.",
        "2. Dispatch Flight Engineer to inspect CO₂ scrubber / O₂ supply loop.",
      ],
      memberActions: [
        "1. Move immediately to designated green-status module per Where-to-Go guidance.",
        "2. Monitor for headache/dizziness/hypoxia symptoms and report via local check-in.",
      ],
    },
  },
];

export function getHazardBySlug(slug: string): HazardSpec | undefined {
  return HAZARDS.find((h) => h.slug === slug);
}
