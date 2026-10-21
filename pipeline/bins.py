"""The 127 generalized percentiles used by WID and by every distribution file.

p0p1 ... p98p99 (99 bins), p99p99.1 ... p99.8p99.9 (9),
p99.9p99.91 ... p99.98p99.99 (9), p99.99p99.991 ... p99.999p100 (10).
"""
from __future__ import annotations

from decimal import Decimal


def _edges() -> list[Decimal]:
    e = [Decimal(i) for i in range(100)]
    for step, start in ((Decimal("0.1"), Decimal(99)), (Decimal("0.01"), Decimal("99.9")),
                        (Decimal("0.001"), Decimal("99.99"))):
        e += [start + step * i for i in range(1, 10)]
    return e + [Decimal(100)]


def _fmt(x: Decimal) -> str:
    s = format(x.normalize(), "f")
    return s


EDGES = _edges()
CODES = [f"p{_fmt(a)}p{_fmt(b)}" for a, b in zip(EDGES[:-1], EDGES[1:])]
# Bin edges as population fractions in [0, 1], rounded to avoid float noise.
P0 = [round(float(a) / 100, 6) for a in EDGES[:-1]]
P1 = [round(float(b) / 100, 6) for b in EDGES[1:]]
WIDTH = [round(b - a, 6) for a, b in zip(P0, P1)]

assert len(CODES) == 127

# The six non-overlapping groups (FAIRSHARE_PLAN.md section 2), as [p0, p1).
GROUPS = {
    "b50": (0.0, 0.5),
    "m40": (0.5, 0.9),
    "u9": (0.9, 0.99),
    "t09": (0.99, 0.999),
    "t009": (0.999, 0.9999),
    "t001": (0.9999, 1.0),
}


def group_bins(key: str) -> list[int]:
    """Indices of the bins that make up a group."""
    lo, hi = GROUPS[key]
    return [i for i in range(127) if P0[i] >= lo - 1e-9 and P1[i] <= hi + 1e-9]
