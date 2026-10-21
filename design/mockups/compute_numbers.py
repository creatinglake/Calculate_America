#!/usr/bin/env python3
"""Compute every number used in the Fair Share Phase 3 design mockups.

Reads public/data/us-ptinc.json (127 bins, 2023 dollars, adults 20+, equal split)
and prints each figure. The mockup builder (build_mockups.py) imports `compute()`
so the HTML shows exactly these values. Run:  python3 design/mockups/compute_numbers.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "public" / "data" / "us-ptinc.json"

YEAR, BASE = "2023", "1963"
USER_INCOME = 60_000
GROUPS = [  # key, label, p0, p1
    ("b50", "Bottom 50%", 0.0, 0.5),
    ("m40", "Middle 40%", 0.5, 0.9),
    ("u9", "Upper 9%", 0.9, 0.99),
    ("t09", "P99–99.9", 0.99, 0.999),
    ("t009", "P99.9–99.99", 0.999, 0.9999),
    ("t001", "Top 0.01%", 0.9999, 1.0),
]
EPS = 1e-9


def r100(x):
    return int(round(x / 100.0) * 100)


def money(x):
    return f"${x:,.0f}"


def show(x):
    """Display rounding: nearest $100 below $1 million, else $X.X million."""
    if abs(x) >= 1_000_000:
        return f"${x / 1_000_000:.1f} million"
    return money(r100(x))


def quantile(bins, thr, p):
    """Income at percentile p: linear between the bin's lower and next thresholds."""
    for i, b in enumerate(bins):
        if b["p0"] - EPS <= p < b["p1"] - EPS:
            if i + 1 >= len(thr):
                raise ValueError("p falls in the open top bin")
            f = (p - b["p0"]) / (b["p1"] - b["p0"])
            return thr[i] + f * (thr[i + 1] - thr[i])
    raise ValueError(p)


def rank(bins, thr, y):
    """Percentile of income y: locate the bin whose thresholds contain y, interpolate."""
    for i in range(len(thr) - 1):
        if thr[i] <= y < thr[i + 1]:
            b = bins[i]
            f = (y - thr[i]) / (thr[i + 1] - thr[i])
            return b["p0"] + f * (b["p1"] - b["p0"]), i
    raise ValueError(y)


def group_shares(bins, share):
    out = {}
    for key, _, g0, g1 in GROUPS:
        out[key] = sum(s for b, s in zip(bins, share) if b["p0"] >= g0 - EPS and b["p1"] <= g1 + EPS)
    return out


def xpos(p):
    """Stretched percentile axis, 0..1: four equal bands; log stretch in the last."""
    if p <= 0.9:
        return p / 0.9 * 0.25
    if p <= 0.99:
        return 0.25 + (p - 0.9) / 0.09 * 0.25
    if p <= 0.999:
        return 0.5 + (p - 0.99) / 0.009 * 0.25
    u = -math.log10(1 - p)  # 3 at P99.9, 5 at P99.999 (finest threshold in the data)
    return 0.75 + (u - 3) / 2 * 0.25


