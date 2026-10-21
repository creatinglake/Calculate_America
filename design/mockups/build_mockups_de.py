#!/usr/bin/env python3
"""Build the second-round Fair Share mockups, D (Studio) and E (Harbor).

Round 2 follows Adam's feedback on A-C: model the look on the previous Fair Share
prototype (legacy/: slate page, white rounded cards, Inter, indigo accent, inputs
on the left and results on the right), make the charts the star, add a working
light/dark toggle, and draw clear boundaries between the input panel, the
results, and the data tables.

Every number comes from compute() in compute_numbers.py (see NUMBERS.md); the
chart geometry helpers are shared with build_mockups.py. Both pages use identical
markup; only the stylesheet, fonts and palette differ, except that E moves the
input panel into a full-width band above the results.

Run:  python3 design/mockups/build_mockups_de.py
"""
import json
from pathlib import Path

from build_mockups import (C, GB, GS, POP, RANK, ROUND_BASE, ROUND_NOW, T1B, T1N, VH, VW,
                           contrast, interp, path, pct, pop_label, tick_label, y_of)
from compute_numbers import DATA, GROUPS, money, show, xpos

OUT = Path(__file__).resolve().parent
YEARS = sorted(json.loads(DATA.read_text())["byYear"])  # labels for the year picker
LABELS = {k: lab for k, lab, *_ in GROUPS}
LONG = {"b50": "Bottom 50%", "m40": "Middle 40%", "u9": "Upper 9%",
        "t09": "Top 1% to 0.1%", "t009": "Top 0.1% to 0.01%", "t001": "Top 0.01%"}
RANGE = {"b50": "P0–50", "m40": "P50–90", "u9": "P90–99",
         "t09": "P99–99.9", "t009": "P99.9–99.99", "t001": "P99.99–100"}

# ---------------------------------------------------------------- color checks

TEXT_PAIRS = [  # (fg, bg, minimum ratio)
    ("ink", "bg", 4.5), ("ink", "surface", 4.5), ("ink", "well", 4.5),
    ("muted", "bg", 4.5), ("muted", "surface", 4.5), ("muted", "well", 4.5),
    ("accent", "surface", 4.5), ("accent", "bg", 4.5), ("accent", "well", 4.5),
    ("on-accent", "accent", 4.5), ("accent-ink", "accent-soft", 4.5),
    ("panel-ink", "panel", 4.5), ("panel-muted", "panel", 4.5),
    ("panel-ink", "field", 4.5), ("panel-on-accent", "panel-accent", 4.5),
    ("panel-ink", "seg-bg", 4.5),
    # non-text: control boundaries and chart marks need 3:1 (WCAG 1.4.11)
    ("field-border", "panel", 3), ("panel-accent", "panel", 3),
    ("line-now", "surface", 3), ("line-base", "surface", 3),
]


def seg_ink(p, k):
    """Label color inside a bar segment: whichever of ink, surface, white or black contrasts most."""
    cands = [p["ink"], p["surface"], "#FFFFFF", "#000000"]
    return max(((c, contrast(c, p[k])) for c in cands), key=lambda t: t[1])


def check(name, mode, p):
    ok = True
    for fg, bg, need in TEXT_PAIRS:
        r = contrast(p[fg], p[bg])
        if r < need:
            ok = False
            print(f"  FAIL {name} {mode}: {fg} on {bg} = {r:.2f} < {need}")
    for k, *_ in GROUPS:
        r = contrast(p[k], p["surface"])
        if r < 3:
            ok = False
            print(f"  FAIL {name} {mode}: group {k} on surface = {r:.2f} < 3")
    # segment labels are printed inside b50, m40, u9 and t09 only
    for k in ("b50", "m40", "u9", "t09"):
        _, r = seg_ink(p, k)
        if r < 4.5:
            ok = False
            print(f"  FAIL {name} {mode}: label ink on {k} = {r:.2f} < 4.5")
    return ok


def vars_block(p):
    out = [f"--{k}:{v};" for k, v in p.items()]
    out += [f"--{k}-ink:{seg_ink(p, k)[0]};" for k, *_ in GROUPS]
    return "".join(out)


def palette_css(light, dark):
    lv, dv = vars_block(light), vars_block(dark)
    return f""":root{{{lv}color-scheme:light;}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{{dv}color-scheme:dark;}}}}
:root[data-theme="dark"]{{{dv}color-scheme:dark;}}"""


# ---------------------------------------------------------------- markup

ICON_SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
ICON_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>'
ICON_AUTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5Z" class="fill"/></svg>'


def header():
    nav = ["Story", "Calculator", "The top", "Methods", "Sources", "About"]
    cur = ' aria-current="page"'
    items = "".join(f'<li><a href="#"{cur if n == "Calculator" else ""}>{n}</a></li>' for n in nav)
    return f"""<header class="site">
  <div class="site-inner">
    <a class="brand" href="#">
      <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="13" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="11" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/></svg></span>
      <span class="brand-text"><span class="brand-tool">Fair Share</span><span class="brand-org">Calculate America</span></span>
    </a>
    <nav aria-label="Main"><ul>{items}</ul></nav>
    <button class="theme-toggle" type="button" aria-label="Color theme: follow system">
      <span class="ti ti-auto">{ICON_AUTO}</span><span class="ti ti-light">{ICON_SUN}</span><span class="ti ti-dark">{ICON_MOON}</span>
      <span class="theme-name">Auto</span>
    </button>
  </div>
</header>"""


