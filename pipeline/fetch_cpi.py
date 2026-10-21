"""Download CPI-U (all items, US city average, not seasonally adjusted,
series CUUR0000SA0) from the BLS public API into pipeline/raw/bls/.

Usage: python fetch_cpi.py [--force]
"""
from __future__ import annotations

import sys
from datetime import date

from common import RAW, download

SERIES = "CUUR0000SA0"


def main(argv: list[str]) -> None:
    end = date.today().year
    url = (f"https://api.bls.gov/publicAPI/v2/timeseries/data/{SERIES}"
           f"?startyear={end - 9}&endyear={end}&annualaverage=true")
    rec = download(url, RAW / "bls" / f"{SERIES}.json", force="--force" in argv)
    print(f"{SERIES}.json: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…")


if __name__ == "__main__":
    main(sys.argv[1:])
