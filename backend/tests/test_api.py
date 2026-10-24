import pytest
from fastapi.testclient import TestClient

from app.main import app, create_app

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
def test_day_rejects_bad_input(params):
    assert client.get("/api/day", params=params).status_code == 422


@pytest.mark.parametrize(
    "path, words",
    [
        ("/api/accuracy?cutoff=9:50", ["cutoff", "HH:MM"]),
        ("/api/day?date=2026-01-15&cutoff=25:00", ["cutoff", "HH:MM"]),
        ("/api/day?date=2026-13-01", ["date", "YYYY-MM-DD"]),
        ("/api/day", ["date", "YYYY-MM-DD"]),
    ],
)
def test_bad_input_gets_a_plain_sentence(path, words):
    detail = client.get(path).json()["detail"]
    assert isinstance(detail, str) and all(w in detail for w in words)


def test_answers_carry_a_cdn_cache_header_but_errors_do_not():
    # Vercel's CDN keys its cache by deployment, and the snapshot never changes within one.
    for path in ["/api/meta", "/api/accuracy", "/api/day?date=2026-01-15"]:
        assert client.get(path).headers["vercel-cdn-cache-control"] == "max-age=31536000"
    assert "vercel-cdn-cache-control" not in client.get("/api/day?date=2026-01-01").headers


def test_requests_never_call_elexon(monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("network call at request time")

    monkeypatch.setattr("urllib.request.urlopen", boom)
    assert client.get("/api/day", params={"date": "2026-01-20", "cutoff": "07:00"}).status_code == 200


@pytest.fixture
def site(tmp_path, monkeypatch):
    """The app serving a small built frontend from tmp_path/static, next to a file it must never serve."""
    root = tmp_path / "static"
    (root / "assets").mkdir(parents=True)
    (root / "index.html").write_text('<div id="root"></div>')
    (root / "favicon.svg").write_text("<svg/>")
    (root / "assets" / "index-abc123.js").write_text("start()")
    (tmp_path / "secret.txt").write_text("secret")
    monkeypatch.setenv("STATIC_DIR", str(root))
    return TestClient(create_app())


def test_serves_the_page_for_app_paths_and_real_files_as_they_are(site):
    assert '<div id="root">' in site.get("/").text
    assert '<div id="root">' in site.get("/some/deep/link").text
    assert site.get("/favicon.svg").text == "<svg/>"
    assert site.get("/api/nope").status_code == 404


def test_never_serves_a_file_outside_the_static_dir(site):
    assert "secret" not in site.get("/..%2Fsecret.txt").text


def test_a_missing_file_is_404_not_the_page(site):
    # After a redeploy an open tab can still ask for the old build's script; the page's HTML in its place breaks it.
    assert site.get("/assets/index-old999.js").status_code == 404
    assert site.get("/robots.txt").status_code == 404


def test_a_null_byte_in_the_path_is_not_a_server_error(site):
    assert site.get("/%00").status_code == 200


def test_head_is_answered_like_get(site):
    for path in ["/", "/assets/index-abc123.js", "/api/health", "/api/meta"]:
        assert site.head(path).status_code == 200


def test_browsers_keep_hashed_assets_and_recheck_everything_else(site):
    assert "immutable" in site.get("/assets/index-abc123.js").headers["cache-control"]
    for path in ["/", "/favicon.svg", "/api/meta"]:
        assert "max-age=0" in site.get(path).headers["cache-control"]