def intro():
    return """<section class="intro">
  <p class="eyebrow">Calculator</p>
  <h1>Same size economy, divided another way</h1>
  <p class="dek">Find your place in how America divides its income today, then see what someone at that place would receive if the same total were divided another way.</p>
</section>"""


def seg(name, options, checked, legend):
    opts = "".join(
        f'<label><input type="radio" name="{name}" value="{v}"{" checked" if v == checked else ""}><span>{lab}</span></label>'
        for v, lab in options)
    return f'<fieldset class="seg"><legend>{legend}</legend><div class="seg-opts">{opts}</div></fieldset>'


def inputs():
    year_opts = "".join(f'<option{" selected" if y == "1963" else ""}>{y}</option>' for y in YEARS if y != "2023")
    presets = ["Gilded Age US", "US peak-equality year", "Nordic countries", "Western Europe", "Perfect equality"]
    preset_list = "".join(f'<li>{p}</li>' for p in presets)
    return f"""<section class="panel inputs" aria-labelledby="in-h">
  <h2 class="sr" id="in-h">Inputs</h2>
  <div class="in-group">
    <h3 class="panel-h"><span class="pdot" aria-hidden="true"></span>Your income</h3>
    <div class="field">
      <label for="inc">Pre-tax income for the year</label>
      <div class="money-in"><span aria-hidden="true">$</span><input id="inc" inputmode="numeric" value="60,000" autocomplete="off"></div>
      <p class="hint">Wages, business income, interest and dividends, pensions received.</p>
    </div>
    <div class="field">
      <label class="switch"><input type="checkbox" role="switch"><span class="track" aria-hidden="true"></span><span>Share finances with a spouse or partner?</span></label>
      <p class="hint">If yes, enter your combined income. It is split in half, and the split is shown.</p>
    </div>
    <div class="rank">
      <div class="rank-top"><span>Your rank, 2023</span><strong>Higher than about {RANK}%</strong></div>
      <div class="rank-bar" aria-hidden="true"><span style="width:{C['p_user'] * 100:.2f}%"></span></div>
      <p class="hint">Of adults age 20 and over. Approximate.</p>
    </div>
  </div>
  <div class="in-group">
    <h3 class="panel-h"><span class="pdot" aria-hidden="true"></span>Compare with</h3>
    <div class="scen">
      {seg("scenario", [("years", "Years"), ("presets", "Presets"), ("custom", "Custom"), ("taxes", "Taxes")], "years", "Scenario type")}
      <div class="scen-panel sp-years">
        <label for="yr">Divide 2023's total the way it was divided in</label>
        <select id="yr">{year_opts}</select>
      </div>
      <div class="scen-panel sp-presets"><ul class="chips">{preset_list}</ul></div>
      <div class="scen-panel sp-custom"><p class="hint">Six linked sliders, one per group, or a blend of two distributions.</p></div>
      <div class="scen-panel sp-taxes"><p class="hint">Keep today's pre-tax division and apply a different tax schedule.</p></div>
    </div>
  </div>
  <div class="in-group">
    <h3 class="panel-h"><span class="pdot" aria-hidden="true"></span>Data</h3>
    {seg("source", [("psz", "PSZ"), ("as", "Auten-Splinter")], "psz", "Data series")}
    {seg("concept", [("pre", "Pre-tax"), ("post", "Post-tax")], "pre", "Income concept")}
    <p class="hint">PSZ: Piketty, Saez and Zucman. Auten-Splinter: an alternative estimate of the same series.</p>
  </div>
</section>"""


def result_card():
    w_now = C["user"] / C["cf_r"] * 100  # bar lengths, relative to the larger value
    return f"""<section class="card result" aria-labelledby="result-h">
  <div class="card-h">
    <h2 id="result-h" class="card-title">Your result</h2>
    <span class="tag">Illustrative, approximate</span>
  </div>
  <div class="result-body">
    <div class="result-main">
      <p class="kpi-label">Difference per year</p>
      <p class="kpi"><span class="kpi-num">+{money(C['diff_r'])}</span><span class="kpi-unit">a year</span></p>
      <p class="result-text">If 2023's total income were divided the way it was in 1963, an adult at your rank would receive <strong>{money(C['cf_r'])}</strong> instead of <strong>{money(C['user'])}</strong>.</p>
    </div>
    <div class="result-compare">
      <div class="cmp-row">
        <div class="cmp-top"><span>Your income, 2023</span><strong>{money(C['user'])}</strong></div>
        <div class="cmp-bar"><span class="cmp-now" style="width:{w_now:.2f}%"></span></div>
      </div>
      <div class="cmp-row">
        <div class="cmp-top"><span>Under the 1963 division</span><strong>{money(C['cf_r'])}</strong></div>
        <div class="cmp-bar"><span class="cmp-base" style="width:100%"></span></div>
      </div>
    </div>
  </div>
  <p class="assumption"><strong>Assumption:</strong> the economy stays the same size as in 2023 (same average income per adult). Only how it is divided changes.</p>
  <p class="fine">Pre-tax national income per adult age 20 and over, income split equally between spouses, 2023 dollars.</p>
</section>"""


def prose():
    return f"""<section class="card prose" aria-labelledby="prose-h">
  <h2 id="prose-h" class="card-title">How the income is divided</h2>
  <p>In 2023, pre-tax income in the United States averaged {ROUND_NOW} per adult. That total is not spread evenly. The bottom half of adults received {pct(GS['b50'])} of it. The top 1% received {pct(T1N)}.</p>
  <p>In 1963 the economy was smaller, {ROUND_BASE} per adult in 2023 dollars, and it was divided differently. The bottom half received {pct(GB['b50'])} and the top 1% received {pct(T1B)}. Fair Share keeps today's total fixed and changes only the division.</p>
</section>"""


