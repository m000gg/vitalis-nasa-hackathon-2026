import { NextRequest, NextResponse } from "next/server";

const HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ERROR_LENGTH = 220;

function normalizeDate(value: string): string {
  return value.trim();
}

function isValidCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function truncateHorizonsError(rawMessage: string): string {
  const cleaned = rawMessage.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "NASA Horizons request failed.";
  }

  if (cleaned.length <= MAX_ERROR_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_ERROR_LENGTH - 3).trim()}...`;
}

function extractHorizonsErrorMessage(rawMessage: unknown): string {
  if (typeof rawMessage !== "string") {
    return "NASA Horizons request failed.";
  }

  const lines = rawMessage
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/error|warning|invalid|missing|cannot|not found|wldini|batvar|failed/i.test(line)) {
      return truncateHorizonsError(line);
    }
  }

  return truncateHorizonsError(rawMessage);
}

function buildHorizonsUrl(date: string): string {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: "'499'",
    CENTER: "'500@399'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    VEC_TABLE: "'1'",
    CSV_FORMAT: "'YES'",
    VEC_LABELS: "'NO'",
    OUT_UNITS: "'KM-S'",
    TLIST: `'${date}'`,
    TLIST_TYPE: "'CAL'",
    TIME_TYPE: "'UT'",
  });

  return `${HORIZONS_URL}?${params.toString()}`;
}

function extractEphBlock(text: string): string | null {
  const startIndex = text.indexOf("$$SOE");
  const endIndex = text.indexOf("$$EOE", startIndex + "$$SOE".length);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return text.slice(startIndex + "$$SOE".length, endIndex);
}

function parseVectorFromBlock(block: string): number | null {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const csvValues = line
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (csvValues.length >= 5) {
      const xyz = csvValues.slice(-3).map((value) => Number(value));
      if (xyz.every((value) => Number.isFinite(value))) {
        return Math.hypot(xyz[0], xyz[1], xyz[2]);
      }
    }

    const tokens = Array.from(
      line.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?/g),
      (match) => Number(match[0])
    ).filter((value) => Number.isFinite(value));

    if (tokens.length >= 3) {
      const [x, y, z] = tokens.slice(-3);
      return Math.hypot(x, y, z);
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const rawDate = request.nextUrl.searchParams.get("date")?.trim() ?? "";
  const date = normalizeDate(rawDate);

  if (!date || !isValidCalendarDate(date)) {
    return NextResponse.json(
      {
        date,
        error: "Invalid date. Use YYYY-MM-DD in the Gregorian calendar.",
        source: "NASA/JPL Horizons",
      },
      { status: 400 }
    );
  }

  const horizonsUrl = buildHorizonsUrl(date);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(horizonsUrl, {
      method: "GET",
      cache: "no-store",
      next: { revalidate: 3600 },
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      },
    });

    const rawBody = await response.text().catch(() => "");

    let payload: Record<string, unknown> = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      const detailedMessage = extractHorizonsErrorMessage(payload.error ?? payload.message ?? rawBody);
      return NextResponse.json(
        {
          date,
          source: "NASA/JPL Horizons",
          error: `NASA Horizons request failed${response.status ? ` (${response.status})` : ""}: ${detailedMessage}`,
        },
        { status: 502 }
      );
    }

    const resultText = typeof payload.result === "string" ? payload.result : rawBody;
    const horizonsError = typeof payload.error === "string" ? payload.error : "";

    if (horizonsError) {
      return NextResponse.json(
        {
          date,
          source: "NASA/JPL Horizons",
          error: extractHorizonsErrorMessage(horizonsError),
        },
        { status: 502 }
      );
    }

    const ephemerisBlock = extractEphBlock(resultText);

    if (!ephemerisBlock) {
      return NextResponse.json(
        {
          date,
          source: "NASA/JPL Horizons",
          error: "NASA Horizons response did not contain a valid $$SOE/$$EOE ephemeris block.",
        },
        { status: 502 }
      );
    }

    const distanceKm = parseVectorFromBlock(ephemerisBlock);

    if (!Number.isFinite(distanceKm) || distanceKm === null || distanceKm <= 0) {
      return NextResponse.json(
        {
          date,
          source: "NASA/JPL Horizons",
          error: "NASA Horizons response did not include valid Earth–Mars vector coordinates in kilometers.",
        },
        { status: 502 }
      );
    }

    const payloadResult = {
      date,
      distanceKm,
      source: "NASA/JPL Horizons",
      query: {
        command: "499",
        center: "500@399",
        ephemType: "VECTORS",
        vectorTable: "1",
        csvFormat: "YES",
        vectorLabels: "NO",
        outUnits: "KM-S",
        timeType: "UT",
        tlistType: "CAL",
        tlist: date,
      },
      generatedAtUtc: new Date().toISOString(),
    };

    return NextResponse.json(payloadResult, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error contacting NASA Horizons";
    const status = error instanceof Error && error.name === "AbortError" ? 504 : 502;

    return NextResponse.json(
      {
        date,
        source: "NASA/JPL Horizons",
        error: status === 504 ? "NASA Horizons request timed out after 15 seconds." : extractHorizonsErrorMessage(message),
      },
      { status }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
