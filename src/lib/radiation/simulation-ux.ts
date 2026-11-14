import {
  RADIATION_SIMULATION_CATALOG,
  defaultSimulationParameters,
  type RadiationSimulationDefinition,
  type SimulationParameterDefinition,
  type SimulationParameterValue,
} from "./simulation.ts";

export const PARAMETER_GROUPS = [
  "Radiation Conditions",
  "Safety Thresholds",
  "Crew Response",
  "Simulation Assumptions",
] as const;

export type ParameterGroup = (typeof PARAMETER_GROUPS)[number];

export type WorkbenchParameterDefinition = SimulationParameterDefinition & {
  group: ParameterGroup;
  tooltip: string;
};

export type SimulationPreset = {
  id: string;
  label: string;
  description: string;
  values: Record<string, SimulationParameterValue>;
};

export type WorkbenchSimulationDefinition = Omit<RadiationSimulationDefinition, "parameters"> & {
  whatsHappening: string;
  whatVitalisDoes: string;
  previewEvents: string[];
  resultHighlights: string[];
  presets: SimulationPreset[];
  parameters: WorkbenchParameterDefinition[];
};

type ScenarioUx = Pick<
  WorkbenchSimulationDefinition,
  "whatsHappening" | "whatVitalisDoes" | "previewEvents" | "resultHighlights"
>;

const GROUP_BY_KEY: Partial<Record<string, ParameterGroup>> = {
  elevatedThreshold: "Safety Thresholds",
  criticalThreshold: "Safety Thresholds",
  addedDoseLimit: "Safety Thresholds",
  differenceThreshold: "Safety Thresholds",
  spreadThreshold: "Safety Thresholds",
  medicalDelayLimit: "Safety Thresholds",
  routeMinutes: "Crew Response",
  ackWindow: "Crew Response",
  captainAcknowledged: "Crew Response",
  returnMinutes: "Crew Response",
  preparationMinutes: "Crew Response",
  vulnerableTaskActive: "Crew Response",
  earthLinkOnline: "Crew Response",
  queuedMessages: "Crew Response",
  alternateAvailable: "Crew Response",
  routeAccessible: "Crew Response",
  saferRoomTravel: "Crew Response",
  patientStability: "Crew Response",
  crewCount: "Crew Response",
  primaryCapacity: "Crew Response",
  secondaryCapacity: "Crew Response",
  secondaryReady: "Crew Response",
  sourceProcedureLoaded: "Crew Response",
  lifeSupportState: "Crew Response",
  shelterOxygenMinutes: "Crew Response",
  shelterRateMultiplier: "Simulation Assumptions",
  sepContext: "Simulation Assumptions",
  sensorBHealthy: "Simulation Assumptions",
  sleepHours: "Simulation Assumptions",
  measurementUncertainty: "Simulation Assumptions",
  eventHours: "Simulation Assumptions",
  originalHours: "Simulation Assumptions",
  extendedHours: "Simulation Assumptions",
  uncertainty: "Simulation Assumptions",
  gapMinutes: "Simulation Assumptions",
};

const TOOLTIP_OVERRIDES: Record<string, string> = {
  doseRate: "How quickly radiation exposure is accumulating at the onboard sensor. Measured in millisieverts per hour (mSv/h). A higher value can raise the simulated warning level and modeled exposure.",
  elevatedThreshold: "The simulated radiation level at which Vitalis+ starts showing an elevated warning. Measured in mSv/h. This is a configurable demo threshold, not a universal NASA safety limit.",
  criticalThreshold: "The simulated radiation level that triggers the critical radiation classification. Measured in mSv/h. It must be higher than the elevated threshold.",
  routeMinutes: "Estimated time the crew needs to reach a designated shelter. Measured in minutes. Longer travel times may increase modeled exposure.",
  ackWindow: "How long the system waits for the captain to acknowledge the alert before following the configured escalation procedure. Measured in minutes.",
  shelterRateMultiplier: "An illustrative factor used to model a lower dose rate inside the shelter. For example, 0.42 represents 42% of the outside dose rate in this toy model. It is not a validated shielding factor.",
  captainAcknowledged: "Choose whether the captain has already confirmed the alert. This changes how the acknowledgement and escalation workflow behaves.",
};

