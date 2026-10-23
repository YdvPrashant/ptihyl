from datetime import date
from pathlib import Path

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"

# The snapshot reaches back before the delivery window so every January day has a full 7-day error history.
ACTUALS_FROM = date(2025, 12, 25)
ACTUALS_TO = date(2026, 2, 1)
FORECASTS_PUBLISHED_FROM = "2025-12-23T00:00:00Z"
FORECASTS_PUBLISHED_TO = "2026-02-02T00:00:00Z"

# Decisions made on D-1 during January 2026 deliver on these days.
DELIVERY_FIRST = date(2026, 1, 2)
DELIVERY_LAST = date(2026, 2, 1)

CUTOFF_PRESETS = [
    ("epex-hourly", "EPEX hourly auction", "09:20"),
    ("n2ex", "Nord Pool N2EX auction", "09:50"),
    ("epex-half-hourly", "EPEX half-hourly auction", "15:30"),
]
DEFAULT_CUTOFF = "09:50"

LEAD_BUCKETS = [(0, 6), (6, 12), (12, 24), (24, 36), (36, 48), (48, 72)]
HISTOGRAM_BIN_MW = 500
TRAILING_DAYS = range(2, 9)  # D-8 .. D-2: D-1 is not finished at the cut-off

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
