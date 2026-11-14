"""Shared builder helpers and registry for all 5 Vitalis+ hazard generators."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from config import CrewMember, ScenarioInfo


def iso_hours_ago(hours_ago: float) -> str:
    dt = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def iso_minutes_ago(minutes_ago: float) -> str:
    dt = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def data_row(
    scenario_id: str,
    character_id: str,
    hazard_slug: str,
    stream_name: str,
    raw_value: str,
    payload: dict[str, Any],
    hours_ago: float = 0.25,
) -> dict[str, Any]:
    row_id = f"{scenario_id}__{character_id}__{hazard_slug}__{stream_name}".replace(" ", "_")
    return {
        "id": row_id,
        "scenario_id": scenario_id,
        "character_id": character_id,
        "hazard_slug": hazard_slug,
        "stream_name": stream_name,
        "raw_value": raw_value,
        "payload": payload,
        "updated_at": iso_hours_ago(hours_ago),
    }


def sample_row(
    scenario_id: str,
    character_id: str,
    hazard_slug: str,
    stream_name: str,
    tag: str,
    numeric_value: float | None,
    sample_payload: dict[str, Any],
    recorded_at: str,
) -> dict[str, Any]:
    safe_tag = tag.replace(" ", "_")
    return {
        "id": f"sim_{hazard_slug}_{scenario_id}_{character_id}_{safe_tag}",
        "scenario_id": scenario_id,
        "character_id": character_id,
        "hazard_slug": hazard_slug,
        "stream_name": stream_name,
        "numeric_value": numeric_value,
        "sample_payload": sample_payload,
        "recorded_at": recorded_at,
    }


def scenario_flight_day(scenario: ScenarioInfo) -> int:
    text = f"{scenario.id} {scenario.name}".lower()
    if "chapea" in text or "210" in text or "surface" in text:
        return 210
    return 126


def is_surface_scenario(scenario: ScenarioInfo) -> bool:
    text = f"{scenario.id} {scenario.name} {scenario.duration_context}".lower()
    return "chapea" in text or "surface" in text or "sol" in text
