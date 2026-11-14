import type { HazardSlug } from "@/lib/hazards";
import type { HazardWidgetComponent } from "./types";
import { IsolationPvtWidget } from "./IsolationPvtWidget";

export type { HazardCustomWidgetProps, HazardWidgetComponent } from "./types";

/**
 * Optional per-hazard interactive widget registry keyed by HazardSlug.
 * Individual hazard modules can register custom UI widgets here (e.g. an
 * interactive PVT-B reaction-time test for `isolation`) without modifying
 * shared HazardDetailPage code.
 */
export const HAZARD_WIDGET_REGISTRY: Partial<Record<HazardSlug, HazardWidgetComponent>> = {
  isolation: IsolationPvtWidget,
};

export function getHazardWidget(slug: HazardSlug): HazardWidgetComponent | undefined {
  return HAZARD_WIDGET_REGISTRY[slug];
}
