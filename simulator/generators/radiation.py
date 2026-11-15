"""Hazard 01 (Space Radiation) telemetry generator matching 01-radiation.ts."""

from __future__ import annotations

import math
import random
from typing import Any

from config import CrewMember, ScenarioInfo
from generators import data_row, iso_hours_ago, is_surface_scenario, sample_row

COMPARTMENTS = [
    ("Storm Shelter", "Center Shielded Rack"),
    ("Crew Quarters", "Port Hab Wall"),
    ("Columbus Lab", "Starboard Research Bay"),
    ("Airlock", "Forward EVA Hatch"),
    ("Galley", "Aft Utility Module"),
]


def _member_severity(idx: int, mode: str) -> str:
    if mode == "positive":
        return "nominal"
    if mode in ("negative", "chaos"):
        return "critical" if idx in (1, 2) or mode == "chaos" else "elevated"
    # demo mix
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
    surface = is_surface_scenario(scenario)

    # 1. Mission policy (stored once on lead slot or first crew member -> scenarioHazardRecords picks it up)
    policy_owner = next((c for c in scenario.crew if c.is_lead_slot), scenario.crew[0])
    remaining_h = 1500 if surface else 2000
    policy_payload = {
        "policyLabel": "Simulation Surface Ops ALARA Fixture" if surface else "Simulation Mars Transit ALARA Fixture",
        "policyMode": "simulation",
        "quantityFamily": "equivalent",
        "rateUnit": "µSv/h",
        "elevatedRateValue": 120,
        "criticalRateValue": 500,
        "doseUnit": "mSv",
        "cumulativeBudgetValue": 300,
        "remainingMissionHours": remaining_h,
        "forecastUncertaintyPercent": 15,
        "sensorDisagreementPercent": 25,
        "maxIntegrationGapHours": 24,
        "acknowledgementWindowMinutes": 15,
    }
    data_rows.append(
        data_row(
            scenario.id,
            policy_owner.id,
            "radiation",
            "Radiation Mission Policy",
            "SIMULATION Policy: Elevated >=120 µSv/h, Critical >=500 µSv/h, Budget 300 mSv",
            policy_payload,
            hours_ago=2.0,
        )
    )

    # 2. Space Weather (DONKI)
    donki_active = mode in ("negative", "chaos")
    donki_payload = {
        "eventId": "2026-CHAOS-X9" if mode == "chaos" else ("2026-SEP-0412" if donki_active else "2026-QUIET-0108"),
        "eventType": "SEP" if donki_active else "FLR",
        "startTime": iso_hours_ago(3.5 if donki_active else 36.0),
        "endTime": "" if donki_active else iso_hours_ago(30.0),
        "active": donki_active,
        "provenanceKind": "simulated",
        "source": "NASA DONKI Replay",
    }
    data_rows.append(
        data_row(
            scenario.id,
            policy_owner.id,
            "radiation",
            "Space Weather (DONKI)",
            "EXTREME X-CLASS SEP CHAOS REPLAY (verify onboard dosimeters)"
            if mode == "chaos"
            else "ACTIVE SEP storm replay (verify onboard dosimeters)"
            if donki_active
            else "Quiet background solar weather (inactive)",
            donki_payload,
            hours_ago=0.5,
        )
    )

    # 3. Experimental BioShield Lab record on Payload/Science slot
    lab_owner = scenario.crew[min(3, len(scenario.crew) - 1)]
    data_rows.append(
        data_row(
            scenario.id,
            lab_owner.id,
            "radiation",
            "Shielding & BioShield Lab (Experimental)",
            "BIOSHIELD-CLA-01: Cladosporium attenuation ~2.1% (experimental)",
            {
                "experimentId": "BIOSHIELD-CLA-01",
                "materialOrSpecimen": "Cladosporium sphaerospermum melanin layer",
                "controlGroup": False,
                "resultValue": 2.1,
                "resultUnit": "%",
                "uncertaintyPercent": 0.4,
                "provenanceKind": "experimental",
            },
            hours_ago=6.0,
        )
    )

    # 4. Per-crew Personal Dosimeter (time-series + latest) and 1 Compartment Sensor each
    for idx, member in enumerate(scenario.crew):
        sev = _member_severity(idx, mode)
        base_rate = 18.0 if surface else 28.0
        cum_dose = 48.0 if surface else 66.0
        quality_flag = "valid"

        if sev == "elevated":
            base_rate = 165.0
            cum_dose = 142.0
            quality_flag = "suspect" if (mode == "negative" and idx == 4) else "valid"
        elif sev == "critical":
            base_rate = 585.0
            cum_dose = 212.0

        # Ascending samples (16 chaotic 1h spikes in chaos mode; 8 normal 2h points otherwise)
        latest_rate = base_rate
        latest_ts = iso_hours_ago(0.2)
        num_steps = 16 if mode == "chaos" else 8
        step_hours = 1.0 if mode == "chaos" else 2.0
        if mode == "chaos":
            cum_dose = round(85.0 + idx * 95.0, 1)

        for step in range(num_steps):
            hours_back = (num_steps - 1 - step) * step_hours + 0.2
            ts = iso_hours_ago(hours_back)
            if mode == "chaos":
                rate = round(
                    random.uniform(14.0, 95.0)
                    if (step + idx) % 2 == 0
                    else random.uniform(1950.0, 6800.0),
                    1,
                )
                step_cum = round(cum_dose + step * random.uniform(6.0, 22.0), 2)
                step_quality = "suspect" if step % 3 == 0 else "valid"
            else:
                wave = math.sin(step * 0.9 + idx) * (0.08 * base_rate)
                if sev in ("elevated", "critical") and step >= 5:
                    # Ramp up in recent samples to look like an incoming event
                    factor = 0.55 + (step - 4) * 0.16
                    rate = round(max(1.0, base_rate * factor + wave * 0.4), 1)
                else:
                    rate = round(max(1.0, base_rate + wave), 1)
                step_cum = round(cum_dose + step * (rate * 0.002), 2)
                step_quality = quality_flag if step == num_steps - 1 else "valid"

            sample_rows.append(
                sample_row(
                    scenario.id,
                    member.id,
                    "radiation",
                    "Personal Dosimeter",
                    f"pd_{step}",
                    rate,
                    {
                        "doseRateValue": rate,
                        "doseRateUnit": "µSv/h",
                        "cumulativeDoseValue": step_cum,
                        "cumulativeDoseUnit": "mSv",
                        "uncertaintyPercent": 7,
                        "instrument": f"RAD-PD-0{idx + 1}",
                        "qualityFlag": step_quality,
                        "provenanceKind": "simulated",
                        "measuredAt": ts,
                        "source": "NASA-PDS / Vitalis-Sim",
                    },
                    ts,
                )
            )
            latest_rate = rate
            latest_ts = ts
            if mode == "chaos":
                cum_dose = step_cum
                quality_flag = step_quality

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "radiation",
                "Personal Dosimeter",
                f"{latest_rate} µSv/h · Cum: {cum_dose:.1f} mSv ({quality_flag})",
                {
                    "doseRateValue": latest_rate,
                    "doseRateUnit": "µSv/h",
                    "cumulativeDoseValue": round(cum_dose + 0.35, 2),
                    "cumulativeDoseUnit": "mSv",
                    "uncertaintyPercent": 7,
                    "instrument": f"RAD-PD-0{idx + 1}",
                    "qualityFlag": quality_flag,
                    "provenanceKind": "simulated",
                    "measuredAt": latest_ts,
                    "source": "NASA-PDS / Vitalis-Sim",
                },
                hours_ago=0.2,
            )
        )

        # Compartment sensor mapped cleanly per crew slot
        comp_name, comp_pos = COMPARTMENTS[idx % len(COMPARTMENTS)]
        if mode == "positive":
            comp_rate = round(base_rate + (idx - 2) * 1.4, 1)  # < 25% spread
            det_status = "online"
        elif mode == "chaos":
            comp_rates = [19.0, 2850.0, 420.0, 9400.0, 6150.0]
            comp_rate = round(comp_rates[idx % len(comp_rates)] * random.uniform(0.65, 1.35), 1)
            det_status = "suspect" if idx in (1, 3) else "online"
        elif mode == "negative":
            # Wide spread (>25%) & high airlock dose rate
            comp_rates = [42.0, 145.0, 220.0, 610.0, 180.0]
            comp_rate = comp_rates[idx % len(comp_rates)]
            det_status = "suspect" if idx == 3 else "online"
        else:
            comp_rates = [24.0, 31.0, 88.0, 140.0, 33.0]
            comp_rate = comp_rates[idx % len(comp_rates)]
            det_status = "online"

        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "radiation",
                "Compartment Sensors",
                f"{comp_name}: {comp_rate} µSv/h ({det_status})",
                {
                    "compartmentId": comp_name,
                    "doseRateValue": comp_rate,
                    "doseRateUnit": "µSv/h",
                    "detectorStatus": det_status,
                    "position": comp_pos,
                    "uncertaintyPercent": 6,
                    "provenanceKind": "simulated",
                    "measuredAt": latest_ts,
                },
                hours_ago=0.2,
            )
        )

    return data_rows, sample_rows


