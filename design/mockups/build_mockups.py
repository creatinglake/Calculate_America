#!/usr/bin/env python3
"""Build the three Fair Share style-direction mockups from compute_numbers.py.

Every number on the pages comes from compute() in compute_numbers.py (see NUMBERS.md).
The three pages share identical markup and content; only the stylesheet, fonts and
palette differ, so the directions can be compared fairly.

Run:  python3 design/mockups/build_mockups.py
"""
import math
from pathlib import Path

from compute_numbers import GROUPS, compute, show, xpos, money

OUT = Path(__file__).resolve().parent
C = compute()

# ---------------------------------------------------------------- color checks

def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexc):
    h = hexc.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def check_palette(name, mode, p):
    """WCAG AA: text 4.5:1, chart marks 3:1 against the page/surface."""
    rows, ok = [], True
    for fg, bg, need in [("ink", "bg", 4.5), ("muted", "bg", 4.5), ("ink", "surface", 4.5),
                         ("muted", "surface", 4.5), ("accent", "bg", 4.5), ("accent", "surface", 4.5),
                         ("on-accent", "accent", 4.5), ("line-now", "surface", 3), ("line-base", "surface", 3)]:
        r = contrast(p[fg], p[bg])
        rows.append(f"{fg}/{bg} {r:.2f}")
        ok &= r >= need
        if r < need:
            print(f"  FAIL {name} {mode}: {fg} on {bg} = {r:.2f} < {need}")
    for k, *_ in GROUPS:
        r = contrast(p[k], p["surface"])
        if r < 3:
            ok = False
            print(f"  FAIL {name} {mode}: group {k} on surface = {r:.2f} < 3")
    return ok


def seg_ink(p, k):
    """Label color inside a bar segment: whichever of ink / bg contrasts more."""
    a, b = contrast(p["ink"], p[k]), contrast(p["bg"], p[k])
    col, r = (p["ink"], a) if a >= b else (p["bg"], b)
    return col, r


# ---------------------------------------------------------------- shared markup

def pct(x):
    return f"{x * 100:.1f}%"


def pop_label(x):
    return f"{x * 100:g}%"


ROUND_NOW = show(C["m_now"])
ROUND_BASE = show(C["m_base"])
RANK = int(C["p_user"] * 100)
GS, GB, POP = C["gs_now"], C["gs_base"], C["pop"]
T1N, T1B = C["top1"]["now"], C["top1"]["base"]


def header():
    nav = ["Story", "Calculator", "The top", "Methods", "Sources", "About"]
    cur = ' aria-current="page"'
    items = "".join(f'<li><a href="#"{cur if n == "Story" else ""}>{n}</a></li>' for n in nav)
    return f"""<header class="site">
  <div class="site-inner">
    <a class="brand" href="#"><span class="brand-org">Calculate America</span><span class="brand-tool">Fair Share</span></a>
    <nav aria-label="Main"><ul>{items}</ul></nav>
    <button class="theme-toggle" type="button" aria-label="Color theme: follow system">Theme: auto</button>
  </div>
</header>"""


def hero():
    return """<section class="hero">
  <p class="kicker">Fair Share</p>
  <h1>Same size economy, divided another way</h1>
  <p class="dek">Find your place in how America divides its income today, then see what someone at that place would receive if the same total were divided the way it was in 1963.</p>
</section>"""


def result_card():
    return f"""<section class="result" aria-labelledby="result-h">
  <div class="result-top">
    <h2 id="result-h" class="result-title">A sample result</h2>
    <span class="tag">Illustrative, approximate</span>
  </div>
  <p class="result-who">An adult with <strong>{money(C['user'])}</strong> of pre-tax income in 2023, higher than about {RANK}% of adults.</p>
  <dl class="result-grid">
    <div class="r-now"><dt>Your income, 2023</dt><dd>{money(C['user'])}</dd></div>
    <div class="r-arrow" aria-hidden="true"><span>&rarr;</span></div>
    <div class="r-cf"><dt>Under the 1963 shape</dt><dd>{money(C['cf_r'])}</dd></div>
    <div class="r-diff"><dt>Difference per year</dt><dd>+{money(C['diff_r'])}</dd></div>
  </dl>
  <p class="assumption"><span class="assumption-label">Assumption.</span> Same average income per adult as 2023; only how it is divided changes.</p>
  <p class="fine">Pre-tax national income per adult age 20 and over, with income split equally between spouses, in 2023 dollars. Your rank is approximate.</p>
</section>"""


