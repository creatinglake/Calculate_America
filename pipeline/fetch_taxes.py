"""Download IRS Statistics of Income tables used for the taxable-base ratio.

Source page: https://www.irs.gov/statistics/soi-tax-stats-individual-time-series-statistical-tables
Usage: python fetch_taxes.py [--force]
"""
from __future__ import annotations

import sys

from common import RAW, download

BASE = "https://www.irs.gov/pub/irs-soi/"
FILES = [
    "05in01an.xls",    # Table 1, all returns: sources of income and tax items, 1913-2005
    "23in41ts.xlsx",   # Table 4.1, returns, shares of AGI, AGI floors, recent years
    "histab1.xls",     # SOI Bulletin Historical Table 1, selected income and tax items
]


def main(argv: list[str]) -> None:
    for name in FILES:
        rec = download(BASE + name, RAW / "irs" / name, force="--force" in argv)
        print(f"{name}: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
              f"last modified {rec['last_modified']}")


if __name__ == "__main__":
    main(sys.argv[1:])
