"""Validate source data and write public/data/*.json.

Usage: python build.py
Fails (exit 1) on any validation error; prints warnings.
"""
from __future__ import annotations

import json
import sys

import numpy as np

import autensplinter
import psz
import wid
from bins import P0, P1, WIDTH, group_bins
from checks import SHARE_TOLERANCE as SHARE_TOL, Report, check_headline, check_year
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
    out["scale"] = scale
    # Adults 20+ (npopuli992) for each year, for "how many people" figures.
    adults = wid.series(df, "npopuli992")
    out["ptinc"]["adults"] = {str(y): round(float(adults[y])) for y in out["ptinc"]["years"]}
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


# Comparison areas for presets (FAIRSHARE_PLAN.md 3.1, 5). QX = Western Europe.
COMPARISONS = ["SE", "DK", "NO", "FI", "FR", "DE", "GB", "QX"]
# Most recent cainc year must be at least this recent to be offered;
# FR's only cainc years are 1970-1979 (VERIFICATION.md V7).
MIN_POSTTAX_YEAR = 2000


def year_entry(d: wid.YearDist, year: int, currency: str) -> dict:
    return {
        "year": year,
        "currency": currency,
        "avg": [round(float(v)) for v in d.avg],
        "thr": [round(float(v)) for v in d.thr],
        "share": [float(f"{v:.6g}") for v in d.share],
        "mean": round(float(np.dot(WIDTH, d.avg))),
    }


def build_comparisons(report: Report) -> dict:
    """Latest estimated pre-tax and post-tax (cainc) shape for each area.

    Values stay in the area's own constant currency: presets use the shape
    only, scaled to US national income by the engine.
    """
    import pandas as pd

    areas = {}
    for c in COMPARISONS:
        df = wid.load(c)
        meta = pd.read_csv(wid.RAW / "wid" / f"WID_metadata_{c}.csv", sep=";",
                           keep_default_na=False)
        row = meta[meta.variable == "aptincj992"].iloc[0]
        entry: dict = {"name": row.countryname.removeprefix("the "), "ptinc": None, "cainc": None}
        for concept in ("ptinc", "cainc"):
            dists = wid.distribution(df, concept)
            if not dists:
                continue
            y = latest_estimated(dists)
            if concept == "cainc" and y < MIN_POSTTAX_YEAR:
                continue
            d = dists[y]
            report.extend(check_year(f"{c} {concept} {y}", d.share, d.avg, d.thr))
            entry[concept] = year_entry(d, y, row.unit)
        areas[c] = entry
    return {"meta": {"unit": "992j", "source": "wid",
                     "note": "Shapes only; values in each area's constant local currency."},
            "bins": [{"p0": a, "p1": b} for a, b in zip(P0, P1)],
            "areas": areas}


GROUP_ORDER = ["b50", "m40", "u9", "t09", "t009", "t001"]
GROUP_POP = {"b50": 0.5, "m40": 0.4, "u9": 0.09, "t09": 0.009, "t009": 0.0009, "t001": 0.0001}


def group_shares(share: np.ndarray) -> dict[str, float]:
    return {g: float(sum(share[i] for i in group_bins(g))) for g in GROUP_ORDER}


def per_person_order_ok(groups: dict[str, float]) -> bool:
    """Each group earns more per person than the group below it."""
    per = [groups[g] / GROUP_POP[g] for g in GROUP_ORDER]
    return all(a < b for a, b in zip(per, per[1:]))


def gilded_age(top10: float, top1: float, top01: float, top001: float,
               b50_fraction_of_b90: float) -> dict[str, float]:
    """Six group shares from top shares, splitting the bottom 90% by a ratio."""
    b90 = 1 - top10
    return {
        "b50": b90 * b50_fraction_of_b90,
        "m40": b90 * (1 - b50_fraction_of_b90),
        "u9": top10 - top1,
        "t09": top1 - top01,
        "t009": top01 - top001,
        "t001": top001,
    }


