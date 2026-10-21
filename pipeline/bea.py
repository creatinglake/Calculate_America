"""Read annual series from the BEA NIPA bulk flat file (NipaDataA.txt)."""
from __future__ import annotations

from functools import lru_cache

import pandas as pd

from common import RAW

# NIPA Table 1.12, National Income by Type of Income (current dollars, millions)
NATIONAL_INCOME = "A032RC"   # line 1
COMPENSATION = "A033RC"      # line 2, compensation of employees
WAGES = "A034RC"             # line 3, wages and salaries


@lru_cache(maxsize=None)
def annual() -> pd.DataFrame:
    d = pd.read_csv(RAW / "bea" / "NipaDataA.txt")
    d.columns = ["code", "year", "value"]
    d["value"] = d.value.astype(str).str.replace(",", "").astype(float)
    return d


def series(code: str) -> pd.Series:
    d = annual()
    return d[d.code == code].set_index("year").value.sort_index()
