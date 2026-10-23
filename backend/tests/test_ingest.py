import json

from app.ingest import build_snapshot, write_snapshot


def fake_fetch(calls):
    def fetch(path):
        calls.append(path)
        if path.startswith("/datasets/FUELHH"):
            return [
                {"startTime": "2026-01-02T00:30:00Z", "generation": 2, "fuelType": "WIND", "settlementPeriod": 2},
                {"startTime": "2026-01-02T00:00:00Z", "generation": 1, "fuelType": "WIND", "settlementPeriod": 1},
            ]
        return [
            {
                "dataset": "WINDFOR",
                "publishTime": "2026-01-01T09:30:00Z",
                "startTime": "2026-01-02T00:00:00Z",
                "generation": 5,
            }
        ]

    return fetch


def test_build_snapshot_requests_exact_ranges():
    calls = []
    build_snapshot(fake_fetch(calls))
    assert "/datasets/FUELHH/stream?settlementDateFrom=2025-12-25&settlementDateTo=2026-02-01&fuelType=WIND" in calls
    assert "/datasets/WINDFOR/stream?publishDateTimeFrom=2025-12-23T00:00:00Z&publishDateTimeTo=2026-02-02T00:00:00Z" in calls


def test_build_snapshot_trims_and_sorts_rows():
    snap = build_snapshot(fake_fetch([]))
    assert snap["actuals"] == [
        {"startTime": "2026-01-02T00:00:00Z", "generation": 1},
        {"startTime": "2026-01-02T00:30:00Z", "generation": 2},
    ]
    assert snap["forecasts"] == [
        {"publishTime": "2026-01-01T09:30:00Z", "startTime": "2026-01-02T00:00:00Z", "generation": 5}
    ]


def test_write_snapshot_round_trips(tmp_path):
    snap = build_snapshot(fake_fetch([]))
    write_snapshot(snap, tmp_path)
    assert json.loads((tmp_path / "forecasts.json").read_text()) == snap["forecasts"]
    assert json.loads((tmp_path / "meta.json").read_text()) == snap["meta"]