def stream_tick(
    scenario: ScenarioInfo,
    mode: str,
    tick_index: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Produce 1 incremental dosimeter point per crew member for live demo streaming."""
    data_rows: list[dict[str, Any]] = []
    sample_rows: list[dict[str, Any]] = []
    surface = is_surface_scenario(scenario)
    ts = iso_hours_ago(0.0)

    for idx, member in enumerate(scenario.crew):
        sev = _member_severity(idx, mode)
        base_rate = 18.0 if surface else 28.0
        cum_dose = 48.5 if surface else 66.8
        if sev == "elevated":
            base_rate, cum_dose = 165.0, 142.5
        elif sev == "critical":
            base_rate, cum_dose = 585.0, 213.0

        if mode == "chaos":
            rate = round(
                random.uniform(18.0, 120.0)
                if (tick_index + idx) % 2 == 0
                else random.uniform(2100.0, 7400.0),
                1,
            )
            cum = round(140.0 + idx * 80.0 + tick_index * random.uniform(1.5, 9.0), 2)
            q_flag = "suspect" if (tick_index + idx) % 3 == 0 else "valid"
        else:
            rate = round(base_rate + math.sin(tick_index * 0.7 + idx) * (0.06 * base_rate), 1)
            cum = round(cum_dose + tick_index * (rate * 0.0005), 2)
            q_flag = "valid"
        payload = {
            "doseRateValue": rate,
            "doseRateUnit": "µSv/h",
            "cumulativeDoseValue": cum,
            "cumulativeDoseUnit": "mSv",
            "uncertaintyPercent": 7,
            "instrument": f"RAD-PD-0{idx + 1}",
            "qualityFlag": q_flag,
            "provenanceKind": "simulated",
            "measuredAt": ts,
            "source": "NASA-PDS / Vitalis-Sim (Live)",
        }
        data_rows.append(
            data_row(
                scenario.id,
                member.id,
                "radiation",
                "Personal Dosimeter",
                f"{rate} µSv/h · Cum: {cum} mSv (valid)",
                payload,
                hours_ago=0.0,
            )
        )
        sample_rows.append(
            sample_row(
                scenario.id,
                member.id,
                "radiation",
                "Personal Dosimeter",
                f"live_{tick_index}",
                rate,
                payload,
                ts,
            )
        )
    return data_rows, sample_rows