def build_gilded_age(report: Report) -> dict:
    """US 1928 preset (FAIRSHARE_PLAN.md 5): observed top shares, bottom 90%
    split with the 1962 b50:m40 ratio, and a range at that ratio +/-25%."""
    df = wid.load("US")
    top = {p: wid.series(df, "sptincj992", p).get(1928)
           for p in ("p90p100", "p99p100", "p99.9p100", "p99.99p100")}
    if any(v is None or np.isnan(v) for v in top.values()):
        report.errors.append(f"Gilded Age: blank 1928 top share {top}")
        return {}
    g1962 = group_shares(wid.distribution(df, "ptinc")[1962].share)
    ratio = g1962["b50"] / g1962["m40"]
    variants = {}
    for name, r in (("central", ratio), ("low", ratio * 0.75), ("high", ratio * 1.25)):
        groups = gilded_age(*top.values(), r / (1 + r))
        if not per_person_order_ok(groups):
            report.errors.append(f"Gilded Age {name}: a lower group earns more per person")
        variants[name] = {g: round(v, 6) for g, v in groups.items()}
    return {
        "id": "gilded-age-1928", "year": 1928, "source": "wid",
        "observed": ["p90p100", "p99p100", "p99.9p100", "p99.99p100"],
        "b50ToM40Ratio1962": round(ratio, 6),
        "groups": variants,
    }


def build_manifest(report: Report) -> dict:
    """Every source with its files' URL, size, SHA-256 and retrieval date."""
    from common import FETCH_LOG
    from sources import SOURCES

    log = json.loads(FETCH_LOG.read_text())
    out = []
    for src in SOURCES:
        files = []
        for name in src["files"]:
            rec = log.get(name)
            if rec is None:
                report.errors.append(f"manifest: {name} not in fetch log; run the fetch script")
                continue
            files.append({k: rec[k] for k in
                          ("file", "url", "bytes", "sha256", "retrieved", "last_modified")})
        out.append({k: v for k, v in src.items() if k != "files"} | {"files": files})
    return {"sources": out}


# Knots for smooth rescaling: the edges of the six groups.
KNOTS = np.array([0.0, 0.5, 0.9, 0.99, 0.999, 0.9999, 1.0])


def smooth_factors(share: np.ndarray, target: dict[str, float]) -> np.ndarray:
    """Per-bin scale factors, piecewise-linear in rank with knots at group edges.

    Chooses the knot values with the least squared change between neighbouring
    knots, subject to every group's rescaled share equalling its target
    exactly. Solved as an equality-constrained least-squares problem (KKT).
    Decision recorded in VERIFICATION.md V12 (Adam, 2026-10-21).
    """
    mid = (np.array(P0) + np.array(P1)) / 2
    n = len(KNOTS)
    # basis[i, k]: weight of knot k in bin i's factor (linear interpolation)
    basis = np.stack([np.interp(mid, KNOTS, np.eye(n)[k]) for k in range(n)], axis=1)
    a = np.array([[share[i] * basis[i] for i in group_bins(g)] for g in GROUP_ORDER],
                 dtype=object)
    A = np.array([np.sum(rows, axis=0) for rows in a], dtype=float)
    t = np.array([target[g] for g in GROUP_ORDER])
    D = np.diff(np.eye(n), axis=0)
    kkt = np.block([[2 * D.T @ D, A.T], [A, np.zeros((len(t), len(t)))]])
    rhs = np.concatenate([np.zeros(n), t])
    knots = np.linalg.solve(kkt, rhs)[:n]
    return basis @ knots


def rescale_to_groups(d: wid.YearDist, target: dict[str, float]) -> wid.YearDist:
    """Scale the distribution smoothly so group shares match target.

    The mean is unchanged (shares are relative), so averages scale by the same
    factors as shares. Thresholds are re-derived from the new averages with
    WID's midpoint rule.
    """
    f = smooth_factors(d.share, target)
    if f.min() <= 0:
        raise ValueError(f"smooth rescaling gave a non-positive factor ({f.min():.3f})")
    avg = d.avg * f
    return wid.YearDist(d.share * f, avg, derive_thresholds(avg))


