"""Read the Tax Foundation historical federal income tax brackets CSV
("Historical Income Tax Rates and Brackets, 1862-2025.csv", supplied by
Adam from https://taxfoundation.org/data/all/federal/historical-income-tax-rates-brackets/).

Rows: year, then (rate, ">", threshold) for married filing jointly, married
filing separately, single and head of household, then notes. A blank row
separates years.
"""
from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

from common import RAW

PATH = RAW / "inputs" / "Historical Income Tax Rates and Brackets, 1862-2025.csv"
STATUSES = {"mfj": 1, "mfs": 4, "single": 7, "hoh": 10}


def _num(s: str) -> float | None:
    s = s.strip().replace("$", "").replace(",", "").replace("%", "")
    try:
        return float(s)
    except ValueError:  # blanks and text such as "No income tax"
        return None


@lru_cache(maxsize=None)
def schedules(path: Path = PATH) -> dict[int, dict[str, list[tuple[float, float]]]]:
    """{year: {status: [(rate as fraction, lower threshold $), ...]}}"""
    out: dict[int, dict[str, list[tuple[float, float]]]] = {}
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    for r in rows[1:]:
        if not r or not r[0].strip().isdigit():
            continue
        year = int(r[0])
        for status, col in STATUSES.items():
            rate, thr = _num(r[col]), _num(r[col + 2]) if len(r) > col + 2 else None
            if rate is None or thr is None:
                continue
            out.setdefault(year, {}).setdefault(status, []).append((rate / 100, thr))
    return out


def notes(path: Path = PATH) -> dict[int, str]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        return {int(r[0]): r[13] for r in csv.reader(f)
                if r and r[0].strip().isdigit() and len(r) > 13 and r[13].strip()}
