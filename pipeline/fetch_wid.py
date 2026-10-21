"""Download WID per-country data and metadata files into pipeline/raw/wid/.

Usage: python fetch_wid.py [--force] [COUNTRY ...]
Countries default to the US plus the comparison set in FAIRSHARE_PLAN.md 3.1.
"""
from __future__ import annotations

import sys

from common import RAW, download

BASE = "https://wid.world/bulk_download"

# US first, then comparison areas for presets. QX is WID's Western Europe
# aggregate; it has a bulk file but is missing from WID_countries.csv
# (see VERIFICATION.md).
COUNTRIES = ["US", "SE", "DK", "NO", "FI", "FR", "DE", "GB", "QX"]


def fetch(country: str, force: bool) -> None:
    for kind in ("data", "metadata"):
        name = f"WID_{kind}_{country}.csv"
        rec = download(f"{BASE}/{name}", RAW / "wid" / name, force=force)
        print(f"{name}: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
              f"last modified {rec['last_modified']}")


def main(argv: list[str]) -> None:
    force = "--force" in argv
    countries = [a for a in argv if not a.startswith("--")] or COUNTRIES
    for c in countries:
        fetch(c, force)


if __name__ == "__main__":
    main(sys.argv[1:])
