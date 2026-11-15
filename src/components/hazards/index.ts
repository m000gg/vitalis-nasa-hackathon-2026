"use client";

import React from "react";
import type { HazardSlug } from "@/lib/hazards";
import type { HazardScreenComponent, HazardScreenProps } from "./types";
import { RadiationHazardScreen } from "./01-radiation";
import { IsolationHazardScreen } from "./02-isolation";
import { DistanceHazardScreen } from "./03-distance";
import { GravityHazardScreen } from "./04-gravity";
import { EnvironmentHazardScreen } from "./05-environment";

export type {
  HazardCustomWidgetProps,
  HazardScreenComponent,
  HazardScreenProps,
  HazardWidgetComponent,
} from "./types";

/**
 * Pre-wired registry mapping each HazardSlug to its isolated 0N-*.tsx screen.
 * Teammates only edit their own src/components/hazards/0N-*.tsx file.
 */
export const HAZARD_SCREEN_REGISTRY: Record<HazardSlug, HazardScreenComponent> = {
  radiation: RadiationHazardScreen,
  isolation: IsolationHazardScreen,
  distance: DistanceHazardScreen,
  gravity: GravityHazardScreen,
  environment: EnvironmentHazardScreen,
};

export function getHazardScreen(slug: HazardSlug): HazardScreenComponent {
  return HAZARD_SCREEN_REGISTRY[slug];
}

export function HazardScreen(props: HazardScreenProps) {
  const Screen = HAZARD_SCREEN_REGISTRY[props.hazard.slug];
  return React.createElement(Screen, props);
}
