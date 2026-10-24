from datetime import UTC, date, datetime, time

from app.data import Forecast
from app.forecasts import build_index, cutoff_for, pick_day_ahead

SLOT = datetime(2026, 1, 15, 12, tzinfo=UTC)


def f(pub, mw):
    return Forecast(datetime(*pub, tzinfo=UTC), SLOT, mw)


def test_cutoff_is_previous_day_at_given_time():
    assert cutoff_for(date(2026, 1, 15), time(9, 50)) == datetime(2026, 1, 14, 9, 50, tzinfo=UTC)


def test_build_index_drops_rows_for_hours_already_past():
    idx = build_index([f((2026, 1, 15, 13, 30), 1), f((2026, 1, 14, 9, 30), 2)])
    assert idx[SLOT] == [(datetime(2026, 1, 14, 9, 30, tzinfo=UTC), 2)]


def test_pick_takes_newest_run_strictly_before_cutoff():
    idx = build_index([f((2026, 1, 14, 7, 30), 1), f((2026, 1, 14, 9, 30), 2), f((2026, 1, 14, 9, 50), 3)])
    assert pick_day_ahead(idx, SLOT, time(9, 50)) == (datetime(2026, 1, 14, 9, 30, tzinfo=UTC), 2)


def test_pick_returns_none_when_no_run_before_cutoff():
    assert pick_day_ahead(build_index([f((2026, 1, 14, 9, 30), 2)]), SLOT, time(9, 0)) is None


def test_snapshot_loads_expected_counts(snap):
    assert len(snap.actuals) == 1872 and len(snap.forecasts) == 23944


def test_late_run_is_picked_by_publish_time(index):  # on 15 Jan the 11:30 run came out at 12:25
    pub, _ = pick_day_ahead(index, datetime(2026, 1, 16, 12, tzinfo=UTC), time(15, 30))
    assert pub == datetime(2026, 1, 15, 12, 25, tzinfo=UTC)
