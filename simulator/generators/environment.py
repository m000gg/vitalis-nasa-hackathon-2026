"""Hazard 05 (Closed Environment / ECLSS) generator matching 05-environment.ts + 02-isolation.ts."""

from __future__ import annotations

import math
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


def _pick_nasa_co2_mmhg(
    eda_points: list[EdaCo2Point],
    point_index: int,
    mode: str,
    module_name: str,
) -> tuple[float, str, str]:
    """Return (co2_mmhg, controller_time_gmt, source_label) driven by NASA EDA CSV when available."""
    if eda_points:
        pt = eda_points[point_index % len(eda_points)]
        base_mmhg = pt.co2_mmhg_iss
        gmt = pt.controller_time_gmt
        src = "NASA-RR1-EDA-CSV"
    else:
        base_mmhg = 2.25
        gmt = "2014-09-25T12:00:00Z"
        src = "Vitalis-Fallback-ECLSS"

    # Keep positive Habitat <= 2.9 mmHg so 02-isolation.ts does not raise false cross-hazard alert.
    if mode == "positive":
        mod_offset = {"Lab": 0.12, "Habitat": 0.04, "Galley": 0.18, "Airlock": -0.05}[module_name]
        co2 = min(2.85, max(1.6, round(base_mmhg + mod_offset, 2)))
    elif mode == "negative":
        # Push Habitat & Lab into elevated/critical scrub failure range
        boost = {"Lab": 1.95, "Habitat": 2.45, "Galley": 1.65, "Airlock": 1.35}[module_name]
        co2 = min(6.2, round(base_mmhg + boost, 2))
    else:
        # Demo: Habitat / Galley slightly lively, Lab/Airlock nominal (overall amber/demo mix)
        boost = {"Lab": 0.25, "Habitat": 1.05, "Galley": 0.85, "Airlock": 0.10}[module_name]
        co2 = min(4.1, round(base_mmhg + boost, 2))

    return co2, gmt, src


def generate(
    scenario: ScenarioInfo,
    mode: str,
    eda_points: list[EdaCo2Point] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    points = eda_points or []

    # Owner slot for scenario-level Environment controls
    owner = next((c for c in scenario.crew if c.is_lead_slot), scenario.crew[0])

    if mode == "positive":
        demo_scenario = "none"
        sim_minutes = 20  # tMin = 20 -> co2Trend 'collecting', all 4 modules green in 05-environment.ts
    elif mode == "negative":
        demo_scenario = "co2-scrubber-failure"
        sim_minutes = 120
    else:
        demo_scenario = "noisy-galley"
        sim_minutes = 45

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

    # Module air streams (backed by RR-1_EDA_Telemetry_table.csv CO2_ppm_ISS * 0.00076)
    # Assign to up to 4 crew members deterministically so each slot carries distinct module telemetry too
    sample_count = 16
    for mod_idx, (stream_name, mod_name) in enumerate(MODULES):
        member = scenario.crew[mod_idx % len(scenario.crew)]
        latest_payload: dict[str, Any] = {}
        latest_raw = ""

        for s_idx in range(sample_count):
            csv_idx = s_idx * 4 + mod_idx
            co2, gmt, src = _pick_nasa_co2_mmhg(points, csv_idx, mode, mod_name)

            if mode == "positive":
                o2_mmhg = round(159.5 + math.sin(s_idx * 0.4 + mod_idx) * 1.1, 1)
                pressure = round(14.7 + math.cos(s_idx * 0.3) * 0.03, 2)
                noise = round(42.0 + mod_idx * 1.2 + math.sin(s_idx) * 1.0, 1)
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
    points = eda_points or []
    ts = iso_hours_ago(0.0)

    owner = next((c for c in scenario.crew if c.is_lead_slot), scenario.crew[0])
    if mode == "positive":
        demo_scenario = "none"
        sim_minutes = 20 + (tick_index % 3) * 5  # stay < 90 in positive mode
    elif mode == "negative":
        demo_scenario = "co2-scrubber-failure"
        sim_minutes = 120 + tick_index * 10
    else:
        demo_scenario = "noisy-galley"
        sim_minutes = 45 + (tick_index % 5) * 5

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
        co2, gmt, src = _pick_nasa_co2_mmhg(points, tick_index * 3 + mod_idx, mode, mod_name)

        if mode == "positive":
            o2_mmhg = round(159.4 + math.sin(tick_index + mod_idx) * 0.8, 1)
            pressure = 14.70
            noise = round(42.5 + mod_idx * 1.1, 1)
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
