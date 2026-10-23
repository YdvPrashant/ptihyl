from collections import defaultdict
from collections.abc import Iterable
from datetime import UTC, date, datetime, time, timedelta

from app.data import Forecast

# Target hour -> every (publishTime, MW) forecast made for it, oldest run first.
ForecastIndex = dict[datetime, list[tuple[datetime, int]]]


def build_index(items: Iterable[Forecast]) -> ForecastIndex:
    """Group forecasts by target hour, dropping rows for hours that had already passed when the run was published."""
    index: dict[datetime, list[tuple[datetime, int]]] = defaultdict(list)
    for f in items:
        if f.start >= f.publish:
            index[f.start].append((f.publish, f.mw))
    for runs in index.values():
        runs.sort()
    return dict(index)


def cutoff_for(day: date, at: time) -> datetime:
    """The decision moment for delivery day `day`: time `at` (UTC) on the day before."""
    return datetime.combine(day - timedelta(days=1), at, tzinfo=UTC)


def pick_day_ahead(index: ForecastIndex, slot: datetime, at: time) -> tuple[datetime, int] | None:
    """The newest forecast for `slot` published strictly before the cut-off, or None if no run came out in time."""
    cutoff = cutoff_for(slot.date(), at)
    best = None
    for publish, mw in index.get(slot, []):
        if publish >= cutoff:
            break
        best = (publish, mw)
    return best