def compute():
    d = json.loads(DATA.read_text())
    bins = d["bins"]
    now, base = d["byYear"][YEAR], d["byYear"][BASE]
    m_now, m_base = d["meanPerAdult"][YEAR], d["meanPerAdult"][BASE]
    scale = m_now / m_base

    # --- headline card ---
    p_user, ibin = rank(bins, now["thr"], USER_INCOME)
    q_base = quantile(bins, base["thr"], p_user)
    cf = m_now * q_base / m_base
    cf_r = r100(cf)
    diff_r = cf_r - USER_INCOME

    # --- groups ---
    gs_now = group_shares(bins, now["share"])
    gs_base = group_shares(bins, base["share"])
    pop = {k: (g1 - g0) for k, _, g0, g1 in GROUPS}
    top1 = {"now": gs_now["t09"] + gs_now["t009"] + gs_now["t001"],
            "base": gs_base["t09"] + gs_base["t009"] + gs_base["t001"]}

    # --- percentile table and chart geometry ---
    table_ps = [0.10, 0.25, 0.50, 0.75, 0.90, 0.99, 0.999, 0.9999]
    table = [(p, quantile(bins, now["thr"], p), quantile(bins, base["thr"], p) * scale) for p in table_ps]

    lo = 1_000
    pts_now, pts_base = [], []
    for i, b in enumerate(bins):
        p = b["p0"]
        if p == 0:
            continue
        pts_now.append((p, now["thr"][i]))
        pts_base.append((p, base["thr"][i] * scale))
    hi_val = max(v for _, v in pts_now + pts_base)
    hi = hi_val * 1.25  # a little headroom above the highest plotted threshold
    ticks = [10 ** k for k in range(3, 10) if 10 ** k <= hi]
    return dict(
        meta=d["meta"], bins=bins, n_bins=len(bins),
        m_now=m_now, m_base=m_base, scale=scale,
        share_sum_now=sum(now["share"]), share_sum_base=sum(base["share"]),
        mean_check_now=sum(a * (b["p1"] - b["p0"]) for a, b in zip(now["avg"], bins)),
        user=USER_INCOME, p_user=p_user, ibin=ibin,
        bin_lo=now["thr"][ibin], bin_hi=now["thr"][ibin + 1],
        q_base=q_base, cf=cf, cf_r=cf_r, diff_r=diff_r,
        median_now=quantile(bins, now["thr"], 0.5),
        gs_now=gs_now, gs_base=gs_base, pop=pop, top1=top1,
        table=table, pts_now=pts_now, pts_base=pts_base, lo=lo, hi=hi, hi_val=hi_val, ticks=ticks,
    )


def pct(x, nd=1):
    return f"{x * 100:.{nd}f}%"


