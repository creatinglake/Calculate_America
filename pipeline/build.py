"""Validate source data and write public/data/*.json.

Usage: python build.py
Fails (exit 1) on any validation error; prints warnings.
"""
from __future__ import annotations

import json
import sys

import numpy as np

import psz
import wid
from bins import P0, P1, WIDTH, group_bins
from checks import Report, check_headline, check_year
from common import OUT

FIRST_YEAR = 1962  # full bottom-to-top distribution starts here (PSZ 2018 QJE)


def top_share(share: np.ndarray, p: float) -> float:
    return float(sum(share[i] for i in range(127) if P0[i] >= p - 1e-9))


def to_json(dists: dict[int, wid.YearDist], scale: float, meta: dict) -> dict:
    """Plan format: {years, bins, byYear: {y: {avg, thr, share}}, meanPerAdult}."""
    by_year, mean = {}, {}
    for y, d in dists.items():
        avg, thr = d.avg * scale, d.thr * scale
        by_year[str(y)] = {
            "avg": [round(float(v)) for v in avg],
            "thr": [round(float(v)) for v in thr],
            "share": [float(f"{v:.6g}") for v in d.share],
        }
        mean[str(y)] = round(float(np.dot(WIDTH, avg)))
    return {
        "meta": meta,
        "years": [int(y) for y in dists],
        "bins": [{"p0": a, "p1": b} for a, b in zip(P0, P1)],
        "byYear": by_year,
        "meanPerAdult": mean,
    }


def latest_estimated(dists: dict[int, wid.YearDist]) -> int:
    """Last year whose shape isn't a copy of the year before."""
    repeated = set(wid.repeated_years(dists))
    return max(y for y in dists if y not in repeated)


def build_us_wid(report: Report) -> dict[str, dict]:
    df = wid.load("US")
    index = wid.series(df, "inyixxi999")
    out: dict = {"index": index}
    dists = {c: wid.distribution(df, c) for c in ("ptinc", "hweal")}
    latest = latest_estimated(dists["ptinc"])
    # WID values are in constant dollars of the price index base year;
    # rebase to dollars of the latest estimated year.
    scale = float(index[latest] / index[index.index.max()])
    for concept, d in dists.items():
        if latest_estimated(d) != latest:
            report.errors.append(f"US {concept}: latest year {latest_estimated(d)} != {latest}")
        years = {y: v for y, v in d.items() if FIRST_YEAR <= y <= latest}
        for y, v in years.items():
            report.extend(check_year(f"US {concept} {y}", v.share, v.avg, v.thr))
        out[concept] = to_json(years, scale, {
            "country": "US", "concept": concept, "unit": "992j",
            "dollarYear": latest, "source": "wid",
        })
    out["latest"] = latest
    # Headline check against the authors' own published series (PSZ Table B1).
    b1 = psz.share_table("TB1")
    pt = dists["ptinc"]
    for y in (1962, 1963, 1980, 2000, 2019):
        report.extend(check_headline(f"US ptinc {y} top 1% vs PSZ TB1",
                                     top_share(pt[y].share, 0.99), b1[y]["Top 1%"]))
        report.extend(check_headline(f"US ptinc {y} bottom 50% vs PSZ TB1",
                                     float(sum(pt[y].share[i] for i in group_bins("b50"))),
                                     b1[y]["Bottom 50%"]))
    return out


def derive_thresholds(avg: np.ndarray) -> np.ndarray:
    """Lower thresholds from bin averages alone, following WID's convention.

    WID's US income thresholds equal the midpoint of adjacent bin averages
    (within 0.04% for ptinc and diinc, 1962-2023; see VERIFICATION.md V9).
    The bottom bin starts at 0, or at twice its average when that is negative.
    """
    thr = np.empty_like(avg)
    thr[1:] = (avg[:-1] + avg[1:]) / 2
    thr[0] = min(0.0, 2 * avg[0])
    return thr


def build_us_posttax(report: Report, index, dollar_year: int) -> dict:
    """US post-tax disposable cash income from PSZ Table C4b ($2018).

    Years with any blank bin (1985) are dropped, not interpolated.
    """
    table = psz.gperc_table("TC4b")
    c1b = psz.share_table("TC1b")
    scale = float(index[dollar_year] / index[2018])
    w = np.array(WIDTH)
    dists = {}
    for y, avg in table.items():
        if y < FIRST_YEAR:
            continue
        share = w * avg / np.dot(w, avg)
        d = wid.YearDist(share, avg, derive_thresholds(avg))
        report.extend(check_year(f"US cainc {y}", d.share, d.avg, d.thr))
        dists[y] = d
    # The bins must reproduce PSZ's own group shares (Table C1b).
    for y in (1962, 1963, 1980, 2000, 2019):
        report.extend(check_headline(f"US cainc {y} top 1% vs PSZ TC1b",
                                     top_share(dists[y].share, 0.99), c1b[y]["Top 1%"]))
        report.extend(check_headline(f"US cainc {y} bottom 50% vs PSZ TC1b",
                                     float(sum(dists[y].share[i] for i in group_bins("b50"))),
                                     c1b[y]["Bottom 50%"]))
    missing = sorted(set(range(FIRST_YEAR, max(dists) + 1)) - set(dists))
    return to_json(dists, scale, {
        "country": "US", "concept": "cainc", "unit": "992j", "dollarYear": dollar_year,
        "source": "psz2022", "table": "TC4b", "missingYears": missing,
        "thresholds": "derived",
    })


def write(name: str, data: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"wrote {path.relative_to(OUT.parent.parent)} ({path.stat().st_size / 1024:.0f} KB)")


def print_warnings(warnings: list[str]) -> None:
    """One line per kind of warning (dataset + message type), with a count."""
    groups: dict[str, list[str]] = {}
    for w in warnings:
        dataset = " ".join(w.split(" ")[:2])
        kind = "negative average" if "negative" in w else w.split(": ", 1)[1]
        groups.setdefault(f"{dataset}: {kind}", []).append(w)
    for key, items in groups.items():
        print(f"warning: {key} ({len(items)}), e.g. {items[0]}")


def main() -> int:
    report = Report()
    us = build_us_wid(report)
    posttax = build_us_posttax(report, us["index"], us["latest"])
    print_warnings(report.warnings)
    if report.errors:
        for e in report.errors:
            print("ERROR:", e)
        return 1
    write("us-ptinc", us["ptinc"])
    write("us-hweal", us["hweal"])
    write("us-cainc", posttax)
    return 0


if __name__ == "__main__":
    sys.exit(main())