def prose_1():
    return f"""<section class="prose">
  <h2>How the income is divided</h2>
  <p>In 2023, pre-tax income in the United States averaged {ROUND_NOW} per adult. That total is not spread evenly. The bottom half of adults received {pct(GS['b50'])} of it. The top 1% received {pct(T1N)}.</p>
  <p>In 1963 the economy was smaller, {ROUND_BASE} per adult in 2023 dollars, and it was divided differently. The bottom half received {pct(GB['b50'])} and the top 1% received {pct(T1B)}. Fair Share keeps today's total fixed and changes only the division.</p>
</section>"""


def prose_2():
    return """<section class="prose">
  <h2>Seeing the top</h2>
  <p>The highest-income groups are too small to see on an ordinary chart. On the chart below, each of the four bands holds ten times fewer adults than the one before it, but every band gets the same width. That makes room to compare the top 0.1% with everyone else.</p>
</section>"""


def bars():
    def seg(k, w, label, cls="seg"):
        lab = f'<span class="seg-label">{label}</span>' if label else ""
        return f'<div class="{cls} g-{k}" style="flex-basis:{w * 100:.4f}%">{lab}</div>'

    people = "".join(seg(k, POP[k], pop_label(POP[k]) if POP[k] >= 0.09 else "") for k, *_ in GROUPS)
    income = "".join(seg(k, GS[k], pct(GS[k]) if GS[k] >= 0.09 else "") for k, *_ in GROUPS)
    top = [k for k, *_ in GROUPS][3:]
    inset = "".join(seg(k, POP[k] / 0.01, f"{POP[k] / 0.01 * 100:g}%" if POP[k] / 0.01 >= 0.09 else "") for k in top)
    legend_rows = "".join(
        f'<tr><th scope="row"><span class="sw g-{k}" aria-hidden="true"></span>{label}</th>'
        f'<td>{pop_label(POP[k])}</td><td>{pct(GS[k])}</td><td class="col-63">{pct(GB[k])}</td></tr>'
        for k, label, *_ in GROUPS)
    return f"""<figure class="chart chart-bars" aria-labelledby="bars-h">
  <figcaption>
    <p class="chart-num">Chart 2</p>
    <h3 id="bars-h">Share of adults and share of income, 2023</h3>
    <p class="chart-sub">Six groups of adults, ordered by income. The top groups are slivers of the people but blocks of the income.</p>
  </figcaption>
  <div class="bars" role="img" aria-label="In 2023 the bottom 50% of adults received {pct(GS['b50'])} of pre-tax income; the top 1% received {pct(T1N)}. Full values in the table below.">
    <div class="inset-wrap">
      <p class="bar-label">The top 1% of adults, magnified 100 times</p>
      <div class="bar bar-inset">{inset}</div>
      <svg class="connector" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 100,0 100,10 99,10"/></svg>
    </div>
    <p class="bar-label">Share of adults</p>
    <div class="bar bar-people">{people}</div>
    <p class="bar-label bar-label-income">Share of income</p>
    <div class="bar bar-income">{income}</div>
  </div>
  <table class="legend">
    <thead><tr><th scope="col">Group</th><th scope="col">Adults</th><th scope="col">Income, 2023</th><th scope="col" class="col-63">Income, 1963</th></tr></thead>
    <tbody>{legend_rows}</tbody>
  </table>
  <p class="source">Source: World Inequality Database, pre-tax national income, adults 20+, equal split between spouses.</p>
</figure>"""


# chart 3 geometry ---------------------------------------------------------------
VW, VH = 1000, 500
L0, L1 = math.log10(C["lo"]), math.log10(C["hi"])


def y_of(v):
    return VH * (1 - (math.log10(v) - L0) / (L1 - L0))


def path(pts):
    pts = [(xpos(p) * VW, y_of(v)) for p, v in pts if v >= C["lo"]]
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def interp(pts, p):
    for (p0, v0), (p1, v1) in zip(pts, pts[1:]):
        if p0 <= p <= p1:
            return v0 + (v1 - v0) * (p - p0) / (p1 - p0)


def tick_label(t):
    return {1e3: "$1k", 1e4: "$10k", 1e5: "$100k", 1e6: "$1M", 1e7: "$10M", 1e8: "$100M", 1e9: "$1B"}[t]