def bars():
    keys = [k for k, *_ in GROUPS]

    def lab(text, small=False):
        cls = "sl sl-s" if small else "sl"
        return f'<span class="{cls}">{text}</span>'

    def segs(shares, labeller):
        return "".join(
            f'<div class="sg g-{k}" style="flex-basis:{shares[k] * 100:.4f}%" title="{LONG[k]}: {labeller(shares[k])}">'
            f'{lab(labeller(shares[k]), shares[k] < 0.12) if shares[k] >= 0.085 else ""}</div>'
            for k in keys)

    inset_sh = {k: POP[k] / 0.01 for k in keys[3:]}
    inset = "".join(
        f'<div class="sg g-{k}" style="flex-basis:{inset_sh[k] * 100:.4f}%">'
        f'{lab(f"{inset_sh[k] * 100:g}% of the top 1%") if inset_sh[k] >= 0.5 else ""}</div>'
        for k in keys[3:])
    legend = "".join(f'<li><span class="sw g-{k}" aria-hidden="true"></span>{LONG[k]}</li>' for k in keys)
    rows = "".join(
        f'<tr><th scope="row"><span class="sw g-{k}" aria-hidden="true"></span>{LONG[k]}<span class="rng">{RANGE[k]}</span></th>'
        f'<td>{pop_label(POP[k])}</td><td>{pct(GS[k])}</td><td>{pct(GB[k])}</td></tr>' for k in keys)
    rows += (f'<tr class="tot"><th scope="row">Top 1% (last three rows)</th><td>1%</td>'
             f'<td>{pct(T1N)}</td><td>{pct(T1B)}</td></tr>')
    return f"""<figure class="card chart chart-bars" aria-labelledby="bars-h">
  <figcaption class="card-h chart-h">
    <h2 id="bars-h" class="card-title">Share of adults and share of income</h2>
    <p class="sub">Six groups of adults, ordered by income. The top groups are slivers of the people but blocks of the income.</p>
  </figcaption>
  <ul class="legend-row" aria-label="Groups">{legend}</ul>
  <div class="bars" role="img" aria-label="In 2023 the bottom 50% of adults received {pct(GS['b50'])} of pre-tax income and the top 1% received {pct(T1N)}. In 1963 the shares were {pct(GB['b50'])} and {pct(T1B)}. Full values in the data table.">
    <div class="brow brow-inset">
      <p class="blabel">Top 1% of adults, magnified 100 times</p>
      <div class="btrack"><div class="bar bar-inset">{inset}</div>
        <svg class="connector" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 100,0 100,10 99,10"/></svg></div>
    </div>
    <div class="brow"><p class="blabel">Adults</p><div class="btrack"><div class="bar">{segs(POP, pop_label)}</div></div></div>
    <div class="brow"><p class="blabel">Income, 2023</p><div class="btrack"><div class="bar">{segs(GS, pct)}</div>
      <div class="bracket" style="width:{T1N * 100:.3f}%"><span>Top 1%: {pct(T1N)}</span></div></div></div>
    <div class="brow"><p class="blabel">Income, 1963</p><div class="btrack"><div class="bar">{segs(GB, pct)}</div>
      <div class="bracket" style="width:{T1B * 100:.3f}%"><span>Top 1%: {pct(T1B)}</span></div></div></div>
  </div>
  <details class="data">
    <summary><span class="chev" aria-hidden="true"></span>Show the data table</summary>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Group</th><th scope="col">Adults</th><th scope="col">Income, 2023</th><th scope="col">Income, 1963</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </details>
  <p class="source">Source: World Inequality Database, pre-tax national income, adults 20+, income split equally between spouses.</p>
</figure>"""


