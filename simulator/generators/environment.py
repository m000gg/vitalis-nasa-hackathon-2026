"""Hazard 05 (Closed Environment / ECLSS) generator matching 05-environment.ts + 02-isolation.ts."""

from __future__ import annotations

import math
import random
from typing import Any

from config import ScenarioInfo
from generators import data_row, iso_hours_ago, iso_minutes_ago, sample_row
from nasa_csv import EdaCo2Point

MODULES = [
    ("Lab Air Readings", "Lab"),
    ("Habitat Air Readings", "Habitat"),
    ("Galley Air Readings", "Galley"),
    ("Airlock Air Readings", "Airlock"),
]


def _select_cabin_window(points: list[EdaCo2Point], mode: str) -> list[EdaCo2Point]:
    """Select authentic NASA OSDR RR-1 telemetry segments appropriate to each mode."""
    if not points:
        return []
    if mode == "positive" and len(points) >= 5804:
        return points[5780:5804]  # Low baseline ~1.4-1.9 mmHg
    if mode == "demo" and len(points) >= 9954:
        return points[9930:9954]  # Natural climbing segment ~2.78 -> 3.44 mmHg
    if mode == "negative" and len(points) >= 5034:
        return points[5010:5034]  # Peak ISS segment up to ~3.55 mmHg
    return points[:24]


def _pick_nasa_co2_mmhg(
    eda_points: list[EdaCo2Point],
    point_index: int,
    mode: str,
    module_name: str,
) -> tuple[float, str, str, float | None, float | None]:
    """Return (co2_mmhg, controller_time_gmt, source_label, temp_c, rh_pct) driven by NASA EDA CSV."""
    if eda_points:
        pt = eda_points[point_index % len(eda_points)]
        base_mmhg = pt.co2_mmhg_iss
        gmt = pt.controller_time_gmt
        temp_c = pt.temp_deg_c_iss
        rh_pct = pt.rh_percent_iss
        src = "NASA-RR1-EDA-CSV"
    else:
        base_mmhg = 2.25
        gmt = "2014-09-25T12:00:00Z"
        temp_c = 23.5
        rh_pct = 40.0
        src = "Vitalis-Fallback-ECLSS"

    if mode == "chaos":
        co2 = round(
            random.uniform(1.4, 2.6)
            if point_index % 2 == 0
            else random.uniform(6.4, 9.8),
            2,
        )
    elif mode == "positive":
        mod_offset = {"Lab": 0.12, "Habitat": 0.04, "Galley": 0.18, "Airlock": -0.05}[module_name]
        co2 = min(2.85, max(1.3, round(base_mmhg + mod_offset, 2)))
    elif mode == "negative":
        boost = {"Lab": 1.95, "Habitat": 2.45, "Galley": 1.65, "Airlock": 1.35}[module_name]
        co2 = min(6.2, round(base_mmhg + boost, 2))
    else:
        boost = {"Lab": 0.0, "Habitat": 0.4, "Galley": 0.2, "Airlock": -0.4}[module_name]
        co2 = min(4.2, round(base_mmhg + boost, 2))

    return co2, gmt, src, temp_c, rh_pct


def generate(
    scenario: ScenarioInfo,
    mode: str,
    eda_points: list[EdaCo2Point] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    all_points = eda_points or []
    points = _select_cabin_window(all_points, mode)

    owner = next((c for c in scenario.crew if c.is_lead_slot), scenario.crew[0])

    if mode == "positive":
        demo_scenario = "none"
        sim_minutes = 120
    elif mode == "chaos":
        demo_scenario = "chaos"
        sim_minutes = 150
    elif mode == "negative":
        demo_scenario = "co2-scrubber-failure"
        sim_minutes = 120
    else:
        demo_scenario = "none"
        sim_minutes = 230  # reaches climbing end of NASA 9930..9953 window -> yellow forecast

    data_rows.append(
        data_row(
            scenario.id,
            owner.id,
            "environment",
            "Demo Scenario",
            demo_scenario,
            {"scenarioId": demo_scenario, "provenanceKind": "simulated"},
            hours_ago=0.1,
        )
    )
    data_rows.append(
        data_row(
            scenario.id,
            owner.id,
            "environment",
            "Simulated Minutes Elapsed",
            str(sim_minutes),
            {"simulatedMinutes": sim_minutes, "provenanceKind": "simulated"},
            hours_ago=0.1,
        )
    )

    if points and mode != "chaos":
        for row_idx, pt in enumerate(points):
            sample_rows.append(
                sample_row(
                    scenario.id,
                    owner.id,
                    "environment",
                    "Cabin CO2 Replay",
                    f"cabin_{row_idx}",
                    pt.co2_ppm_iss,
                    {
                        "unit": "ppm",
                        "rowIndex": row_idx,
                        "temperatureC": pt.temp_deg_c_iss,
                        "humidityPct": pt.rh_percent_iss,
                        "controllerTimeGmt": pt.controller_time_gmt,
                        "source": "NASA-RR1-EDA-CSV",
                    },
                    iso_minutes_ago((len(points) - row_idx) * 10.0),
                )
            )

    # Module air streams (backed by RR-1_EDA_Telemetry_table.csv CO2_ppm_ISS * 0.00076)
    sample_count = 16
    for mod_idx, (stream_name, mod_name) in enumerate(MODULES):
        member = scenario.crew[mod_idx % len(scenario.crew)]
        latest_payload: dict[str, Any] = {}
        latest_raw = ""

        for s_idx in range(sample_count):
            csv_idx = s_idx + mod_idx
            co2, gmt, src, temp_c, rh_pct = _pick_nasa_co2_mmhg(points, csv_idx, mode, mod_name)

            if mode == "positive":
                o2_mmhg = round(159.5 + math.sin(s_idx * 0.4 + mod_idx) * 1.1, 1)
                pressure = round(14.7 + math.cos(s_idx * 0.3) * 0.03, 2)
                noise = round(42.0 + mod_idx * 1.2 + math.sin(s_idx) * 1.0, 1)
            elif mode == "chaos":
                o2_mmhg = round(random.uniform(106.0, 174.0), 1)
                pressure = round(random.uniform(4.2, 15.8), 2)
                noise = round(random.uniform(43.0, 108.0), 1)
            elif mode == "negative":
                o2_mmhg = round((143.0 if mod_name == "Lab" else 152.0) - s_idx * 0.25, 1)
                pressure = round(14.42 - s_idx * 0.008, 2)
                noise = round((78.0 if mod_name == "Galley" else 64.0) + math.sin(s_idx) * 3.0, 1)
            else:
                o2_mmhg = round(157.5 - (1.8 if mod_name == "Lab" else 0.3), 1)
                pressure = round(14.66 + math.cos(s_idx * 0.2) * 0.04, 2)
                noise = round(68.0 if mod_name == "Galley" else 46.5 + mod_idx * 1.0, 1)

            mins_ago = (sample_count - 1 - s_idx) * 15.0 + 2.0
            payload = {
                "module": mod_name,
                "co2MmHg": co2,
                "o2MmHg": o2_mmhg,
                "pressurePsia": pressure,
                "noiseDba": noise,
                "temperatureC": temp_c,
                "humidityPct": rh_pct,
                "controllerTimeGmt": gmt,
                "source": src,
                "provenanceKind": "simulated",
            }
            latest_payload = payload
            latest_raw = (
                f"{mod_name}: CO2 {co2} mmHg · O2 {o2_mmhg} mmHg · {pressure} psia · {noise} dBA"
            )
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "environment",
                    stream_name,
                    f"env_{mod_name.lower()}_{s_idx}",
                    co2,
                    payload,
                    iso_minutes_ago(mins_ago),
                )
            )

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "environment",
                stream_name,
                latest_raw,
                latest_payload,
                hours_ago=0.05,
            )
        )

    return data_rows, sample_rows


