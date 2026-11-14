#!/usr/bin/env python3
"""Vitalis Telemetry Simulator for all 5 NASA Human Research Program hazards.

Subcommands:
    status  Inspect Supabase row counts across scenarios, crew, and hazard tables.
    clear   Clear hazard telemetry rows (preserves scenarios & crew roster).
    seed    Populate historical samples + latest readings in positive/negative/demo mode.
    stream  Continuously emit incremental telemetry ticks via Supabase DB or Next.js API.
"""

from __future__ import annotations

import argparse
from collections import Counter
import sys
import time
from pathlib import Path
from typing import Any, Iterable

SIM_DIR = Path(__file__).resolve().parent
if str(SIM_DIR) not in sys.path:
    sys.path.insert(0, str(SIM_DIR))

import requests  # noqa: E402
from supabase import Client  # noqa: E402

from config import (  # noqa: E402
    DEFAULT_CSV_PATH,
    HAZARD_SLUGS,
    ScenarioInfo,
    fetch_scenarios_and_crew,
    get_supabase_client,
)
from generators import distance, environment, gravity, isolation, radiation  # noqa: E402
from nasa_csv import EdaCo2Point, load_nasa_eda_co2_series  # noqa: E402


def _chunked(items: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def _normalize_list_arg(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    out: list[str] = []
    for item in values:
        for part in item.split(","):
            cleaned = part.strip()
            if cleaned and cleaned != "all":
                out.append(cleaned)
    return out or None


def _resolve_hazards(values: list[str] | None) -> list[str]:
    selected = _normalize_list_arg(values)
    if not selected:
        return list(HAZARD_SLUGS)
    invalid = [h for h in selected if h not in HAZARD_SLUGS]
    if invalid:
        raise ValueError(f"Unknown hazard(s): {invalid}. Valid choices: {', '.join(HAZARD_SLUGS)}")
    return list(dict.fromkeys(selected))


def _clear_telemetry(
    client: Client,
    scenario_ids: list[str] | None = None,
    hazards: list[str] | None = None,
) -> tuple[int, int]:
    """Delete telemetry rows while never touching scenarios or characters."""
    deleted_samples = 0
    deleted_data = 0

    for table_name in ("character_hazard_samples", "character_hazard_data"):
        q = client.table(table_name).delete()
        if scenario_ids:
            q = q.in_("scenario_id", scenario_ids)
        if hazards:
            q = q.in_("hazard_slug", hazards)
        if not scenario_ids and not hazards:
            # PostgREST requires at least one filter clause on DELETE
            q = q.neq("id", "__never_matches__")
        resp = q.execute()
        count = len(resp.data or [])
        if table_name == "character_hazard_samples":
            deleted_samples = count
        else:
            deleted_data = count

    return deleted_data, deleted_samples


def _write_rows_db(
    client: Client,
    data_rows: list[dict[str, Any]],
    sample_rows: list[dict[str, Any]],
) -> None:
    for batch in _chunked(data_rows, 200):
        client.table("character_hazard_data").upsert(
            batch,
            on_conflict="scenario_id,character_id,hazard_slug,stream_name",
        ).execute()

    for batch in _chunked(sample_rows, 500):
        client.table("character_hazard_samples").insert(batch).execute()


def _write_rows_api(
    session: requests.Session,
    api_url: str,
    data_rows: list[dict[str, Any]],
    sample_rows: list[dict[str, Any]],
) -> tuple[int, int]:
    base = api_url.rstrip("/")
    ok_data = 0
    ok_samples = 0

    for row in data_rows:
        resp = session.post(
            f"{base}/api/hazard-data",
            json={
                "scenarioId": row["scenario_id"],
                "characterId": row["character_id"],
                "hazardSlug": row["hazard_slug"],
                "streamName": row["stream_name"],
                "rawValue": row["raw_value"],
                "payload": row["payload"],
                "recordSample": False,
            },
            timeout=10,
        )
        resp.raise_for_status()
        ok_data += 1

    for srow in sample_rows:
        resp = session.post(
            f"{base}/api/hazard-samples",
            json={
                "scenarioId": srow["scenario_id"],
                "characterId": srow["character_id"],
                "hazardSlug": srow["hazard_slug"],
                "streamName": srow["stream_name"],
                "numericValue": srow["numeric_value"],
                "samplePayload": srow["sample_payload"],
            },
            timeout=10,
        )
        resp.raise_for_status()
        ok_samples += 1

    return ok_data, ok_samples


def _generate_for_hazard(
    hazard: str,
    scenario: ScenarioInfo,
    mode: str,
    eda_points: list[EdaCo2Point],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if hazard == "radiation":
        return radiation.generate(scenario, mode)
    if hazard == "isolation":
        return isolation.generate(scenario, mode)
    if hazard == "distance":
        return distance.generate(scenario, mode)
    if hazard == "gravity":
        return gravity.generate(scenario, mode)
    if hazard == "environment":
        return environment.generate(scenario, mode, eda_points=eda_points)
    raise ValueError(f"Unsupported hazard: {hazard}")


def _stream_tick_for_hazard(
    hazard: str,
    scenario: ScenarioInfo,
    mode: str,
    tick_index: int,
    eda_points: list[EdaCo2Point],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if hazard == "radiation":
        return radiation.stream_tick(scenario, mode, tick_index)
    if hazard == "isolation":
        return isolation.stream_tick(scenario, mode, tick_index)
    if hazard == "distance":
        return distance.stream_tick(scenario, mode, tick_index)
    if hazard == "gravity":
        return gravity.stream_tick(scenario, mode, tick_index)
    if hazard == "environment":
        return environment.stream_tick(scenario, mode, tick_index, eda_points=eda_points)
    raise ValueError(f"Unsupported hazard: {hazard}")


def cmd_status(client: Client) -> int:
    scenarios = fetch_scenarios_and_crew(client)
    data_resp = client.table("character_hazard_data").select("scenario_id,hazard_slug").execute()
    sample_resp = client.table("character_hazard_samples").select("scenario_id,hazard_slug").execute()
    eda_points, csv_loaded = load_nasa_eda_co2_series(DEFAULT_CSV_PATH, max_rows=300)

    data_rows: list[dict[str, Any]] = data_resp.data or []
    sample_rows: list[dict[str, Any]] = sample_resp.data or []

    total_crew = sum(len(s.crew) for s in scenarios)
    print(f"Scenarios: {len(scenarios)} | Crew slots: {total_crew}")
    for s in scenarios:
        print(f"  - {s.id} ({s.name}): {len(s.crew)} crew")

    print(
        f"\nTelemetry totals: character_hazard_data={len(data_rows)}, "
        f"character_hazard_samples={len(sample_rows)}"
    )
    csv_status = f"loaded ({len(eda_points)} pts)" if csv_loaded else f"not found at {DEFAULT_CSV_PATH} (fallback active)"
    print(f"NASA RR-1 EDA CSV: {csv_status}")

    if data_rows or sample_rows:
        d_by_hazard = Counter(r["hazard_slug"] for r in data_rows)
        s_by_hazard = Counter(r["hazard_slug"] for r in sample_rows)
        print("\nBy hazard:")
        for h in HAZARD_SLUGS:
            print(f"  {h:<12} data={d_by_hazard[h]:>4} | samples={s_by_hazard[h]:>5}")

    return 0


def cmd_clear(
    client: Client,
    scenario_filter: list[str] | None,
    hazards: list[str] | None,
) -> int:
    scenarios = fetch_scenarios_and_crew(client, scenario_filter=scenario_filter)
    if scenario_filter and not scenarios:
        print(f"No scenarios matched {scenario_filter}", file=sys.stderr)
        return 1

    s_ids = [s.id for s in scenarios] if scenario_filter else None
    deleted_data, deleted_samples = _clear_telemetry(client, scenario_ids=s_ids, hazards=hazards)
    scope_s = ",".join(s_ids) if s_ids else "ALL scenarios"
    scope_h = ",".join(hazards) if hazards else "ALL hazards"
    print(
        f"Cleared [{scope_s} | {scope_h}]: "
        f"{deleted_data} character_hazard_data rows, {deleted_samples} character_hazard_samples rows "
        "(scenarios & characters preserved)."
    )
    return 0


def cmd_seed(
    client: Client,
    mode: str,
    scenario_filter: list[str] | None,
    hazards: list[str],
    no_reset: bool,
) -> int:
    scenarios = fetch_scenarios_and_crew(client, scenario_filter=scenario_filter)
    if not scenarios:
        print("No matching scenarios found in Supabase.", file=sys.stderr)
        return 1

    eda_points, csv_loaded = load_nasa_eda_co2_series(DEFAULT_CSV_PATH, max_rows=300)
    if "environment" in hazards:
        note = f"NASA EDA CSV ({len(eda_points)} pts)" if csv_loaded else "built-in ECLSS fallback"
        print(f"Environment CO2 curve source: {note}")

    if not no_reset:
        s_ids = [s.id for s in scenarios] if scenario_filter else None
        h_filter = hazards if set(hazards) != set(HAZARD_SLUGS) else None
        del_d, del_s = _clear_telemetry(client, scenario_ids=s_ids, hazards=h_filter)
        print(f"Reset scope first: removed {del_d} data rows and {del_s} sample rows.")

    all_data: list[dict[str, Any]] = []
    all_samples: list[dict[str, Any]] = []

    for scenario in scenarios:
        if not scenario.crew:
            print(f"Skipping scenario {scenario.id}: 0 crew members found.", file=sys.stderr)
            continue
        for hazard in hazards:
            d_rows, s_rows = _generate_for_hazard(hazard, scenario, mode, eda_points)
            all_data.extend(d_rows)
            all_samples.extend(s_rows)

    _write_rows_db(client, all_data, all_samples)
    print(
        f"Seeded mode={mode} for {len(scenarios)} scenario(s) and {len(hazards)} hazard(s): "
        f"{len(all_data)} character_hazard_data rows, {len(all_samples)} character_hazard_samples rows."
    )
    return 0


def cmd_stream(
    client: Client,
    mode: str,
    interval: float,
    ticks: int,
    via: str,
    api_url: str,
    scenario_filter: list[str] | None,
    hazards: list[str],
) -> int:
    scenarios = fetch_scenarios_and_crew(client, scenario_filter=scenario_filter)
    if not scenarios:
        print("No matching scenarios found in Supabase.", file=sys.stderr)
        return 1

    eda_points, _ = load_nasa_eda_co2_series(DEFAULT_CSV_PATH, max_rows=300)
    session = requests.Session() if via == "api" else None
    tick = 0

    print(
        f"Starting telemetry stream: mode={mode}, via={via}, interval={interval}s, "
        f"ticks={'infinite' if ticks <= 0 else ticks}, hazards={','.join(hazards)}"
    )
    try:
        while ticks <= 0 or tick < ticks:
            tick += 1
            tick_data: list[dict[str, Any]] = []
            tick_samples: list[dict[str, Any]] = []

            for scenario in scenarios:
                if not scenario.crew:
                    continue
                for hazard in hazards:
                    d_rows, s_rows = _stream_tick_for_hazard(hazard, scenario, mode, tick, eda_points)
                    tick_data.extend(d_rows)
                    tick_samples.extend(s_rows)

            if via == "api":
                assert session is not None
                n_d, n_s = _write_rows_api(session, api_url, tick_data, tick_samples)
            else:
                _write_rows_db(client, tick_data, tick_samples)
                n_d, n_s = len(tick_data), len(tick_samples)

            print(f"[tick {tick}] pushed {n_d} data updates, {n_s} sample points ({via})")

            if ticks > 0 and tick >= ticks:
                break
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nStream stopped by user.")
    finally:
        if session is not None:
            session.close()

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sim.py",
        description="Vitalis Python Telemetry Simulator for all 5 HRP hazards.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Inspect current database row counts and NASA CSV availability.")

    p_clear = sub.add_parser(
        "clear",
        help="Clear character_hazard_data and character_hazard_samples (keeps scenarios & crew).",
    )
    p_clear.add_argument(
        "--scenario",
        action="append",
        help="Scenario ID filter (repeatable or comma-separated).",
    )
    p_clear.add_argument(
        "--hazard",
        action="append",
        help=f"Hazard slug filter: {', '.join(HAZARD_SLUGS)} (repeatable or comma-separated).",
    )

    p_seed = sub.add_parser("seed", help="Seed telemetry across scenarios and hazards.")
    p_seed.add_argument(
        "--mode",
        choices=["positive", "negative", "demo"],
        default="demo",
        help="Telemetry profile: positive (nominal), negative (critical faults), or demo (mixed).",
    )
    p_seed.add_argument("--scenario", action="append", help="Scenario ID filter.")
    p_seed.add_argument("--hazard", action="append", help="Hazard slug filter.")
    p_seed.add_argument(
        "--no-reset",
        action="store_true",
        help="Keep existing telemetry rows instead of resetting the targeted scope first.",
    )

    p_stream = sub.add_parser("stream", help="Emit live incremental sensor ticks.")
    p_stream.add_argument(
        "--mode",
        choices=["positive", "negative", "demo"],
        default="demo",
        help="Streaming telemetry profile.",
    )
    p_stream.add_argument(
        "--interval",
        type=float,
        default=3.0,
        help="Seconds between ticks (default: 3.0).",
    )
    p_stream.add_argument(
        "--ticks",
        type=int,
        default=0,
        help="Number of ticks to emit (0 = run until Ctrl+C).",
    )
    p_stream.add_argument(
        "--via",
        choices=["db", "api"],
        default="db",
        help="Write directly to Supabase ('db') or through Next.js HTTP routes ('api').",
    )
    p_stream.add_argument(
        "--api-url",
        default="http://localhost:3000",
        help="Base URL of Next.js server when using --via api (default: http://localhost:3000).",
    )
    p_stream.add_argument("--scenario", action="append", help="Scenario ID filter.")
    p_stream.add_argument("--hazard", action="append", help="Hazard slug filter.")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    client = get_supabase_client()

    if args.command == "status":
        return cmd_status(client)

    if args.command == "clear":
        scenarios = _normalize_list_arg(args.scenario)
        hazards = _resolve_hazards(args.hazard) if args.hazard else None
        return cmd_clear(client, scenarios, hazards)

    if args.command == "seed":
        scenarios = _normalize_list_arg(args.scenario)
        hazards = _resolve_hazards(args.hazard)
        return cmd_seed(client, args.mode, scenarios, hazards, args.no_reset)

    if args.command == "stream":
        scenarios = _normalize_list_arg(args.scenario)
        hazards = _resolve_hazards(args.hazard)
        return cmd_stream(
            client,
            args.mode,
            args.interval,
            args.ticks,
            args.via,
            args.api_url,
            scenarios,
            hazards,
        )

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
