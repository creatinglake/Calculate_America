"""Download the Federal Reserve Distributional Financial Accounts (DFA) zip.

Source page: https://www.federalreserve.gov/releases/z1/dataviz/dfa/
Usage: python fetch_dfa.py [--force]
"""
from __future__ import annotations

import sys
import zipfile

from common import RAW, download

URL = "https://www.federalreserve.gov/releases/z1/dataviz/download/zips/dfa.zip"


def main(argv: list[str]) -> None:
    dest = RAW / "dfa" / "dfa.zip"
    rec = download(URL, dest, force="--force" in argv)
    print(f"dfa.zip: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
          f"last modified {rec['last_modified']}")
    with zipfile.ZipFile(dest) as z:
        z.extractall(dest.parent / "extracted")
        for name in z.namelist():
            print("  ", name)


if __name__ == "__main__":
    main(sys.argv[1:])
