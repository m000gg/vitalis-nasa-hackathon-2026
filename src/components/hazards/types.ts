import type { ComponentType } from "react";
import type { CrewSlot, MissionProfile, UserRole } from "@/lib/domain";
import type { HazardSlug } from "@/lib/hazards";
import type { SaveActorInputOptions } from "@/context/MissionContext";

export interface HazardCustomWidgetProps {
  mission: MissionProfile;
  activeCharacter: CrewSlot;
  role: UserRole;
  saveActorInput: (
    streamName: string,
    value: string,
    hazardSlug?: HazardSlug,
    options?: SaveActorInputOptions
  ) => Promise<void>;
  onFillSubfields: (streamName: string, values: Record<string, string>) => void;
}

export type HazardWidgetComponent = ComponentType<HazardCustomWidgetProps>;
