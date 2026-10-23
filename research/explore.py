"""Reproduce the January 2026 wind-forecast research, step by step.

Run:  python research/explore.py   (standard library only, no API key needed)

Each block matches a step of the walkthrough; the blocks can also be pasted one by one into `python`.
"""

# --- Block 1 (Step 4): download a month of actuals and forecasts ---
import json, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

BASE = "https://data.elexon.co.uk/bmrs/api/v1"
def get(path):
    with urllib.request.urlopen(BASE + path, timeout=120) as r:
        return json.load(r)
def t(s):  # "2026-01-02T09:30:00Z" -> a UTC datetime
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

actuals = get("/datasets/FUELHH/stream?settlementDateFrom=2025-12-30&settlementDateTo=2026-02-01&fuelType=WIND")
forecasts = get("/datasets/WINDFOR/stream?publishDateTimeFrom=2025-12-29T00:00:00Z&publishDateTimeTo=2026-02-02T00:00:00Z")
print(len(actuals), "actual rows |", len(forecasts), "forecast rows")
print(actuals[0]); print(forecasts[0])

# --- Block 2 (Step 4): check the shape of the data ---
print("actual minutes:", Counter(t(r["startTime"]).minute for r in actuals))
print("forecast minutes:", Counter(t(r["startTime"]).minute for r in forecasts))
runs = Counter(r["publishTime"] for r in forecasts)
print(len(runs), "forecast runs | rows per run:", set(runs.values()))
print("run times (UTC):", sorted(Counter(p[11:16] for p in runs).items()))
past = sum(r["startTime"] < r["publishTime"] for r in forecasts)
print(f"rows already in the past when published: {past} ({past / len(forecasts):.0%})")

# --- Block 3 (Step 5): docs say 03:30, January data says 02:30 - who is right? ---
july = get("/datasets/WINDFOR/stream?publishDateTimeFrom=2025-07-15T00:00:00Z&publishDateTimeTo=2025-07-16T00:00:00Z")
print("July run times:", sorted({r["publishTime"][11:16] for r in july}))
latest = get("/datasets/WINDFOR/stream")
print("newest run:", latest[0]["publishTime"], "| clock now (UTC):", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M"))

# --- Block 4 (Step 7): pick the forecast the team would actually have used ---
actual = {t(r["startTime"]): r["generation"] for r in actuals}
by_slot = defaultdict(list)                      # hour -> [(publishTime, forecast), ...]
for r in forecasts:
    if r["startTime"] >= r["publishTime"]:       # skip the "past" rows
        by_slot[t(r["startTime"])].append((t(r["publishTime"]), r["generation"]))

def day_ahead(slot, hh=9, mm=50):
    """Latest forecast published before hh:mm on the day before delivery."""
    cutoff = slot.replace(hour=hh, minute=mm) - timedelta(days=1)
    usable = [(p, g) for p, g in by_slot[slot] if p < cutoff]
    return max(usable)[1]                        # max() picks the newest publishTime

# --- Block 5 (Step 8): how accurate were those forecasts? ---
slots = [datetime(2026, 1, 2, tzinfo=timezone.utc) + timedelta(hours=h) for h in range(31 * 24)]

def report(hh=9, mm=50):
    errors = sorted(day_ahead(s, hh, mm) - actual[s] for s in slots)   # + means forecast too high
    n = len(errors)
    avg = sum(actual[s] for s in slots) / n
    mae = sum(abs(e) for e in errors) / n
    print(f"cut-off {hh:02}:{mm:02} | avg wind {avg:.0f} MW | typical miss (MAE) {mae:.0f} MW = {mae / avg:.0%}")
    print(f"   bias {sum(errors) / n:+.0f} MW | too high in {sum(e > 0 for e in errors) / n:.0%} of hours")
    print(f"   8 in 10 hours between {errors[n // 10]} and {errors[9 * n // 10]} MW | worst {max(map(abs, errors))} MW")

report()        # Nord Pool deadline 09:50
report(9, 20)   # EPEX deadline 09:20

# --- Block 6 (Step 9): does accuracy improve closer to the time? ---
groups = defaultdict(list)
for s in slots:
    for p, g in by_slot[s]:
        lead = (s - p).total_seconds() / 3600        # hours between publishing and the slot
        for lo, hi in [(0, 6), (6, 12), (12, 24), (24, 36), (36, 48), (48, 72)]:
            if lo <= lead < hi:
                groups[(lo, hi)].append(abs(g - actual[s]))
for (lo, hi), errs in sorted(groups.items()):
    print(f"{lo:>2}-{hi}h ahead: typical miss {sum(errs) / len(errs):.0f} MW")

# --- Block 7 (Step 10): a simple fix for the bias ---
first_day = datetime(2025, 12, 30, tzinfo=timezone.utc)    # first day we downloaded actuals for
days = [first_day + timedelta(days=i) for i in range(34)]   # 30 Dec .. 1 Feb
day_bias = {d: sum(day_ahead(d + timedelta(hours=h)) - actual[d + timedelta(hours=h)] for h in range(24)) / 24
            for d in days}
fixed = []
for s in slots:
    D = s.replace(hour=0)
    known = [day_bias[D - timedelta(days=k)] for k in range(2, 9) if D - timedelta(days=k) in day_bias]
    fixed.append(abs(day_ahead(s) - sum(known) / len(known) - actual[s]))
print(f"typical miss after subtracting last week's average error: {sum(fixed) / len(fixed):.0f} MW")
