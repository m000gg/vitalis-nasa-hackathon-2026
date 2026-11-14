"""Hazard 04 (Altered Gravity / Sensorimotor & Musculoskeletal) generator matching 04-gravity.ts."""

from __future__ import annotations

import math
from typing import Any

from config import ScenarioInfo
from generators import (
    data_row,
    iso_hours_ago,
    sample_row,
    scenario_flight_day,
)


def _member_severity(idx: int, mode: str) -> str:
    if mode == "positive":
        return "nominal"
    if mode == "negative":
        return "critical" if idx in (0, 2) else "elevated"
    if idx == 2:
        return "critical"
    if idx == 3:
        return "elevated"
    return "nominal"


def generate(
    scenario: ScenarioInfo,
    mode: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    fd = scenario_flight_day(scenario)

    for idx, member in enumerate(scenario.crew):
        sev = _member_severity(idx, mode)
        base_mass = 74.0 + (idx % 4) * 2.5
        base_calf = 2480.0 + (idx % 4) * 45.0
        base_grip = 46.0 + (idx % 3) * 2.0

        # 1. Pre-Test Conditions
        if sev == "nominal":
            pre_test = {
                "currentFlightDay": fd,
                "hoursSinceMeal": 3.5,
                "hoursSinceCaffeine": 11.0,
                "hoursSinceStrenuousExercise": 30.0,
                "hoursSinceAlcoholOrMeds": 48.0,
                "hoursSinceNblSession": 96.0,
                "calfMorningFastedPaired": True,
                "provenanceKind": "simulated",
            }
            pre_raw = f"FD {fd}: all pre-test readiness windows satisfied"
        elif sev == "elevated":
            pre_test = {
                "currentFlightDay": fd,
                "hoursSinceMeal": 2.5,
                "hoursSinceCaffeine": 4.0,  # < 8h threshold
                "hoursSinceStrenuousExercise": 26.0,
                "hoursSinceAlcoholOrMeds": 36.0,
                "hoursSinceNblSession": 72.0,
                "calfMorningFastedPaired": True,
                "provenanceKind": "simulated",
            }
            pre_raw = f"FD {fd}: caffeine clearance 4.0h (< 8h protocol)"
        else:
            pre_test = {
                "currentFlightDay": fd,
                "hoursSinceMeal": 0.9,  # < 2h threshold
                "hoursSinceCaffeine": 2.0,
                "hoursSinceStrenuousExercise": 10.0,  # < 24h
                "hoursSinceAlcoholOrMeds": 18.0,
                "hoursSinceNblSession": 36.0,
                "calfMorningFastedPaired": False,
                "provenanceKind": "simulated",
            }
            pre_raw = f"FD {fd}: non-fasted / post-exercise pre-test violations"

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "gravity",
                "Pre-Test Conditions",
                pre_raw,
                pre_test,
                hours_ago=1.5,
            )
        )

        # 2. Handgrip & Calf Volume: separate non-collinear cadences (calf every 14d, grip every 30d)
        # Calf series (14-day cadence, offset to avoid exact collision with 30d grip days)
        calf_days = [d for d in range(14, fd + 1, 14)]
        latest_calf = base_calf
        latest_mass = base_mass
        for step_idx, d in enumerate(calf_days[-8:]):
            progress = (step_idx + 1) / max(len(calf_days[-8:]), 1)
            jitter = math.sin(step_idx * 1.1 + idx) * 14.0
            if sev == "nominal":
                calf_val = round(base_calf - 35.0 * progress + jitter, 1)
                mass_val = round(base_mass - 0.6 * progress, 1)
            elif sev == "elevated":
                calf_val = round(base_calf - 190.0 * progress + jitter, 1)
                mass_val = round(base_mass - 2.4 * progress, 1)
            else:
                calf_val = round(base_calf - 360.0 * progress + jitter, 1)
                mass_val = round(base_mass - 4.8 * progress, 1)

            latest_calf = calf_val
            latest_mass = mass_val
            days_ago = max(fd - d, 0)
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "gravity",
                    "Handgrip & Calf Volume",
                    f"calf_fd_{d}",
                    None,  # keep numeric_value = None when calfVolumeValue is set
                    {
                        "measurementFlightDay": d,
                        "calfVolumeValue": calf_val,
                        "bodyMassKg": mass_val,
                        "calfMorningFastedPaired": pre_test["calfMorningFastedPaired"],
                        "maxGripKg": None,
                        "gripStaticEnduranceSec": None,
                        "gripDynamicEnduranceReps": None,
                        "provenanceKind": "simulated",
                    },
                    iso_hours_ago(days_ago * 24.0 + 14.0),
                )
            )

        # Grip series (30-day cadence, +1d offset so timestamps/FDs stay non-collinear with 14d calf checks)
        grip_days = [min(d + 1, fd) for d in range(30, fd + 1, 30)]
        if not grip_days:
            grip_days = [fd]
        latest_grip = base_grip
        latest_static = 60.0
        latest_reps = 30
        for step_idx, d in enumerate(grip_days[-6:]):
            progress = (step_idx + 1) / max(len(grip_days[-6:]), 1)
            jitter = math.cos(step_idx * 1.3 + idx) * 0.6
            if sev == "nominal":
                grip_val = round(base_grip - 1.2 * progress + jitter, 1)
                static_sec = round(61.0 - 2.0 * progress, 1)
                reps = int(round(30 - 1 * progress))
            elif sev == "elevated":
                grip_val = round(base_grip - 6.8 * progress + jitter, 1)
                static_sec = round(54.0 - 11.0 * progress, 1)
                reps = int(round(27 - 5 * progress))
            else:
                grip_val = round(base_grip - 13.5 * progress + jitter, 1)
                static_sec = round(48.0 - 16.0 * progress, 1)
                reps = int(round(24 - 8 * progress))

            latest_grip = grip_val
            latest_static = static_sec
            latest_reps = reps
            days_ago = max(fd - d, 0)
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "gravity",
                    "Handgrip & Calf Volume",
                    f"grip_fd_{d}",
                    grip_val,
                    {
                        "measurementFlightDay": d,
                        "calfVolumeValue": None,
                        "bodyMassKg": latest_mass,
                        "calfMorningFastedPaired": pre_test["calfMorningFastedPaired"],
                        "maxGripKg": grip_val,
                        "gripStaticEnduranceSec": static_sec,
                        "gripDynamicEnduranceReps": reps,
                        "provenanceKind": "simulated",
                    },
                    iso_hours_ago(days_ago * 24.0 + 4.0),
                )
            )

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "gravity",
                "Handgrip & Calf Volume",
                f"FD {fd}: calf {latest_calf} mL, grip {latest_grip} kg ({latest_static}s / {latest_reps} reps)",
                {
                    "measurementFlightDay": fd,
                    "calfVolumeValue": latest_calf,
                    "bodyMassKg": latest_mass,
                    "calfMorningFastedPaired": pre_test["calfMorningFastedPaired"],
                    "maxGripKg": latest_grip,
                    "gripStaticEnduranceSec": latest_static,
                    "gripDynamicEnduranceReps": latest_reps,
                    "provenanceKind": "simulated",
                },
                hours_ago=2.0,
            )
        )

        # 3. Daily Exercise Log (last 7 flight days)
        prescribed_load = 96.0 + (idx % 3) * 4.0
        latest_exercise: dict[str, Any] = {}
        for d_off in range(6, -1, -1):
            day_num = max(1, fd - d_off)
            if sev == "nominal":
                aero = 60 + ((d_off + idx) % 6)
                resist = 90 + ((d_off + idx) % 8)
                actual_load = round(prescribed_load * (0.98 + ((d_off % 3) * 0.02)), 1)
                after_meal = 2.5
                before_sleep = 3.0
            elif sev == "elevated":
                aero = 42 + ((d_off + idx) % 5)
                resist = 68 + ((d_off + idx) % 6)
                actual_load = round(prescribed_load * 0.80, 1)
                after_meal = 1.6
                before_sleep = 2.1
            else:
                aero = 22 if d_off % 2 == 0 else 0
                resist = 35 if d_off % 2 == 0 else 25
                actual_load = round(prescribed_load * 0.58, 1)
                after_meal = 1.0
                before_sleep = 1.2

            ex_payload = {
                "flightDay": day_num,
                "aerobicMinutes": aero,
                "resistanceMinutes": resist,
                "prescribedLoadKg": prescribed_load,
                "actualLoadKg": actual_load,
                "hoursAfterMeal": after_meal,
                "hoursBeforeSleep": before_sleep,
                "reconditioningDayRPlus": None,
                "provenanceKind": "simulated",
            }
            latest_exercise = ex_payload
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "gravity",
                    "Daily Exercise Log",
                    f"ex_fd_{day_num}",
                    float(aero + resist),
                    ex_payload,
                    iso_hours_ago(d_off * 24.0 + 3.0),
                )
            )

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "gravity",
                "Daily Exercise Log",
                (
                    f"FD {fd}: {latest_exercise['aerobicMinutes']}m aero / "
                    f"{latest_exercise['resistanceMinutes']}m resist @ {latest_exercise['actualLoadKg']} kg"
                ),
                latest_exercise,
                hours_ago=0.5,
            )
        )

    return data_rows, sample_rows


