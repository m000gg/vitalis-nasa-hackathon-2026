"""Hazard 03 (Distance from Earth) telemetry generator matching 03-distance.ts."""

from __future__ import annotations

from typing import Any

from config import ScenarioInfo
from generators import data_row, iso_hours_ago, is_surface_scenario, sample_row


def _distance_trajectory_km(scenario: ScenarioInfo, mode: str) -> list[float]:
    surface = is_surface_scenario(scenario)
    if mode == "positive":
        # < 179.87M km (< 600s one-way) => strictly NOMINAL
        return (
            [92_000_000, 96_500_000, 101_200_000, 106_800_000, 112_400_000, 118_000_000]
            if surface
            else [78_000_000, 84_000_000, 90_500_000, 97_000_000, 103_500_000, 110_000_000]
        )
    if mode == "negative":
        # >= 179.87M km (>= 10 min one-way) => ELEVATED autonomy latency
        return (
            [265_000_000, 278_000_000, 291_000_000, 304_000_000, 318_000_000, 332_000_000]
            if surface
            else [220_000_000, 236_000_000, 252_000_000, 268_000_000, 284_000_000, 298_500_000]
        )
    # demo mix: transit elevated deep-space, surface elevated
    return (
        [240_000_000, 248_000_000, 256_000_000, 264_000_000, 272_000_000, 279_000_000]
        if surface
        else [165_000_000, 174_000_000, 183_000_000, 192_000_000, 201_000_000, 210_000_000]
    )


def generate(
    scenario: ScenarioInfo,
    mode: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    traj = _distance_trajectory_km(scenario, mode)
    latest_km = traj[-1]

    for member in scenario.crew:
        for step, dist_km in enumerate(traj):
            ts = iso_hours_ago((len(traj) - 1 - step) * 24.0 + 1.0)
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "distance",
                    "Earth–Mars Ephemeris (JPL Horizons)",
                    f"ephem_{step}",
                    float(dist_km),
                    {"distanceKm": dist_km, "au": round(dist_km / 149_597_870.7, 3)},
                    ts,
                )
            )

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "distance",
                "Earth–Mars Ephemeris (JPL Horizons)",
                f"{latest_km:,.0f} km",
                {"distanceKm": latest_km, "au": round(latest_km / 149_597_870.7, 3)},
                hours_ago=0.4,
            )
        )

        if mode == "positive":
            inv_raw = "100% nominal (nearest expiry: Epinephrine 410d)"
            inv_payload = {
                "kitStatus": "NOMINAL",
                "remainingConsumablesPct": 96,
                "nextExpiringItem": "Epinephrine auto-injector",
                "daysUntilExpiry": 410,
            }
        elif mode == "negative":
            inv_raw = "LOW STOCK / EXPIRING: Broad-spectrum antibiotics (14d left)"
            inv_payload = {
                "kitStatus": "LOW_STOCK_WARNING",
                "remainingConsumablesPct": 58,
                "nextExpiringItem": "Broad-spectrum antibiotics",
                "daysUntilExpiry": 14,
            }
        else:
            inv_raw = "Watch: Analgesics restock review in 45d (92% kit intact)"
            inv_payload = {
                "kitStatus": "WATCH",
                "remainingConsumablesPct": 92,
                "nextExpiringItem": "IV Normal Saline 500mL",
                "daysUntilExpiry": 45,
            }

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "distance",
                "Onboard Medical Inventory",
                inv_raw,
                inv_payload,
                hours_ago=0.4,
            )
        )

    return data_rows, sample_rows


def stream_tick(
    scenario: ScenarioInfo,
    mode: str,
    tick_index: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    traj = _distance_trajectory_km(scenario, mode)
    dist_km = traj[-1] + tick_index * 180_000.0
    ts = iso_hours_ago(0.0)

    for member in scenario.crew:
        payload = {"distanceKm": dist_km, "au": round(dist_km / 149_597_870.7, 3)}
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "distance",
                "Earth–Mars Ephemeris (JPL Horizons)",
                f"{dist_km:,.0f} km",
                payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "distance",
                "Earth–Mars Ephemeris (JPL Horizons)",
                f"live_{tick_index}",
                dist_km,
                payload,
                ts,
            )
        )
    return data_rows, sample_rows
