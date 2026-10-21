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
    out = {}
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
    print_warnings(report.warnings)
    if report.errors:
        for e in report.errors:
            print("ERROR:", e)
        return 1
    write("us-ptinc", us["ptinc"])
    write("us-hweal", us["hweal"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
