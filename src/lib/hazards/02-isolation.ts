import {
  HazardChartSpec,
  HazardDataRecord,
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardSampleRecord,
  HazardSpec,
} from "./types";

/**
 * ============================================================================
 * HAZARD 2: ISOLATION & CONFINEMENT
 * Owner: Teammate 2 — Edit ONLY this file (src/lib/hazards/02-isolation.ts)
 * and the registered Hazard 02 screen component.
 * ============================================================================
 */

// [SECTION 1: HAZARD 2 VALUES & THRESHOLD SLOTS]
// Strictly limited to published NASA standards and NASA-supported peer-reviewed studies:
// - NASA-STD-3001 Vol. 1 & Vol. 2 ([V2 6079], [V2 8055])
// - NASA OCHMO-TB-004 (Carbon Dioxide) & OCHMO Acoustics Technical Brief
// - Barger et al. (2014), The Lancet Neurology (ISS & Shuttle sleep study)
// - Basner, Mollicone & Dinges (2011) & Basner et al. (2015) (NASA Cognition PVT-B)
// - Basner et al. (2014), PLOS ONE (Mars500 520-day study) & CHAPEA
export const ISOLATION_PIPELINE_VALUES = {
  supportedStreams: [
    "Wearable / Actigraphy",
    "Habitat Acoustics & Lighting",
    "60-Second Self-Check (Private)",
    "CONNECT & Countermeasure Log",
  ] as const,

  // Sleep Benchmarks (NASA-STD-3001 Vol. 1 + Barger et al., 2014, The Lancet Neurology)
  scheduledSleepHours: 8.5, // Scheduled sleep opportunity in ISS operations (Barger et al., 2014)
  nasaStd3001SleepReqHours: 8.0, // NASA-STD-3001 Vol. 1 daily sleep requirement
  issHistoricalMeanSleepHours: 6.09, // Observed ISS mean sleep duration (Barger et al., 2014)
  shuttleHistoricalMeanSleepHours: 5.96, // Observed Space Shuttle mean sleep duration (Barger et al., 2014)
  issHypnoticUsePct: 75, // Observed ISS crew sleep-medication prevalence (Barger et al., 2014)

  // NASA Cognition / PVT-B Benchmark (Basner, Mollicone & Dinges, 2011)
  pvtLapseThresholdMs: 355, // Validated 3-min PVT-B lapse threshold (vs. 500 ms on 10-min PVT)

  // Circadian Benchmark (CHAPEA Martian Sol)
  martianSolDriftMinPerDay: 39, // 24h 39m 35s Martian sol vs. 24h Earth day
  chapeaMaxCommsRttMin: 44, // Up to 44-min round-trip comms delay in CHAPEA

  // Habitability & Acoustics (NASA-STD-3001 Vol. 2 [V2 6079])
  sleepQuarterNoiseLimitNc40Dba: 49, // NC-40 continuous sleep-quarter limit (>30 day missions)
  workAreaNoiseLimitNc50Dba: 58, // NC-50 continuous work-area limit

  // Mars500 / HERA Confinement Window (Basner et al., 2014)
  thirdQuarterStartPct: 50,
  thirdQuarterEndPct: 75,

  // Cross-Hazard Habitat CO2 Limit (NASA-STD-3001 Vol. 2 / OCHMO-TB-004)
  co2LimitMmHg: 3.0, // <= 3 mmHg nominal habitable volume ppCO2 limit
};

export interface ResearchReferenceLink {
  label: string;
  url: string;
}

export interface IsolationInfoEntry {
  id: string;
  title: string;
  explanation: string;
  benchmark: string;
  links: readonly ResearchReferenceLink[];
}

