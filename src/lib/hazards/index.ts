import { radiationHazard } from "./01-radiation";
import { isolationHazard } from "./02-isolation";
import { distanceHazard } from "./03-distance";
import { gravityHazard } from "./04-gravity";
import { environmentHazard } from "./05-environment";
import { HazardSpec } from "./types";

export type {
  HazardEvaluationInput,
  HazardEvaluationResult,
  HazardInputSlot,
  HazardSlug,
  HazardSpec,
} from "./types";

/**
 * Central Hazard Registry.
 * Each of the 5 team members owns their isolated file in src/lib/hazards/01..05-*.ts
 * and exports a HazardSpec + evaluate() function.
 */
export const HAZARDS: HazardSpec[] = [
  radiationHazard,
  isolationHazard,
  distanceHazard,
  gravityHazard,
  environmentHazard,
];

export function getHazardBySlug(slug: string): HazardSpec | undefined {
  return HAZARDS.find((h) => h.slug === slug);
}
