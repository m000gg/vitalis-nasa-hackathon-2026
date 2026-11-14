import type { ComponentType } from "react";
import type { CrewSlot, MissionProfile, UserRole } from "@/lib/domain";
import type { HazardActorSnapshot } from "@/lib/evaluator";
import type {
  HazardDataRecord,
  HazardSampleRecord,
  HazardSpec,
} from "@/lib/hazards";

export interface HazardCustomWidgetProps {
  hazard: HazardSpec;
  mission: MissionProfile;
  activeCharacter: CrewSlot;
  role: UserRole;
  snapshot: HazardActorSnapshot;
  hazardRecords: readonly HazardDataRecord[];
  hazardSamples: readonly HazardSampleRecord[];
  scenarioHazardRecords: readonly HazardDataRecord[];
  scenarioHazardSamples: readonly HazardSampleRecord[];
}

export type HazardScreenProps = HazardCustomWidgetProps;
export type HazardWidgetComponent = ComponentType<HazardCustomWidgetProps>;
export type HazardScreenComponent = HazardWidgetComponent;
