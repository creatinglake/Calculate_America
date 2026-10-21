"""Citation and license for each source. build.py adds file hashes and
retrieval dates from raw/fetch_log.json and writes public/data/manifest.json.

License wording must match what VERIFICATION.md records.
"""
from __future__ import annotations

SOURCES = [
    {
        "id": "wid",
        "title": "World Inequality Database (WID.world)",
        "url": "https://wid.world/data/",
        "files": [f"WID_{k}_{c}.csv" for c in
                  ("US", "SE", "DK", "NO", "FI", "FR", "DE", "GB", "QX")
                  for k in ("data", "metadata")],
        "used_for": "US pre-tax income and wealth by percentile (127 bins, 1962-2023), "
                    "adult population, price index, comparison countries, 1928 top shares.",
        "license": "CC BY-NC-SA 4.0, as marked on WID.world charts. Terms for bulk "
                   "downloads not separately stated (VERIFICATION.md V8).",
        "citation": "World Inequality Database (WID.world), per-country bulk files. "
                    "US series: Piketty, Saez and Zucman; wealth: Saez and Zucman (2020); "
                    "European series: Blanchet, Chancel and Gethin.",
    },
    {
        "id": "psz2022",
        "title": "Piketty, Saez and Zucman, Distributional National Accounts for the "
                 "United States, updated series (February 2022)",
        "url": "https://gabriel-zucman.eu/usdina/",
        "files": ["PSZ2022AppendixTablesII(Distrib).xlsx"],
        "used_for": "US post-tax disposable cash income by percentile (Table C4b, "
                    "1962-2019); checks against Tables B1 and C1b.",
        "license": "Not stated on the source page; published by the authors for public use.",
        "citation": "Piketty, T., Saez, E. and Zucman, G. (2018). Distributional National "
                    "Accounts: Methods and Estimates for the United States. Quarterly "
                    "Journal of Economics 133(2): 553-609. Updated series, February 2022.",
    },
    {
        "id": "autensplinter",
        "title": "Auten and Splinter, Income Inequality in the United States: Using Tax "
                 "Data to Measure Long-term Trends (extension through 2022)",
        "url": "https://davidsplinter.com/",
        "files": ["AutenSplinter-IncomeIneq.xlsx"],
        "used_for": "Alternative pre-tax group shares, 1962-2022 (Table C2, Pre-tax "
                    "National Income), applied to the PSZ shape.",
        "license": "Not stated on the source page; published by the authors for public use.",
        "citation": "Auten, G. and Splinter, D. (2024). Income Inequality in the United "
                    "States: Using Tax Data to Measure Long-term Trends. Journal of "
                    "Political Economy 132(7). Data extended through 2022.",
    },
]