export const ISOLATION_RESEARCH_METADATA: Record<string, IsolationInfoEntry> = {
  actigraphy_sleep: {
    id: "actigraphy_sleep",
    title: "Actigraphy Sleep, Efficiency & HRV",
    explanation:
      "Tracks nightly sleep duration, sleep efficiency, and resting heart rate variability (HRV RMSSD) from wrist actigraphy, matching NASA ARCHeR and OSDR Standard Measures.",
    benchmark:
      "NASA schedules 8.5 h/night (NASA-STD-3001 Vol. 1 requires 8.0 h); ISS crew averaged 6.09 h (Shuttle 5.96 h) with 75% using sleep aids (Barger et al., 2014).",
    links: [
      {
        label: "Barger et al. (2014) — Lancet Neurology (DOI)",
        url: "https://doi.org/10.1016/S1474-4422(14)70122-X",
      },
      {
        label: "NASA HRP Ongoing Research (ARCHeR / Standard Measures)",
        url: "https://www.nasa.gov/hrp/ongoing-hrp-research/",
      },
      {
        label: "NASA OSDR Stress & Immune Datasets",
        url: "https://osdr.nasa.gov/",
      },
    ],
  },
  pvt_cognition: {
    id: "pvt_cognition",
    title: "Cognition PVT-B Vigilance & Circadian Shift",
    explanation:
      "The 3-minute Brief Psychomotor Vigilance Test (PVT-B) from NASA's Cognition battery detects microsleeps and attentional lapses caused by sleep loss or circadian misalignment (such as the 24h 39m Martian sol drift).",
    benchmark:
      "Validated PVT-B lapse threshold >= 355 ms (Basner et al., 2011; vs. 500 ms on 10-min PVT). Mars sol drift = +39 min/day (24h 39m 35s sol, CHAPEA).",
    links: [
      {
        label: "Basner, Mollicone & Dinges (2011) — PVT-B 355 ms (DOI)",
        url: "https://doi.org/10.1016/j.actaastro.2011.07.015",
      },
      {
        label: "Basner et al. (2015) — NASA Cognition Battery (DOI)",
        url: "https://doi.org/10.3357/AMHP.4343.2015",
      },
      {
        label: "CHAPEA Mars Analog (24h 39m Sol & 44-min Delay)",
        url: "https://www.nasa.gov/mission/chapea/",
      },
    ],
  },
  sleep_acoustics: {
    id: "sleep_acoustics",
    title: "Sleep-Quarter Acoustics & Circadian Lighting",
    explanation:
      "Measures continuous and impulse noise in crew sleep bays alongside compliance with NASA's tunable circadian lighting schedule (blue-enriched wake light, dim red-shifted pre-sleep light).",
    benchmark:
      "NASA-STD-3001 Vol. 2 [V2 6079]: <= NC-40 (~49 dBA) in sleep quarters and <= NC-50 (~58 dBA) in work areas for >30-day missions. [V2 8055]: Dynamic circadian lighting.",
    links: [
      {
        label: "NASA-STD-3001 Standards Portal",
        url: "https://standards.nasa.gov/",
      },
      {
        label: "NASA OCHMO Acoustics Technical Brief (PDF)",
        url: "https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf",
      },
      {
        label: "NASA OCHMO Habitable Environment",
        url: "https://www.nasa.gov/ochmo/",
      },
    ],
  },
  mission_connect: {
    id: "mission_connect",
    title: "Third-Quarter Window & NASA CONNECT / Veggie",
    explanation:
      "Tracks mission elapsed % (Mars500 50%–75% Third-Quarter phenomenon) alongside NASA CONNECT resilience check-ins and ISS Veggie space gardening countermeasures.",
    benchmark:
      "Mars500 & HERA documented motivation/cohesion dips in the 50%–75% mission window; ISS Veggie and NASA CONNECT support sensory enrichment and crew cohesion.",
    links: [
      {
        label: "NASA HRP Hazard 2: Isolation & Confinement",
        url: "https://www.nasa.gov/hrp/hazard-isolation-and-confinement/",
      },
      {
        label: "NASA Podcast Ep. 58 — CONNECT Framework",
        url: "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      },
      {
        label: "ISS Veggie Space Gardening & Biophilia",
        url: "https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/",
      },
    ],
  },
  ready_to_act_guidance: {
    id: "ready_to_act_guidance",
    title: "Dual-Horizon Guidance & Re-Entry Throttling",
    explanation:
      "Separates immediate NASA safety limits (355 ms PVT-B lapse ceiling, ISS sleep floor, NC-40/50 acoustics) from prolonged trends (Martian sol drift, Third-Quarter window, Hazard 05 CO₂). In Re-Entry Mode, caps action cards to 1 step per NASA post-isolation guidance.",
    benchmark:
      "Cross-correlates Hazard 05 ppCO2 (> 3.0 mmHg per NASA-STD-3001 / OCHMO-TB-004) & acoustics with sleep loss; caps solutions to 1 step in Re-Entry mode per NASA Emerging from Isolation.",
    links: [
      {
        label: "Five Tips from NASA Crew on Emerging from Isolation",
        url: "https://www.nasa.gov/humans-in-space/five-tips-from-nasa-crew-on-emerging-from-isolation/",
      },
      {
        label: "NASA OCHMO CO₂ Technical Brief (PDF)",
        url: "https://nasa.gov/wp-content/uploads/2023/03/co2-technical-brief-ochmo.pdf",
      },
      {
        label: "NASA Human Research Roadmap (BMed, Team, Sleep Risks)",
        url: "https://humanresearchroadmap.nasa.gov/Risks/",
      },
    ],
  },
  crew_matrix: {
    id: "crew_matrix",
    title: "Anonymized Crew Matrix",
    explanation:
      "Allows the Commander/Lead to detect shared habitat stressors (such as quarters exceeding 49 dBA NC-40 or crew sleep falling below the 6.09 h ISS historical mean) while masking private journal text, mood scores, and sleep-aid usage.",
    benchmark:
      "Evaluates each crew slot against NASA-STD-3001 NC-40 (49 dBA), Barger et al. (2014) 8.5 h / 6.09 h benchmarks, and Basner et al. (2011) 355 ms PVT-B ceiling.",
    links: [
      {
        label: "NASA Life Sciences Portal (NLSP / Standard Measures)",
        url: "https://nlsp.nasa.gov/",
      },
      {
        label: "NEK / SIRIUS Multicultural Isolation Analog",
        url: "https://www.nasa.gov/about-nek-sirius/",
      },
      {
        label: "HERA 45-Day Isolation & Team Analog",
        url: "https://www.nasa.gov/specials/hera/",
      },
    ],
  },
  personal_fatigue_strain: {
    id: "personal_fatigue_strain",
    title: "Subjective Fatigue, Workload Strain & Hypokinesis",
    explanation:
      "Displays self-rated fatigue and workload strain (1–5) alongside wearable daytime activity counts. Mars500 showed protracted crew hypokinesis (progressive sedentary drift) during prolonged confinement.",
    benchmark:
      "Mars500 520-day study (Basner et al., 2014) tracked daily actigraphy counts and self-ratings to identify progressive hypokinesis and Third-Quarter (50%–75%) strain.",
    links: [
      {
        label: "Basner et al. (2014) — Mars500 520-Day Study (DOI)",
        url: "https://doi.org/10.1371/journal.pone.0093298",
      },
      {
        label: "NASA HRP Behavioral & Performance Research",
        url: "https://www.nasa.gov/hrp/ongoing-hrp-research/",
      },
    ],
  },
  private_journal_firewall: {
    id: "private_journal_firewall",
    title: "Astronaut Journal, Mood & Sleep-Aid Privacy",
    explanation:
      "Personal astronaut reflections, mood valence (1–5), and sleep-medication logs remain visible only to the individual crew member and are stripped before Leader evaluation.",
    benchmark:
      "Barger et al. (2014) found 75% of ISS crew used sleep medication; NASA journaling research highlights strict confidentiality for honest behavioral self-reporting.",
    links: [
      {
        label: "NASA Video — Journaling: Astronauts Chronicle Missions",
        url: "https://www.youtube.com/watch?v=3LD3od5E64U",
      },
      {
        label: "Barger et al. (2014) — Sleep-Aid Prevalence (DOI)",
        url: "https://doi.org/10.1016/S1474-4422(14)70122-X",
      },
    ],
  },
  chart_sleep: {
    id: "chart_sleep",
    title: "Sleep Duration vs. NASA Benchmarks Chart",
    explanation:
      "Plots historical actigraphy sleep duration samples against NASA's 8.5 h scheduled opportunity, 8.0 h NASA-STD-3001 requirement, and 6.09 h ISS historical mean.",
    benchmark:
      "Dashed lines: 8.5 h Scheduled Target (Barger et al., 2014), 8.0 h NASA-STD-3001 Vol. 1 Requirement, 6.09 h ISS Historical Mean (Barger et al., 2014).",
    links: [
      {
        label: "Barger et al. (2014) — Lancet Neurology (DOI)",
        url: "https://doi.org/10.1016/S1474-4422(14)70122-X",
      },
      {
        label: "NASA NLSP Actigraphy & Sleep Datasets",
        url: "https://nlsp.nasa.gov/",
      },
    ],
  },
  chart_pvt: {
    id: "chart_pvt",
    title: "PVT-B Median Reaction Time (Cognition) Chart",
    explanation:
      "Tracks 3-minute PVT-B reaction times against NASA's validated 355 ms cognitive lapse threshold and your personal +2 SD baseline (computed once >= 3 prior samples exist).",
    benchmark:
      "355 ms = validated PVT-B lapse threshold (Basner, Mollicone & Dinges, 2011).",
    links: [
      {
        label: "Basner, Mollicone & Dinges (2011) — PVT-B (DOI)",
        url: "https://doi.org/10.1016/j.actaastro.2011.07.015",
      },
      {
        label: "Basner et al. (2015) — Cognition Battery (DOI)",
        url: "https://doi.org/10.3357/AMHP.4343.2015",
      },
    ],
  },
  chart_acoustics: {
    id: "chart_acoustics",
    title: "Sleep-Quarter Noise vs. NASA-STD-3001 NC-40 Chart",
    explanation:
      "Monitors continuous dBA readings in crew sleep quarters relative to NASA-STD-3001 Vol. 2 acoustic curves. Hearing protection cannot be used to claim NC-40 design compliance.",
    benchmark:
      "NC-40 Sleep Limit = 49 dBA (>30-day missions); NC-50 Work Area Limit = 58 dBA (NASA-STD-3001 Vol. 2 [V2 6079]).",
    links: [
      {
        label: "NASA OCHMO Acoustics Technical Brief (PDF)",
        url: "https://www.nasa.gov/sites/default/files/atoms/files/acoustics_technical_brief_ochmo_0.pdf",
      },
      {
        label: "NASA-STD-3001 Vol. 2 [V2 6079]",
        url: "https://standards.nasa.gov/",
      },
    ],
  },
  chart_hypokinesis: {
    id: "chart_hypokinesis",
    title: "Daytime Activity (Mars500 Hypokinesis Monitor)",
    explanation:
      "Tracks daily actigraphy movement counts to monitor for protracted hypokinesis (progressive sedentary behavior) documented in the 520-day Mars500 analog.",
    benchmark:
      "Mars500 (Basner et al., 2014) demonstrated progressive declines in daytime actigraphy counts during long-duration confinement, especially across the 50%–75% Third-Quarter window.",
    links: [
      {
        label: "Basner et al. (2014) — Mars500 520-Day Study (DOI)",
        url: "https://doi.org/10.1371/journal.pone.0093298",
      },
      {
        label: "NASA HERA Isolation Analog",
        url: "https://www.nasa.gov/specials/hera/",
      },
    ],
  },
};

const STREAM_WEARABLE = "Wearable / Actigraphy";
const STREAM_HABITAT = "Habitat Acoustics & Lighting";
const STREAM_SELF_CHECK = "60-Second Self-Check (Private)";
const STREAM_CONNECT = "CONNECT & Countermeasure Log";

// [SECTION 2: HAZARD 2 FORMULAS & EVALUATION PIPELINE]
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = Number(trimmed);
    if (Number.isFinite(direct)) return direct;
    const match = trimmed.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function toBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") return true;
    if (lower === "false" || lower === "no" || lower === "0") return false;
  }
  return null;
}

