"""Configuration, Supabase client, and dynamic scenario/crew discovery."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV_PATH = ROOT_DIR / "docs" / "nasa-data" / "RR-1_EDA_Telemetry_table.csv"

HAZARD_SLUGS = ("radiation", "isolation", "distance", "gravity", "environment")


@dataclass(frozen=True)
class CrewMember:
    id: str
    scenario_id: str
    callsign: str
    assigned_role_title: str
    is_lead_slot: bool


@dataclass(frozen=True)
class ScenarioInfo:
    id: str
    name: str
    duration_context: str
    crew: list[CrewMember]


def load_env() -> None:
    """Load .env.local then .env from repository root (mirrors Next.js env order)."""
    for fname in (".env.local", ".env"):
        env_path = ROOT_DIR / fname
        if env_path.exists():
            load_dotenv(env_path, override=False)


def get_supabase_client() -> Client:
    load_env()
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    if not url or not key:
        raise RuntimeError(
            "Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env or .env.local."
        )
    return create_client(url, key)


def fetch_scenarios_and_crew(
    client: Client,
    scenario_filter: list[str] | None = None,
) -> list[ScenarioInfo]:
    """Discover active scenarios and crew slots directly from Supabase."""
    s_resp = client.table("scenarios").select("id,name,duration_context").order("created_at").execute()
    c_resp = (
        client.table("characters")
        .select("id,scenario_id,callsign,assigned_role_title,is_lead_slot")
        .order("created_at")
        .execute()
    )

    scenarios_raw: list[dict[str, Any]] = s_resp.data or []
    chars_raw: list[dict[str, Any]] = c_resp.data or []

    if scenario_filter:
        allowed = set(scenario_filter)
        scenarios_raw = [s for s in scenarios_raw if s["id"] in allowed]

    result: list[ScenarioInfo] = []
    for s in scenarios_raw:
        crew = [
            CrewMember(
                id=c["id"],
                scenario_id=c["scenario_id"],
                callsign=c["callsign"],
                assigned_role_title=c["assigned_role_title"],
                is_lead_slot=bool(c.get("is_lead_slot", False)),
            )
            for c in chars_raw
            if c["scenario_id"] == s["id"]
        ]
        result.append(
            ScenarioInfo(
                id=s["id"],
                name=s["name"],
                duration_context=s.get("duration_context", ""),
                crew=crew,
            )
        )
    return result