const IMPACT_BY_KEY: Partial<Record<string, string>> = {
  higherDose: "Vitalis+ compares it with the peer record; the field name does not decide which value is larger.",
  peerDose: "Vitalis+ compares it with Crew A using the absolute dose difference.",
  sensorA: "Changing it affects the sensor agreement and data-quality assessment.",
  sensorB: "Changing it affects the sensor agreement and data-quality assessment.",
  currentRate: "It is multiplied by the planned sleep time to estimate exposure in the current location.",
  alternateRate: "It is used to estimate whether the alternate sleeping location lowers exposure.",
  beforeRate: "It is the baseline for the paired before-and-after comparison.",
  afterRate: "It is compared with the baseline; a zero baseline is handled as an absolute change.",
  roverShelterRate: "It changes the modeled exposure for sheltering at the rover.",
  baseShelterRate: "It changes the modeled exposure after reaching the base shelter.",
  localRate: "A high local value relative to the neighboring compartment can indicate a localized pattern.",
  neighborRate: "It provides the nearby reference used to assess whether the pattern is localized.",
  currentDose: "It becomes the starting point for the end-of-mission dose forecast.",
  previousValue: "Together with the next valid sample, it bounds the visibly modeled data gap.",
  nextValue: "Together with the previous valid sample, it bounds the visibly modeled data gap.",
  controlMean: "It is the control observation used for the experimental comparison.",
  treatmentMean: "It is compared with the control observation; it does not prove crew protection.",
};

function unitSentence(parameter: SimulationParameterDefinition) {
  if (!parameter.unit || parameter.unit === "×") return "";
  if (parameter.unit === "relative") return " Values are unitless relative model values.";
  return ` Measured in ${parameter.unit}.`;
}

function tooltipFor(parameter: SimulationParameterDefinition) {
  const override = TOOLTIP_OVERRIDES[parameter.key];
  if (override) return override;
  const impact = IMPACT_BY_KEY[parameter.key]
    ?? "Changing this value updates this scenario's deterministic assessment, displayed metrics, or recommended next step.";
  return `${parameter.help}${unitSentence(parameter)} ${impact}`;
}