def stretched():
    ticks = C["ticks"]
    grid = "".join(f'<line class="grid" x1="0" x2="{VW}" y1="{y_of(t):.1f}" y2="{y_of(t):.1f}"/>' for t in ticks)
    bands = "".join(f'<line class="band" x1="{VW * f:.0f}" x2="{VW * f:.0f}" y1="0" y2="{VH}"/>' for f in (0.25, 0.5, 0.75))
    ylabels = "".join(f'<span class="ylab" style="top:{y_of(t) / VH * 100:.2f}%">{tick_label(t)}</span>' for t in ticks)
    band_names = [("Bottom 90%", "P0–90"), ("Next 9%", "P90–99"), ("Next 0.9%", "P99–99.9"), ("Top 0.1%", "P99.9–100")]
    blabels = "".join(f'<span class="blab" style="left:{i * 25}%"><b>{a}</b><span>{b}</span></span>' for i, (a, b) in enumerate(band_names))
    xu = xpos(C["p_user"]) * VW
    yu, yc = y_of(C["user"]), y_of(C["cf"])
    # line labels, both in the top band: 2023 above its line, 1963 shape below its line
    pl_base = 0.9995
    yb = y_of(interp(C["pts_base"], pl_base))
    pl_now = 0.9995
    yn = y_of(interp(C["pts_now"], pl_now))
    rows = "".join(f'<tr><th scope="row">P{p * 100:g}</th><td>{show(a)}</td><td>{show(b)}</td></tr>' for p, a, b in C["table"])
    return f"""<figure class="chart chart-pc" aria-labelledby="pc-h">
  <figcaption>
    <p class="chart-num">Chart 3</p>
    <h3 id="pc-h">Income at each rank: 2023 and the 1963 shape</h3>
    <p class="chart-sub">Pre-tax income per adult (log scale). The 1963 line shows the 1963 division scaled up to 2023's average income.</p>
  </figcaption>
  <div class="pc" role="img" aria-label="Line chart. Below about the 90th percentile the 1963-shape line is higher than 2023; above it the 2023 line is higher. Values in the table below.">
    <div class="pc-bands">{blabels}</div>
    <div class="pc-plot">
      <svg viewBox="0 0 {VW} {VH}" preserveAspectRatio="none" aria-hidden="true">
        {grid}{bands}
        <path class="ln ln-base" d="{path(C['pts_base'])}"/>
        <path class="ln ln-now" d="{path(C['pts_now'])}"/>
        <line class="you-link" x1="{xu:.1f}" x2="{xu:.1f}" y1="{yu:.1f}" y2="{yc:.1f}"/>
      </svg>
      {ylabels}
      <span class="dot dot-now" style="left:{xu / VW * 100:.2f}%;top:{yu / VH * 100:.2f}%"></span>
      <span class="dot dot-base" style="left:{xu / VW * 100:.2f}%;top:{yc / VH * 100:.2f}%"></span>
      <span class="you-label" style="left:{xu / VW * 100:.2f}%;top:{yu / VH * 100:.2f}%">You: {money(C['user'])}<br><span>1963 shape: {money(C['cf_r'])}</span></span>
      <span class="line-label lab-base" style="left:{xpos(pl_base) * 100:.2f}%;top:{yb / VH * 100:.2f}%">1963 shape</span>
      <span class="line-label lab-now" style="left:{xpos(pl_now) * 100:.2f}%;top:{yn / VH * 100:.2f}%">2023</span>
    </div>
  </div>
  <details class="table-toggle">
    <summary>Show as a table</summary>
    <table>
      <thead><tr><th scope="col">Rank</th><th scope="col">2023</th><th scope="col">1963 shape, 2023 size</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </details>
  <p class="source">Each band holds ten times fewer adults than the one before. The last band uses a log stretch and ends at P99.999, the highest threshold in the data.</p>
</figure>"""


def cta():
    return """<section class="cta">
  <h2>Find your number</h2>
  <p>Enter your income to see your rank, and what someone at that rank would receive under another year, a preset, or a division you design.</p>
  <a class="button" href="#">Find your number</a>
</section>"""


def footer():
    return """<footer class="site-foot">
  <p><strong>Calculate America</strong> &middot; Fair Share. Design mockup, not for publication. Numbers from <code>public/data/us-ptinc.json</code>; see NUMBERS.md.</p>
</footer>"""


TOGGLE_JS = """<script>
(function(){var b=document.querySelector('.theme-toggle'),r=document.documentElement,m=['auto','light','dark'],i=0;
b.addEventListener('click',function(){i=(i+1)%3;if(m[i]==='auto'){r.removeAttribute('data-theme');}else{r.setAttribute('data-theme',m[i]);}
b.textContent='Theme: '+m[i];b.setAttribute('aria-label','Color theme: '+(m[i]==='auto'?'follow system':m[i]));});})();
</script>"""


# ---------------------------------------------------------------- themes

def vars_block(p):
    out = [f"--{k}:{v};" for k, v in p.items()]
    for k, *_ in GROUPS:
        out.append(f"--{k}-ink:{seg_ink(p, k)[0]};")
    return "".join(out)


