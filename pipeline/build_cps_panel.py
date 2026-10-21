"""Write public/data/cps-panel.json: aggregate figures for the methods-page
panel "Why we don't use survey data for the top".

Needs Adam's CPS spreadsheet in pipeline/raw/inputs/ (never committed, IPUMS
microdata). Only aggregates are written. Run separately from build.py, which
must work without the spreadsheet.
Usage: python build_cps_panel.py
"""
from __future__ import annotations

import json

import build
import cps
import wid
from common import OUT


def main() -> None:
    w = wid.distribution(wid.load("US"), "ptinc")
    rows = []
    for sheet, income_year in (("1963", 1962), ("2024", 2023)):
        s = cps.load(sheet)
        rows.append({
            "surveyYear": int(sheet),
            "incomeYear": income_year,
            "records": int(len(s.income)),
            "weightedPersonsWithIncome": round(float(s.weight.sum())),
            "maxIncome": round(float(s.income.max())),
            "cpsTop1Share": round(cps.top_share(s, 0.01), 4),
            "cpsTop01Share": round(cps.top_share(s, 0.001), 4),
            "widTop1Share": round(build.top_share(w[income_year].share, 0.99), 4),
            "widTop01Share": round(build.top_share(w[income_year].share, 0.999), 4),
        })
    t, n = cps.load("2024"), cps.load("1963")
    p, ratio, out = cps.counterfactual(t, n, 100_000)
    data = {
        "meta": {"source": "ipums-cps", "unit": "persons with positive INCTOT, as included in the spreadsheet",
                 "note": "CPS ASEC asks about the previous calendar year. WID figures are "
                         "pre-tax national income, equal-split adults 20+."},
        "years": rows,
        "spreadsheetExample": {"income": 100_000, "percentile": round(p, 6),
                               "meanRatio": round(ratio, 6), "result": round(out, 2)},
    }
    path = OUT / "cps-panel.json"
    path.write_text(json.dumps(data, indent=1) + "\n")
    print(json.dumps(data, indent=1))


if __name__ == "__main__":
    main()