def main():
    c = compute()
    P = print
    P("# Fair Share mockups: computed numbers")
    P()
    P(f"Source: public/data/us-ptinc.json  meta={c['meta']}  bins={c['n_bins']}")
    P(f"All dollars are {c['meta']['dollarYear']} dollars, pre-tax national income per adult (20+), income split equally between spouses.")
    P()
    P("## Averages")
    P(f"- Mean income per adult {YEAR} (meanPerAdult): {money(c['m_now'])}  -> shown as {money(r100(c['m_now']))}")
    P(f"- Mean income per adult {BASE} (meanPerAdult): {money(c['m_base'])}  -> shown as {money(r100(c['m_base']))}")
    P(f"- Check: sum(avg x bin width) {YEAR} = {money(c['mean_check_now'])}")
    P(f"- Scale factor mean{YEAR}/mean{BASE} = {c['scale']:.4f}")
    P(f"- Median (P50 threshold) {YEAR}: {money(c['median_now'])}  -> shown as {money(r100(c['median_now']))}")
    P(f"- Sum of shares: {YEAR} {c['share_sum_now']:.4f}, {BASE} {c['share_sum_base']:.4f} (bin shares are rounded to 4 dp in the data file)")
    P()
    P("## Headline card (illustrative, approximate)")
    P(f"- User income: {money(c['user'])}")
    P(f"- Bin containing it: index {c['ibin']} P{c['bins'][c['ibin']]['p0']*100:g}-P{c['bins'][c['ibin']]['p1']*100:g}, thresholds {money(c['bin_lo'])} to {money(c['bin_hi'])}")
    P(f"- Percentile p = {c['p_user']:.5f}  -> shown as 'higher than about {int(c['p_user']*100)}% of adults'")
    P(f"- q{BASE}(p) = {money(c['q_base'])} ({BASE} shape, in 2023 dollars, {BASE}-size economy)")
    P(f"- Counterfactual = {money(c['m_now'])} x {money(c['q_base'])} / {money(c['m_base'])} = {money(c['cf'])}  -> shown as {money(c['cf_r'])}")
    P(f"- Annual difference (shown) = {money(c['cf_r'])} - {money(c['user'])} = +{money(c['diff_r'])}")
    P()
    P("## Group shares of pre-tax income (sum of bin shares)")
    P("| Group | Share of adults | Share of income 2023 | Share of income 1963 |")
    P("|---|---|---|---|")
    for key, label, _, _ in GROUPS:
        P(f"| {key} {label} | {c['pop'][key]*100:g}% | {pct(c['gs_now'][key])} ({c['gs_now'][key]:.4f}) | {pct(c['gs_base'][key])} ({c['gs_base'][key]:.4f}) |")
    P(f"| Top 1% (t09+t009+t001) | 1% | {pct(c['top1']['now'])} | {pct(c['top1']['base'])} |")
    P()
    P("Top 1% inset (people): P99-99.9 = 90% of the top 1%, P99.9-99.99 = 9%, top 0.01% = 1% (population definitions).")
    P()
    P("## Income at selected percentiles (chart 3 table)")
    P(f"| Percentile | {YEAR} | {BASE} shape at {YEAR} size (q{BASE} x {c['scale']:.4f}) |")
    P("|---|---|---|")
    for p, a, b in c["table"]:
        P(f"| P{p*100:g} | {money(a)} -> {show(a)} | {money(b)} -> {show(b)} |")
    P()
    P("## Chart 3 geometry")
    P(f"- Points: each bin's lower threshold at its p0 (p0 > 0), {len(c['pts_now'])} per line; {BASE} line multiplied by the scale factor.")
    P(f"- Y axis: log scale from {money(c['lo'])} to {money(c['hi'])} (max plotted value {money(c['hi_val'])}, the P99.999 threshold, x 1.25 headroom); ticks at {', '.join(show(t) if t >= 1e6 else money(t) for t in c['ticks'])}; points below {money(c['lo'])} are clipped to the axis floor.")
    P("- X axis: four equal bands P0-90, P90-99, P99-99.9 (linear inside) and P99.9-P99.999 (log10 stretch inside).")
    P(f"- Y tick labels shown as $1k, $10k, $100k, $1M, $10M, $100M (axis gridlines, not statistics).")
    P(f"- 'You' marker at p={c['p_user']:.5f}, x={xpos(c['p_user']):.4f}; {money(c['user'])} on the {YEAR} line and {money(c['cf'])} on the {BASE} line.")
    P()
    P("## Definitions used as labels (not statistics)")
    P("- Group population shares (50%, 40%, 9%, 0.9%, 0.09%, 0.01%), 'Top 1%', 'Top 0.1%', band names P0-90, P90-99, P99-99.9, P99.9-100,")
    P("  inset proportions 90% / 9% / 1% of the top 1%, the sample income $60,000, and the years 1963 and 2023 are definitions or inputs from FAIRSHARE_PLAN.md.")
    P("- Every other figure on the mockup pages is printed above. build_mockups.py imports compute() from this script, so the pages and this file cannot drift.")
    P()
    P("## Round 2 additions (D Studio, E Harbor; built by build_mockups_de.py)")
    P(f"- Rank bar in the input panel: filled to p = {c['p_user'] * 100:.2f}% of its width; text 'Higher than about {int(c['p_user'] * 100)}%'.")
    P(f"- Result card comparison bars: {money(c['user'])} bar is {c['user'] / c['cf_r'] * 100:.2f}% of the {money(c['cf_r'])} bar (lengths only, no new figure shown).")
    P(f"- Income bars: 2023 and 1963 group shares from the table above; brackets labelled 'Top 1%: {pct(c['top1']['now'])}' and 'Top 1%: {pct(c['top1']['base'])}'.")
    P("- Data table under the bars adds a 'Top 1% (last three rows)' total row using the Top 1% line above.")
    P("- Year picker options: the years present in the data file's byYear (1962-2023 less 2023), labels only.")
    P("- No other figures appear on D or E; all other numbers are the same values printed above.")


if __name__ == "__main__":
    main()