def palette_css(light, dark):
    lv, dv = vars_block(light), vars_block(dark)
    return f""":root{{{lv}color-scheme:light;}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{{dv}color-scheme:dark;}}}}
:root[data-theme="dark"]{{{dv}color-scheme:dark;}}"""


BASE_CSS = """
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);overflow-wrap:break-word}
a{color:var(--accent)}
img,svg{max-width:100%}
.g-b50{background:var(--b50);color:var(--b50-ink)}.g-m40{background:var(--m40);color:var(--m40-ink)}
.g-u9{background:var(--u9);color:var(--u9-ink)}.g-t09{background:var(--t09);color:var(--t09-ink)}
.g-t009{background:var(--t009);color:var(--t009-ink)}.g-t001{background:var(--t001);color:var(--t001-ink)}
.site-inner{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1.25rem}
.brand{text-decoration:none;color:var(--ink);display:flex;flex-direction:column;line-height:1.1}
nav ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.25rem 1rem}
nav a{color:var(--ink);text-decoration:none;padding:.25rem 0;display:inline-block}
nav a[aria-current]{color:var(--accent);text-decoration:underline;text-underline-offset:.3em;text-decoration-thickness:2px}
.theme-toggle{font:inherit;font-size:.8rem;background:transparent;color:var(--muted);border:1px solid var(--rule);border-radius:999px;padding:.3rem .7rem;cursor:pointer}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.result-grid{margin:0}.result-grid dd{margin:0;font-variant-numeric:tabular-nums lining-nums}
.bars{margin:1.25rem 0 1rem}
.bar{display:flex;gap:2px;height:44px}
.seg{position:relative;min-width:1px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:.8rem;font-weight:600;font-variant-numeric:tabular-nums}
.seg-label{white-space:nowrap}
.bar-label{margin:.9rem 0 .35rem;font-size:.85rem;color:var(--muted)}
.inset-wrap .bar-label{margin-top:0}
.bar-inset{height:34px}
.connector{display:block;width:100%;height:28px}
.connector polygon{fill:var(--rule);opacity:.7}
.legend{width:100%;border-collapse:collapse;font-size:.88rem;font-variant-numeric:tabular-nums}
.legend th,.legend td{text-align:right;padding:.4rem .3rem;border-bottom:1px solid var(--rule)}
.legend th:first-child{text-align:left;font-weight:500}
.legend thead th{font-weight:600;color:var(--muted);font-size:.78rem}
.sw{display:inline-block;width:.8em;height:.8em;margin-right:.5em;vertical-align:-.05em}
.pc{position:relative;margin:1rem 0 0 2.9rem}
.pc-bands{position:relative;height:2.6rem;font-size:.72rem;line-height:1.2}
.blab{position:absolute;bottom:.3rem;width:25%;padding-left:.3rem;color:var(--muted)}
.blab b{display:block;color:var(--ink);font-weight:600}
.pc-plot{position:relative;height:clamp(260px,52vw,400px);margin-bottom:1rem}
.pc-plot svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.grid{stroke:var(--rule);stroke-width:1;vector-effect:non-scaling-stroke}
.band{stroke:var(--muted);stroke-width:1;stroke-dasharray:3 3;vector-effect:non-scaling-stroke}
.ln{fill:none;stroke-width:2.5;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.ln-now{stroke:var(--line-now)}.ln-base{stroke:var(--line-base);stroke-dasharray:7 4}
.you-link{stroke:var(--ink);stroke-width:1.5;vector-effect:non-scaling-stroke}
.pc-plot{--plot-bg:var(--surface)}
.you-label,.line-label{text-shadow:0 0 3px var(--plot-bg),0 0 3px var(--plot-bg),0 0 6px var(--plot-bg)}
.ylab{position:absolute;right:calc(100% + .4rem);transform:translateY(-50%);font-size:.72rem;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.dot{position:absolute;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid var(--surface)}
.dot-now{background:var(--line-now)}.dot-base{background:var(--line-base)}
.you-label{position:absolute;transform:translate(.7rem,.5rem);font-size:.78rem;font-weight:600;line-height:1.3;white-space:nowrap;color:var(--ink)}
.you-label span{font-weight:400;color:var(--muted)}
.line-label{position:absolute;transform:translate(-50%,-160%);font-size:.78rem;font-weight:700;white-space:nowrap}
.lab-base{color:var(--line-base);transform:translate(-30%,100%)}.lab-now{color:var(--line-now);transform:translate(-100%,-150%)}
.table-toggle{margin:.5rem 0;font-size:.9rem}
.table-toggle summary{cursor:pointer;color:var(--accent);font-weight:600}
.table-toggle table{width:100%;border-collapse:collapse;margin-top:.5rem;font-variant-numeric:tabular-nums}
.table-toggle th,.table-toggle td{text-align:right;padding:.35rem .3rem;border-bottom:1px solid var(--rule)}
.table-toggle th:first-child{text-align:left}
.source{font-size:.78rem;color:var(--muted);margin:.6rem 0 0}
.button{display:inline-block;text-decoration:none;background:var(--accent);color:var(--on-accent);font-weight:700;padding:.85rem 1.5rem}
@media (max-width:480px){.col-63{display:none}.pc{margin-left:2.6rem}.blab span{display:none}.pc-bands{height:1.8rem}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""

THEMES = {}

# A. Broadsheet: warm newsprint, classic single column --------------------------
THEMES["a-broadsheet"] = dict(
    title="Fair Share: Broadsheet",
    fonts="family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Source+Sans+3:wght@400;500;600;700",
    light={"bg": "#F5EFE3", "surface": "#FBF7EF", "ink": "#1E1A15", "muted": "#5B5247", "rule": "#D6CCBA",
           "accent": "#9E3519", "on-accent": "#FFFFFF", "line-now": "#1E1A15", "line-base": "#9E3519",
           "b50": "#4F6F86", "m40": "#2E5069", "u9": "#1A2F40", "t09": "#8C5E0E", "t009": "#B44C1C", "t001": "#7A1D12"},
    dark={"bg": "#181512", "surface": "#211D19", "ink": "#EEE6D7", "muted": "#B3A994", "rule": "#3E372F",
          "accent": "#EE8A66", "on-accent": "#181512", "line-now": "#EEE6D7", "line-base": "#EE8A66",
          "b50": "#B4CEDE", "m40": "#82AAC6", "u9": "#5A86A7", "t09": "#DDAE4E", "t009": "#E87D4B", "t001": "#F2A595"},
    css="""
