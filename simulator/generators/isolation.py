"""Hazard 02 (Isolation & Confinement) telemetry generator matching 02-isolation.ts."""

from __future__ import annotations

import math
import random
from typing import Any

from config import ScenarioInfo
from generators import data_row, iso_hours_ago, is_surface_scenario, sample_row


def _member_profile(idx: int, mode: str) -> str:
    if mode == "positive":
        return "nominal"
    if mode == "chaos":
        return "chaos"
    if mode == "negative":
        return "critical" if idx in (1, 2, 3) else "elevated"
    # demo mix
    if idx == 2:
        return "critical"
    if idx in (1, 3):
        return "elevated"
    return "nominal"


def generate(
    scenario: ScenarioInfo,
    mode: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    surface = is_surface_scenario(scenario)

    # Note: mission_day_pct in [50, 75] triggers Mars500 Third-Quarter ELEVATED in 02-isolation.ts.
    # For strictly NOMINAL positive runs, place positive outside 50..75% (e.g. 34% / 78%).
    if mode == "positive":
        mission_pct = 78 if surface else 34
    elif mode in ("negative", "chaos"):
        mission_pct = 58 if surface else 66
    else:
        mission_pct = 58 if surface else 44

    for idx, member in enumerate(scenario.crew):
        prof = _member_profile(idx, mode)

        if prof == "nominal":
            sleep_series = [8.2, 8.1, 8.3, 8.0, 8.4, 8.2]
            activity_series = [21200, 21450, 20900, 21300, 21500, 21400]
            pvt_series = [248, 252, 245, 250, 246, 249]
            noise_series = [43.0, 44.0, 43.5, 44.2, 43.8, 43.4]
            efficiency = 91
            circadian_drift = 12 if surface else 6
            hrv = 54
            impulse_spikes = 0
            lux_match = 94
            lapses = 0
            fatigue = 2
            strain = 2
            mood_priv = 4
            journal_priv = "Slept solidly after evening reading; greenhouse check felt grounding."
            veggie_done = True
            connect_done = True
            sleep_med_priv = False
        elif prof == "elevated":
            sleep_series = [8.1, 7.6, 7.4, 7.1, 6.9, 6.8]
            activity_series = [20800, 19800, 18900, 17900, 17200, 16600]
            pvt_series = [258, 265, 272, 281, 294, 308]
            noise_series = [46.0, 48.0, 49.5, 51.0, 51.8, 52.4]
            efficiency = 81
            circadian_drift = 41 if surface else 24
            hrv = 39
            impulse_spikes = 2
            lux_match = 72
            lapses = 2
            fatigue = 3
            strain = 4
            mood_priv = 3
            journal_priv = "Ventilation hum woke me twice; slight afternoon drag."
            veggie_done = idx % 2 == 0
            connect_done = True
            sleep_med_priv = False
        elif prof == "chaos":
            sleep_series = [
                round(random.uniform(1.8, 3.4) if (s + idx) % 2 == 0 else random.uniform(11.5, 14.4), 2)
                for s in range(12)
            ]
            activity_series = [
                int(random.uniform(800, 3200) if (s + idx) % 2 == 0 else random.uniform(32000, 42500))
                for s in range(12)
            ]
            pvt_series = [
                int(random.uniform(190, 245) if (s + idx) % 2 == 0 else random.uniform(760, 1180))
                for s in range(12)
            ]
            noise_series = [
                round(random.uniform(32.0, 41.5) if (s + idx) % 2 == 0 else random.uniform(82.0, 106.5), 1)
                for s in range(12)
            ]
            efficiency = 58
            circadian_drift = 148
            hrv = 12
            impulse_spikes = 19
            lux_match = 29
            lapses = 12
            fatigue = 5
            strain = 5
            mood_priv = 1
            journal_priv = "PRIVATE: Total circadian disarray and alarms going off continuously."
            veggie_done = False
            connect_done = False
            sleep_med_priv = True
        else:  # critical
            sleep_series = [7.8, 7.1, 6.6, 6.1, 5.7, 5.4]
            activity_series = [21000, 19400, 17600, 15900, 14400, 13100]
            pvt_series = [260, 270, 276, 284, 322, 378]
            noise_series = [47.5, 51.0, 54.5, 56.8, 58.6, 59.4]
            efficiency = 73
            circadian_drift = 54
            hrv = 27
            impulse_spikes = 6
            lux_match = 56
            lapses = 5
            fatigue = 5
            strain = 5
            mood_priv = 1
            journal_priv = "PRIVATE: Exhausted, hard to focus; fan noise is relentless and miss Earth calls."
            veggie_done = False
            connect_done = False
            sleep_med_priv = True

        # Generate historical points spaced every 24h so charts & +2 SD baselines populate cleanly
        num_steps = len(sleep_series)
        for step in range(num_steps):
            ts = iso_hours_ago((num_steps - 1 - step) * 24.0 + 0.5)
            slp = sleep_series[step]
            act = activity_series[step]
            pvt = pvt_series[step]
            nse = noise_series[step]

            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "isolation",
                    "Wearable / Actigraphy",
                    f"wear_{step}",
                    slp,
                    {
                        "sleep_duration_h": slp,
                        "sleep_efficiency_pct": efficiency,
                        "circadian_phase_shift_min": circadian_drift,
                        "daytime_activity_counts": act,
                        "resting_hrv_rmssd": hrv,
                    },
                    ts,
                )
            )
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "isolation",
                    "Habitat Acoustics & Lighting",
                    f"hab_{step}",
                    nse,
                    {
                        "sleep_quarter_noise_dba": nse,
                        "impulse_noise_events_sleep": impulse_spikes,
                        "ambient_lux_schedule_match": lux_match,
                        "mission_day_pct": mission_pct,
                    },
                    ts,
                )
            )
            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "isolation",
                    "60-Second Self-Check (Private)",
                    f"self_{step}",
                    pvt,
                    {
                        "pvt_median_rt_ms": pvt,
                        "pvt_lapses_count": lapses if step == 5 else max(0, lapses - (5 - step)),
                        "subjective_fatigue_1_5": fatigue,
                        "team_workload_strain_1_5": strain,
                        "mood_valence_private": mood_priv,
                        "private_journal_note": journal_priv,
                    },
                    ts,
                )
            )

        last_sleep = sleep_series[-1]
        last_act = activity_series[-1]
        last_pvt = pvt_series[-1]
        last_noise = noise_series[-1]

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "Wearable / Actigraphy",
                f"Sleep {last_sleep} h · Eff {efficiency}% · Drift {circadian_drift}m · HRV {hrv} ms",
                {
                    "sleep_duration_h": last_sleep,
                    "sleep_efficiency_pct": efficiency,
                    "circadian_phase_shift_min": circadian_drift,
                    "daytime_activity_counts": last_act,
                    "resting_hrv_rmssd": hrv,
                },
                hours_ago=0.5,
            )
        )
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "Habitat Acoustics & Lighting",
                f"Noise {last_noise} dBA (NC-40<=49) · Impulses {impulse_spikes} · Lux {lux_match}% · Mission {mission_pct}%",
                {
                    "sleep_quarter_noise_dba": last_noise,
                    "impulse_noise_events_sleep": impulse_spikes,
                    "ambient_lux_schedule_match": lux_match,
                    "mission_day_pct": mission_pct,
                },
                hours_ago=0.5,
            )
        )
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "60-Second Self-Check (Private)",
                f"PVT-B {last_pvt} ms ({lapses} lapses) · Fatigue {fatigue}/5 · Strain {strain}/5",
                {
                    "pvt_median_rt_ms": last_pvt,
                    "pvt_lapses_count": lapses,
                    "subjective_fatigue_1_5": fatigue,
                    "team_workload_strain_1_5": strain,
                    "mood_valence_private": mood_priv,
                    "private_journal_note": journal_priv,
                },
                hours_ago=0.5,
            )
        )
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "CONNECT & Countermeasure Log",
                f"Veggie: {'done' if veggie_done else 'pending'} · CONNECT: {'done' if connect_done else 'pending'}",
                {
                    "veggie_plant_care_done": veggie_done,
                    "crew_social_checkin_done": connect_done,
                    "sleep_med_used_private": sleep_med_priv,
                },
                hours_ago=0.5,
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
    ts = iso_hours_ago(0.0)
    surface = is_surface_scenario(scenario)
    mission_pct = (78 if surface else 34) if mode == "positive" else (58 if surface else 64)

    for idx, member in enumerate(scenario.crew):
        prof = _member_profile(idx, mode)
        if prof == "chaos":
            noise = round(
                random.uniform(33.0, 42.0) if (tick_index + idx) % 2 == 0 else random.uniform(84.0, 108.0),
                1,
            )
            pvt = int(
                random.uniform(195, 250) if (tick_index + idx) % 2 == 1 else random.uniform(790, 1190)
            )
        else:
            base_noise = 43.6 if prof == "nominal" else (52.0 if prof == "elevated" else 59.5)
            noise = round(base_noise + math.sin(tick_index * 0.8 + idx) * 1.1, 1)
            base_pvt = 248 if prof == "nominal" else (305 if prof == "elevated" else 374)
            pvt = int(round(base_pvt + math.cos(tick_index * 0.6 + idx) * 6))

        hab_payload = {
            "sleep_quarter_noise_dba": noise,
            "impulse_noise_events_sleep": 0 if prof == "nominal" else 4,
            "ambient_lux_schedule_match": 94 if prof == "nominal" else 62,
            "mission_day_pct": mission_pct,
        }
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "Habitat Acoustics & Lighting",
                f"Noise {noise} dBA (NC-40<=49) · Mission {mission_pct}%",
                hab_payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "isolation",
                "Habitat Acoustics & Lighting",
                f"live_hab_{tick_index}",
                noise,
                hab_payload,
                ts,
            )
        )

        self_payload = {
            "pvt_median_rt_ms": pvt,
            "pvt_lapses_count": 0 if prof == "nominal" else 4,
            "subjective_fatigue_1_5": 2 if prof == "nominal" else 4,
            "team_workload_strain_1_5": 2 if prof == "nominal" else 4,
            "mood_valence_private": 4 if prof == "nominal" else 2,
            "private_journal_note": "Live check-in reflection (masked from Lead).",
        }
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "isolation",
                "60-Second Self-Check (Private)",
                f"PVT-B {pvt} ms",
                self_payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "isolation",
                "60-Second Self-Check (Private)",
                f"live_self_{tick_index}",
                float(pvt),
                self_payload,
                ts,
            )
        )

    return data_rows, sample_rows
