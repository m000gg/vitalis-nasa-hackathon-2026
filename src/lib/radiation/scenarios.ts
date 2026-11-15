export type RadiationScenarioStatus = "implemented";

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
    description:
      "Simulated SEP context and elevated onboard dose-rate telemetry trigger a storm-shelter alert while crew sleep.",
    assumptions: ["Simulation policy only", "DONKI context is not crew dose"],
    availableActions: ["Shelter procedure", "Crew confirmation", "Incident report"],
  },
  {
    id: "B",
    title: "Elevated Onboard Dose Rate",
    status: "implemented",
    threatType: "Task exposure",
    description:
      "Simulated elevated onboard dose rate triggers crew exposure reassessment without autonomous spacecraft action.",
    assumptions: ["Human-approved flight rules", "Explicit units and provenance"],
    availableActions: ["Apply flight rule", "Confirm shelter", "Incident report"],
  },
  {
    id: "C",
    title: "Unequal Crew Exposure",
    status: "implemented",
    threatType: "Crew budget",
    description:
      "Simulated crew comparison shows higher cumulative Sv exposure for one crew member to support task rotation.",
    assumptions: ["Comparable Sv-family records only", "Operational safety view"],
    availableActions: ["Propose task rotation", "Review mission policy", "Incident report"],
  },
  {
    id: "D",
    title: "Compartment Sensor Disagreement",
    status: "implemented",
    threatType: "Detector spread",
    description:
      "Simulated Habitat-A and Habitat-B sensors diverge past the mission-policy spread threshold.",
    assumptions: ["Disagreement is not proof of shield failure"],
    availableActions: ["Verify detectors", "Prefer lower-rate compartment", "Incident report"],
  },
];

export function getRadiationScenario(id: string): RadiationScenarioDefinition | undefined {
  return RADIATION_SCENARIOS.find((scenario) => scenario.id === id.toUpperCase());
}
