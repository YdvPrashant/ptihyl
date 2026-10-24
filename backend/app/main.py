import os
from datetime import date, time
from functools import cache, lru_cache
from pathlib import Path, PurePosixPath
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import CUTOFF_PRESETS, DATA_SOURCE, DEFAULT_CUTOFF, DELIVERY_FIRST, DELIVERY_LAST
from app.data import Snapshot, load_snapshot
from app.forecasts import ForecastIndex, build_index
from app.schemas import AccuracyResponse, DayResponse, MetaResponse, PresetOut
from app.views import accuracy_view, day_view

CUTOFF_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"
Cutoff = Annotated[
    str, Query(pattern=CUTOFF_PATTERN, description="Decision time on the day before delivery, HH:MM UK time")
]

# Browsers re-check the page and the API on every visit, so a new deployment shows at once. Vercel's CDN may keep
# them for good: it keys its cache by deployment and the snapshot never changes within one, so repeat visits skip the
# container's cold start. Files under /assets have a content hash in their names, so browsers keep those too.
KEEP_ON_VERCEL_CDN = {"Vercel-CDN-Cache-Control": "max-age=31536000"}
RECHECK = {"Cache-Control": "public, max-age=0, must-revalidate", **KEEP_ON_VERCEL_CDN}
IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable", **KEEP_ON_VERCEL_CDN}

PLAIN_ERRORS = {
    "date": f"date must be a day written YYYY-MM-DD, from {DELIVERY_FIRST} to {DELIVERY_LAST}",
    "cutoff": "cutoff must be a time written HH:MM, from 00:00 to 23:59",
}


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


def cacheable(response: Response) -> None:
    """Set on a successful answer only: an error raised in the route gets a fresh response without these headers."""
    response.headers.update(RECHECK)


class HeadAsGet:
    """Answer HEAD like GET, so `curl -I` and link checkers get 200, not 405. The server drops the body itself."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["method"] == "HEAD":
            scope = {**scope, "method": "GET"}  # a copy: the server still sees HEAD and sends no body
        await self.app(scope, receive, send)


def create_app() -> FastAPI:
    app = FastAPI(title="Wind Desk API")
    app.add_middleware(HeadAsGet)

    @app.exception_handler(RequestValidationError)
    async def plain_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        names = dict.fromkeys(str(e["loc"][-1]) for e in exc.errors())
        return JSONResponse({"detail": "; ".join(PLAIN_ERRORS.get(n, f"{n} is not valid") for n in names)}, 422)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/meta", dependencies=[Depends(cacheable)])
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

    @app.get("/api/accuracy", dependencies=[Depends(cacheable)])
    def accuracy(cutoff: Cutoff = DEFAULT_CUTOFF) -> AccuracyResponse:
        return accuracy_for(cutoff)

    @app.get("/api/day", dependencies=[Depends(cacheable)])
    def day(on: Annotated[date, Query(alias="date")], cutoff: Cutoff = DEFAULT_CUTOFF) -> DayResponse:
        if not DELIVERY_FIRST <= on <= DELIVERY_LAST:
            raise HTTPException(status_code=422, detail=f"date must be between {DELIVERY_FIRST} and {DELIVERY_LAST}")
        return day_for(on, cutoff)

    if static_dir := os.environ.get("STATIC_DIR"):
        _serve_frontend(app, Path(static_dir).resolve())
    return app


def _serve_frontend(app: FastAPI, root: Path) -> None:
    """Serve the built React app from the same origin: real files as-is, any other path gets index.html.

    Registered after the API routes, so those win. Unknown /api paths and missing files (a path with an extension,
    such as an old /assets script after a redeploy) get 404 rather than the page, and nothing outside `root` is served.
    """

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        if file := _file_under(root, path):
            return FileResponse(file, headers=IMMUTABLE if path.startswith("assets/") else RECHECK)
        if PurePosixPath(path).suffix:
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(root / "index.html", headers=RECHECK)


def _file_under(root: Path, path: str) -> Path | None:
    """The file `path` names inside `root`, or None if there is no such file or the path leads outside `root`."""
    try:
        candidate = (root / path).resolve()
    except (OSError, ValueError):  # e.g. a null byte, which Linux rejects
        return None
    return candidate if path and candidate.is_relative_to(root) and candidate.is_file() else None


app = create_app()
