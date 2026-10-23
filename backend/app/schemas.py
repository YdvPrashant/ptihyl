"""JSON response shapes. MW values are ints; shares are floats rounded to 4 decimal places."""

from pydantic import BaseModel


class SummaryOut(BaseModel):
    hours: int
    mean_actual: int
    mae: int
    mae_pct: float
    bias: int
    rmse: int
    share_over: float
    p10: int
    p90: int
    worst: int


class AdjustedOut(BaseModel):
    mae: int
    improvement: float


class DailyOut(BaseModel):
    date: str
    mae: int
    bias: int


class LeadBucketOut(BaseModel):
    label: str
    lo: int
    hi: int
    mae: int
    n: int


class BinOut(BaseModel):
    lo: int
    hi: int
    count: int


class AccuracyResponse(BaseModel):
    cutoff: str
    window_first: str
    window_last: str
    summary: SummaryOut
    adjusted: AdjustedOut
    band_coverage: float
    daily: list[DailyOut]
    by_lead_time: list[LeadBucketOut]
    histogram: list[BinOut]


class HourOut(BaseModel):
    time: str
    forecast: int | None
    actual: int | None
    low: int | None
    high: int | None
    adjusted: int | None
    lead_hours: float | None
    published: str | None


class DayStatsOut(BaseModel):
    hours_with_forecast: int
    mae: int | None
    bias: int | None
    worst: int | None


class BandOut(BaseModel):
    p10: int
    p90: int
    bias: int
    days_of_history: int


class DayResponse(BaseModel):
    date: str
    cutoff: str
    runs_used: list[str]
    hours: list[HourOut]
    stats: DayStatsOut
    band: BandOut | None