def build_us_as(report: Report, pretax: dict, latest: int) -> dict:
    """PSZ shape rescaled to Auten-Splinter group shares (plan 3.2).

    Years where the rescaled bins fail validation are listed as disabled,
    not forced. AS years without data are simply absent.
    """
    as_shares = autensplinter.block_shares(autensplinter.PRETAX)
    wid_dists = wid.distribution(wid.load("US"), "ptinc")
    dists, disabled = {}, {}
    for y in range(FIRST_YEAR, latest + 1):
        if y not in as_shares:
            continue
        target = autensplinter.six_groups(as_shares[y])
        total = sum(target.values())
        if abs(total - 1) > SHARE_TOL:
            report.errors.append(f"AS {y}: six groups sum to {total:.4f}")
            continue
        d = rescale_to_groups(wid_dists[y], target)
        r = check_year(f"US ptinc-as {y}", d.share, d.avg, d.thr)
        if r.errors:
            disabled[y] = r.errors[0]
            continue
        report.warnings += r.warnings
        dists[y] = d
    out = to_json(dists, pretax["scale"], {
        "country": "US", "concept": "ptinc", "unit": "AS groups on 992j shape",
        "dollarYear": latest, "source": "autensplinter", "table": "C2-Shares",
        "block": autensplinter.PRETAX,
        "label": "PSZ shape, rescaled to Auten-Splinter group shares",
        "rescaling": "smooth: piecewise-linear factor in rank, knots at group edges",
        "disabledYears": {str(k): v for k, v in disabled.items()},
    })
    return out


DFA_GROUPS = {"Bottom50": "b50", "Next40": "m40", "Next9": "u9",
              "RemainingTop1": "t09", "TopPt1": "top01"}


def build_dfa(report: Report) -> dict:
    """Household net worth shares by wealth group, quarterly (Fed DFA).

    Households, not the 992j unit, and group totals only: used for the
    group-share history chart and never mixed into 127-bin distributions.
    """
    import pandas as pd

    path = wid.RAW / "dfa" / "extracted" / "dfa-networth-shares.csv"
    df = pd.read_csv(path, usecols=["Date", "Category", "Net worth"])
    piv = df.pivot(index="Date", columns="Category", values="Net worth")
    if set(piv.columns) != set(DFA_GROUPS):
        report.errors.append(f"DFA groups changed: {sorted(piv.columns)}")
        return {}
    quarters = sorted(piv.index, key=lambda q: (int(q[:4]), int(q[-1])))
    for q in quarters:
        total = float(piv.loc[q].sum())
        if abs(total - 100) > 0.3:  # published to 0.1 point, five groups
            report.errors.append(f"DFA {q}: shares sum to {total:.1f}")
    return {
        "meta": {"source": "dfa", "unit": "households", "concept": "net worth",
                 "groups": {v: k for k, v in DFA_GROUPS.items()},
                 "note": "Households, group totals only. Not comparable bin-by-bin "
                         "with the 992j wealth distribution."},
        "quarters": quarters,
        "shares": {DFA_GROUPS[c]: [round(float(piv.loc[q, c]) / 100, 4) for q in quarters]
                   for c in DFA_GROUPS},
    }


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
    comparisons = build_comparisons(report)
    us_as = build_us_as(report, {"scale": us["scale"]}, us["latest"])
    presets = {"gildedAge": build_gilded_age(report)}
    dfa = build_dfa(report)
    manifest = build_manifest(report)
    print_warnings(report.warnings)
    if report.errors:
        for e in report.errors:
            print("ERROR:", e)
        return 1
    write("us-ptinc", us["ptinc"])
    write("us-hweal", us["hweal"])
    write("us-cainc", posttax)
    write("us-ptinc-as", us_as)
    write("comparisons", comparisons)
    write("presets", presets)
    write("us-dfa-wealth", dfa)
    write("manifest", manifest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