const UX: Record<string, ScenarioUx> = {
  A: {
    whatsHappening: "The crew is sleeping when onboard sensors detect increased radiation. You can configure the alert level, response timing, and an illustrative shelter assumption.",
    whatVitalisDoes: "Vitalis+ classifies the reading, models travel and shelter exposure, checks captain acknowledgement, and builds a chronological response timeline.",
    previewEvents: ["Sensor reading is classified", "Captain acknowledgement window is evaluated", "Crew movement and shelter exposure are modeled"],
    resultHighlights: ["Radiation status", "Modeled added dose", "Acknowledgement and shelter timeline"],
  },
  B: {
    whatsHappening: "An astronaut is outside the vehicle when radiation conditions worsen. The return time and current onboard reading determine the modeled exposure during the EVA return.",
    whatVitalisDoes: "Vitalis+ estimates added dose, compares it with the configured demo flight-rule budget, and shows the immediate return workflow.",
    previewEvents: ["EVA conditions are recorded", "Return exposure is estimated", "Demo flight-rule budget is checked"],
    resultHighlights: ["Modeled return dose", "Budget comparison", "Return actions"],
  },
  C: {
    whatsHappening: "Two crew members have different cumulative exposure records. The values may come in either order, so the comparison uses the actual absolute difference.",
    whatVitalisDoes: "Vitalis+ identifies the larger record, measures the gap, and indicates whether task rotation should be reviewed under the configured demo policy.",
    previewEvents: ["Compatible crew records are compared", "Absolute dose difference is calculated", "Task-rotation rule is evaluated"],
    resultHighlights: ["Higher cumulative record", "Absolute difference", "Rotation review"],
  },
  D: {
    whatsHappening: "Two nearby compartment sensors disagree after a possible shielding incident. A single unusual reading is not automatically treated as confirmed leakage.",
    whatVitalisDoes: "Vitalis+ calculates the relative spread, flags data-quality concerns, and requests cross-checks before operational conclusions are made.",
    previewEvents: ["Neighboring sensors are sampled", "Relative spread is calculated", "Cross-check workflow is selected"],
    resultHighlights: ["Sensor spread", "Data-quality status", "Verification actions"],
  },
  E: {
    whatsHappening: "Trajectory data predicts that the spacecraft is approaching a higher-radiation zone. The crew may need to finish preparation and pause vulnerable work before entry.",
    whatVitalisDoes: "Vitalis+ compares time to zone entry with preparation time and shows whether the configured work plan needs immediate adjustment.",
    previewEvents: ["Zone-entry estimate is loaded", "Preparation margin is calculated", "Vulnerable task status is reviewed"],
    resultHighlights: ["Preparation margin", "Readiness status", "Task recommendation"],
  },
  F: {
    whatsHappening: "Two sensors report different values, or one sensor may have unhealthy telemetry. The situation could be a real change or an instrumentation problem.",
    whatVitalisDoes: "Vitalis+ checks sensor spread and health, separates uncertainty from a confirmed hazard, and recommends the appropriate cross-check.",
    previewEvents: ["Detector values are compared", "Telemetry health is checked", "Uncertainty or hazard path is selected"],
    resultHighlights: ["Relative disagreement", "Sensor-health context", "Cross-check decision"],
  },
  G: {
    whatsHappening: "The spacecraft may lose its live link to Earth while radiation monitoring continues onboard. Reports can be queued until communication returns.",
    whatVitalisDoes: "Vitalis+ keeps the local assessment active, classifies the onboard reading, and shows how many reports remain queued for later delivery.",
    previewEvents: ["Earth-link state is checked", "Local radiation rule is evaluated", "Report queue is updated"],
    resultHighlights: ["Local warning status", "Queued report count", "Offline response steps"],
  },
  H: {
    whatsHappening: "One sleeping compartment has a higher measured dose rate than another available location. The planned sleep duration determines the size of the difference.",
    whatVitalisDoes: "Vitalis+ estimates exposure in both locations and indicates whether moving the sleep assignment would reduce modeled exposure.",
    previewEvents: ["Compartment rates are compared", "Sleep exposure is estimated", "Alternate-location availability is checked"],
    resultHighlights: ["Current-location exposure", "Alternate exposure", "Sleep-location recommendation"],
  },
  I: {
    whatsHappening: "Radiation readings changed after protective cargo was moved. The comparison uses paired measurements and their uncertainty, not an assumed universal shielding value.",
    whatVitalisDoes: "Vitalis+ calculates the absolute and percentage change when defined, handles a zero baseline safely, and identifies whether the change exceeds measurement uncertainty.",
    previewEvents: ["Before and after readings are paired", "Change is calculated", "Measurement uncertainty is applied"],
    resultHighlights: ["Absolute rate change", "Percentage change when defined", "Significance assessment"],
  },
  J: {
    whatsHappening: "A Mars surface crew member is away from the base during a radiation spike. Staying with the rover and returning to base have different modeled exposure and route constraints.",
    whatVitalisDoes: "Vitalis+ compares both exposure paths and only recommends return travel when the route is explicitly marked accessible.",
    previewEvents: ["Rover shelter exposure is modeled", "Return path exposure is modeled", "Route feasibility is checked"],
    resultHighlights: ["Rover-path dose", "Base-return dose", "Feasible shelter decision"],
  },
  K: {
    whatsHappening: "A medical emergency occurs while radiation conditions are elevated. Moving the patient may reduce radiation exposure but could delay time-sensitive care.",
    whatVitalisDoes: "Vitalis+ displays the timing trade-off and follows the supplied medical workflow status without performing clinical triage or replacing authorized medical procedures.",
    previewEvents: ["Radiation context is recorded", "Medical delay is compared with travel time", "Protocol priority is displayed"],
    resultHighlights: ["Timing conflict", "Patient-stability context", "Authorized-procedure reminder"],
  },
  L: {
    whatsHappening: "The crew needs shelter, but the primary and secondary locations may not have enough ready places. Capacity is counted only where a shelter is marked ready.",
    whatVitalisDoes: "Vitalis+ creates a crew-to-shelter allocation, identifies any unassigned crew members, and exposes the exact capacity shortfall.",
    previewEvents: ["Ready shelter capacity is counted", "Crew members are allocated", "Overflow is identified"],
    resultHighlights: ["Ready capacity", "Named allocation", "Unassigned crew count"],
  },
  M: {
    whatsHappening: "A compartment sensor may indicate a localized radiation source or reactor-related anomaly. A local reading is compared with a neighboring compartment rather than interpreted alone.",
    whatVitalisDoes: "Vitalis+ checks the localized pattern and only presents operational guidance when a mission-specific source procedure is marked as loaded.",
    previewEvents: ["Local and neighboring rates are compared", "Localized pattern is evaluated", "Procedure availability is checked"],
    resultHighlights: ["Local-to-neighbor contrast", "Anomaly status", "Procedure guard"],
  },
  N: {
    whatsHappening: "The planned mission end date changes, extending the crew's remaining time in the current radiation environment. The forecast assumes the configured rate remains constant.",
    whatVitalisDoes: "Vitalis+ recalculates the modeled end-of-mission dose and uncertainty range. It prevents an extension time that is shorter than the original remaining plan.",
    previewEvents: ["Original and revised durations are checked", "Added dose is forecast", "Uncertainty range is calculated"],
    resultHighlights: ["Revised added dose", "End-of-mission forecast", "Uncertainty range"],
  },
  O: {
    whatsHappening: "A material or geometry change lowers the modeled primary component but may increase secondary radiation. Looking at only the primary value can therefore be misleading.",
    whatVitalisDoes: "Vitalis+ compares both transport-model components before and after the change and reports the combined modeled total.",
    previewEvents: ["Primary components are compared", "Secondary components are compared", "Combined totals are calculated"],
    resultHighlights: ["Primary change", "Secondary change", "Combined modeled total"],
  },
  P: {
    whatsHappening: "Galactic cosmic-ray measurements decrease during a possible solar-particle event. That decrease alone does not prove that the current environment is safe.",
    whatVitalisDoes: "Vitalis+ keeps the GCR change, SEP context, and onboard dose reading separate before assigning the demo warning status.",
    previewEvents: ["GCR change is recorded", "SEP context is checked", "Onboard rate is independently classified"],
    resultHighlights: ["GCR context", "SEP context", "Independent onboard status"],
  },
  Q: {
    whatsHappening: "A telemetry interval is missing between two valid sensor samples. The gap must remain visible instead of being presented as a real measurement.",
    whatVitalisDoes: "Vitalis+ produces a clearly labeled modeled interval with added uncertainty and preserves the distinction between observed and reconstructed values.",
    previewEvents: ["Gap boundaries are identified", "Modeled interval is calculated", "Uncertainty and provenance are attached"],
    resultHighlights: ["Estimated midpoint", "Uncertainty range", "Visible gap marker"],
  },
  R: {
    whatsHappening: "Radiation conditions and life-support constraints occur at the same time. A shelter may reduce radiation exposure but have a limited oxygen reserve.",
    whatVitalisDoes: "Vitalis+ presents the conflict, applies the explicit life-support status and reserve inputs, and avoids hiding one hazard behind the other.",
    previewEvents: ["Radiation status is classified", "Life-support state is read", "Shelter reserve and conflict are evaluated"],
    resultHighlights: ["Combined severity", "Oxygen reserve", "Priority actions"],
  },
  S: {
    whatsHappening: "A controlled BioShield experiment compares treatment and control observations. Experimental differences may be interesting but are not evidence of proven astronaut protection.",
    whatVitalisDoes: "Vitalis+ calculates the experimental difference, displays uncertainty and culture-growth context, and keeps the result labeled as research evidence.",
    previewEvents: ["Treatment and control are compared", "Experimental uncertainty is applied", "Evidence boundary is displayed"],
    resultHighlights: ["Experimental difference", "Uncertainty context", "No crew-protection claim"],
  },
};