def stream_tick(
    scenario: ScenarioInfo,
    mode: str,
    tick_index: int,
    eda_points: list[EdaCo2Point] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Emit fresh ECLSS readings and advance Simulated Minutes Elapsed smoothly."""
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    points = _select_cabin_window(eda_points or [], mode)
    ts = iso_hours_ago(0.0)

    owner = next((c for c in scenario.crew if c.is_lead_slot), scenario.crew[0])
    if mode == "positive":
        demo_scenario = "none"
        sim_minutes = 120 + (tick_index % 6) * 10
    elif mode == "chaos":
        demo_scenario = "chaos"
        sim_minutes = 150 + tick_index * 10
    elif mode == "negative":
        demo_scenario = "co2-scrubber-failure"
        sim_minutes = 120 + tick_index * 10
    else:
        demo_scenario = "none"
        sim_minutes = 200 + (tick_index % 4) * 10

    data_rows.append(
        data_row(
            scenario.id,
            owner.id,
            "environment",
            "Demo Scenario",
            demo_scenario,
            {"scenarioId": demo_scenario, "provenanceKind": "simulated"},
            hours_ago=0.0,
        )
    )

    data_rows.append(
        data_row(
            scenario.id,
            owner.id,
            "environment",
            "Simulated Minutes Elapsed",
            str(sim_minutes),
            {"simulatedMinutes": sim_minutes, "demoScenario": demo_scenario, "provenanceKind": "simulated"},
            hours_ago=0.0,
        )
    )

    for mod_idx, (stream_name, mod_name) in enumerate(MODULES):
        member = scenario.crew[mod_idx % len(scenario.crew)]
        co2, gmt, src, temp_c, rh_pct = _pick_nasa_co2_mmhg(
            points, tick_index * 3 + mod_idx, mode, mod_name
        )

        if mode == "positive":
            o2_mmhg = round(159.4 + math.sin(tick_index + mod_idx) * 0.8, 1)
            pressure = 14.70
            noise = round(42.5 + mod_idx * 1.1, 1)
        elif mode == "chaos":
            o2_mmhg = round(random.uniform(108.0, 172.0), 1)
            pressure = round(random.uniform(4.2, 15.8), 2)
            noise = round(random.uniform(44.0, 108.0), 1)
        elif mode == "negative":
            o2_mmhg = round(142.0 if mod_name == "Lab" else 151.0, 1)
            pressure = 14.38
            noise = 79.0 if mod_name == "Galley" else 65.0
        else:
            o2_mmhg = round(157.8, 1)
            pressure = 14.66
            noise = 68.5 if mod_name == "Galley" else 46.5

        payload = {
            "module": mod_name,
            "co2MmHg": co2,
            "o2MmHg": o2_mmhg,
            "pressurePsia": pressure,
            "noiseDba": noise,
            "temperatureC": temp_c,
            "humidityPct": rh_pct,
            "controllerTimeGmt": gmt,
            "source": src,
            "provenanceKind": "simulated",
        }
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "environment",
                stream_name,
                f"{mod_name}: CO2 {co2} mmHg · O2 {o2_mmhg} mmHg · {pressure} psia · {noise} dBA",
                payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "environment",
                stream_name,
                f"tick_{tick_index}",
                co2,
                payload,
                ts,
            )
        )

    return data_rows, sample_rows
