export type DonkiEventType = "SEP" | "FLR" | "RBE";

export interface DonkiEvent {
  eventId: string;
  eventType: DonkiEventType;
  startTime: string | null;
  endTime: string | null;
  source: string;
  provenanceKind: "measured";
  summary: string;
  raw: Record<string, unknown>;
}

const ALLOWED_TYPES: DonkiEventType[] = ["SEP", "FLR", "RBE"];
const DEFAULT_BASE_URL = "https://api.nasa.gov/DONKI";
const MAX_RANGE_DAYS = 30;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toIsoOrNull(value: unknown): string | null {
  const text = asText(value);
  if (!text || !Number.isFinite(new Date(text).getTime())) return null;
  return new Date(text).toISOString();
}

function asEventType(value: string | null): DonkiEventType | null {
  return value && ALLOWED_TYPES.includes(value as DonkiEventType)
    ? (value as DonkiEventType)
    : null;
}

function validateDate(value: string | null, label: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(`${value}T00:00:00Z`).getTime())) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  return value;
}

export function normalizeDonkiEvent(type: DonkiEventType, value: unknown): DonkiEvent {
  const raw = asRecord(value);
  const eventId =
    asText(raw.sepID) ||
    asText(raw.flrID) ||
    asText(raw.rbeID) ||
    asText(raw.activityID) ||
    asText(raw.id) ||
    `donki-${type}-${asText(raw.beginTime) || asText(raw.startTime) || "unknown"}`;
  const startTime = toIsoOrNull(raw.beginTime ?? raw.startTime ?? raw.eventTime);
  const endTime = toIsoOrNull(raw.endTime ?? raw.endTimeUTC ?? raw.peakTime);
  const details =
    asText(raw.note) ||
    asText(raw.sourceLocation) ||
    asText(raw.classType) ||
    "NASA DONKI space-weather event";

  return {
    eventId,
    eventType: type,
    startTime,
    endTime,
    source: `NASA DONKI ${type}`,
    provenanceKind: "measured",
    summary: details,
    raw,
  };
}

export async function fetchDonkiEvents(input: {
  eventType: string | null;
  startDate: string | null;
  endDate: string | null;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ events: DonkiEvent[]; sourceUrl: string }> {
  const eventType = asEventType(input.eventType);
  if (!eventType) throw new Error("eventType must be one of SEP, FLR or RBE.");
  const startDate = validateDate(input.startDate, "startDate");
  const endDate = validateDate(input.endDate, "endDate");
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (end < start) throw new Error("endDate must not be earlier than startDate.");
  if ((end - start) / 86_400_000 > MAX_RANGE_DAYS) {
    throw new Error(`DONKI date range cannot exceed ${MAX_RANGE_DAYS} days.`);
  }

  const baseUrl = (process.env.NASA_DONKI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = new URL(`${baseUrl}/${eventType}`);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("api_key", input.apiKey || process.env.NASA_API_KEY || "DEMO_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await (input.fetchImpl ?? fetch)(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`NASA DONKI returned HTTP ${response.status}.`);
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("NASA DONKI response was not an event array.");
    return {
      events: data.map((event) => normalizeDonkiEvent(eventType, event)),
      sourceUrl: url.toString().replace(/api_key=[^&]+/, "api_key=REDACTED"),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("NASA DONKI request timed out after 8 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
