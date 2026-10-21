"""Read WID bulk per-country files into 127-bin distributions.

WID bulk files spell variable codes as concept + population letter + age,
e.g. ``sptincj992`` (the WID API and codes dictionary write ``sptinc992j``).
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from bins import CODES
from common import RAW


@dataclass
class YearDist:
    share: np.ndarray  # fraction of the total going to each bin
    avg: np.ndarray    # average per adult in the bin, WID currency units
    thr: np.ndarray    # lower threshold of each bin


@lru_cache(maxsize=None)
def load(country: str, raw: Path = RAW) -> pd.DataFrame:
    path = raw / "wid" / f"WID_data_{country}.csv"
    return pd.read_csv(path, sep=";", keep_default_na=False, na_values=[""],
                       usecols=["variable", "percentile", "year", "value"])


def code(prefix: str, concept: str, pop: str = "j", age: str = "992") -> str:
    return f"{prefix}{concept}{pop}{age}"


def series(df: pd.DataFrame, variable: str, percentile: str = "p0p100") -> pd.Series:
    """One value per year for a single variable and percentile."""
    sub = df[(df.variable == variable) & (df.percentile == percentile)]
    return sub.set_index("year").value.sort_index()


def distribution(df: pd.DataFrame, concept: str, pop: str = "j",
                 age: str = "992") -> dict[int, YearDist]:
    """All years that have every one of the 127 bins for s, a and t."""
    piv = {}
    for prefix in "sat":
        sub = df[(df.variable == code(prefix, concept, pop, age)) & df.percentile.isin(CODES)]
        piv[prefix] = sub.pivot(index="year", columns="percentile", values="value").reindex(columns=CODES)
    years = sorted(set.intersection(*(set(p.dropna().index) for p in piv.values())))
    return {int(y): YearDist(*(piv[k].loc[y].to_numpy(dtype=float) for k in "sat")) for y in years}


def repeated_years(dists: dict[int, YearDist]) -> list[int]:
    """Years whose shares are identical to the previous year's (a carried-forward shape)."""
    out = []
    for y, d in dists.items():
        prev = dists.get(y - 1)
        if prev is not None and np.array_equal(d.share, prev.share):
            out.append(y)
    return out
