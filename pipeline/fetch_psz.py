"""Download the Piketty-Saez-Zucman updated US series (February 2022 vintage).

Source page: https://gabriel-zucman.eu/usdina/
Usage: python fetch_psz.py [--force]
"""
from __future__ import annotations

import sys
from urllib.parse import quote

from common import RAW, download

BASE = "https://gabriel-zucman.eu/files/"
FILES = ["PSZ2022AppendixTablesII(Distrib).xlsx"]


def main(argv: list[str]) -> None:
    for name in FILES:
        rec = download(BASE + quote(name), RAW / "psz" / name, force="--force" in argv)
        print(f"{name}: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
              f"last modified {rec['last_modified']}")


if __name__ == "__main__":
    main(sys.argv[1:])