function readRecordField(
  records: readonly HazardDataRecord[],
  streamName: string,
  keys: string[]
): number | null {
  const rec = records.find((r) => r.streamName === streamName);
  if (!rec) return null;
  for (const key of keys) {
    const val = toFiniteNumber(rec.payload?.[key]);
    if (val !== null) return val;
  }
  return null;
}

function readRecordBool(
  records: readonly HazardDataRecord[],
  streamName: string,
  keys: string[]
): boolean | null {
  const rec = records.find((r) => r.streamName === streamName);
  if (!rec) return null;
  for (const key of keys) {
    const val = toBooleanFlag(rec.payload?.[key]);
    if (val !== null) return val;
  }
  return null;
}

function extractSampleNumber(sample: HazardSampleRecord, keys: string[], fallbackToNumeric = false): number | null {
  for (const key of keys) {
    const val = toFiniteNumber(sample.samplePayload?.[key]);
    if (val !== null) return val;
  }
  return fallbackToNumeric && sample.numericValue !== null && Number.isFinite(sample.numericValue)
    ? sample.numericValue
    : null;
}

function formatSampleLabel(iso: string, idx: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `#${idx + 1}`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mean(nums: number[]): number {
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
}

function sampleStdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const variance = nums.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

function buildChartSeries(
  samples: readonly HazardSampleRecord[],
  keys: string[],
  fallbackToNumeric = false
) {
  const points: Array<{ label: string; value: number }> = [];
  samples.forEach((s, idx) => {
    const val = extractSampleNumber(s, keys, fallbackToNumeric);
    if (val !== null) {
      points.push({
        label: formatSampleLabel(s.recordedAt, idx),
        value: Number(val.toFixed(2)),
      });
    }
  });
  return points;
}

function detectCrossHazardHabitatStress(
  allRecords: readonly HazardDataRecord[],
  missionDelayLabel: string
): { sharedEnvCause: string | null; commsDelayMin: number | null } {
  const envModuleStreams = ["Habitat Air Readings", "Lab Air Readings", "Galley Air Readings", "Airlock Air Readings"];
  const envAtmos =
    allRecords.find((r) => r.hazardSlug === "environment" && r.streamName === "Cabin Atmosphere & Pressure") ??
    allRecords.find((r) => r.hazardSlug === "environment" && envModuleStreams.includes(r.streamName));
  const envAcoustics =
    allRecords.find((r) => r.hazardSlug === "environment" && r.streamName === "Module Acoustics & Thermal") ??
    allRecords.find((r) => r.hazardSlug === "environment" && envModuleStreams.includes(r.streamName));

  const co2Val =
    toFiniteNumber(envAtmos?.payload?.co2MmHg) ??
    toFiniteNumber(envAtmos?.payload?.co2) ??
    toFiniteNumber(envAtmos?.rawValue);
  const moduleNoiseVal =
    toFiniteNumber(envAcoustics?.payload?.noiseDba) ??
    toFiniteNumber(envAcoustics?.payload?.dba) ??
    toFiniteNumber(envAcoustics?.rawValue);

  const causes: string[] = [];
  if (co2Val !== null && co2Val > ISOLATION_PIPELINE_VALUES.co2LimitMmHg) {
    causes.push(
      `Hazard 05 Cabin CO₂ ${co2Val} mmHg (> ${ISOLATION_PIPELINE_VALUES.co2LimitMmHg} mmHg NASA-STD-3001 / OCHMO-TB-004 limit)`
    );
  }
  if (moduleNoiseVal !== null && moduleNoiseVal > ISOLATION_PIPELINE_VALUES.sleepQuarterNoiseLimitNc40Dba) {
    causes.push(
      `Hazard 05 Module Noise ${moduleNoiseVal} dBA (> ${ISOLATION_PIPELINE_VALUES.sleepQuarterNoiseLimitNc40Dba} dBA NC-40)`
    );
  }

  const distRec = allRecords.find((r) => r.hazardSlug === "distance");
  const commsDelayMin =
    toFiniteNumber(distRec?.payload?.commsDelayMin) ??
    toFiniteNumber(distRec?.payload?.rttMin) ??
    toFiniteNumber(missionDelayLabel);

  return {
    sharedEnvCause: causes.length > 0 ? causes.join(" & ") : null,
    commsDelayMin,
  };
}

export function evaluateIsolationHazard(input: HazardEvaluationInput): HazardEvaluationResult {
  const V = ISOLATION_PIPELINE_VALUES;
  const {
    mission,
    actor,
    role = actor.isLeadSlot ? "lead" : "member",
    actorInputs,
    hazardRecords,
    hazardSamples,
    allHazardRecords,
    scenarioHazardRecords = [],
    reentryMode,
  } = input;

  const maxSolutions = reentryMode ? 1 : 2;
  const isMarsSurface =
    mission.phase.toUpperCase().includes("SURFACE") ||
    mission.name.toLowerCase().includes("chapea") ||
    mission.name.toLowerCase().includes("mars");

  // 1. Parse actor-level numeric inputs from DB streams
  const wearableSamples = hazardSamples.filter((s) => s.streamName === STREAM_WEARABLE);
  const habitatSamples = hazardSamples.filter((s) => s.streamName === STREAM_HABITAT);
  const selfCheckSamples = hazardSamples.filter((s) => s.streamName === STREAM_SELF_CHECK);

  const sleepDurationH =
    readRecordField(hazardRecords, STREAM_WEARABLE, ["sleep_duration_h"]) ??
    readRecordField(hazardRecords, STREAM_SELF_CHECK, ["sleepHours", "sleepHoursInput"]) ??
    toFiniteNumber(actorInputs[STREAM_WEARABLE]);

  const sleepEfficiencyPct = readRecordField(hazardRecords, STREAM_WEARABLE, ["sleep_efficiency_pct"]);
  const circadianShiftMin = readRecordField(hazardRecords, STREAM_WEARABLE, ["circadian_phase_shift_min"]);
  const daytimeActivity = readRecordField(hazardRecords, STREAM_WEARABLE, ["daytime_activity_counts"]);
  const restingHrv = readRecordField(hazardRecords, STREAM_WEARABLE, ["resting_hrv_rmssd"]);

  const sleepNoiseDba =
    readRecordField(hazardRecords, STREAM_HABITAT, ["sleep_quarter_noise_dba"]) ??
    toFiniteNumber(actorInputs[STREAM_HABITAT]);
  const luxCompliancePct = readRecordField(hazardRecords, STREAM_HABITAT, ["ambient_lux_schedule_match"]);
  const missionDayPct = readRecordField(hazardRecords, STREAM_HABITAT, ["mission_day_pct"]);

  const pvtMedianRtMs = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["pvt_median_rt_ms"]);
  const pvtLapsesCount = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["pvt_lapses_count"]);
  const subjectiveFatigue =
    readRecordField(hazardRecords, STREAM_SELF_CHECK, ["subjective_fatigue_1_5", "fatigueScore"]) ??
    toFiniteNumber(actorInputs[STREAM_SELF_CHECK]);
  const workloadStrain = readRecordField(hazardRecords, STREAM_SELF_CHECK, ["team_workload_strain_1_5"]);

  const veggieCareDone = readRecordBool(hazardRecords, STREAM_CONNECT, ["veggie_plant_care_done"]);
  const socialCheckinDone = readRecordBool(hazardRecords, STREAM_CONNECT, ["crew_social_checkin_done"]);

  // 2. Sleep Duration vs. NASA Benchmarks (NASA-STD-3001 Vol. 1 8.0h & Barger et al. 2014 8.5h / 6.09h ISS mean)
  const sleepHistory = buildChartSeries(wearableSamples, ["sleep_duration_h"], true);
  if (sleepDurationH !== null && sleepHistory.length === 0) {
    sleepHistory.push({ label: "Latest", value: sleepDurationH });
  }
  const sleepBelowIssMean = sleepDurationH !== null && sleepDurationH < V.issHistoricalMeanSleepHours;
  const sleepBelowNasaReq =
    !sleepBelowIssMean && sleepDurationH !== null && sleepDurationH < V.nasaStd3001SleepReqHours;

  // 3. PVT-B Cognitive Vigilance (Basner, Mollicone & Dinges, 2011: 355 ms lapse threshold; personal baseline when >= 3 prior samples)
  const pvtRtHistory = buildChartSeries(selfCheckSamples, ["pvt_median_rt_ms"], false);
  const priorPvtPts = pvtRtHistory.length > 3 ? pvtRtHistory.slice(0, -1).map((p) => p.value) : [];
  const pvtBaseMean = priorPvtPts.length >= 3 ? mean(priorPvtPts) : null;
  const pvtBaseSd = priorPvtPts.length >= 3 ? sampleStdDev(priorPvtPts) : null;
  const pvtZScore =
    pvtMedianRtMs !== null && pvtBaseMean !== null && pvtBaseSd !== null && pvtBaseSd > 0
      ? (pvtMedianRtMs - pvtBaseMean) / pvtBaseSd
      : null;

  const pvtCritical = pvtMedianRtMs !== null && pvtMedianRtMs >= V.pvtLapseThresholdMs;
  const pvtElevated =
    !pvtCritical &&
    ((pvtLapsesCount !== null && pvtLapsesCount > 0) || (pvtZScore !== null && pvtZScore >= 2.0));

  // 4. Martian Sol Circadian Drift (+39 min/day, CHAPEA)
  const circadianElevated =
    circadianShiftMin !== null && Math.abs(circadianShiftMin) >= V.martianSolDriftMinPerDay;

  // 5. NASA-STD-3001 Vol. 2 [V2 6079] Acoustics (49 dBA NC-40 sleep quarters, 58 dBA NC-50 work areas) + Cross-Hazard CO2 (<= 3.0 mmHg)
  const acousticCritical = sleepNoiseDba !== null && sleepNoiseDba >= V.workAreaNoiseLimitNc50Dba;
  const acousticElevated =
    !acousticCritical && sleepNoiseDba !== null && sleepNoiseDba > V.sleepQuarterNoiseLimitNc40Dba;

  const { sharedEnvCause, commsDelayMin } = detectCrossHazardHabitatStress(
    allHazardRecords,
    mission.commsDelayLabel
  );

  // 6. Mars500 Third-Quarter Window (50%–75%) & Actigraphy Slope (descriptive vs. early-mission samples)
  const activityHistory = buildChartSeries(wearableSamples, ["daytime_activity_counts"], false);
  let activityChangePct: number | null = null;
  if (activityHistory.length >= 4) {
    const recentAct = mean(activityHistory.slice(-2).map((p) => p.value));
    const baseAct = mean(activityHistory.slice(0, -2).map((p) => p.value));
    if (baseAct > 0) {
      activityChangePct = ((recentAct - baseAct) / baseAct) * 100;
    }
  } else if (daytimeActivity !== null && activityHistory.length >= 2) {
    const baseAct = mean(activityHistory.slice(0, -1).map((p) => p.value));
    if (baseAct > 0) {
      activityChangePct = ((daytimeActivity - baseAct) / baseAct) * 100;
    }
  }

  const inThirdQuarter =
    missionDayPct !== null &&
    missionDayPct >= V.thirdQuarterStartPct &&
    missionDayPct <= V.thirdQuarterEndPct;

  // 7. Scenario-Wide Crew Aggregation (privacy-sanitized)
  const crewIsolationRecords = scenarioHazardRecords.filter((r) => r.hazardSlug === "isolation");
  const crewSleepValues = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_WEARABLE)
    .map((r) => ({
      characterId: r.characterId,
      sleepH: toFiniteNumber(r.payload?.sleep_duration_h),
    }))
    .filter((item): item is { characterId: string; sleepH: number } => item.sleepH !== null);

  const crewBelowIssMeanCount = crewSleepValues.filter(
    (item) => item.sleepH < V.issHistoricalMeanSleepHours
  ).length;
  const crewNoiseBreachCount = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_HABITAT)
    .filter((r) => {
      const dba = toFiniteNumber(r.payload?.sleep_quarter_noise_dba);
      return dba !== null && dba > V.sleepQuarterNoiseLimitNc40Dba;
    }).length;
  const crewVeggieCount = crewIsolationRecords
    .filter((r) => r.streamName === STREAM_CONNECT)
    .filter((r) => toBooleanFlag(r.payload?.veggie_plant_care_done) === true).length;

  const hasAnyIsolationTelemetry =
    sleepDurationH !== null ||
    sleepEfficiencyPct !== null ||
    circadianShiftMin !== null ||
    sleepNoiseDba !== null ||
    pvtMedianRtMs !== null ||
    pvtLapsesCount !== null ||
    subjectiveFatigue !== null ||
    workloadStrain !== null ||
    daytimeActivity !== null ||
    restingHrv !== null;

  const crossHazardFlag = Boolean(sharedEnvCause);
  const leadSharedAcousticFlag = role === "lead" && crewNoiseBreachCount > 0;

  // 8. Overall Status (driven strictly by NASA-STD-3001, Cognition PVT-B, Barger 2014, CHAPEA, Mars500)
  const hasCriticalTelemetry = sleepBelowIssMean || pvtCritical || acousticCritical;
  const hasElevatedTelemetry =
    sleepBelowNasaReq ||
    pvtElevated ||
    circadianElevated ||
    acousticElevated ||
    inThirdQuarter ||
    leadSharedAcousticFlag ||
    crossHazardFlag;

  const status: HazardEvaluationResult["status"] = hasAnyIsolationTelemetry
    ? hasCriticalTelemetry
      ? "CRITICAL"
      : hasElevatedTelemetry
      ? "ELEVATED"
      : "NOMINAL"
    : actor.readinessState === "HOLD"
    ? "CRITICAL"
    : actor.readinessState === "CONDITIONAL"
    ? "ELEVATED"
    : "NOMINAL";

  // 9. Factual Operational Window & Horizon Summaries (no invented countdown formulas)
  let eta = actor.metrics.etaSlot;
  if (hasCriticalTelemetry) {
    eta = "Pre-task hold — NASA threshold exceeded";
  } else if (hasElevatedTelemetry) {
    eta = "Active — mitigate before next sleep or duty cycle";
  } else if (hasAnyIsolationTelemetry) {
    eta = "Nominal — within NASA-STD-3001 & Cognition bounds";
  }

  const immediateFindings: string[] = [];
  if (sleepBelowIssMean) {
    immediateFindings.push(
      `Sleep ${sleepDurationH} h (below ${V.issHistoricalMeanSleepHours} h ISS historical mean, Barger et al. 2014; NASA-STD-3001 req ${V.nasaStd3001SleepReqHours} h)`
    );
  } else if (sleepBelowNasaReq) {
    immediateFindings.push(
      `Sleep ${sleepDurationH} h (below ${V.nasaStd3001SleepReqHours} h NASA-STD-3001 Vol. 1 requirement; ${V.scheduledSleepHours} h scheduled)`
    );
  }
  if (pvtCritical || pvtElevated) {
    const zLabel = pvtZScore !== null ? ` (${pvtZScore >= 0 ? "+" : ""}${pvtZScore.toFixed(1)} SD)` : "";
    immediateFindings.push(
      `PVT-B ${pvtMedianRtMs ?? "—"} ms${zLabel}, ${pvtLapsesCount ?? 0} lapses (threshold ${V.pvtLapseThresholdMs} ms)`
    );
  }
  if (acousticCritical || acousticElevated) {
    immediateFindings.push(
      `Sleep-quarter noise ${sleepNoiseDba ?? "—"} dBA (exceeds NASA-STD-3001 NC-40 limit of ${V.sleepQuarterNoiseLimitNc40Dba} dBA)`
    );
  }
  if (sharedEnvCause) {
    immediateFindings.push(`Cross-Hazard Link: ${sharedEnvCause}`);
  }

  const immediateHorizon =
    immediateFindings.length > 0
      ? immediateFindings.join(" · ")
      : hasAnyIsolationTelemetry
      ? `Nominal — ${[
          sleepDurationH !== null ? `Sleep ${sleepDurationH} h` : null,
          pvtMedianRtMs !== null ? `PVT-B ${pvtMedianRtMs} ms (${pvtLapsesCount ?? 0} lapses)` : null,
          sleepNoiseDba !== null
            ? `Quarter noise ${sleepNoiseDba} dBA (<= ${V.sleepQuarterNoiseLimitNc40Dba} dBA NC-40)`
            : null,
        ]
          .filter(Boolean)
          .join(", ")}.`
      : isolationHazard.outputSlots.immediateHorizon;

  const prolongedFindings: string[] = [];
  if (circadianElevated) {
    prolongedFindings.push(
      `Circadian phase shift ${circadianShiftMin ?? 0} min${isMarsSurface ? ` (24h 39m Martian sol drift)` : ""}${
        luxCompliancePct !== null ? `, lighting match ${luxCompliancePct}%` : ""
      }`
    );
  }
  if (inThirdQuarter) {
    const actText =
      activityChangePct !== null
        ? `, daytime activity ${activityChangePct >= 0 ? "+" : ""}${activityChangePct.toFixed(0)}% vs. early samples`
        : "";
    prolongedFindings.push(`Mars500 Third-Quarter window (${missionDayPct}% elapsed)${actText}`);
  }
  if (commsDelayMin !== null && commsDelayMin > 0) {
    prolongedFindings.push(
      `Earth-comms delay ${commsDelayMin} min RTT (CHAPEA max ${V.chapeaMaxCommsRttMin} min)`
    );
  }
  if (role === "lead" && crewSleepValues.length > 0) {
    prolongedFindings.push(
      `Crew Aggregate (Anonymized): ${crewBelowIssMeanCount}/${crewSleepValues.length} below ${V.issHistoricalMeanSleepHours} h ISS mean` +
        (crewNoiseBreachCount > 0 ? ` · ${crewNoiseBreachCount} quarter(s) > 49 dBA NC-40` : "") +
        (crewVeggieCount > 0 ? ` · ISS Veggie (${crewVeggieCount} logged)` : "")
    );
  }

  const prolongedHorizon =
    prolongedFindings.length > 0
      ? prolongedFindings.join(" | ")
      : isolationHazard.outputSlots.prolongedHorizon;

  // 10. Actionable 1–2 Solutions (grounded in NASA-STD-3001, Barger 2014, Cognition, CONNECT, ISS Veggie, Emerging from Isolation)
  const rankedSolutions: string[] = [];
  if (acousticCritical || acousticElevated || sharedEnvCause || leadSharedAcousticFlag) {
    rankedSolutions.push(
      `Acoustic / Habitat Mitigation [NASA-STD-3001 V2 6079]: ${
        sleepNoiseDba !== null && sleepNoiseDba > V.sleepQuarterNoiseLimitNc40Dba
          ? `Quarter noise is ${sleepNoiseDba} dBA (> ${V.sleepQuarterNoiseLimitNc40Dba} dBA NC-40)`
          : sharedEnvCause ?? `${crewNoiseBreachCount} crew quarter(s) > ${V.sleepQuarterNoiseLimitNc40Dba} dBA NC-40`
      } — inspect habitat fan/ECLSS noise source and provide onboard hearing protection.`
    );
  }
  if (pvtCritical || sleepBelowIssMean) {
    rankedSolutions.push(
      `Pre-Task Hold & Recovery Sleep [NASA-STD-3001 / Cognition]: ${
        pvtCritical
          ? `PVT-B ${pvtMedianRtMs} ms (>= ${V.pvtLapseThresholdMs} ms lapse ceiling)`
          : `Sleep ${sleepDurationH} h (< ${V.issHistoricalMeanSleepHours} h ISS mean)`
      } — defer precision EVA/rover tasks until an ${V.nasaStd3001SleepReqHours}–${V.scheduledSleepHours} h sleep window is completed.`
    );
  } else if (sleepBelowNasaReq || pvtElevated) {
    rankedSolutions.push(
      `Sleep Window Protection [NASA-STD-3001 Vol. 1]: ${
        sleepDurationH !== null
          ? `Sleep ${sleepDurationH} h (< ${V.nasaStd3001SleepReqHours} h requirement)`
          : `PVT-B ${pvtMedianRtMs ?? "—"} ms (${pvtLapsesCount ?? 0} lapses)`
      } — protect the scheduled ${V.scheduledSleepHours} h sleep opportunity.`
    );
  }
  if (circadianElevated) {
    rankedSolutions.push(
      `Circadian Lighting Entrainment [NASA-STD-3001 V2 8055]: Phase shift ${circadianShiftMin ?? 0} min — align with blue-enriched wake light and dim red-shifted pre-sleep lighting.`
    );
  }
  if (inThirdQuarter) {
    rankedSolutions.push(
      `Mars500 Third-Quarter Countermeasure: Mission at ${missionDayPct}% (50%–75% window) — schedule physical exercise and ISS Veggie plant care / CONNECT crew check-in.`
    );
  }

  if (rankedSolutions.length === 0) {
    if (!hasAnyIsolationTelemetry) {
      rankedSolutions.push(
        "Awaiting DB Telemetry: Ingest Wearable / Actigraphy, Habitat Acoustics, or PVT-B streams to evaluate against NASA benchmarks."
      );
    } else if (reentryMode) {
      rankedSolutions.push(
        "Post-Isolation Re-Entry Pacing [NASA Emerging from Isolation]: Telemetry is within NASA bounds — limit choices and maintain steady rest routines."
      );
    } else {
      const verifiedChecks = [
        sleepDurationH !== null ? `Sleep ${sleepDurationH} h (>= ${V.nasaStd3001SleepReqHours} h req)` : null,
        pvtMedianRtMs !== null ? `PVT-B ${pvtMedianRtMs} ms (< ${V.pvtLapseThresholdMs} ms lapse)` : null,
        sleepNoiseDba !== null ? `Noise ${sleepNoiseDba} dBA (<= ${V.sleepQuarterNoiseLimitNc40Dba} dBA NC-40)` : null,
      ]
        .filter(Boolean)
        .join(", ");

      rankedSolutions.push(
        `Within NASA Bounds: ${verifiedChecks} — preserve scheduled ${V.scheduledSleepHours} h sleep opportunity & pre-sleep lighting.`
      );

      if (veggieCareDone !== true) {
        rankedSolutions.push(
          `ISS Veggie Countermeasure: Plant-module care is ${
            veggieCareDone === false ? "pending" : "unlogged"
          } in DB — complete scheduled Veggie sensory care.`
        );
      } else if (socialCheckinDone !== true) {
        rankedSolutions.push(
          `NASA CONNECT Check-In: Crew/async check-in is ${
            socialCheckinDone === false ? "pending" : "unlogged"
          } in DB — log shared crew briefing or async Earth message.`
        );
      } else {
        rankedSolutions.push(
          "NASA Countermeasures Logged in DB: ISS Veggie care and CONNECT check-in are both complete."
        );
      }
    }
  }

  const solutions = rankedSolutions.slice(0, maxSolutions);

  // 11. Build Thresholded Telemetry Charts (strictly NASA threshold lines)
  const charts: HazardChartSpec[] = [];

  if (sleepHistory.length > 0) {
    charts.push({
      id: "sample-wearable-actigraphy",
      title: "Sleep Duration vs. NASA Benchmarks",
      unit: "h",
      series: sleepHistory,
      thresholds: [
        { label: "Scheduled Target", value: V.scheduledSleepHours, color: "#10b981" },
        { label: "NASA-STD-3001 Req", value: V.nasaStd3001SleepReqHours, color: "#0284c7" },
        { label: "ISS Mean (Barger 2014)", value: V.issHistoricalMeanSleepHours, color: "#ef4444" },
      ],
    });
  }

  if (pvtRtHistory.length > 0) {
    const pvtThresholds: HazardChartSpec["thresholds"] = [
      { label: "PVT-B Lapse", value: V.pvtLapseThresholdMs, color: "#ef4444" },
    ];
    if (pvtBaseMean !== null && pvtBaseSd !== null && pvtBaseSd > 0) {
      pvtThresholds.push({
        label: "+2 SD Personal Baseline",
        value: Math.round(pvtBaseMean + 2 * pvtBaseSd),
        color: "#f59e0b",
      });
    }
    charts.push({
      id: "sample-60-second-self-check-private-",
      title: "PVT-B Median Reaction Time (Cognition)",
      unit: "ms",
      series: pvtRtHistory,
      thresholds: pvtThresholds,
    });
  }

  const noiseSeries = buildChartSeries(habitatSamples, ["sleep_quarter_noise_dba"], true);
  if (noiseSeries.length > 0) {
    charts.push({
      id: "sample-habitat-acoustics-lighting",
      title: "Sleep-Quarter Noise vs. NASA-STD-3001 NC-40",
      unit: "dBA",
      series: noiseSeries,
      thresholds: [
        { label: "NC-40 Sleep Limit", value: V.sleepQuarterNoiseLimitNc40Dba, color: "#f59e0b" },
        { label: "NC-50 Work Limit", value: V.workAreaNoiseLimitNc50Dba, color: "#ef4444" },
      ],
    });
  }

  if (activityHistory.length > 0) {
    charts.push({
      id: "isolation-hypokinesis-activity",
      title: "Daytime Activity (Mars500 Hypokinesis Monitor)",
      unit: "counts",
      series: activityHistory,
    });
  }

  const scenarioStatusSlot =
    role === "lead"
      ? `${mission.environment.isolationStatusSlot} · ${status} (${crewSleepValues.length} crew actigraphy stream(s) loaded, private notes masked)`
      : `${mission.environment.isolationStatusSlot} · ${status}`;

  return {
    status,
    scenarioStatusSlot,
    immediateHorizon,
    prolongedHorizon,
    eta,
    solutions,
    charts,
  };
}

