"""Reproduce Adam's CPS spreadsheet (Simple 1963 2024 Calculator 12-03-2025.xlsx).

The spreadsheet holds IPUMS CPS ASEC records (ASECWT, INCTOT) for survey
years 1963 and 2024, i.e. income years 1962 and 2023. It is never committed
(IPUMS microdata); it lives in pipeline/raw/inputs/.

Method, read from the workbook's formulas:
- each sheet sorted by income; percentile = cumulative weight / total weight
- INCTOT codes 999999999 / 999999998 count as 0
- ratio = (total income / total weight) 2024 over the same for 1963
- your percentile = percentile of the last 2024 record with income <= yours
- result = 1963 income x ratio, at the 1963 record whose percentile is
  closest to yours (first one on ties)
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from common import RAW

WORKBOOK = RAW / "inputs" / "Simple 1963 2024 Calculator 12-03-2025.xlsx"
CODES = (999999999, 999999998)


@dataclass
class Sheet:
    weight: np.ndarray
    income: np.ndarray       # ascending
    percentile: np.ndarray   # cumulative weight share, inclusive

    @property
    def mean(self) -> float:
        return float(np.dot(self.weight, self.income) / self.weight.sum())


def load(sheet: str, path: Path = WORKBOOK) -> Sheet:
    d = pd.read_excel(path, sheet_name=sheet, header=1, usecols=[0, 1])
    d.columns = ["w", "inc"]
    d["inc"] = d.inc.where(~d.inc.isin(CODES), 0)
    d = d.sort_values("inc", kind="stable")
    w = d.w.to_numpy(float)
    return Sheet(w, d.inc.to_numpy(float), np.cumsum(w) / w.sum())


def percentile_of(s: Sheet, income: float) -> float:
    """MATCH(income, incomes, 1): last record with income <= the input."""
    i = np.searchsorted(s.income, income, side="right") - 1
    return float(s.percentile[max(i, 0)])


def counterfactual(today: Sheet, then: Sheet, income: float) -> tuple[float, float, float]:
    """(percentile, ratio of means, income at that percentile under `then`'s shape)."""
    p = percentile_of(today, income)
    ratio = today.mean / then.mean
    j = int(np.argmin(np.abs(then.percentile - p)))
    return p, ratio, float(then.income[j] * ratio)


def top_share(s: Sheet, top: float) -> float:
    """Share of total income going to the top `top` fraction (e.g. 0.01)."""
    total = np.dot(s.weight, s.income)
    above = s.percentile > 1 - top
    # include the fraction of the boundary record that falls in the top group
    i = int(np.argmax(above))
    prev = s.percentile[i - 1] if i > 0 else 0.0
    frac = (s.percentile[i] - (1 - top)) / (s.percentile[i] - prev)
    inc = np.dot(s.weight[i + 1:], s.income[i + 1:]) + frac * s.weight[i] * s.income[i]
    return float(inc / total)
