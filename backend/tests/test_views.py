from datetime import UTC, date, datetime, time

import pytest

from app.views import ErrorPoint, accuracy_view, day_view, trailing_errors


def test_trailing_window_is_d8_to_d2():
    t0 = datetime(2026, 1, 1, tzinfo=UTC)
    by_day = {date(2026, 1, d): [ErrorPoint(t0, t0, 0, 0, d)] for d in range(1, 15)}
    assert sorted(trailing_errors(by_day, date(2026, 1, 12))) == [4, 5, 6, 7, 8, 9, 10]


def test_accuracy_reference_numbers(snap, index):
    a = accuracy_view(snap, index, time(9, 50))
    s = a.summary
    assert (s.hours, s.mean_actual, s.mae, s.bias, s.rmse) == (744, 11286, 1996, 1728, 2499)
    assert (s.share_over, s.mae_pct, s.p10, s.p90, s.worst) == (0.8427, 0.1768, -506, 4189, 6857)
    assert (a.adjusted.mae, a.adjusted.improvement, a.band_coverage) == (1648, 0.174, 0.7151)
    assert [b.mae for b in a.by_lead_time] == [1654, 1723, 1880, 2004, 2234, 2307]
    assert [b.n for b in a.by_lead_time] == [1488, 1488, 2976, 2976, 2945, 2510]
    assert len(a.daily) == 31 and [d.mae for d in a.daily[:3]] == [3157, 2098, 853]
    assert len(a.histogram) == 22 and sum(b.count for b in a.histogram) == 744


@pytest.mark.parametrize("at, mae", [(time(9, 20), 2022), (time(15, 30), 1886)])
def test_accuracy_other_cutoffs(snap, index, at, mae):
    assert accuracy_view(snap, index, at).summary.mae == mae


def test_day_view_jan15(snap, index):
    d = day_view(snap, index, date(2026, 1, 15), time(9, 50))
    assert (d.cutoff, d.runs_used) == ("2026-01-14T09:50:00Z", ["2026-01-14T09:30:00Z"])
    h0 = d.hours[0]
    assert len(d.hours) == 24 and h0.time == "2026-01-15T00:00:00Z" and h0.lead_hours == 14.5
    assert (h0.forecast, h0.actual, h0.low, h0.high, h0.adjusted) == (15828, 14602, 10098, 16844, 13973)
    assert (d.stats.hours_with_forecast, d.stats.mae) == (24, 1094)
    assert (d.band.p10, d.band.p90, d.band.bias, d.band.days_of_history) == (-1016, 5730, 1855, 7)


def test_day_view_early_cutoff_leaves_gaps(snap, index):  # Review Focus 2
    d = day_view(snap, index, date(2026, 1, 15), time(1, 0))
    assert [h.time for h in d.hours if h.forecast is None] == ["2026-01-15T22:00:00Z", "2026-01-15T23:00:00Z"]
    assert d.stats.hours_with_forecast == 22 and d.stats.mae is not None
