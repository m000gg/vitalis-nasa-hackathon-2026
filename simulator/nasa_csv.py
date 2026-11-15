"""Reader for NASA OSDR Rodent Research-1 Environmental Data (CO2_ppm_ISS)."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

from config import DEFAULT_CSV_PATH

CO2_PPM_TO_MMHG = 0.00076


@dataclass(frozen=True)
class EdaCo2Point:
    index: int
    controller_time_gmt: str
    co2_ppm_iss: float
    co2_mmhg_iss: float
    temp_deg_c_iss: float | None = None
    rh_percent_iss: float | None = None


def _opt_float(raw: str | None) -> float | None:
    if raw is None or raw == "":
        return None
    try:
        return round(float(raw), 2)
    except ValueError:
        return None


def load_nasa_eda_co2_series(
    csv_path: Path = DEFAULT_CSV_PATH,
    max_rows: int | None = None,
) -> tuple[list[EdaCo2Point], bool]:
    """Load real ISS CO2, temp & RH measurements from the NASA OSDR RR-1 CSV.

    Returns (points, used_real_csv). Falls back gracefully if CSV is missing.
    """
    if not csv_path.exists():
        fallback = [
            EdaCo2Point(
                index=i,
                controller_time_gmt=f"2014-09-20 04:{(i * 5) % 60:02d}",
                co2_ppm_iss=round((2.5 + 0.03 * (i % 20)) / CO2_PPM_TO_MMHG, 1),
                co2_mmhg_iss=round(2.5 + 0.03 * (i % 20), 3),
                temp_deg_c_iss=23.5,
                rh_percent_iss=40.0,
            )
            for i in range(60)
        ]
        return fallback, False

    points: list[EdaCo2Point] = []
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for idx, row in enumerate(reader):
            raw_ppm = row.get("CO2_ppm_ISS")
            raw_time = row.get("Controller_Time_GMT", "")
            if raw_ppm is None:
                continue
            try:
                ppm = float(raw_ppm)
            except ValueError:
                continue
            points.append(
                EdaCo2Point(
                    index=idx,
                    controller_time_gmt=raw_time,
                    co2_ppm_iss=ppm,
                    co2_mmhg_iss=round(ppm * CO2_PPM_TO_MMHG, 3),
                    temp_deg_c_iss=_opt_float(row.get("Temp_degC_ISS")),
                    rh_percent_iss=_opt_float(row.get("RH_percent_ISS")),
                )
            )
            if max_rows is not None and len(points) >= max_rows:
                break

    return points, True