def stretched():
    ticks = C["ticks"]
    shade = "".join(f'<rect class="bandbg" x="{VW * f:.0f}" y="0" width="{VW * 0.25:.0f}" height="{VH}"/>' for f in (0.25, 0.75))
    grid = "".join(f'<line class="grid" x1="0" x2="{VW}" y1="{y_of(t):.1f}" y2="{y_of(t):.1f}"/>' for t in ticks)
    ylabels = "".join(f'<span class="ylab" style="top:{y_of(t) / VH * 100:.2f}%">{tick_label(t)}</span>' for t in ticks)
    band_names = [("Bottom 90%", "P0–90"), ("Next 9%", "P90–99"), ("Next 0.9%", "P99–99.9"), ("Top 0.1%", "P99.9–100")]
    blabels = "".join(f'<span class="blab"><b>{a}</b><span>{b}</span></span>' for a, b in band_names)
    xu = xpos(C["p_user"]) * VW
    yu, yc = y_of(C["user"]), y_of(C["cf"])
    pl = 0.9995
    yb = y_of(interp(C["pts_base"], pl))
    yn = y_of(interp(C["pts_now"], pl))
    rows = "".join(f'<tr><th scope="row">P{p * 100:g}</th><td>{show(a)}</td><td>{show(b)}</td></tr>' for p, a, b in C["table"])
    L = lambda v: f"{v / VW * 100:.2f}%"
    T = lambda v: f"{v / VH * 100:.2f}%"
    return f"""<figure class="card chart chart-pc" aria-labelledby="pc-h">
  <figcaption class="card-h chart-h">
    <h2 id="pc-h" class="card-title">Income at each rank: 2023 and the 1963 division</h2>
    <p class="sub">Each band holds ten times fewer adults than the one before, but every band gets the same width. That makes room to see the top 0.1%.</p>
  </figcaption>
  <ul class="legend-row legend-lines" aria-label="Lines">
    <li><span class="lsw lsw-now" aria-hidden="true"></span>2023</li>
    <li><span class="lsw lsw-base" aria-hidden="true"></span>1963 division, scaled to 2023's average</li>
  </ul>
  <div class="pc" role="img" aria-label="Line chart of income by rank. Below about the 90th percentile the 1963-division line is higher than 2023; above it the 2023 line is higher. Values in the data table.">
    <p class="axis-title">Pre-tax income per adult, log scale</p>
    <div class="pc-plot">
      <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="none" aria-hidden="true">
        {shade}{grid}
        <path class="ln ln-base" d="{path(C['pts_base'])}"/>
        <path class="ln ln-now" d="{path(C['pts_now'])}"/>
        <line class="you-link" x1="{xu:.1f}" x2="{xu:.1f}" y1="{yu:.1f}" y2="{yc:.1f}"/>
      </svg>
      {ylabels}
      <span class="dot dot-now" style="left:{L(xu)};top:{T(yu)}"></span>
      <span class="dot dot-base" style="left:{L(xu)};top:{T(yc)}"></span>
      <span class="you-label" style="left:{L(xu)};top:{T(yu)}">You: {money(C['user'])}<br><span>1963 division: {money(C['cf_r'])}</span></span>
      <span class="line-label lab-base" style="left:{xpos(pl) * 100:.2f}%;top:{T(yb)}">1963</span>
      <span class="line-label lab-now" style="left:{xpos(pl) * 100:.2f}%;top:{T(yn)}">2023</span>
    </div>
    <div class="pc-bands">{blabels}</div>
    <p class="axis-title axis-x">Rank among adults, stretched so each band gets equal width</p>
  </div>
  <details class="data">
    <summary><span class="chev" aria-hidden="true"></span>Show the data table</summary>
    <div class="table-wrap">
      <table>
        <thead><tr><th scope="col">Rank</th><th scope="col">2023</th><th scope="col">1963 division, 2023 size</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </details>
  <p class="source">The last band uses a log stretch and ends at P99.999, the highest threshold in the data.</p>
</figure>"""


def footer():
    return """<footer class="site-foot">
  <p><strong>Calculate America</strong> &middot; Fair Share. Design mockup, not for publication. Numbers from <code>public/data/us-ptinc.json</code>; see NUMBERS.md.</p>
</footer>"""


TOGGLE_JS = """<script>
(function(){var b=document.querySelector('.theme-toggle'),r=document.documentElement,n=b.querySelector('.theme-name'),
m=['auto','light','dark'],L={auto:'Auto',light:'Light',dark:'Dark'},i=0;
function set(){if(m[i]==='auto'){r.removeAttribute('data-theme');}else{r.setAttribute('data-theme',m[i]);}
r.setAttribute('data-mode',m[i]);n.textContent=L[m[i]];b.setAttribute('aria-label','Color theme: '+(m[i]==='auto'?'follow system':m[i]));}
b.addEventListener('click',function(){i=(i+1)%3;set();});set();})();
</script>"""

# ---------------------------------------------------------------- shared CSS

BASE_CSS = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);overflow-wrap:break-word;-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
svg{max-width:100%}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.g-b50{background:var(--b50);color:var(--b50-ink)}.g-m40{background:var(--m40);color:var(--m40-ink)}
.g-u9{background:var(--u9);color:var(--u9-ink)}.g-t09{background:var(--t09);color:var(--t09-ink)}
.g-t009{background:var(--t009);color:var(--t009-ink)}.g-t001{background:var(--t001);color:var(--t001-ink)}
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.panel :focus-visible{outline-color:var(--panel-accent)}

/* header */
.site{background:var(--surface);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:5}
.site-inner{max-width:78rem;margin:0 auto;padding:.6rem 16px;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.5rem}
.brand{display:flex;align-items:center;gap:.6rem;text-decoration:none;color:var(--ink)}
.mark{width:34px;height:34px;border-radius:9px;background:var(--accent);display:grid;place-items:center}
.mark svg{width:20px;height:20px;fill:var(--on-accent)}
.brand-text{display:flex;flex-direction:column;line-height:1.15}
.brand-tool{font-weight:700;font-size:1.06rem;letter-spacing:-.01em}
.brand-org{font-size:.72rem;color:var(--muted);font-weight:500}
nav{margin-left:auto}
nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.15rem}
nav a{display:block;color:var(--muted);text-decoration:none;font-size:.9rem;font-weight:500;padding:.45rem .7rem;border-radius:8px}
nav a:hover{color:var(--ink);background:var(--well)}
nav a[aria-current]{color:var(--accent-ink);background:var(--accent-soft);font-weight:600}
.theme-toggle{display:inline-flex;align-items:center;gap:.4rem;font:inherit;font-size:.82rem;font-weight:600;color:var(--ink);background:var(--well);border:1px solid var(--rule);border-radius:999px;padding:.35rem .75rem .35rem .5rem;cursor:pointer}
.theme-toggle svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;display:block}
.theme-toggle .fill{fill:currentColor;stroke:none}
.ti{display:none}
:root[data-mode="auto"] .ti-auto,:root[data-mode="light"] .ti-light,:root[data-mode="dark"] .ti-dark{display:block}
:root:not([data-mode]) .ti-auto{display:block}