body{font-family:'Source Sans 3',system-ui,sans-serif;font-size:1.125rem;line-height:1.6}
h1,h2,h3,.brand-tool,.result-grid dd{font-family:'Newsreader',Georgia,serif}
.site{border-bottom:1px solid var(--ink);padding:1rem 16px .75rem}
.site-inner{max-width:44rem;margin:0 auto;justify-content:space-between}
.brand-org{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--muted)}
.brand-tool{font-size:1.6rem;font-weight:700;letter-spacing:-.01em}
nav{order:3;width:100%;border-top:1px solid var(--rule);padding-top:.4rem}
nav ul{font-size:.92rem;font-weight:500;justify-content:space-between}
main{max-width:40rem;margin:0 auto;padding:0 16px}
.hero{padding:3rem 0 1.5rem;text-align:center}
.kicker{font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 .75rem}
h1{font-size:clamp(2.3rem,7vw,3.6rem);line-height:1.05;font-weight:600;margin:0 0 1rem;letter-spacing:-.015em}
.dek{font-family:'Newsreader',Georgia,serif;font-style:italic;font-size:1.3rem;line-height:1.45;color:var(--muted);margin:0 auto;max-width:34rem}
.result{background:var(--surface);border-top:3px double var(--ink);border-bottom:3px double var(--ink);padding:1.5rem 1.25rem;margin:2rem 0 2.5rem}
.result-top{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap}
.result-title{font-size:1.1rem;font-weight:600;margin:0;text-transform:uppercase;letter-spacing:.1em;font-family:'Source Sans 3',sans-serif}
.tag{font-size:.75rem;font-style:italic;color:var(--muted);border:1px solid var(--rule);padding:.1rem .5rem}
.result-who{margin:.75rem 0 1.25rem}
.result-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:1rem;align-items:end;text-align:center}
.result-grid dt{font-size:.82rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.result-grid dd{font-size:clamp(2rem,7vw,2.8rem);font-weight:600;line-height:1.1}
.r-arrow{font-size:1.8rem;color:var(--muted);padding-bottom:.3rem}
.r-cf dd{color:var(--accent)}
.r-diff{grid-column:1/-1;border-top:1px solid var(--rule);padding-top:.75rem}
.r-diff dd{font-size:1.6rem}
.assumption{font-family:'Newsreader',Georgia,serif;font-size:1.15rem;margin:1.25rem 0 .5rem;text-align:center}
.assumption-label{font-weight:700}
.fine{font-size:.82rem;color:var(--muted);margin:0;text-align:center}
.prose h2{font-size:1.75rem;line-height:1.2;margin:2.5rem 0 .5rem;font-weight:600}
.prose p{margin:0 0 1rem}
.chart{margin:2rem 0 2.5rem;padding:1.5rem 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--rule)}
.chart-num{font-size:.75rem;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:700;margin:0}
.chart h3{font-size:1.45rem;line-height:1.2;margin:.25rem 0 .3rem;font-weight:600}
.chart-sub{margin:0;color:var(--muted);font-size:1rem}
.pc-plot{background:var(--surface)}
.cta{text-align:center;padding:2.5rem 0 3rem;border-top:3px double var(--ink);margin-top:1rem}
.cta h2{font-size:2.2rem;margin:0 0 .5rem;font-weight:600}
.cta p{color:var(--muted);max-width:30rem;margin:0 auto 1.5rem}
.button{border-radius:2px;letter-spacing:.04em}
.site-foot{border-top:1px solid var(--rule);padding:1.5rem 16px;font-size:.85rem;color:var(--muted);text-align:center}
@media (max-width:480px){.result-grid{grid-template-columns:1fr}.r-arrow{transform:rotate(90deg);padding:0}.result{padding:1.25rem 1rem}}
""",
)

# B. Ledger: crisp, cool, dark-friendly, wider grid with side notes --------------
THEMES["b-ledger"] = dict(
    title="Fair Share: Ledger",
    fonts="family=Spectral:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600",
    light={"bg": "#FFFFFF", "surface": "#F4F6F8", "ink": "#121820", "muted": "#4F5B67", "rule": "#D5DBE1",
           "accent": "#0A6B66", "on-accent": "#FFFFFF", "line-now": "#121820", "line-base": "#0A6B66",
           "b50": "#6B8CA8", "m40": "#46698C", "u9": "#2E4A78", "t09": "#5A3D8C", "t009": "#7B2C80", "t001": "#A0185A"},
    dark={"bg": "#0D1117", "surface": "#151B23", "ink": "#E6EDF3", "muted": "#9AA7B4", "rule": "#2A333E",
          "accent": "#4FD1C5", "on-accent": "#0D1117", "line-now": "#E6EDF3", "line-base": "#4FD1C5",
          "b50": "#4E6E8E", "m40": "#7AA3D2", "u9": "#A3C2F2", "t09": "#A88BE0", "t009": "#D47FD8", "t001": "#FF7FB0"},
    css="""