// [SECTION 3: HAZARD 2 UI METADATA, INPUT STREAMS & ALARMS]
export const isolationHazard: HazardSpec = {
  slug: "isolation",
  number: 2,
  title: "Isolation & Confinement",
  shortTitle: "Isolation",
  ownerSlot: "src/lib/hazards/02-isolation.ts",
  sourceDoc: "docs/hazards/02-isolation-and-confinement.md",
  nasaReferences: [
    "NASA HRP Isolation & Confinement",
    "NASA-STD-3001 Vol. 1 & Vol. 2 (NC-40 / Lighting / Sleep)",
    "HERA, CHAPEA & Mars500 (520-Day)",
    "Cognition (PVT-B 355 ms) & CONNECT Framework",
    "ISS Veggie Space Gardening & OSDR Standard Measures",
  ],
  overviewSlot:
    "Here is: Sleep benchmarking (NASA-STD-3001 & Barger et al. 2014), Martian sol circadian monitoring, NC-40 acoustic limits, Cognition PVT-B vigilance, private behavioral logs, and CONNECT/Veggie countermeasures.",
  inputSlots: [
    {
      streamName: STREAM_WEARABLE,
      inputPrompt: "Add your info: Actigraphy sleep duration, efficiency, circadian drift, activity & HRV here",
      sourceRef: "ARCHeR / Mars500 / OSDR Standard Measures",
      fieldType: "number",
      unit: "h",
      recordSample: true,
      subfields: [
        {
          key: "sleep_duration_h",
          label: "Sleep Duration",
          fieldType: "number",
          unit: "h",
          prompt: "Add your info: Hours slept (NASA scheduled 8.5h, req 8.0h, ISS mean 6.09h)",
        },
        {
          key: "sleep_efficiency_pct",
          label: "Sleep Efficiency",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Sleep efficiency %",
        },
        {
          key: "circadian_phase_shift_min",
          label: "Circadian Phase Shift",
          fieldType: "number",
          unit: "min",
          prompt: "Add your info: Phase drift min (Mars sol +39 min/day)",
        },
        {
          key: "daytime_activity_counts",
          label: "Daytime Activity",
          fieldType: "number",
          unit: "counts/day",
          prompt: "Add your info: Actigraphy daytime counts (Mars500 hypokinesis)",
        },
        {
          key: "resting_hrv_rmssd",
          label: "Resting HRV (RMSSD)",
          fieldType: "number",
          unit: "ms",
          prompt: "Add your info: Resting HRV RMSSD (ms)",
        },
      ],
    },
    {
      streamName: STREAM_HABITAT,
      inputPrompt: "Add your info: Sleep-quarter dBA vs NC-40, impulse spikes, circadian lighting & mission % here",
      sourceRef: "NASA-STD-3001 Vol. 2 [V2 6079 / V2 8055]",
      fieldType: "number",
      unit: "dBA",
      recordSample: true,
      subfields: [
        {
          key: "sleep_quarter_noise_dba",
          label: "Sleep-Quarter Noise",
          fieldType: "number",
          unit: "dBA",
          prompt: "Add your info: Continuous dBA (NC-40 limit = 49 dBA)",
        },
        {
          key: "impulse_noise_events_sleep",
          label: "Sleep Impulse Spikes",
          fieldType: "number",
          unit: "events",
          prompt: "Add your info: Impulse noise events during sleep",
        },
        {
          key: "ambient_lux_schedule_match",
          label: "Circadian Lighting Match",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Wake/pre-sleep light schedule match %",
        },
        {
          key: "mission_day_pct",
          label: "Mission Elapsed",
          fieldType: "number",
          unit: "%",
          prompt: "Add your info: Mission progress % (50–75% = Mars500 Third Quarter)",
        },
      ],
    },
    {
      streamName: STREAM_SELF_CHECK,
      inputPrompt: "Add your info: PVT-B median RT, lapses >355 ms, subjective fatigue & private journal here",
      sourceRef: "NASA Cognition PVT-B / Journaling",
      fieldType: "number",
      unit: "ms",
      recordSample: true,
      subfields: [
        {
          key: "pvt_median_rt_ms",
          label: "PVT-B Median RT",
          fieldType: "number",
          unit: "ms",
          prompt: "Add your info: Median reaction time ms (lapse >= 355 ms)",
        },
        {
          key: "pvt_lapses_count",
          label: "PVT-B Lapses (>= 355 ms)",
          fieldType: "number",
          unit: "lapses",
          prompt: "Add your info: Count of trials >= 355 ms",
        },
        {
          key: "subjective_fatigue_1_5",
          label: "Subjective Fatigue (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: 1 (Rested) to 5 (Exhausted)",
        },
        {
          key: "team_workload_strain_1_5",
          label: "Workload Strain (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: 1 (Manageable) to 5 (Overloaded)",
        },
        {
          key: "mood_valence_private",
          label: "Private Mood Score (1–5)",
          fieldType: "number",
          unit: "1–5",
          prompt: "Add your info: Private mood score (masked from Lead)",
          isPrivate: true,
        },
        {
          key: "private_journal_note",
          label: "Private Reflection Journal",
          fieldType: "textarea",
          prompt: "Add your info: Personal reflection note (strictly private, never shown to Lead)",
          isPrivate: true,
        },
      ],
    },
    {
      streamName: STREAM_CONNECT,
      inputPrompt: "Add your info: Veggie plant care, CONNECT social check-in, and private sleep-aid log here",
      sourceRef: "ISS Veggie / CONNECT Framework",
      recordSample: false,
      subfields: [
        {
          key: "veggie_plant_care_done",
          label: "Veggie Plant Care Completed",
          fieldType: "boolean",
          prompt: "ISS Veggie plant-module care completed today",
        },
        {
          key: "crew_social_checkin_done",
          label: "CONNECT Crew / Async Check-In",
          fieldType: "boolean",
          prompt: "Shared crew briefing or async Earth check-in logged",
        },
        {
          key: "sleep_med_used_private",
          label: "Sleep Aid Used (Private)",
          fieldType: "boolean",
          prompt: "Private sleep-medication tracking (masked from Lead)",
          isPrivate: true,
        },
      ],
    },
  ],
  outputSlots: {
    immediateHorizon: "Here is: Sleep vs. NASA-STD-3001/ISS benchmarks, PVT-B (>=355 ms), or NC-40 acoustic alert.",
    prolongedHorizon: "Here is: Martian sol (24h 39m) circadian drift, NC-40 acoustic exposure, or Mars500 Third-Quarter window.",
    etaSlot: "Here is: Operational gate status against NASA-STD-3001 and Cognition thresholds.",
    solutionsSlot: "Here is: 1–2 NASA CONNECT / Veggie / acoustic-mitigation actions.",
  },
  leadView: {
    summary:
      "Anonymized crew sleep & PVT-B overview, NC-40 acoustic breaches, Mars500 Third-Quarter context, and Re-Entry UI throttling.",
    privacyRule:
      "STRICT PRIVACY FIREWALL: Raw journal entries, personal mood scores, and sleep-aid usage are masked and NEVER shown to Lead.",
    modules: [
      {
        title: "Crew Matrix (Anonymized)",
        detail:
          "Here is: Crew sleep vs. 6.09h ISS historical mean, PVT-B vs. 355 ms ceiling, and NC-40 compliance.",
        actionSlot: "Ready-to-act: Protect an 8.0–8.5h sleep window when crew averages fall below NASA benchmarks.",
      },
      {
        title: "Shared Habitat Debuff Attribution",
        detail:
          "Here is: Distinguishes shared habitat noise (>49 dBA NC-40) or Hazard 05 CO₂ (>3.0 mmHg) from individual sleep loss.",
        actionSlot: "Ready-to-act: Inspect acoustic source in flagged crew quarters.",
      },
      {
        title: "Post-Isolation Re-Entry Mode Toggle",
        detail:
          "Here is: Reduces non-essential alerts & caps action cards to 1 step per NASA Emerging from Isolation guidance.",
        actionSlot: "Ready-to-act: Toggle Re-Entry mode in header when transitioning post-isolation.",
      },
    ],
  },
  memberView: {
    summary:
      "Personal telemetry view combining wrist actigraphy, habitat NC-40 sensors, and Cognition PVT-B telemetry, with private reflection records.",
    privacyRule:
      "PRIVATE TO YOU: Your journal text, mood score, and sleep-medication logs are masked from Lead and stay private.",
    modules: [
      {
        title: "Actigraphy & PVT-B Vigilance",
        detail:
          "Here is: Sleep duration, circadian drift, and >=355 ms PVT-B lapse monitoring calibrated to NASA benchmarks.",
        actionSlot: "Ready-to-act: Follow pre-task hold or protected sleep recovery guidance when flagged.",
      },
      {
        title: "CONNECT & ISS Veggie Countermeasures",
        detail:
          "Here is: 1–2 actions grounded in ISS Veggie plant care, NASA CONNECT, and acoustic/lighting compliance.",
        actionSlot: "Ready-to-act: Execute top-ranked countermeasure aligned with current mission phase.",
      },
    ],
  },
  proposedEndpoints: [
    {
      method: "GET",
      path: "/api/hazard-data?scenarioId=...&hazardSlug=isolation",
      purpose: "Fetch DB-ingested isolation/sleep snapshots across character or scenario",
    },
    {
      method: "GET",
      path: "/api/hazard-samples?scenarioId=...&hazardSlug=isolation",
      purpose: "Fetch DB-ingested time-series telemetry points for thresholded charts",
    },
  ],
  alarmPreset: {
    title: "CIRCADIAN & VIGILANCE DEBUFF — PRE-TASK HOLD",
    severity: "WARNING",
    etaLabel: "Here is: Operational gate status prior to scheduled precision task / EVA",
    descriptionSlot:
      "Here is: Sleep below 6.09 h ISS mean, PVT-B lapse (>=355 ms), or sleep-quarter acoustic breach (>49 dBA NC-40) detected in device streams.",
    leadActions: [
      "1. Inspect habitat acoustic source and provide hearing protection for NC-40 (>49 dBA) compliance.",
      "2. Shift non-critical maintenance to restore protected 8.0–8.5h sleep window.",
    ],
    memberActions: [
      "1. Defer precision EVA tasks and complete a protected 8.0–8.5h recovery sleep window.",
      "2. Use hearing protection and follow pre-sleep dim/red lighting schedule.",
    ],
  },
  evaluate: evaluateIsolationHazard,
};
