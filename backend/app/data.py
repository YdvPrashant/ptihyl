import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.config import DATA_DIR


def parse_utc(s: str) -> datetime:
    """Parse an Elexon timestamp such as "2026-01-15T09:30:00Z" into an aware UTC datetime."""
    return datetime.fromisoformat(s)


@dataclass(frozen=True)
class Forecast:
    publish: datetime
    start: datetime
    mw: int


@dataclass(frozen=True)
class Snapshot:
    actuals: dict[datetime, int]
    forecasts: list[Forecast]
    fetched_at: str


def load_snapshot(data_dir: Path = DATA_DIR) -> Snapshot:
    def read(name: str):
        return json.loads((data_dir / f"{name}.json").read_text(encoding="utf-8"))

    return Snapshot(
        actuals={parse_utc(r["startTime"]): r["generation"] for r in read("actuals")},
        forecasts=[
            Forecast(parse_utc(r["publishTime"]), parse_utc(r["startTime"]), r["generation"]) for r in read("forecasts")
        ],
        fetched_at=read("meta")["fetched_at"],
    )