/* layout */
main{max-width:78rem;margin:0 auto;padding:0 16px 3rem}
.intro{padding:2rem 0 1.5rem}
.eyebrow{margin:0 0 .4rem;font-size:.75rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}
h1{margin:0 0 .6rem;font-size:clamp(1.75rem,4.2vw,2.5rem);line-height:1.12;letter-spacing:-.02em;font-weight:700}
.dek{margin:0;max-width:44rem;color:var(--muted);font-size:1.08rem;line-height:1.55}
.stack{display:grid;gap:1.25rem;min-width:0}

/* cards */
.card{background:var(--surface);border:1px solid var(--rule);border-radius:var(--radius);box-shadow:var(--shadow);padding:1.25rem;min-width:0;margin:0}
.card-h{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.5rem 1rem;margin:0 0 1rem}
.card-title{margin:0;font-size:1.12rem;line-height:1.3;font-weight:700;letter-spacing:-.01em}
.chart-h{display:block}
.chart-h .sub{margin:.3rem 0 0;color:var(--muted);font-size:.92rem;line-height:1.5;max-width:46rem}
.tag{font-size:.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent-ink);background:var(--accent-soft);border-radius:999px;padding:.25rem .65rem}
.source{margin:.9rem 0 0;font-size:.78rem;color:var(--muted);line-height:1.5}