const PRESETS: Record<string, SimulationPreset[]> = {
  A: [
    { id: "normal", label: "Normal Conditions", description: "Low reading with acknowledgement already confirmed.", values: { doseRate: 0.1, elevatedThreshold: 0.3, criticalThreshold: 0.8, routeMinutes: 6, ackWindow: 2, shelterRateMultiplier: 0.42, captainAcknowledged: true } },
    { id: "elevated", label: "Elevated Risk", description: "Elevated reading with acknowledgement still pending.", values: { doseRate: 0.62, elevatedThreshold: 0.3, criticalThreshold: 0.8, routeMinutes: 8, ackWindow: 2, shelterRateMultiplier: 0.42, captainAcknowledged: false } },
    { id: "critical", label: "Critical Situation", description: "Critical reading and a longer route to shelter.", values: { doseRate: 1.2, elevatedThreshold: 0.3, criticalThreshold: 0.8, routeMinutes: 15, ackWindow: 2, shelterRateMultiplier: 0.42, captainAcknowledged: false } },
  ],
  B: [
    { id: "short-return", label: "Short Return", description: "A short EVA return below the demo budget.", values: { doseRate: 0.25, returnMinutes: 12, addedDoseLimit: 0.4, sepContext: false } },
    { id: "elevated", label: "Elevated EVA", description: "Longer return during active SEP context.", values: { doseRate: 0.62, returnMinutes: 35, addedDoseLimit: 0.4, sepContext: true } },
    { id: "critical", label: "Budget Exceeded", description: "High rate and long return exceed the configured budget.", values: { doseRate: 1.4, returnMinutes: 60, addedDoseLimit: 0.4, sepContext: true } },
  ],
  C: [
    { id: "balanced", label: "Balanced Crew", description: "Small difference between cumulative records.", values: { higherDose: 30, peerDose: 27, differenceThreshold: 12 } },
    { id: "review", label: "Rotation Review", description: "Difference reaches the demo review threshold.", values: { higherDose: 42, peerDose: 24, differenceThreshold: 12 } },
    { id: "reversed", label: "Reversed Records", description: "Crew B is higher, testing order-independent comparison.", values: { higherDose: 0, peerDose: 200, differenceThreshold: 12 } },
  ],
  D: [
    { id: "agreement", label: "Sensors Agree", description: "Neighboring readings are close.", values: { sensorA: 0.14, sensorB: 0.16, spreadThreshold: 35 } },
    { id: "disagreement", label: "Sensor Disagreement", description: "Readings exceed the allowed spread.", values: { sensorA: 0.14, sensorB: 0.58, spreadThreshold: 35 } },
    { id: "strong-contrast", label: "Strong Contrast", description: "A large local contrast requires verification.", values: { sensorA: 0.1, sensorB: 1.2, spreadThreshold: 20 } },
  ],
  E: [
    { id: "ready", label: "Ready in Time", description: "Preparation finishes well before entry.", values: { timeToZone: 60, preparationMinutes: 20, vulnerableTaskActive: false } },
    { id: "tight", label: "Tight Margin", description: "Only a small preparation margin remains.", values: { timeToZone: 28, preparationMinutes: 20, vulnerableTaskActive: true } },
    { id: "late", label: "Preparation Late", description: "Zone entry occurs before preparation can finish.", values: { timeToZone: 10, preparationMinutes: 20, vulnerableTaskActive: true } },
  ],
  F: [
    { id: "healthy", label: "Healthy Agreement", description: "Healthy sensors report similar values.", values: { sensorA: 0.18, sensorB: 0.21, spreadThreshold: 25, sensorBHealthy: true } },
    { id: "disagreement", label: "Disagreement", description: "Healthy sensors disagree beyond policy.", values: { sensorA: 0.18, sensorB: 0.7, spreadThreshold: 25, sensorBHealthy: true } },
    { id: "fault", label: "Telemetry Fault", description: "The second sensor is marked unhealthy.", values: { sensorA: 0.18, sensorB: 0.7, spreadThreshold: 25, sensorBHealthy: false } },
  ],
  G: [
    { id: "online", label: "Earth Link Online", description: "Live link with a nominal onboard reading.", values: { earthLinkOnline: true, queuedMessages: 0, doseRate: 0.1, elevatedThreshold: 0.3 } },
    { id: "offline", label: "Offline Monitoring", description: "Link is offline while local monitoring continues.", values: { earthLinkOnline: false, queuedMessages: 3, doseRate: 0.4, elevatedThreshold: 0.3 } },
    { id: "queue", label: "Large Report Queue", description: "Elevated reading with many reports waiting.", values: { earthLinkOnline: false, queuedMessages: 18, doseRate: 0.9, elevatedThreshold: 0.3 } },
  ],
  H: [
    { id: "similar", label: "Similar Locations", description: "Both sleeping areas have similar rates.", values: { currentRate: 0.1, alternateRate: 0.09, sleepHours: 8, alternateAvailable: true } },
    { id: "move", label: "Move Available", description: "The alternate location meaningfully lowers exposure.", values: { currentRate: 0.22, alternateRate: 0.09, sleepHours: 8, alternateAvailable: true } },
    { id: "blocked", label: "Alternate Unavailable", description: "A better location exists but is unavailable.", values: { currentRate: 0.35, alternateRate: 0.05, sleepHours: 8, alternateAvailable: false } },
  ],
  I: [
    { id: "stable", label: "No Meaningful Change", description: "Change remains within uncertainty.", values: { beforeRate: 0.12, afterRate: 0.125, measurementUncertainty: 10 } },
    { id: "increase", label: "Clear Increase", description: "The after reading is clearly higher.", values: { beforeRate: 0.12, afterRate: 0.2, measurementUncertainty: 10 } },
    { id: "zero-baseline", label: "Zero Baseline", description: "Tests a valid absolute change from zero.", values: { beforeRate: 0, afterRate: 2, measurementUncertainty: 10 } },
  ],
  J: [
    { id: "rover", label: "Rover Shelter", description: "Rover shelter is the lower-dose feasible choice.", values: { doseRate: 0.62, roverShelterRate: 0.08, baseShelterRate: 0.12, returnMinutes: 45, eventHours: 3, routeAccessible: true } },
    { id: "base", label: "Return to Base", description: "Accessible return offers the lower modeled dose.", values: { doseRate: 0.62, roverShelterRate: 0.24, baseShelterRate: 0.08, returnMinutes: 20, eventHours: 3, routeAccessible: true } },
    { id: "blocked", label: "Route Unavailable", description: "Return route is not verified accessible.", values: { doseRate: 0.9, roverShelterRate: 0.24, baseShelterRate: 0.05, returnMinutes: 20, eventHours: 4, routeAccessible: false } },
  ],
  K: [
    { id: "stable", label: "Stable Patient", description: "Stable workflow with travel inside the delay limit.", values: { doseRate: 0.3, medicalDelayLimit: 15, saferRoomTravel: 8, patientStability: "stable" } },
    { id: "conflict", label: "Timing Conflict", description: "Travel exceeds the medical delay limit.", values: { doseRate: 0.62, medicalDelayLimit: 8, saferRoomTravel: 12, patientStability: "stable" } },
    { id: "unstable", label: "Unstable Patient", description: "Unstable state keeps medical protocol priority explicit.", values: { doseRate: 1.2, medicalDelayLimit: 8, saferRoomTravel: 12, patientStability: "unstable" } },
  ],
  L: [
    { id: "capacity", label: "Capacity Available", description: "All crew fit in the ready shelters.", values: { crewCount: 5, primaryCapacity: 4, secondaryCapacity: 2, secondaryReady: true } },
    { id: "exact", label: "Exact Capacity", description: "Ready capacity exactly matches crew count.", values: { crewCount: 6, primaryCapacity: 4, secondaryCapacity: 2, secondaryReady: true } },
    { id: "overflow", label: "Capacity Exceeded", description: "One crew member remains unassigned.", values: { crewCount: 6, primaryCapacity: 4, secondaryCapacity: 1, secondaryReady: true } },
  ],
  M: [
    { id: "quiet", label: "No Local Anomaly", description: "Both compartments report zero.", values: { localRate: 0, neighborRate: 0, sourceProcedureLoaded: true } },
    { id: "localized", label: "Localized Pattern", description: "Local reading is much higher than its neighbor.", values: { localRate: 1.1, neighborRate: 0.16, sourceProcedureLoaded: true } },
    { id: "guarded", label: "Procedure Missing", description: "Pattern exists but the source procedure is unavailable.", values: { localRate: 1.1, neighborRate: 0.16, sourceProcedureLoaded: false } },
  ],
  N: [
    { id: "unchanged", label: "No Extension", description: "Revised plan matches the original duration.", values: { currentDose: 52, doseRate: 0.1, originalHours: 240, extendedHours: 240, uncertainty: 20 } },
    { id: "extension", label: "Mission Extended", description: "Remaining mission time triples.", values: { currentDose: 52, doseRate: 0.1, originalHours: 240, extendedHours: 720, uncertainty: 20 } },
    { id: "high-rate", label: "High-Rate Extension", description: "Longer mission under a higher constant-rate assumption.", values: { currentDose: 52, doseRate: 0.5, originalHours: 240, extendedHours: 720, uncertainty: 30 } },
  ],
  O: [
    { id: "balanced", label: "Balanced Change", description: "Lower primary and modest secondary increase.", values: { primaryBefore: 100, primaryAfter: 80, secondaryBefore: 20, secondaryAfter: 30 } },
    { id: "secondary", label: "Secondary Increase", description: "Secondary increase offsets most primary reduction.", values: { primaryBefore: 100, primaryAfter: 70, secondaryBefore: 20, secondaryAfter: 58 } },
    { id: "total-rise", label: "Combined Total Rises", description: "Secondary production makes the total increase.", values: { primaryBefore: 100, primaryAfter: 60, secondaryBefore: 20, secondaryAfter: 90 } },
  ],
  P: [
    { id: "quiet", label: "Quiet Context", description: "No SEP context and a nominal onboard rate.", values: { gcrChange: -5, sepContext: false, doseRate: 0.1, elevatedThreshold: 0.3 } },
    { id: "forbush", label: "Forbush Context", description: "GCR decreases while SEP context is active.", values: { gcrChange: -18, sepContext: true, doseRate: 0.25, elevatedThreshold: 0.3 } },
    { id: "elevated", label: "Elevated Onboard Rate", description: "Onboard rate remains independently elevated.", values: { gcrChange: -25, sepContext: true, doseRate: 0.8, elevatedThreshold: 0.3 } },
  ],
  Q: [
    { id: "short-gap", label: "Short Gap", description: "Brief gap between similar samples.", values: { previousValue: 0.14, nextValue: 0.16, gapMinutes: 5, uncertainty: 10 } },
    { id: "rising-gap", label: "Rising Gap", description: "Longer gap between rising values.", values: { previousValue: 0.14, nextValue: 0.32, gapMinutes: 45, uncertainty: 20 } },
    { id: "wide-uncertainty", label: "High Uncertainty", description: "Long gap with a wide uncertainty allowance.", values: { previousValue: 0.1, nextValue: 0.8, gapMinutes: 240, uncertainty: 60 } },
  ],
  R: [
    { id: "nominal", label: "Systems Nominal", description: "Nominal life support and low radiation.", values: { doseRate: 0.1, criticalThreshold: 0.8, lifeSupportState: "nominal", shelterOxygenMinutes: 120 } },
    { id: "degraded", label: "Degraded Support", description: "Elevated radiation with degraded life support.", values: { doseRate: 0.7, criticalThreshold: 0.8, lifeSupportState: "degraded", shelterOxygenMinutes: 60 } },
    { id: "combined", label: "Combined Emergency", description: "Critical radiation and limited shelter oxygen.", values: { doseRate: 1.2, criticalThreshold: 0.8, lifeSupportState: "critical", shelterOxygenMinutes: 20 } },
  ],
  S: [
    { id: "no-effect", label: "No Clear Difference", description: "Treatment and control remain within uncertainty.", values: { controlMean: 100, treatmentMean: 98, uncertainty: 8, growthPercent: 2 } },
    { id: "candidate", label: "Candidate Effect", description: "A larger experimental difference for review.", values: { controlMean: 100, treatmentMean: 85, uncertainty: 8, growthPercent: 12 } },
    { id: "uncertain", label: "High Uncertainty", description: "Apparent difference with large uncertainty.", values: { controlMean: 100, treatmentMean: 80, uncertainty: 30, growthPercent: 12 } },
  ],
};

