"""Download BEA NIPA bulk flat files (annual data and registers).

Source: https://apps.bea.gov/national/Release/TXT/
Usage: python fetch_bea.py [--force]
"""
from __future__ import annotations

import sys

from common import RAW, download

BASE = "https://apps.bea.gov/national/Release/TXT/"
FILES = ["NipaDataA.txt", "SeriesRegister.txt", "TablesRegister.txt"]


def main(argv: list[str]) -> None:
    for name in FILES:
        rec = download(BASE + name, RAW / "bea" / name, force="--force" in argv)
        print(f"{name}: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
              f"last modified {rec['last_modified']}")


if __name__ == "__main__":
    main(sys.argv[1:])