def stream_tick(
    scenario: ScenarioInfo,
    mode: str,
    tick_index: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Emit fresh Daily Exercise Log telemetry per crew member."""
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    fd = scenario_flight_day(scenario)
    ts = iso_hours_ago(0.0)

    for idx, member in enumerate(scenario.crew):
        sev = _member_severity(idx, mode)
        prescribed = 96.0 + (idx % 3) * 4.0
        if sev == "nominal":
            aero = 60 + (tick_index % 5)
            resist = 90 + (tick_index % 6)
            actual = round(prescribed, 1)
            after_meal, before_sleep = 2.5, 3.0
        elif sev == "elevated":
            aero = 44 + (tick_index % 4)
            resist = 70 + (tick_index % 5)
            actual = round(prescribed * 0.80, 1)
            after_meal, before_sleep = 1.8, 2.2
        else:
            aero = 25 + (tick_index % 4)
            resist = 35 + (tick_index % 5)
            actual = round(prescribed * 0.58, 1)
            after_meal, before_sleep = 1.0, 1.2

        payload = {
            "flightDay": fd,
            "aerobicMinutes": aero,
            "resistanceMinutes": resist,
            "prescribedLoadKg": prescribed,
            "actualLoadKg": actual,
            "hoursAfterMeal": after_meal,
            "hoursBeforeSleep": before_sleep,
            "reconditioningDayRPlus": None,
            "provenanceKind": "simulated",
        }
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "gravity",
                "Daily Exercise Log",
                f"FD {fd}: {aero}m aero / {resist}m resist @ {actual} kg",
                payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "gravity",
                "Daily Exercise Log",
                f"tick_{tick_index}",
                float(aero + resist),
                payload,
                ts,
            )
        )

    return data_rows, sample_rows
