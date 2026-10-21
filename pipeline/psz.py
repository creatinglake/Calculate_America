"""Read tables from the PSZ updated US series workbook (Appendix Tables II).

Share tables (e.g. TB1, TC1b): one row per year, columns are groups such as
"Top 1%". G-percentile tables (e.g. TB4, TC4b): one row per g-percentile
(lower edge 0, 1, ..., 99.999), one column per year, in $2018.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np
import openpyxl

from bins import P0
from common import RAW

WORKBOOK = RAW / "psz" / "PSZ2022AppendixTablesII(Distrib).xlsx"


@lru_cache(maxsize=None)
def _rows(sheet: str, path: Path = WORKBOOK) -> list[tuple]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    return list(wb[sheet].iter_rows(values_only=True))


def share_table(sheet: str, path: Path = WORKBOOK) -> dict[int, dict[str, float]]:
    """{year: {"Top 1%": 0.19, ...}} for a group-share table."""
    rows = _rows(sheet, path)
    header_i = next(i for i, r in enumerate(rows) if r[1] in ("Bottom 90%", "Bottom 50%"))
    header = rows[header_i]
    out: dict[int, dict[str, float]] = {}
    for r in rows[header_i + 1:]:
        if isinstance(r[0], (int, float)) and 1900 <= r[0] <= 2100:
            vals = {str(h): float(v) for h, v in zip(header[1:], r[1:])
                    if h and isinstance(v, (int, float))}
            if vals:
                out[int(r[0])] = vals
    return out


def gperc_table(sheet: str, path: Path = WORKBOOK) -> dict[int, np.ndarray]:
    """{year: 127 averages} for a g-percentile table; years with gaps dropped."""
    rows = _rows(sheet, path)
    header_i = next(i for i, r in enumerate(rows)
                    if sum(isinstance(x, int) and 1900 <= x <= 2100 for x in r) > 10)
    header = rows[header_i]
    body = [r for r in rows[header_i + 1:] if isinstance(r[0], (int, float))][:127]
    edges = [round(float(r[0]) / 100, 6) for r in body]
    if edges != P0:
        raise ValueError(f"{sheet}: g-percentile rows don't match the 127 WID bins")
    out = {}
    for j, y in enumerate(header):
        if isinstance(y, int) and 1900 <= y <= 2100:
            col = [r[j] for r in body]
            if all(isinstance(v, (int, float)) for v in col):
                out[y] = np.array(col, dtype=float)
    return out
