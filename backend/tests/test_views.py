from datetime import UTC, date, datetime, time

import pytest

from app.views import ErrorPoint, accuracy_view, trailing_errors


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