body{font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:1.0625rem;line-height:1.6}
h1,h2,h3,.brand-tool{font-family:'Spectral',Georgia,serif}
.result-grid dd,.legend td,.table-toggle td,.seg{font-family:'IBM Plex Mono',ui-monospace,monospace}
.site{background:var(--surface);border-bottom:1px solid var(--rule);padding:.8rem 16px}
.site-inner{max-width:72rem;margin:0 auto}
.brand{flex-direction:row;align-items:baseline;gap:.6rem}
.brand-org{font-size:.8rem;font-weight:600;letter-spacing:.04em;color:var(--muted)}
.brand-tool{font-size:1.25rem;font-weight:700}
nav{margin-left:auto}
nav ul{font-size:.9rem}
nav a[aria-current]{text-decoration:none;box-shadow:inset 0 -2px 0 var(--accent)}
main{max-width:72rem;margin:0 auto;padding:0 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:0 3rem}
@media (min-width:960px){main{grid-template-columns:minmax(0,40rem) minmax(0,1fr)}
 .hero,.prose,.cta{grid-column:1}.result{grid-column:2;grid-row:1/span 2;align-self:start;margin-top:3rem!important}
 .chart{grid-column:1/-1}}
.hero{padding:3rem 0 1rem}
.kicker{font-family:'IBM Plex Mono',monospace;font-size:.78rem;color:var(--accent);margin:0 0 .75rem;text-transform:uppercase;letter-spacing:.08em}
h1{font-size:clamp(2.1rem,5.5vw,3.2rem);line-height:1.08;font-weight:600;margin:0 0 1rem;letter-spacing:-.01em}
.dek{font-size:1.2rem;color:var(--muted);margin:0}
.result{border:1px solid var(--rule);background:var(--surface);padding:1.25rem;margin:1.5rem 0;border-radius:6px}
.result-top{display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;border-bottom:1px solid var(--rule);padding-bottom:.75rem}
.result-title{font-family:'IBM Plex Sans',sans-serif;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin:0;color:var(--muted)}
.tag{font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--accent);border:1px solid var(--accent);border-radius:3px;padding:.1rem .4rem}
.result-who{font-size:.98rem;margin:.9rem 0}
.result-grid{display:grid;grid-template-columns:1fr;gap:0}
.result-grid>div{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;padding:.6rem 0;border-bottom:1px dashed var(--rule)}
.result-grid dt{font-size:.92rem;color:var(--muted)}
.result-grid dd{font-size:1.5rem;font-weight:600}
.r-arrow{display:none!important}
.r-cf dd{color:var(--accent)}
.r-diff{border-bottom:2px solid var(--ink)!important}
.r-diff dd{font-size:1.9rem}
.assumption{font-size:.95rem;margin:1rem 0 .4rem;padding-left:.75rem;border-left:3px solid var(--accent)}
.assumption-label{font-weight:700}
.fine{font-size:.78rem;color:var(--muted);margin:0}
.prose h2{font-size:1.6rem;margin:2.5rem 0 .5rem;font-weight:600;line-height:1.2}
.prose p{margin:0 0 1rem}
.chart{margin:2.5rem 0;padding:1.5rem;border:1px solid var(--rule);border-radius:6px;background:var(--surface)}
@media (min-width:960px){.chart-bars{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:0 2.5rem}.chart-bars figcaption{grid-column:1/-1}.chart-bars .legend{align-self:center}.chart-bars .source{grid-column:1/-1}}
.chart-num{font-family:'IBM Plex Mono',monospace;font-size:.75rem;color:var(--accent);margin:0}
.chart h3{font-size:1.35rem;margin:.2rem 0 .3rem;font-weight:600;line-height:1.25}
.chart-sub{margin:0;color:var(--muted);font-size:.95rem}
.bar{height:40px;gap:1px}
.seg{font-size:.75rem}
.cta{padding:2rem 0 3rem}
.cta h2{font-size:1.8rem;margin:0 0 .4rem}
.cta p{color:var(--muted);margin:0 0 1.25rem}
.button{border-radius:4px}
.site-foot{border-top:1px solid var(--rule);padding:1.5rem 16px;font-size:.82rem;color:var(--muted);max-width:72rem;margin:0 auto}
@media (max-width:640px){nav{margin-left:0;order:3;width:100%}}
""",
)

# C. Poster: bold, bright, big numbers, colored section bands ---------------------
THEMES["c-poster"] = dict(
    title="Fair Share: Poster",
    fonts="family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800",
    light={"bg": "#FFFFFF", "surface": "#FFF6DD", "ink": "#16130F", "muted": "#55504A", "rule": "#16130F",
           "accent": "#2340CC", "on-accent": "#FFFFFF", "line-now": "#16130F", "line-base": "#2340CC",
           "band": "#E9F0FF",
           "b50": "#2A72AD", "m40": "#3D8F5A", "u9": "#8A6500", "t09": "#D2571F", "t009": "#C2306A", "t001": "#6A2FB0"},
    dark={"bg": "#121116", "surface": "#1D1B24", "ink": "#F6F2EA", "muted": "#B8B2A8", "rule": "#F6F2EA",
          "accent": "#8FA4FF", "on-accent": "#121116", "line-now": "#F6F2EA", "line-base": "#8FA4FF",
          "band": "#191A28",
          "b50": "#5AA8E6", "m40": "#5CBF7D", "u9": "#E0B23A", "t09": "#FF8A4C", "t009": "#FF6FA3", "t001": "#B88CFF"},
    css="""
