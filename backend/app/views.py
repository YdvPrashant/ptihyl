"""Turn the snapshot into the payloads the API serves. Error = forecast - actual (MW); positive means over-forecast."""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from app.config import ACTUALS_FROM, DELIVERY_FIRST, DELIVERY_LAST, LEAD_BUCKETS, TRAILING_DAYS
from app.data import Snapshot
from app.forecasts import ForecastIndex, pick_day_ahead
from app.metrics import Summary, histogram, percentile, summarize
from app.schemas import AccuracyResponse, AdjustedOut, BinOut, DailyOut, LeadBucketOut, SummaryOut


@dataclass(frozen=True)
class ErrorPoint:
    slot: datetime
    publish: datetime
    forecast: int
    actual: int
    error: int


@dataclass(frozen=True)
class Band:
    """Spread and lean of recent errors. For a forecast F the likely range is [F - p90, F - p10]."""

    p10: float
    p90: float
    bias: float


def _days(first: date, last: date) -> list[date]:
    return [first + timedelta(days=i) for i in range((last - first).days + 1)]


def delivery_days() -> list[date]:
    return _days(DELIVERY_FIRST, DELIVERY_LAST)


def history_days() -> list[date]:
    return _days(ACTUALS_FROM, DELIVERY_LAST)


def hours_of(day: date) -> list[datetime]:
    midnight = datetime.combine(day, time(0), tzinfo=UTC)
    return [midnight + timedelta(hours=h) for h in range(24)]


def day_ahead_errors(
    snap: Snapshot, index: ForecastIndex, at: time, days: Iterable[date]
) -> dict[date, list[ErrorPoint]]:
    """Error of the forecast the buyer could have used, for every hour with both a usable forecast and an actual."""
    by_day = {}
    for day in days:
        points = []
        for slot in hours_of(day):
            picked = pick_day_ahead(index, slot, at)
            actual = snap.actuals.get(slot)
            if picked is not None and actual is not None:
                publish, forecast = picked
                points.append(ErrorPoint(slot, publish, forecast, actual, forecast - actual))
        by_day[day] = points
    return by_day


def trailing_errors(by_day: dict[date, list[ErrorPoint]], day: date) -> list[int]:
    """Errors from delivery days D-8 .. D-2: the history fully known at the cut-off on D-1."""
    return [p.error for k in TRAILING_DAYS for p in by_day.get(day - timedelta(days=k), [])]


def band_from(errors: Sequence[int]) -> Band | None:
    if not errors:
        return None
    ordered = sorted(errors)
    return Band(p10=percentile(ordered, 0.1), p90=percentile(ordered, 0.9), bias=sum(errors) / len(errors))


def _summary_out(s: Summary) -> SummaryOut:
    return SummaryOut(
        hours=s.hours,
        mean_actual=round(s.mean_actual),
        mae=round(s.mae),
        mae_pct=round(s.mae_pct, 4),
        bias=round(s.bias),
        rmse=round(s.rmse),
        share_over=round(s.share_over, 4),
        p10=round(s.p10),
        p90=round(s.p90),
        worst=round(s.worst),
    )


def _adjusted_and_coverage(by_day: dict[date, list[ErrorPoint]]) -> tuple[float, float]:
    """MAE after subtracting each day's trailing bias, and how often the actual fell inside the trailing band."""
    adjusted_abs, inside = [], 0
    for day in delivery_days():
        band = band_from(trailing_errors(by_day, day))
        if band is None:
            continue
        for p in by_day[day]:
            adjusted_abs.append(abs(p.forecast - band.bias - p.actual))
            inside += p.forecast - band.p90 <= p.actual <= p.forecast - band.p10
    return sum(adjusted_abs) / len(adjusted_abs), inside / len(adjusted_abs)


def _lead_time_buckets(snap: Snapshot, index: ForecastIndex) -> list[LeadBucketOut]:
    """MAE of every forecast run for the window's hours, grouped by how far ahead it was published."""
    errors: dict[tuple[int, int], list[int]] = {bucket: [] for bucket in LEAD_BUCKETS}
    for day in delivery_days():
        for slot in hours_of(day):
            actual = snap.actuals.get(slot)
            if actual is None:
                continue
            for publish, forecast in index.get(slot, []):
                lead = (slot - publish).total_seconds() / 3600
                for lo, hi in LEAD_BUCKETS:
                    if lo <= lead < hi:
                        errors[(lo, hi)].append(abs(forecast - actual))
    return [
        LeadBucketOut(label=f"{lo}-{hi}h", lo=lo, hi=hi, mae=round(sum(e) / len(e)), n=len(e))
        for (lo, hi), e in errors.items()
        if e
    ]


def accuracy_view(snap: Snapshot, index: ForecastIndex, at: time) -> AccuracyResponse:
    by_day = day_ahead_errors(snap, index, at, history_days())
    window = [p for day in delivery_days() for p in by_day[day]]
    errors = [p.error for p in window]
    summary = summarize(errors, [p.actual for p in window])
    adjusted_mae, coverage = _adjusted_and_coverage(by_day)
    return AccuracyResponse(
        cutoff=at.strftime("%H:%M"),
        window_first=DELIVERY_FIRST.isoformat(),
        window_last=DELIVERY_LAST.isoformat(),
        summary=_summary_out(summary),
        adjusted=AdjustedOut(mae=round(adjusted_mae), improvement=round((summary.mae - adjusted_mae) / summary.mae, 4)),
        band_coverage=round(coverage, 4),
        daily=[
            DailyOut(
                date=day.isoformat(),
                mae=round(sum(abs(p.error) for p in by_day[day]) / len(by_day[day])),
                bias=round(sum(p.error for p in by_day[day]) / len(by_day[day])),
            )
            for day in delivery_days()
            if by_day[day]
        ],
        by_lead_time=_lead_time_buckets(snap, index),
        histogram=[BinOut(lo=b.lo, hi=b.hi, count=b.count) for b in histogram(errors)],
    )
