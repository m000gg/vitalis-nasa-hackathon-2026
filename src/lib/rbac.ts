import type { UserRole } from "./domain";
import type {
  HazardDataRecord,
  HazardInputSlot,
  HazardSampleRecord,
  HazardSlug,
} from "./hazards/types";

export type InputSlotResolver = (
  hazardSlug: HazardSlug,
  streamName: string
) => HazardInputSlot | undefined;

const SHARED_OPERATIONAL_STREAMS = new Set<string>([
  // Radiation shared infrastructure & mission policy
  "Space Weather (DONKI)",
  "Radiation Mission Policy",
  "Compartment Sensors",
  // Distance shared mission ephemeris & medical inventory
  "Earth–Mars Ephemeris (JPL Horizons)",
  "Onboard Medical Inventory",
  // Environment shared habitat module telemetry & NASA OSDR replay
  "Demo Scenario",
  "Simulated Minutes Elapsed",
  "Cabin CO2 Replay",
  "Lab Air Readings",
  "Habitat Air Readings",
  "Galley Air Readings",
  "Airlock Air Readings",
  "Cabin Atmosphere & Pressure",
  "Module Acoustics & Thermal",
]);

const DEFAULT_PRIVATE_KEYS_BY_STREAM: Record<string, string[]> = {
  "60-Second Self-Check (Private)": [
    "mood_valence_private",
    "private_journal_note",
    "privateJournalNote",
  ],
  "CONNECT & Countermeasure Log": ["sleep_med_used_private"],
};

function isVisibleToMember(characterId: string, streamName: string, actorId?: string): boolean {
  if (!actorId) return true;
  return characterId === actorId || SHARED_OPERATIONAL_STREAMS.has(streamName);
}

function getPrivateSubfieldKeys(streamName: string, slot?: HazardInputSlot): Set<string> {
  const keys = new Set<string>(DEFAULT_PRIVATE_KEYS_BY_STREAM[streamName] ?? []);
  if (slot?.subfields) {
    slot.subfields.forEach((sf) => {
      if (sf.isPrivate) {
        keys.add(sf.key);
      }
    });
  }
  return keys;
}

function stripKeysFromPayload(
  payload: Record<string, unknown>,
  privateKeys: Set<string>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!privateKeys.has(k)) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export function sanitizeHazardRecordsForRole(
  records: readonly HazardDataRecord[],
  role: UserRole,
  actorId?: string,
  resolveSlot?: InputSlotResolver
): HazardDataRecord[] {
  if (role === "member") {
    return actorId
      ? records.filter((rec) => isVisibleToMember(rec.characterId, rec.streamName, actorId))
      : [...records];
  }

  const sanitized: HazardDataRecord[] = [];
  for (const rec of records) {
    const slot = resolveSlot?.(rec.hazardSlug, rec.streamName);
    if (slot?.isPrivate) {
      continue;
    }

    const privateKeys = getPrivateSubfieldKeys(rec.streamName, slot);
    if (privateKeys.size === 0) {
      sanitized.push(rec);
      continue;
    }

    const cleanedPayload = stripKeysFromPayload(rec.payload ?? {}, privateKeys);
    let cleanedRawValue = rec.rawValue;

    if (slot?.subfields && slot.subfields.length > 0) {
      const publicParts = slot.subfields
        .filter(
          (sf) => !sf.isPrivate && cleanedPayload[sf.key] !== undefined && cleanedPayload[sf.key] !== ""
        )
        .map((sf) => `${sf.label}: ${String(cleanedPayload[sf.key])}${sf.unit ? ` ${sf.unit}` : ""}`);
      cleanedRawValue = publicParts.join(", ");
    } else {
      const hasAnyPrivateInPayload = Object.keys(rec.payload ?? {}).some((k) => privateKeys.has(k));
      if (hasAnyPrivateInPayload && Object.keys(cleanedPayload).length === 0) {
        cleanedRawValue = "";
      }
    }

    sanitized.push({
      ...rec,
      rawValue: cleanedRawValue,
      payload: cleanedPayload,
    });
  }
  return sanitized;
}

export function sanitizeHazardSamplesForRole(
  samples: readonly HazardSampleRecord[],
  role: UserRole,
  actorId?: string,
  resolveSlot?: InputSlotResolver
): HazardSampleRecord[] {
  if (role === "member") {
    return actorId
      ? samples.filter((s) => isVisibleToMember(s.characterId, s.streamName, actorId))
      : [...samples];
  }

  const sanitized: HazardSampleRecord[] = [];
  for (const sample of samples) {
    const slot = resolveSlot?.(sample.hazardSlug, sample.streamName);
    if (slot?.isPrivate) {
      continue;
    }

    const privateKeys = getPrivateSubfieldKeys(sample.streamName, slot);
    if (privateKeys.size === 0) {
      sanitized.push(sample);
      continue;
    }

    sanitized.push({
      ...sample,
      samplePayload: stripKeysFromPayload(sample.samplePayload ?? {}, privateKeys),
    });
  }
  return sanitized;
}

export function sanitizeActorInputsForRole(
  actorInputs: Record<string, string>,
  hazardSlug: HazardSlug,
  role: UserRole,
  sanitizedRecords: readonly HazardDataRecord[],
  resolveSlot?: InputSlotResolver
): Record<string, string> {
  if (role !== "lead") {
    return actorInputs;
  }

  const cleaned: Record<string, string> = {};
  for (const [streamName, value] of Object.entries(actorInputs)) {
    const slot = resolveSlot?.(hazardSlug, streamName);
    if (slot?.isPrivate) {
      continue;
    }
    const privateKeys = getPrivateSubfieldKeys(streamName, slot);
    if (privateKeys.size > 0) {
      const safeRec = sanitizedRecords.find(
        (r) => r.hazardSlug === hazardSlug && r.streamName === streamName
      );
      if (safeRec && safeRec.rawValue) {
        cleaned[streamName] = safeRec.rawValue;
      }
      continue;
    }
    cleaned[streamName] = value;
  }
  return cleaned;
}