body{font-family:'DM Sans',system-ui,sans-serif;font-size:1.15rem;line-height:1.6}
h1,h2,h3,.brand-tool,.result-grid dd{font-family:'DM Serif Display',Georgia,serif;font-weight:400}
.site{padding:1rem 16px;border-bottom:3px solid var(--ink)}
.site-inner{max-width:62rem;margin:0 auto}
.brand{flex-direction:row;align-items:center;gap:.6rem}
.brand-org{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;background:var(--ink);color:var(--bg);padding:.2rem .5rem}
.brand-tool{font-size:1.5rem}
nav{margin-left:auto}
nav ul{font-weight:700;font-size:.95rem}
nav a[aria-current]{text-decoration:none;color:var(--ink);background:var(--surface);border:2px solid var(--ink);padding:.15rem .6rem;border-radius:999px}
.theme-toggle{border:2px solid var(--ink);color:var(--ink);font-weight:700}
main{padding:0}
main>section,main>figure{padding-left:16px;padding-right:16px}
main>*>*{max-width:46rem;margin-left:auto!important;margin-right:auto!important}
.hero{background:var(--surface);padding-top:3.5rem;padding-bottom:3.5rem;border-bottom:3px solid var(--ink)}
.kicker{display:inline-block;font-weight:800;text-transform:uppercase;letter-spacing:.1em;font-size:.8rem;color:var(--accent);margin-bottom:1rem}
.hero .kicker{display:block}
h1{font-size:clamp(2.6rem,9vw,5rem);line-height:1;margin-top:0;margin-bottom:1.25rem;letter-spacing:-.01em}
.dek{font-size:1.3rem;line-height:1.5;margin-top:0;margin-bottom:0}
.result{padding-top:3rem;padding-bottom:3rem}
.result>*{max-width:46rem}
.result-top,.result-who,.result-grid,.assumption,.fine{position:relative}
.result-top{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
.result-title{font-size:2rem;margin:0}
.tag{font-weight:800;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;background:var(--ink);color:var(--bg);padding:.25rem .6rem;border-radius:999px}
.result-who{font-size:1.2rem}
.result-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.result-grid>div{border:3px solid var(--ink);border-radius:18px;padding:1rem 1.1rem;background:var(--bg);box-shadow:5px 5px 0 var(--ink)}
.r-arrow{display:none}
.result-grid dt{font-weight:700;font-size:.9rem}
.result-grid dd{font-size:clamp(2.2rem,8vw,3.6rem);line-height:1.05}
.r-cf{background:var(--surface)!important}
.r-cf dd{color:var(--accent)}
.r-diff{grid-column:1/-1;background:var(--accent)!important;color:var(--on-accent)}
.r-diff dt{color:var(--on-accent)}
.r-diff dd{font-size:clamp(2.6rem,10vw,4.5rem)}
.assumption{font-size:1.2rem;font-weight:500;margin-top:1.75rem;margin-bottom:.5rem}
.assumption-label{font-weight:800;color:var(--accent)}
.fine{font-size:.85rem;color:var(--muted);margin-top:0}
.prose{padding-top:1rem;padding-bottom:1rem}
.prose h2{font-size:clamp(2rem,6vw,2.8rem);line-height:1.1;margin-top:1.5rem;margin-bottom:.75rem}
.prose p{margin-top:0;margin-bottom:1.1rem}
.chart{background:var(--band);margin:2rem 0;padding-top:2.5rem;padding-bottom:2.5rem;border-top:3px solid var(--ink);border-bottom:3px solid var(--ink)}
.chart-num{display:inline-block;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin-top:0;margin-bottom:.25rem}
.chart figcaption{display:block}
.chart h3{font-size:clamp(1.7rem,5vw,2.3rem);line-height:1.1;margin-top:0;margin-bottom:.4rem}
.chart-sub{margin-top:0;color:var(--muted)}
.bars,.legend,.pc,.table-toggle,.source{max-width:46rem}
.pc{margin-left:auto!important;margin-right:auto!important;padding-left:2.9rem}
.pc-plot{background:var(--bg);border:2px solid var(--ink);--plot-bg:var(--bg)}
.connector polygon{opacity:.3}
.bar{height:52px;gap:3px}
.bar-inset{height:40px}
.seg{border-radius:4px;font-size:.85rem;font-weight:800}
.bar-label{font-weight:700;color:var(--ink)}
.legend{margin-top:1rem}
.legend th,.legend td{border-bottom:2px solid var(--ink)}
.sw{border-radius:50%}
.cta{text-align:center;padding-top:3.5rem;padding-bottom:4rem}
.cta h2{font-size:clamp(2.4rem,8vw,4rem);line-height:1;margin-top:0;margin-bottom:.75rem}
.cta p{color:var(--muted);margin-bottom:1.75rem}
.button{font-size:1.15rem;border:3px solid var(--ink);border-radius:999px;box-shadow:5px 5px 0 var(--ink);padding:1rem 2rem}
.site-foot{border-top:3px solid var(--ink);padding:1.5rem 16px;font-size:.85rem;color:var(--muted);text-align:center}
@media (max-width:640px){nav{margin-left:0;order:3;width:100%}.result-grid{grid-template-columns:1fr}}
@media (max-width:480px){.pc{padding-left:2.6rem}}
""",
)


def build(name, t):
    print(f"{name}:")
    ok = check_palette(name, "light", t["light"]) & check_palette(name, "dark", t["dark"])
    for mode in ("light", "dark"):
        p = t[mode]
        for k, *_ in GROUPS:
            col, r = seg_ink(p, k)
            if r < 4.5:
                print(f"  note {mode}: label ink on {k} = {r:.2f} (labels shown only on b50/m40/u9 and inset t09)")
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
{hero()}
{result_card()}
{prose_1()}
{bars()}
{prose_2()}
{stretched()}
{cta()}
</main>
{footer()}
{TOGGLE_JS}
</body>
</html>
"""
    (OUT / f"{name}.html").write_text(html)


if __name__ == "__main__":
    for n, t in THEMES.items():
        build(n, t)
