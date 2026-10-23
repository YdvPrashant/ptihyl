import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_meta_lists_window_and_presets():
    m = client.get("/api/meta").json()
    assert (m["delivery_first"], m["delivery_last"], m["default_cutoff"]) == ("2026-01-02", "2026-02-01", "09:50")
    assert [p["time"] for p in m["presets"]] == ["09:20", "09:50", "15:30"]


def test_accuracy_defaults_to_0950():
    assert client.get("/api/accuracy").json()["summary"]["mae"] == 1996


def test_day_returns_24_hours():
    r = client.get("/api/day", params={"date": "2026-01-15", "cutoff": "09:50"})
    assert r.status_code == 200 and len(r.json()["hours"]) == 24


def test_day_out_of_window_message():
    r = client.get("/api/day", params={"date": "2026-01-01"})
    assert r.status_code == 422 and r.json()["detail"] == "date must be between 2026-01-02 and 2026-02-01"


@pytest.mark.parametrize(
    "params",
    [
        {"date": "2026-02-02"},
        {"date": "2026-13-01"},
        {"date": "2026-01-15", "cutoff": "25:00"},
        {"date": "2026-01-15", "cutoff": "9:5"},
        {"date": "2026-01-15", "cutoff": "abc"},
    ],
)
def test_day_rejects_bad_input(params):  # Review Focus 3
    assert client.get("/api/day", params=params).status_code == 422


def test_requests_never_call_elexon(monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("network call at request time")

    monkeypatch.setattr("urllib.request.urlopen", boom)
    assert client.get("/api/day", params={"date": "2026-01-20", "cutoff": "07:00"}).status_code == 200
