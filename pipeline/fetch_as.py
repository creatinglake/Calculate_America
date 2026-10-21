"""Download Auten-Splinter public Excel files into pipeline/raw/as/.

Source page: https://davidsplinter.com/ (Income Inequality section).
Usage: python fetch_as.py [--force]
"""
from __future__ import annotations

import sys

from common import RAW, download

BASE = "https://davidsplinter.com/"
# Site labels (2026-10-20): "Extension through 2022"; "Original through 2019";
# Excel file for "Income Inequality in the United States: Extensions and Updates".
FILES = ["AutenSplinter-IncomeIneq.xlsx", "AutenSplinter-IncomeIneq-2024.xlsx",
         "AS-Update-2025.xlsx"]


def main(argv: list[str]) -> None:
    for name in FILES:
        rec = download(BASE + name, RAW / "as" / name, force="--force" in argv)
        print(f"{name}: {rec['bytes']:,} bytes, sha256 {rec['sha256'][:12]}…, "
              f"last modified {rec['last_modified']}")


if __name__ == "__main__":
    main(sys.argv[1:])
