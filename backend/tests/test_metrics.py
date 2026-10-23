import pytest

from app.metrics import histogram, percentile, summarize


def test_percentile_uses_index_rule():
    v = list(range(1, 11))
    assert (percentile(v, 0.1), percentile(v, 0.5), percentile(v, 0.9)) == (2, 6, 10)


def test_summarize_basic():
    s = summarize([100, -50, 300], [1000, 1000, 1000])
    assert (s.hours, s.mean_actual, s.mae, s.mae_pct, s.worst) == (3, 1000, 150, 0.15, 300)
    assert round(s.bias, 2) == 116.67 and round(s.rmse) == 185 and round(s.share_over, 4) == 0.6667
    assert (s.p10, s.p90) == (-50, 300)


def test_summarize_rejects_empty():
    with pytest.raises(ValueError):
        summarize([], [])


def test_histogram_bins_are_half_open():
    assert [(b.lo, b.hi, b.count) for b in histogram([-600, -100, 0, 499, 500], 500)] == [
        (-1000, -500, 1),
        (-500, 0, 1),
        (0, 500, 2),
        (500, 1000, 1),
    ]


def test_histogram_keeps_empty_bins_between():
    assert [b.count for b in histogram([-600, 600], 500)] == [1, 0, 0, 1]
