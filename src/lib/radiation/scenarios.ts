export type RadiationScenarioStatus = "implemented" | "contract_only" | "experimental" | "unsupported_model";

export interface RadiationScenarioDefinition {
  id: string;
  title: string;
  status: RadiationScenarioStatus;
  threatType: string;
  description: string;
  assumptions: string[];
  availableActions: string[];
}

export const RADIATION_SCENARIOS: RadiationScenarioDefinition[] = [
  {
    id: "A",
    title: "Solar Storm During Sleep",
    status: "implemented",
    threatType: "SEP / shelter",
    description: "A simulated SEP context plus elevated onboard dose-rate telemetry creates a captain alert while crew sleep.",
    assumptions: ["Simulation policy only", "DONKI context is not dose"],
    availableActions: ["Shelter procedure", "Crew confirmation", "Incident report"],
  },
  {
    id: "B",
    title: "Radiation Threat During EVA",
    status: "implemented",
    threatType: "EVA return",
    description: "A simulated elevated onboard reading marks the EVA gate for reassessment.",
    assumptions: ["No autonomous spacecraft action"],
    availableActions: ["Apply flight rule", "Confirm return/shelter", "Incident report"],
  },
  {
    id: "C",
    title: "Unequal Crew Exposure",
    status: "implemented",
    threatType: "Crew budget",
    description: "Crew comparison shows a simulated higher cumulative exposure for one member.",
    assumptions: ["Comparable Sv-family records only"],
    availableActions: ["Task rotation proposal", "Review mission policy"],
  },
  {
    id: "D",
    title: "Shield Integrity Failure",
    status: "implemented",
    threatType: "Compartment sensor disagreement",
    description: "Simulated compartment readings disagree beyond a simulation-policy threshold.",
    assumptions: ["Detector disagreement is not proof of shield failure"],
    availableActions: ["Verify instruments", "Use lowest-exposure route", "Incident report"],
  },
  { id: "E", title: "Approaching Radiation Belt", status: "contract_only", threatType: "route model", description: "Needs mission trajectory model.", assumptions: ["No route model loaded"], availableActions: [] },
  { id: "F", title: "Sensor Disagreement", status: "implemented", threatType: "quality", description: "Policy-backed relative sensor spread check.", assumptions: ["Compatible units only"], availableActions: ["Verify detector"] },
  { id: "G", title: "Communication Blackout", status: "contract_only", threatType: "comms", description: "Uses shared DTN layer; radiation data remain locally available.", assumptions: ["No remote acknowledgement guarantee"], availableActions: [] },
  { id: "H", title: "Higher-Exposure Sleeping Compartment", status: "contract_only", threatType: "sleep allocation", description: "Needs compartment assignment model.", assumptions: ["No validated optimizer"], availableActions: [] },
  { id: "I", title: "Protective Cargo Removed", status: "experimental", threatType: "shielding", description: "Needs validated transport-model inputs.", assumptions: ["No universal shielding factor"], availableActions: [] },
  { id: "J", title: "Mars Surface Radiation Spike", status: "contract_only", threatType: "surface telemetry", description: "Accepts sensor replay; no source-specific dose claim.", assumptions: ["No live Mars feed"], availableActions: [] },
  { id: "K", title: "Medical Emergency During Storm", status: "contract_only", threatType: "combined emergency", description: "Delegates medical workflow to shared emergency layer.", assumptions: ["No clinical triage model"], availableActions: [] },
  { id: "L", title: "Shelter Capacity Exceeded", status: "contract_only", threatType: "capacity", description: "Needs shelter-capacity model.", assumptions: ["No current shelter table"], availableActions: [] },
  { id: "M", title: "Nuclear Source / Reactor Anomaly", status: "unsupported_model", threatType: "source term", description: "Needs mission-specific source model and procedure.", assumptions: ["No source term"], availableActions: [] },
  { id: "N", title: "Mission Extension", status: "implemented", threatType: "forecast", description: "Change remainingMissionHours in policy and rerun forecast.", assumptions: ["Constant-rate model"], availableActions: ["Review forecast"] },
  { id: "O", title: "Secondary Radiation Surprise", status: "unsupported_model", threatType: "secondary particles", description: "Requires particle transport/LET inputs.", assumptions: ["No OLTARIS output loaded"], availableActions: [] },
  { id: "P", title: "Forbush Decrease Misinterpretation", status: "contract_only", threatType: "interpretation", description: "Context-only education; no automatic safety inference.", assumptions: ["No operational reduction claim"], availableActions: [] },
  { id: "Q", title: "Missing Data Reconstruction", status: "contract_only", threatType: "data gap", description: "The engine reports gaps but does not invent measurements.", assumptions: ["No reconstruction model"], availableActions: [] },
  { id: "R", title: "Combined Emergency", status: "contract_only", threatType: "multi-hazard", description: "Uses shared cross-hazard command policy.", assumptions: ["No priority model"], availableActions: [] },
  { id: "S", title: "BioShield Controlled Trial", status: "experimental", threatType: "research", description: "Stores experimental/control evidence without claiming crew protection.", assumptions: ["Not an operational shield"], availableActions: [] },
];

export function getRadiationScenario(id: string): RadiationScenarioDefinition | undefined {
  return RADIATION_SCENARIOS.find((scenario) => scenario.id === id.toUpperCase());
}