/* input panel */
.panel{background:var(--panel);color:var(--panel-ink);border:1px solid var(--panel-border);border-radius:var(--radius);padding:1.25rem;min-width:0}
.panel-h{display:flex;align-items:center;gap:.5rem;margin:0 0 .9rem;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.pdot{width:8px;height:8px;border-radius:50%;background:var(--panel-accent);flex:none}
.in-group+.in-group{border-top:1px solid var(--panel-border);margin-top:1.25rem;padding-top:1.25rem}
.field{margin:0 0 1rem}
.field>label,.scen-panel>label{display:block;font-size:.88rem;font-weight:600;margin:0 0 .35rem}
.hint{margin:.35rem 0 0;font-size:.8rem;line-height:1.45;color:var(--panel-muted)}
.money-in{display:flex;align-items:center;background:var(--field);border:1px solid var(--field-border);border-radius:10px;padding:0 .8rem}
.money-in span{color:var(--panel-muted);font-weight:600}
.money-in input{flex:1;min-width:0;border:0;background:transparent;color:var(--panel-ink);font:inherit;font-size:1.3rem;font-weight:700;padding:.55rem .4rem;font-variant-numeric:tabular-nums}
.money-in input:focus{outline:none}
.money-in:focus-within{outline:3px solid var(--panel-accent);outline-offset:1px}
select{width:100%;font:inherit;font-size:1rem;font-weight:600;color:var(--panel-ink);background:var(--field);border:1px solid var(--field-border);border-radius:10px;padding:.55rem .7rem}
.field>.switch,.switch{display:flex;align-items:center;gap:.7rem;font-size:.92rem;font-weight:600;cursor:pointer}
.switch input{position:absolute;opacity:0;width:1px;height:1px}
.track{display:block;flex:none;width:42px;height:24px;border-radius:999px;background:var(--field);border:1px solid var(--field-border);position:relative;transition:background .15s}
.track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--panel-muted);transition:transform .15s}
.switch input:checked+.track{background:var(--panel-accent);border-color:var(--panel-accent)}
.switch input:checked+.track::after{transform:translateX(18px);background:var(--panel-on-accent)}
.switch input:focus-visible+.track{outline:3px solid var(--panel-accent);outline-offset:2px}
.rank{background:var(--seg-bg);border:1px solid var(--panel-border);border-radius:10px;padding:.75rem .85rem}
.rank-top{display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;font-size:.85rem;align-items:baseline}
.rank-top strong{font-size:.95rem}
.rank-bar{height:8px;border-radius:999px;background:var(--field);border:1px solid var(--field-border);margin:.5rem 0 0;overflow:hidden}
.rank-bar span{display:block;height:100%;background:var(--panel-accent)}
.seg{border:0;margin:0 0 .85rem;padding:0;min-width:0}
.seg legend{font-size:.88rem;font-weight:600;padding:0;margin:0 0 .35rem}
.seg-opts{display:flex;background:var(--seg-bg);border:1px solid var(--panel-border);border-radius:11px;padding:3px;gap:3px}
.seg-opts label{flex:1 1 0;min-width:0}
.seg-opts input{position:absolute;opacity:0;width:1px;height:1px}
.seg-opts span{display:block;text-align:center;font-size:.85rem;font-weight:600;padding:.45rem .3rem;border-radius:8px;cursor:pointer;color:var(--panel-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seg-opts input:checked+span{background:var(--panel-accent);color:var(--panel-on-accent);box-shadow:0 1px 2px rgba(0,0,0,.15)}
.seg-opts input:focus-visible+span{outline:3px solid var(--panel-accent);outline-offset:2px}
.scen .seg legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.scen-panel{display:none}
.scen:has(input[value=years]:checked) .sp-years,.scen:has(input[value=presets]:checked) .sp-presets,
.scen:has(input[value=custom]:checked) .sp-custom,.scen:has(input[value=taxes]:checked) .sp-taxes{display:block}
.chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.4rem}
.chips li{font-size:.82rem;font-weight:600;border:1px solid var(--field-border);border-radius:999px;padding:.3rem .7rem}

/* result card */
.result{border-top:4px solid var(--accent)}
.result-body{display:grid;gap:1.25rem;align-items:center}
.kpi-label{margin:0;font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.kpi{margin:.2rem 0 .6rem;display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap}
.kpi-num{font-size:clamp(2.4rem,7vw,3.3rem);font-weight:800;letter-spacing:-.03em;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums}
.kpi-unit{color:var(--muted);font-weight:600}
.result-text{margin:0;line-height:1.55}
.result-compare{background:var(--well);border:1px solid var(--rule);border-radius:12px;padding:1rem}
.cmp-row+.cmp-row{margin-top:.9rem}
.cmp-top{display:flex;justify-content:space-between;gap:.5rem;font-size:.86rem;color:var(--muted);margin-bottom:.35rem}
.cmp-top strong{color:var(--ink);font-size:1.05rem;font-variant-numeric:tabular-nums}
.cmp-bar{height:14px;border-radius:4px;background:var(--rule-soft);overflow:hidden}
.cmp-bar span{display:block;height:100%;border-radius:0 4px 4px 0}
.cmp-now{background:var(--line-now)}.cmp-base{background:var(--line-base)}
.assumption{margin:1.1rem 0 .35rem;padding:.65rem .85rem;background:var(--accent-soft);color:var(--accent-ink);border-radius:10px;font-size:.92rem;line-height:1.5}
.fine{margin:0;font-size:.78rem;color:var(--muted)}

/* prose */
.prose p{margin:.75rem 0 0;line-height:1.65}

/* legend */
.legend-row{list-style:none;margin:0 0 1rem;padding:0;display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.84rem;color:var(--ink)}
.legend-row li{display:flex;align-items:center;gap:.4rem}
.sw{display:inline-block;width:12px;height:12px;border-radius:3px;flex:none}
.lsw{display:inline-block;width:26px;height:0;border-top:3px solid var(--line-now)}
.lsw-base{border-top-style:dashed;border-color:var(--line-base)}

/* bars chart */
.bars{display:grid;gap:.25rem}
.brow{display:grid;grid-template-columns:minmax(0,1fr);gap:.3rem;align-items:center}
.blabel{margin:.5rem 0 0;font-size:.84rem;font-weight:600;color:var(--muted)}
.brow-inset .blabel{margin-top:0}
.btrack{position:relative;min-width:0}
.bar{display:flex;gap:2px;height:42px}
.bar-inset{height:34px}
.sg{min-width:2px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:.8rem;font-weight:700;font-variant-numeric:tabular-nums}
.sg:first-child{border-radius:6px 0 0 6px}.sg:last-child{border-radius:0 6px 6px 0}
.sl{white-space:nowrap;padding:0 .25rem}
.connector{display:block;width:100%;height:26px}
.connector polygon{fill:var(--connector)}
.bracket{margin-left:auto;margin-top:5px;border:2px solid var(--muted);border-bottom:0;height:7px;position:relative}
.bracket span{position:absolute;right:0;top:6px;font-size:.8rem;font-weight:700;white-space:nowrap;color:var(--ink);font-variant-numeric:tabular-nums}
.brow:has(.bracket){padding-bottom:1.35rem}

/* stretched percentile chart */
.pc{margin:0 0 0 3rem;position:relative}
.axis-title{margin:0 0 .5rem -3rem;font-size:.78rem;font-weight:600;color:var(--muted)}
.axis-x{margin:.4rem 0 0;}
.pc-plot{position:relative;height:clamp(260px,40vw,420px);border-left:1px solid var(--axis);border-bottom:1px solid var(--axis)}
.pc-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.bandbg{fill:var(--band)}
.grid{stroke:var(--gridline);stroke-width:1;vector-effect:non-scaling-stroke}
.ln{fill:none;stroke-width:2.5;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.ln-now{stroke:var(--line-now)}.ln-base{stroke:var(--line-base);stroke-dasharray:7 5}
.you-link{stroke:var(--ink);stroke-width:1.5;stroke-dasharray:2 3;vector-effect:non-scaling-stroke}
.ylab{position:absolute;right:calc(100% + .45rem);transform:translateY(-50%);font-size:.74rem;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.dot{position:absolute;width:13px;height:13px;border-radius:50%;transform:translate(-50%,-50%);border:2.5px solid var(--surface)}
.dot-now{background:var(--line-now)}.dot-base{background:var(--line-base)}
.you-label,.line-label{text-shadow:0 0 3px var(--surface),0 0 3px var(--surface),0 0 6px var(--surface),0 0 6px var(--surface)}
.you-label{position:absolute;transform:translate(.75rem,.4rem);font-size:.8rem;font-weight:700;line-height:1.35;white-space:nowrap;color:var(--ink)}
.you-label span{font-weight:500;color:var(--muted)}
.line-label{position:absolute;font-size:.8rem;font-weight:800;white-space:nowrap}
.lab-now{color:var(--ink);transform:translate(-110%,-140%)}
.lab-base{color:var(--ink);transform:translate(-30%,60%)}
.pc-bands{display:grid;grid-template-columns:repeat(4,1fr);font-size:.74rem;line-height:1.25;margin-top:.4rem}
.blab{padding:0 .3rem;color:var(--muted)}
.blab b{display:block;color:var(--ink);font-weight:700}

/* data tables: a separate, recessed surface */
.data{margin:1.1rem 0 0;border:1px solid var(--rule);border-radius:12px;background:var(--well);overflow:hidden}
.data summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:.5rem;padding:.7rem .9rem;font-size:.88rem;font-weight:700;color:var(--accent)}
.data summary::-webkit-details-marker{display:none}
.chev{display:inline-block;flex:none;width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .15s}
.data[open] .chev{transform:rotate(45deg)}
.data[open] summary{border-bottom:1px solid var(--rule)}
.table-wrap{overflow-x:auto}
.data table{width:100%;border-collapse:collapse;font-size:.86rem;font-variant-numeric:tabular-nums}
.data th,.data td{padding:.55rem .9rem;text-align:right;border-bottom:1px solid var(--rule)}
.data tbody tr:last-child th,.data tbody tr:last-child td{border-bottom:0}
.data thead th{font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);background:var(--table-head)}
.data tbody th{text-align:left;font-weight:600}
.data td{white-space:nowrap}
.data th:first-child{text-align:left}
.data tbody tr:nth-child(even){background:var(--table-stripe)}
.data .sw{margin-right:.5rem;vertical-align:-1px}
.rng{display:block;font-weight:400;color:var(--muted);font-size:.76rem;margin-left:1.3rem}
.data .tot th,.data .tot td{font-weight:700;border-top:2px solid var(--rule)}

.site-foot{max-width:78rem;margin:0 auto;padding:1.5rem 16px 2.5rem;font-size:.82rem;color:var(--muted);border-top:1px solid var(--rule)}
.site-foot p{margin:0}

@media (min-width:640px){
  .brow{grid-template-columns:10.5rem minmax(0,1fr);gap:1rem}
  .blabel{margin:0;text-align:right}
  .card{padding:1.5rem}
}
@media (max-width:720px){nav{order:3;width:100%;margin-left:0}nav a{white-space:nowrap;padding:.35rem .55rem;font-size:.86rem}.theme-toggle{margin-left:auto}.site{position:static}}
@media (max-width:520px){
  .sl-s{display:none}
  .pc{margin-left:2.6rem}.axis-title{margin-left:-2.6rem}
  .blab span{display:none}.blab{font-size:.7rem;padding:0 .15rem}
  .data th,.data td{padding:.5rem .55rem}
  .data table{font-size:.8rem}
  .rng{margin-left:0}
  .chart-bars .data tbody th{width:42%}
  .sl{font-size:.7rem;padding:0;letter-spacing:-.02em}
  .theme-name{display:none}.theme-toggle{padding:.4rem}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""

# ---------------------------------------------------------------- themes

THEMES = {}

# D. Studio: the legacy prototype, refined. Slate page, white cards, Inter, indigo.
THEMES["d-studio"] = dict(
    title="Fair Share: Studio",
    fonts="family=Inter:wght@400;500;600;700;800",
    light={"bg": "#EDF1F6", "surface": "#FFFFFF", "well": "#F6F8FB", "rule": "#D3DAE4", "rule-soft": "#E6EBF2",
           "ink": "#0F172A", "muted": "#4A5568", "accent": "#4F46E5", "on-accent": "#FFFFFF",
           "accent-soft": "#EEF0FE", "accent-ink": "#3730A3",
           "panel": "#E9ECFD", "panel-ink": "#1E1B4B", "panel-muted": "#4A4F7A", "panel-border": "#C3C8F2",
           "panel-accent": "#4F46E5", "panel-on-accent": "#FFFFFF", "field": "#FFFFFF", "field-border": "#7C83B8",
           "seg-bg": "#F7F8FF",
           "line-now": "#4F46E5", "line-base": "#047857",
           "axis": "#94A3B8", "gridline": "#E3E8EF", "band": "#F3F5F9", "connector": "#E0E3F4",
           "table-head": "#EEF2F7", "table-stripe": "#FFFFFF",
           "b50": "#0369A1", "m40": "#6366F1", "u9": "#5B21B6", "t09": "#B45309", "t009": "#DB2777", "t001": "#9F1239"},
    dark={"bg": "#0B1120", "surface": "#161F31", "well": "#0F1727", "rule": "#2A3750", "rule-soft": "#222C40",
          "ink": "#E8EDF5", "muted": "#A3AFC2", "accent": "#A5B4FC", "on-accent": "#111827",
          "accent-soft": "#242B52", "accent-ink": "#C7D0FE",
          "panel": "#1A1C3A", "panel-ink": "#E8EAFB", "panel-muted": "#B3B8DE", "panel-border": "#383E78",
          "panel-accent": "#A5B4FC", "panel-on-accent": "#111827", "field": "#10122A", "field-border": "#6E76AE",
          "seg-bg": "#141632",
          "line-now": "#A5B4FC", "line-base": "#34D399",
          "axis": "#55627A", "gridline": "#243046", "band": "#1B263A", "connector": "#2C3552",
          "table-head": "#141D2E", "table-stripe": "#131B2B",
          "b50": "#3690BF", "m40": "#5254F0", "u9": "#A27FCE", "t09": "#B77300", "t009": "#C447A6", "t001": "#F9493A"},
    css="""
:root{--radius:14px;--shadow:0 1px 2px rgba(15,23,42,.06),0 1px 3px rgba(15,23,42,.05)}
:root[data-theme="dark"]{--shadow:none}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--shadow:none}}
body{font-family:'Inter',system-ui,sans-serif;font-size:1rem;line-height:1.5;font-feature-settings:"cv11","ss01"}
.layout{display:grid;gap:1.25rem;align-items:start}
@media (min-width:1000px){
  .layout{grid-template-columns:minmax(0,22rem) minmax(0,1fr);gap:1.5rem}
  .inputs{position:sticky;top:5rem}
  .result-body{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
}
@media (min-width:700px) and (max-width:999px){.result-body{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
""",
)

# E. Harbor: deep-teal control band across the top, full-width chart cards below.
THEMES["e-harbor"] = dict(
    title="Fair Share: Harbor",
    fonts="family=Plus+Jakarta+Sans:wght@400;500;600;700;800",
    light={"bg": "#F2F0EA", "surface": "#FFFFFF", "well": "#F7F5F0", "rule": "#D9D3C6", "rule-soft": "#EAE6DD",
           "ink": "#18211F", "muted": "#545E5A", "accent": "#0F766E", "on-accent": "#FFFFFF",
           "accent-soft": "#E3F2EF", "accent-ink": "#0B5049",
           "panel": "#12343B", "panel-ink": "#F1F6F4", "panel-muted": "#B9CEC9", "panel-border": "#2C5761",
           "panel-accent": "#5EEAD4", "panel-on-accent": "#0B2328", "field": "#0B262C", "field-border": "#7FA8A2",
           "seg-bg": "#0E2D33",
           "line-now": "#0F766E", "line-base": "#C2410C",
           "axis": "#A39C8E", "gridline": "#ECE8E0", "band": "#F7F5F0", "connector": "#E6E1D6",
           "table-head": "#EFEBE3", "table-stripe": "#FCFBF8",
           "b50": "#2EA487", "m40": "#3887F7", "u9": "#6332AD", "t09": "#D18329", "t009": "#B40036", "t001": "#CB5AC9"},
    dark={"bg": "#0C1312", "surface": "#162120", "well": "#101918", "rule": "#2B3B38", "rule-soft": "#22302D",
          "ink": "#E9F0EE", "muted": "#A2B2AE", "accent": "#5EEAD4", "on-accent": "#0C1312",
          "accent-soft": "#183A37", "accent-ink": "#A7F3E6",
          "panel": "#1B3A3D", "panel-ink": "#ECF5F3", "panel-muted": "#B4CCC8", "panel-border": "#356468",
          "panel-accent": "#5EEAD4", "panel-on-accent": "#0B2328", "field": "#10292B", "field-border": "#79A9A4",
          "seg-bg": "#153033",
          "line-now": "#5EEAD4", "line-base": "#FB923C",
          "axis": "#4D5F5B", "gridline": "#22302D", "band": "#1B2826", "connector": "#2A3A37",
          "table-head": "#14201E", "table-stripe": "#131D1C",
          "b50": "#0CA491", "m40": "#2870A6", "u9": "#8F61F8", "t09": "#A75B23", "t009": "#FC3977", "t001": "#B732AB"},
    css="""
:root{--radius:18px;--shadow:0 1px 0 rgba(24,33,31,.04),0 8px 24px -12px rgba(24,33,31,.12)}
:root[data-theme="dark"]{--shadow:none}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--shadow:none}}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:1rem;line-height:1.55}
.mark{border-radius:50%}
h1{font-weight:800}
.panel{border-radius:var(--radius);padding:1.4rem}
@media (min-width:900px){
  .inputs{display:grid;grid-template-columns:1.05fr 1fr 1fr;gap:0}
  .in-group{padding:0 1.5rem}
  .in-group:first-of-type{padding-left:0}
  .in-group:last-child{padding-right:0}
  .in-group+.in-group{border-top:0;margin-top:0;padding-top:0;border-left:1px solid var(--panel-border)}
}
.layout{display:grid;gap:1.25rem}
.results-row{display:grid;gap:1.25rem;align-items:stretch}
@media (min-width:900px){.results-row{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}}
@media (min-width:640px){.result-body{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}}
.card-title{font-weight:800}
.result{border-top:0;position:relative;overflow:hidden}
.result::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--accent)}
.prose{background:var(--well)}
.tag{background:transparent;border:1.5px solid var(--accent);color:var(--accent-ink)}
:root[data-theme="dark"] .tag{color:var(--accent)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .tag{color:var(--accent)}}
.data{border-style:dashed}
""",
)


def body_d():
    return f"""{intro()}
<div class="layout">
  {inputs()}
  <div class="stack">
    {result_card()}
    {bars()}
    {prose()}
    {stretched()}
  </div>
</div>"""


def body_e():
    return f"""{intro()}
<div class="layout">
  {inputs()}
  <div class="results-row">
    {result_card()}
    {prose()}
  </div>
  {bars()}
  {stretched()}
</div>"""


BODIES = {"d-studio": body_d, "e-harbor": body_e}


def build(name, t):
    print(f"{name}:")
    ok = check(name, "light", t["light"]) & check(name, "dark", t["dark"])
    print("  palette checks", "pass" if ok else "FAIL")
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t['title']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{t['fonts']}&display=swap">
<style>
{palette_css(t['light'], t['dark'])}
{BASE_CSS}
{t['css']}
</style>
</head>
<body>
{header()}
<main>
{BODIES[name]()}
</main>
{footer()}
{TOGGLE_JS}
</body>
</html>
"""
    (OUT / f"{name}.html").write_text(html)
    return ok


if __name__ == "__main__":
    results = [build(n, t) for n, t in THEMES.items()]
    raise SystemExit(0 if all(results) else 1)