export const RADIATION_WORKBENCH_CATALOG: WorkbenchSimulationDefinition[] = RADIATION_SIMULATION_CATALOG.map((scenario) => ({
  ...scenario,
  ...UX[scenario.id],
  presets: PRESETS[scenario.id] ?? [],
  parameters: scenario.parameters.map((parameter) => ({
    ...parameter,
    group: GROUP_BY_KEY[parameter.key] ?? "Radiation Conditions",
    tooltip: tooltipFor(parameter),
  })),
}));

export function parametersForPreset(definition: WorkbenchSimulationDefinition, presetId: string) {
  const preset = definition.presets.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown preset ${presetId} for scenario ${definition.id}.`);
  return { ...defaultSimulationParameters(definition), ...preset.values };
}

export function validateWorkbenchParameters(
  definition: WorkbenchSimulationDefinition,
  values: Record<string, SimulationParameterValue>
) {
  const errors: Record<string, string> = {};
  for (const parameter of definition.parameters) {
    const value = values[parameter.key] ?? parameter.defaultValue;
    if (parameter.type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) errors[parameter.key] = "Enter a valid number.";
      else if (parameter.min !== undefined && value < parameter.min) errors[parameter.key] = `Must be at least ${parameter.min} ${parameter.unit ?? ""}.`.trim();
      else if (parameter.max !== undefined && value > parameter.max) errors[parameter.key] = `Must not exceed ${parameter.max} ${parameter.unit ?? ""}.`.trim();
    }
  }
  const elevated = values.elevatedThreshold;
  const critical = values.criticalThreshold;
  if (typeof elevated === "number" && typeof critical === "number" && critical <= elevated) {
    errors.criticalThreshold = "Critical threshold must be higher than the elevated threshold.";
  }
  if (definition.id === "N" && typeof values.originalHours === "number" && typeof values.extendedHours === "number" && values.extendedHours < values.originalHours) {
    errors.extendedHours = "Extended remaining time cannot be shorter than the original plan.";
  }
  if (definition.id === "L") {
    for (const key of ["crewCount", "primaryCapacity", "secondaryCapacity"]) {
      if (typeof values[key] === "number" && !Number.isInteger(values[key])) errors[key] = "Use a whole number of people.";
    }
  }
  if (definition.id === "A") {
    const elevated = values.elevatedThreshold;
    const critical = values.criticalThreshold;
    if (typeof elevated === "number" && typeof critical === "number" && critical <= elevated) {
      errors.criticalThreshold = "Critical threshold must be higher than the elevated threshold.";
      errors.elevatedThreshold = "Elevated threshold must be lower than the critical threshold.";
    }
  }
  if (definition.id === "N") {
    const original = values.originalHours;
    const extended = values.extendedHours;
    if (typeof original === "number" && typeof extended === "number" && extended < original) {
      errors.extendedHours = "Revised remaining time cannot be shorter than the original plan in this extension scenario.";
    }
  }
  if (definition.id === "L") {
    for (const key of ["crewCount", "primaryCapacity", "secondaryCapacity"]) {
      if (typeof values[key] === "number" && !Number.isInteger(values[key])) errors[key] = "Enter a whole number of people.";
    }
  }
  return errors;
}
