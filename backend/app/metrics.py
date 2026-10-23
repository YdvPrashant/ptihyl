import math
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

from app.config import HISTOGRAM_BIN_MW


def percentile(sorted_values: Sequence[float], q: float) -> float:
    """Nearest-rank percentile of an already sorted list: values[min(n-1, int(q*n))]."""
    return sorted_values[min(len(sorted_values) - 1, int(q * len(sorted_values)))]


@dataclass(frozen=True)
class Summary:
    hours: int
    mean_actual: float
    mae: float
    mae_pct: float
    bias: float
    rmse: float
    share_over: float
    p10: float
    p90: float
    worst: float


def summarize(errors: Sequence[int], actuals: Sequence[int]) -> Summary:
    """Accuracy of a set of forecasts, given their errors (forecast - actual, MW) and the matching actuals."""
    if not errors:
        raise ValueError("no forecast errors to summarise")
    n = len(errors)
    ordered = sorted(errors)
    mean_actual = sum(actuals) / n
    mae = sum(abs(e) for e in errors) / n
    return Summary(
        hours=n,
        mean_actual=mean_actual,
        mae=mae,
        mae_pct=mae / mean_actual,
        bias=sum(errors) / n,
        rmse=math.sqrt(sum(e * e for e in errors) / n),
        share_over=sum(e > 0 for e in errors) / n,
        p10=percentile(ordered, 0.1),
        p90=percentile(ordered, 0.9),
        worst=max(abs(e) for e in errors),
    )


@dataclass(frozen=True)
class Bin:
    lo: int
    hi: int
    count: int


def histogram(errors: Sequence[int], width: int = HISTOGRAM_BIN_MW) -> list[Bin]:
    """Half-open [lo, hi) bins of `width` MW, contiguous from the lowest to the highest occupied bin."""
    counts = Counter((e // width) * width for e in errors)
    if not counts:
        return []
    return [Bin(lo, lo + width, counts.get(lo, 0)) for lo in range(min(counts), max(counts) + width, width)]
