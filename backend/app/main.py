from datetime import date, time
from functools import cache, lru_cache
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query

from app.config import CUTOFF_PRESETS, DATA_SOURCE, DEFAULT_CUTOFF, DELIVERY_FIRST, DELIVERY_LAST
from app.data import Snapshot, load_snapshot
from app.forecasts import ForecastIndex, build_index
from app.schemas import AccuracyResponse, DayResponse, MetaResponse, PresetOut
from app.views import accuracy_view, day_view

CUTOFF_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
Cutoff = Annotated[str, Query(pattern=CUTOFF_PATTERN, description="Decision time on the day before delivery, HH:MM UK time")]


@cache
def state() -> tuple[Snapshot, ForecastIndex]:
    """The snapshot never changes, so it is loaded and indexed once, on first use."""
    snap = load_snapshot()
    return snap, build_index(snap.forecasts)


@lru_cache(maxsize=256)
def accuracy_for(cutoff: str) -> AccuracyResponse:
    return accuracy_view(*state(), time.fromisoformat(cutoff))


@lru_cache(maxsize=256)
def day_for(day: date, cutoff: str) -> DayResponse:
    return day_view(*state(), day, time.fromisoformat(cutoff))


def create_app() -> FastAPI:
    app = FastAPI(title="Wind Desk API")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/meta")
    def meta() -> MetaResponse:
        snap, _ = state()
        return MetaResponse(
            delivery_first=DELIVERY_FIRST.isoformat(),
            delivery_last=DELIVERY_LAST.isoformat(),
            default_cutoff=DEFAULT_CUTOFF,
            presets=[PresetOut(id=key, label=label, time=at) for key, label, at in CUTOFF_PRESETS],
            fetched_at=snap.fetched_at,
            source=DATA_SOURCE,
        )

    @app.get("/api/accuracy")
    def accuracy(cutoff: Cutoff = DEFAULT_CUTOFF) -> AccuracyResponse:
        return accuracy_for(cutoff)

    @app.get("/api/day")
    def day(on: Annotated[date, Query(alias="date")], cutoff: Cutoff = DEFAULT_CUTOFF) -> DayResponse:
        if not DELIVERY_FIRST <= on <= DELIVERY_LAST:
            raise HTTPException(status_code=422, detail=f"date must be between {DELIVERY_FIRST} and {DELIVERY_LAST}")
        return day_for(on, cutoff)

    return app


app = create_app()
