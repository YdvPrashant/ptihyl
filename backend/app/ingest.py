"""Fetch the wind actuals and forecasts from Elexon into the committed snapshot.

Run from backend/:  uv run python -m app.ingest
"""

import json
import urllib.request
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

from app.config import ACTUALS_FROM, ACTUALS_TO, DATA_DIR, ELEXON_BASE, FORECASTS_PUBLISHED_FROM, FORECASTS_PUBLISHED_TO

SOURCE = "Elexon BMRS: FUELHH (fuelType=WIND), WINDFOR"


def fetch_json(path: str) -> list[dict]:
    with urllib.request.urlopen(ELEXON_BASE + path, timeout=120) as response:
        return json.load(response)


def build_snapshot(fetch: Callable[[str], list[dict]] = fetch_json) -> dict:
    actuals = fetch(
        f"/datasets/FUELHH/stream?settlementDateFrom={ACTUALS_FROM}&settlementDateTo={ACTUALS_TO}&fuelType=WIND"
    )
    forecasts = fetch(
        f"/datasets/WINDFOR/stream?publishDateTimeFrom={FORECASTS_PUBLISHED_FROM}"
        f"&publishDateTimeTo={FORECASTS_PUBLISHED_TO}"
    )
    return {
        "actuals": sorted(
            ({"startTime": r["startTime"], "generation": r["generation"]} for r in actuals),
            key=lambda r: r["startTime"],
        ),
        "forecasts": sorted(
            (
                {"publishTime": r["publishTime"], "startTime": r["startTime"], "generation": r["generation"]}
                for r in forecasts
            ),
            key=lambda r: (r["publishTime"], r["startTime"]),
        ),
        "meta": {"fetched_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"), "source": SOURCE},
    }


def write_snapshot(snapshot: dict, data_dir: Path = DATA_DIR) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    for name in ("actuals", "forecasts", "meta"):
        (data_dir / f"{name}.json").write_text(json.dumps(snapshot[name], separators=(",", ":")), encoding="utf-8")


def main() -> None:
    snapshot = build_snapshot()
    write_snapshot(snapshot)
    runs = len({r["publishTime"] for r in snapshot["forecasts"]})
    print(f"actuals {len(snapshot['actuals'])} rows | forecasts {len(snapshot['forecasts'])} rows ({runs} runs)")


if __name__ == "__main__":
    main()
