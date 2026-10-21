"""Read Auten-Splinter group shares (Table C2 of AutenSplinter-IncomeIneq.xlsx).

Each income definition is a block of columns headed e.g.
"2. Pre-tax National Income (232)", with sub-columns P0-50, P50-90,
P90-100, P95-100, P99-100, P99.5-100, P99.9-100, P99.99-100.
Years with spreadsheet errors (e.g. "#DIV/0!" in 2023) are skipped.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import openpyxl

from common import RAW

WORKBOOK = RAW / "as" / "AutenSplinter-IncomeIneq.xlsx"
PRETAX = "2. Pre-tax National Income (232)"


@lru_cache(maxsize=None)
def _rows(path: Path = WORKBOOK) -> list[tuple]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return list(wb["C2-Shares"].iter_rows(values_only=True))


def block_shares(block: str, path: Path = WORKBOOK) -> dict[int, dict[str, float]]:
    """{year: {"P0-50": share, ..., "P99.99-100": share}} for one income definition."""
    rows = _rows(path)
    start = rows[2].index(block)
    labels = rows[4][start:start + 8]
    out = {}
    for r in rows[5:]:
        if not isinstance(r[0], (int, float)):
            continue
        vals = r[start:start + 8]
        if all(isinstance(v, (int, float)) for v in vals):
            out[int(r[0])] = {str(k): float(v) for k, v in zip(labels, vals)}
    return out


def six_groups(s: dict[str, float]) -> dict[str, float]:
    """The plan's six non-overlapping groups from AS's cumulative top shares."""
    return {
        "b50": s["P0-50"],
        "m40": s["P50-90"],
        "u9": s["P90-100"] - s["P99-100"],
        "t09": s["P99-100"] - s["P99.9-100"],
        "t009": s["P99.9-100"] - s["P99.99-100"],
        "t001": s["P99.99-100"],
    }
