# Fair Share — Build Plan

**Product:** Fair Share, a Calculate America tool, published at calculateamerica.com
**Owner:** Adam Lake. Methods advisor: James Green-Armytage.
**Repo:** github.com/creatinglake/Calculate_America (local: ~/Developer/Calculate_America)
**Status of this document:** build spec for a Claude Code session. Sections marked **VERIFY** are facts the build session must confirm against the source before relying on them. Sections marked **ASK ADAM** are decisions the session must stop and ask about.

---

## 1. What the tool does

Fair Share lets a person see how the US economy divides its income and wealth, and what their own income would be if the same total were divided differently.

The core move is simple and must be explained on every result:

> Find your rank in today's distribution. Keep the size of the economy fixed (same average income per adult). Change only how it is divided. Report what someone at your rank would receive.

Four ways to change how it is divided:

1. **Pick a year.** Any US year with full data (expected 1962 to the latest available year). Default comparison: 1963.
2. **Pick a preset.** Gilded Age US, US peak-equality year, Nordic countries, Western Europe, perfect equality, and survey-based "what Americans think" presets (see section 5).
3. **Build a custom distribution.** Set each group's share of total income with linked sliders, or blend between any two distributions.
4. **Change the taxes.** Keep today's pre-tax distribution, apply a different tax schedule, and return the extra revenue by a rule the user picks (section 7).

Plus a **wealth mode** (section 8) and a **top-of-the-distribution zoom** that makes the 1%, 0.1% and 0.01% visible (section 9).

### Non-goals for this build
- No claim that a past distribution can be restored without changing growth. The "same size economy" assumption is stated as an assumption, with an optional growth-penalty slider so users can test it.
- No behavioral tax modeling beyond one labeled elasticity slider.
- No user accounts, no backend, no collection of personal data. Everything runs in the browser.

---

## 2. Key concepts, defined once

**Unit of measure.** Who counts as "one person" changes every number. Default: **adults 20+, with income split equally between spouses** (WID code `992j`). A married couple with $120k combined counts as two adults with $60k each. This is the standard in the Piketty-Saez-Zucman data and avoids treating a non-earning spouse as "zero income." The input form asks "Do you share finances with a spouse or partner?" and if yes asks for combined income and halves it. Show the halving on screen.

**Income concept.** Default: **pre-tax national income** (WID `ptinc`). It includes wages, business income, capital income (including corporate retained earnings attributed to owners), employer benefits and payroll taxes, and pensions. It adds up to national income, which is what makes "same size economy" consistent across years. Pension benefits count, pension contributions don't (DINA pre-tax income is measured after the pension system operates).

Two post-tax concepts exist and must not be confused:
- **Post-tax disposable income** (WID `cainc`): minus all taxes, plus cash transfers only. This is the right concept for "what would your after-tax income be." Use it for all after-tax comparisons where published.
- **Post-tax national income** (WID `diinc`): minus all taxes, plus *all* public spending, including in-kind benefits and collective goods like roads and defense (with the deficit split 50/50 between taxes and spending). It is not money anyone receives. If shown, label it "includes the value of public services allocated to you, not cash."
- Use the same concept code for every comparison country. **VERIFY** `cainc992j` availability for the US and for each comparison country. If a country lacks it, disable its post-tax comparison rather than mixing `diinc` and `cainc`.

**Placing a user in the distribution.** A salary is smaller than its share of national income. A single gross-up factor can't fix this, because national income also includes capital income and retained earnings. Instead, the input form has a short income checklist: wages and salary; self-employment or business income; interest, dividends and rent; pension and Social Security benefits received. Apply the NIPA compensation-to-wages factor (BEA NIPA Table 1.12; **VERIFY** current value, around 1.2) to the wage line only, and say so. Tell the user their rank is approximate (plus or minus 2 to 3 percentiles) and that retained corporate earnings aren't asked for. Retirees enter benefits received.

**Real dollars.** All dollar figures in constant dollars of the latest data year, labeled ("2023 dollars" or whatever the latest year is). WID averages are already in constant local currency; use WID's own national income deflator for consistency. Convert to the current calendar year using CPI-U only for the user-entered income, and say so.

**Groups.** Every chart uses the same six non-overlapping groups with the same colors:

| Key | Group | Population share |
|---|---|---|
| b50 | Bottom 50% | 50% |
| m40 | Middle 40% (P50–P90) | 40% |
| u9 | Upper 9% (P90–P99) | 9% |
| t09 | P99–P99.9 | 0.9% |
| t009 | P99.9–P99.99 | 0.09% |
| t001 | Top 0.01% | 0.01% |

"Top 1%" = t09 + t009 + t001, and so on. Non-overlapping slices are what let the top groups be summed, compared and stacked.

---

## 3. Data

### 3.1 Primary: WID / Piketty-Saez-Zucman (PSZ) distributional national accounts

- Source: WID.world bulk download (country file for US) or WID API. Updated PSZ series also at gabriel-zucman.eu/usdina.
- Pull for US, unit `992j`, concepts `ptinc` and `diinc`, all available years:
  - shares (`s`), averages (`a`), thresholds (`t`) for the **127 generalized percentiles**: p0p1 … p98p99 (99 bins), p99p99.1 … p99.8p99.9 (9), p99.9p99.91 … p99.98p99.99 (9), p99.99p99.991 … p99.999p100 (10). Structure confirmed by the reviewer against the WID codes dictionary; still confirm in the downloaded file.
  - national income per adult (`anninc992i`), adult population (`npopul992i`), and the deflator.
- Full bottom-to-top distribution is annual **from 1962**. Before that, only the top 1% (from 1913) and top 10% (from 1917) are observed; WID's bottom 50% and middle 40% for 1946–61 are assumptions (they grow with the bottom 90%). Source: PSZ 2018 QJE, https://eml.berkeley.edu/~saez/PSZ2018QJE.pdf. The year slider therefore runs 1962 to latest. Earlier years appear only as top-share presets (section 5).
- Prefer the per-country download (`WID_data_US.csv` and `WID_metadata_US.csv`) over the full bulk zip. Record each file's hash in manifest.json.
- The latest data year lags the calendar by one to two years. Optionally use realtimeinequality.org for a labeled current-year mean; never mix it silently with WID.
- Also pull the same for Sweden, Denmark, Norway, Finland, France, Germany, UK and the WID Western Europe aggregate, latest available year, for presets.
- License: WID data is free to reuse with citation (**VERIFY** current terms); every chart cites its source.

### 3.2 Alternative estimate: Auten-Splinter (AS)

Two research teams disagree on how much the top share has grown. PSZ find the top 1% pre-tax share rose from about 13% to about 19% between 1960 and 2019; AS find about 10% to 14% (Tax Policy Center summary). AS also find the after-tax top 1% share roughly flat since 1960. The tool lets users switch between them so it can't be dismissed as one-sided.

- Source: AS public Excel files at davidsplinter.com (the reviewer found AutenSplinter-IncomeIneq.xlsx, AutenSplinter-IncomeIneq-2024.xlsx and AS-Update-2025.xlsx). **VERIFY** which file is current and what groups and years it covers.
- Reconcile against the published headline numbers (Tax Policy Center): top 1% pre-tax 1960→2019, PSZ 13%→19%, AS 10%→14%; after-tax PSZ 9%→15%, AS 8%→9%.
- AS rank individuals with income split within the tax unit. That is close to, not identical to, `992j`. Say so on the methods page.
- Implementation: AS doesn't publish 127 bins. Build an "AS-adjusted" distribution per year by taking the PSZ bins and rescaling each of the six groups so group shares match AS. After rescaling, re-solve bin thresholds so the quantile function stays continuous at group edges. If the monotonicity check fails for a year, disable the AS switch for that year. Label it "PSZ shape, rescaled to Auten-Splinter group shares."
- Where AS has no value for a group or year, the switch is disabled for that view with a note. Do not extrapolate.

### 3.3 Wealth

- **WID / Saez-Zucman wealth** (`hweal992j`, 127 bins with thresholds): primary for wealth mode. It's the only source that lets the engine rank a user's net worth and handle the top 0.01%, in the same unit as the income data.
- **Federal Reserve Distributional Financial Accounts (DFA)**: quarterly from 1989 Q3, groups top 0.1%, 99–99.9, 90–99, 50–90, bottom 50. Unit is **households**, and it publishes group totals only, no thresholds. Use it for the group-share history chart only, labeled "households." Never mix DFA shares into the `992j` bin structure.
- **VERIFY** the DFA download format and latest quarter, and the latest `hweal` year.

### 3.4 Taxes

- Historical federal income tax brackets and rates by year and filing status: Tax Foundation historical tables, cross-checked with IRS SOI. Reviewer-confirmed: 1963 rates 20% to 91% (91% above $200k single / $400k joint); 1964 16% to 77%; 1965 14% to 70% (Revenue Act of 1964). Still log the exact bracket table used.
- SOI total AGI by year and BEA national income by year, to compute the taxable-base ratio (section 7).
- Effective total tax rates by income group over time: PSZ appendix tables (federal, state, local; income, payroll, corporate, estate, sales). **VERIFY** the table and groups.
- Current-law 2025/2026 brackets from IRS. **VERIFY**.

### 3.5 Survey data (CPS) from Adam's spreadsheet

`Simple_1963_2024_Calculator_12-03-2025.xlsx` holds CPS ASEC microdata (IPUMS) for survey years 1963 (25,933 records) and 2024 (102,330), variables ASECWT and INCTOT. ASEC asks about the previous calendar year, so these are **income years 1962 and 2023**. Compare them with WID 1962 and 2023, not 1963 and 2024.

It is **not** the main data source. Surveys miss the top: 2024 CPS gives a top 1% share of 10.5% and top 0.1% of 1.9%, and the highest income is $2.1M, partly because IPUMS top-codes and rank-swaps high incomes for privacy. The two years' populations also differ (who has any income changed a lot). Use it for:
- A methods-page panel: "Why we don't use survey data for the top."
- A regression test: reproduce the spreadsheet result ($100,000 in income year 2023 = 83.1st percentile → $110,370 under the 1962 shape, with the 17.80× mean ratio).
- A note: the 1963 file sums to about 60M weighted earners, which looks low; **VERIFY** against IPUMS sample notes before quoting.

Later phase: age adjustment (James's Paglin Gini) from IPUMS CPS extracts. Requires Adam to make an IPUMS account and request an extract. **ASK ADAM** when reached.

### 3.6 Pipeline

- `pipeline/` directory, Python 3, pandas. One script per source: `fetch_wid.py`, `fetch_as.py`, `fetch_dfa.py`, `fetch_taxes.py`, `build.py`.
- Raw downloads go to `pipeline/raw/` (gitignored, large). Outputs go to `public/data/*.json` (committed, small).
- `public/data/manifest.json` lists every source: URL, retrieval date, version, license, citation text. The site's Sources page renders from this file.
- Output format (per country/concept/unit): `{ years: [...], bins: [{p0, p1}], byYear: { "1963": { avg: [...127], thr: [...127], share: [...127] }, ... }, meanPerAdult: {...} }`. Target total payload under 2 MB gzipped; lazy-load non-default files.
- Build-time checks that fail the build: shares in each year sum to 1 ± 0.002; averages increase across bins; thresholds increase; bin average lies between its thresholds; group shares for a few years match published PSZ headline numbers within 0.5 points. Bottom bins may be zero or negative in `ptinc` (p0p1 can be negative); that's a warning, not a failure.
- If a source cannot be downloaded from the session (network blocked, login wall), **stop and tell Adam** which file to download by hand and where to put it. Do not substitute invented or remembered numbers.

---

## 4. Calculation engine

Pure TypeScript, no UI imports, in `src/engine/`. Every function unit-tested (Vitest).

### 4.1 Distribution representation
A distribution is 127 bins with population width, average income, lower threshold. Mean = Σ width × avg.

### 4.2 Income at percentile p (quantile function)
This is the one thing a WID-literate economist will check first, so it must follow WID's own method (generalized Pareto interpolation, Blanchet, Fournier and Piketty 2017, "gpinter"). State that on the methods page.
- Inside each bin, fit a quantile function that matches **both** thresholds **and** the published bin average. (Straight-line interpolation between thresholds won't do this: its mean is the midpoint, not the published average.) Use a power (Pareto-form) interpolation q(p) = t_lo · ((1−p_lo)/(1−p))^(1/α_bin), with α_bin solved so the bin mean equals the published average. If the fit fails (for example bottom bins with zero or negative income), fall back to a quadratic-in-rank quantile constrained to the mean.
- Top bin (p99.999–p100): Pareto tail with inverted Pareto coefficient b = avg / threshold, giving α = b/(b−1).
- Tests: each bin's mean reproduced to 1e-6; monotonic and continuous across bin edges.

### 4.3 Rank of an income (inverse)
Binary search on the quantile function. Return percentile with up to 4 decimals (needed for the 0.01%). Incomes above the top-bin threshold get a percentile from the Pareto tail.

### 4.4 Counterfactual at the same size of economy
`cf(p) = meanToday × q_scenario(p) / mean_scenario`
That is, the scenario supplies only the shape; today supplies the size. This is what the spreadsheet does (17.80× ratio).

Optional **growth penalty** slider (default 0%): scales meanToday by (1 − x) to let a skeptic test "less inequality would have meant less growth." Range 0 to 30%. Show the breakeven: "Your result stays positive unless the economy would have been more than N% smaller."

### 4.5 Your results
- Annual difference, real dollars.
- Lifetime difference, two modes:
  - **Simple:** annual difference × years worked.
  - **Career (default when start year given):** for each year y from start year to latest, apply that year's mean and the scenario's shape at the user's current percentile. Sum in real dollars. Optional: let the user's percentile follow a typical age-earnings path (later phase, needs CPS).
- **Hours equivalent:** difference ÷ (your income ÷ your annual hours, default 2,000). "That equals N weeks of work a year at your current pay."
- Rank in words: "You earn more than X% of adults." "Your income is N× the median."

### 4.6 Custom distributions
Three builders, all producing a 127-bin distribution:
1. **Group shares:** six linked sliders (section 2 groups) that always sum to 100%. Moving one slider takes from or gives to the others in proportion. Within each group, keep the shape of a reference distribution (default: latest US year), rescale, and re-solve thresholds so the curve stays continuous. Show the implied threshold ladder live (top of bottom 50%, top of middle 40%, and so on) so users see the consequence of each setting. If a setting makes a lower group earn more per person than a higher one, show "This isn't possible: a lower group would earn more per person than a higher group" and block it.
2. **Blend:** a single slider between any two distributions (A at 0, B at 1), mixing quantile functions: q(p) = (1−t)·qA(p)/meanA + t·qB(p)/meanB, times meanToday. Replaces the old "accordion." Presets appear as named points.
3. **Parametric (advanced):** bottom 90% lognormal with σ slider, top 10% Pareto with α slider, joined smoothly. For people who want a "function for the distribution curve" (from the original spec). Show resulting group shares and Gini.

Shareable: every scenario serializes to the URL (e.g. `?s=custom&g=12.5,40,27,10,5.5,5`). Sharing a link reproduces the view.

### 4.7 Summary statistics
For any distribution: six group shares, top 10/1/0.1/0.01 shares, Gini, median, mean, ratio of top 1% average to bottom 50% average. Gini computed from the bins (trapezoid), with a note that bin-based Gini slightly understates (James's deck makes this point).

---

## 5. Presets

Each preset has a short card: what it is, the source, the year, and what is estimated vs observed.

| Preset | Source | Notes |
|---|---|---|
| US, any year 1962–latest | WID/PSZ | Year slider. Default 1963. |
| US most equal year | WID/PSZ | The year with the lowest Gini of the 127-bin distribution, 1962 to latest. Computed, not hard-coded. Say on the card how it's defined (the lowest top 1% share and the highest bottom 50% share fall in different years). |
| Gilded Age (US 1928) | WID `sptinc992j` top 10/1/0.1/0.01% shares for 1928 | Only the top 10% is observed for 1928. Confirm the 1928 values are non-blank in the US file; if blank, fall back to Piketty-Saez fiscal-income shares (tax units) and label the concept and unit difference. Split the bottom-90% remainder between b50 and m40 using the 1962 b50:m40 ratio. Show a range by also computing with that ratio ±25%. Card text: "Only the top 10% is observed for 1928; how the bottom 90% was split is an assumption." If it fails validation, drop the preset and tell Adam. |
| Sweden / Denmark / Norway (latest) | WID | Same concept and unit. Nordic countries are more equal mostly after taxes and transfers, so show pre-tax and post-tax together. Card note: "European series (Blanchet, Chancel, Gethin) are built from surveys and tax data with different pension and public-sector conventions." |
| Western Europe (latest) | WID region aggregate | |
| Perfect equality | — | Everyone at the mean. Reference point, not a proposal. |
| Auten-Splinter version of any US year | AS | Via the data switch. |
| "What Americans think it is / should be" | Norton & Ariely (2011), N = 5,522 | These were **wealth** quintile estimates, not income: top 20% estimated at 59%, ideal 32% (their "actual" was 84%, from 2005 data). Only offer in wealth mode, labeled as survey perceptions, and compare against today's actual from the data, not their 84%. Source: https://news.harvard.edu/wp-content/uploads/2016/02/norton_ariely.pdf. If a comparable income-perception survey exists, research and propose it to Adam; don't invent one. |

---

## 6. The interface

### 6.1 Site structure
- `/` **Story.** A short scrolling explainer, about five screens: how the pie is cut today; zoom into the top; how it was cut in 1963; what that difference means for one person; call to action "Find your number."
- `/explore` **Calculator.** Inputs on the left (or top on mobile), results and charts on the right. Scenario picker: Years · Presets · Custom · Taxes. Data switch: PSZ / Auten-Splinter. Concept switch: pre-tax / post-tax.
- `/top` **The top, up close.** The zoom grid and the to-scale parade.
- `/taxes` **Tax scenarios** (could be a tab of /explore; decide during build).
- `/wealth` **Wealth mode.**
- `/methods` **Methods.** Every formula from section 4, data definitions, the PSZ vs AS dispute, the CPS panel, the Gini and Paglin explanation from James's deck, limitations.
- `/ethics` **The case.** An essay on why distribution matters. Author: Adam and James. Build the page with placeholder text and a visible "draft" banner. **ASK ADAM** for the text; do not write the argument for him.
- `/sources` rendered from manifest.json.
- `/about` Calculate America, credits (James Green-Armytage, data authors), license (repo is GPL-3.0 per LICENSE), contact.

### 6.2 Charts
All charts share the six-group color scale, work in light and dark mode, and have a text alternative (a table toggle).

1. **Headline result card.** Your income now → under scenario, difference per year, per career, in weeks of work. One sentence that states the assumption.
2. **People vs income bars.** Two horizontal stacked bars, "share of people" and "share of income," six groups. Top groups are slivers in the first bar and blocks in the second. A zoom inset magnifies the top 1% of the people bar. Animates between scenarios.
3. **Stretched-percentile chart.** X axis split into four equal-width bands: P0–90, P90–99, P99–99.9, P99.9–100 (log-like stretch inside the last band). Y axis: income (log scale toggle). Lines for today and the scenario. A marker for "you." Second view of the same axis: growth since a chosen year by percentile (growth incidence curve).
4. **Powers-of-ten zoom grid.** 10×10 grid of adults. Click the top cell → it opens into the 100 sub-cells of the top 1% (each = 0.01% of adults). Click again → top 0.1%, then top 0.01%. Compute how many adults each cell represents from WID `npopul992i`; never hard-code it (roughly 2,600 per cell at the top-0.1% level and 260 at the top-0.01% level with ~258M adults). WID's finest bin is 0.001% wide, so cells inside the top 0.01% level are Pareto-interpolated; label them "interpolated." At each level show average income, threshold, multiple of median, and "earns the median annual income in N hours."
   Companion: a "within the top 1%" stacked bar (shares of t09, t009, t001 in the top 1% total) and a live "minutes to earn the median" counter.
5. **To-scale parade** (on /top and in the story). Each person's height proportional to income; median adult = 5'7". Vertical scroll; distance markers ("you are now as high as the Empire State Building"). Heights computed from real data. Optional for v1 if time is tight; build after charts 1–4.
6. **Group share history.** Stacked area of the six groups' shares, 1962–latest, with PSZ/AS switch. This is where the dispute is visible.
7. Lorenz curve and Gini: methods page only.

Library: D3 (scales, shapes, transitions) rendered into React SVG. Recharts can't do the stretched axis or the zoom grid well; drop it.

### 6.3 Look and feel
Editorial, not a SaaS dashboard. Remove "Guest User / Free Plan," the sidebar app shell and the onboarding modal. Reference style: data journalism explainers (NYT Upshot, The Pudding). Large readable type, generous whitespace, one accent color plus the six-group scale, serif for headlines and sans for body. Mobile first; every chart works at 375px width.
**ASK ADAM** for design direction before building section 6 visuals: offer two or three style directions as static mockups (one page each) and let him pick.

### 6.4 Language
- Neutral in the calculator: "difference," "your share under this scenario." Not "loss" or "stolen."
- Every result shows its assumption in one sentence.
- Plain words; define every term on first use with a tooltip.
- Numbers rounded sensibly ($48,100 not $48,064.23); show exact values in tooltips.

### 6.5 Accessibility and performance
WCAG AA contrast, keyboard-operable sliders and grid, `prefers-reduced-motion` respected, table alternative for each chart. Lighthouse performance ≥ 90 on mobile.

---

## 7. Tax mode

**Question it answers:** "If today's pre-tax incomes were taxed like year X (or like my custom brackets), and the extra revenue were returned by rule R, what would my after-tax income be?"

- **Base:** today's pre-tax distribution (PSZ or AS).
- **Schedules:**
  - Current law (federal income tax, single and married filing jointly).
  - Historical statutory brackets for any year (start with 1953, 1963, 1980), indexed to today by either (a) inflation or (b) growth in mean income per adult. User picks; explain the difference (b keeps brackets at the same place in the distribution).
  - Historical **effective** total tax rates by group (PSZ), applied as average rates per group. This is the **default** for historical comparisons and the only mode shown on the headline result card, because few people paid the 91% top rate in 1963; deductions and shelters kept effective rates far lower.
  - Custom bracket editor (add/remove brackets, set rates).
- **Taxable base for statutory schedules.** Statutory brackets must not be applied to pre-tax national income directly. National income includes employer payroll taxes, employer health benefits, pension accruals, retained corporate earnings and imputed items that never appear on a tax return; in 1963 taxable income was well under half of national income. Base per bin = bin average × r_year − standard deduction and exemptions, where r_year = SOI total AGI ÷ BEA national income for that year (compute it; don't assume a value). Label results "approximate taxable income."
- **Filing status.** Apply the single schedule to each equal-split adult. That equals joint filing with full income splitting: exact under 1948–1969 law (joint brackets were exactly double single brackets) and within a few hundred dollars at the top under current law. Use married-joint only for the user's own headline number.
- **Top bin:** integrate the schedule over the Pareto tail rather than applying it to the average. Document the approximation.
- **Scope label:** statutory schedules cover federal income tax only. Effective-rate schedules cover all taxes. The UI states which is in use.
- **Revenue to recycle = scenario revenue − current-law revenue**, both computed by the engine on the same base. Never recycle gross revenue.
- **Revenue recycling (user choice):** equal dividend per adult; to the bottom 50% only; proportional to income below the median; "public goods" (not returned to incomes; show revenue only). Show total new revenue in dollars and as % of national income.
- **Behavior:** elasticity of taxable income slider e, default 0 (static), range 0 to 1. Per bin: income′ = income × ((1 − τ′)/(1 − τ))^e, where τ is the current-law marginal rate and τ′ the scenario's. Mark 0.25 on the slider: Saez, Slemrod and Giertz (Journal of Economic Literature, 2012) put the best estimates at 0.12 to 0.40 (https://www.nber.org/papers/w15012). Also show the revenue-maximizing top rate 1/(1 + a·e), using the Pareto a from the data. Label: "0 = people don't change behavior."
- **Outputs:** your after-tax income now vs under the scenario; change in each group's after-tax share; revenue; who pays more, who receives more.

---

## 8. Wealth mode

- User enters net worth (and optionally age). Rank from WID `hweal992j` bins (section 3.3).
- Scenarios: same total wealth, divided like year X (WID years), presets, custom group shares. DFA appears only in the household group-share history chart.
- **Income-to-wealth link:** "If your annual income difference had been saved at rate s and earned real return r over your career, you'd have $N more." Sliders for s (default 10%) and r (default 3% real). Label these as assumptions.
- Norton & Ariely perception presets live here, labeled.
- Zoom grid and people-vs-wealth bars reused with wealth data.

---

## 9. Showing the 1%, 0.1%, and 0.01%

Summarized from above, since this is the central design problem:
- Non-overlapping groups so the top slices can be seen and summed (section 2).
- Stretched percentile axis giving each tenfold-smaller group equal width (chart 3).
- Powers-of-ten zoom grid (chart 4).
- People-vs-income bars with a magnified inset (chart 2).
- To-scale parade for gut impact (chart 5).
- Time comparisons: "the top 0.01% average earns the median annual income every N hours" (computed live).

---

## 10. Technology

- Vite + React 19 + TypeScript (strict). D3 for charts. Tailwind via npm (not CDN). Vitest for unit tests (the gate for every commit). Playwright for a few smoke tests only (pages load, calculator returns a result); screenshot-diff tests are too flaky to gate on.
- No backend. Static build to `dist/`.
- Remove the unused Gemini dependency and `.env` requirement.
- State: URL query params as the source of truth for scenario state; React context for derived values. localStorage only for "remember my inputs," wrapped in try/catch, off by default.
- Rebuild approach: work on branch `rebuild`. Move the current app to `legacy/` in the first commit so it can be referenced, delete it once the new app is at parity.
- **Commits small and frequent** (Adam's standing preference): one logical change per commit, tests passing at each commit, descriptive messages. Never a single giant commit. Open a PR from `rebuild` to `main` at the end of each phase.

---

## 11. Hosting and launch

- **Host (decided 2026-10-20):** GitHub Pages, deployed from `main` by GitHub Actions. No per-PR preview deploys; Adam reviews each PR locally with `npm run dev` / `npm run preview`.
- Build command `npm run build`, output `dist`. GitHub Pages has no SPA fallback, so the build copies `index.html` to every route path and to `404.html`.
- **Domains (decided 2026-10-20):** Fair Share lives at **fairshare.calculateamerica.com** (CNAME in `public/CNAME`). The apex calculateamerica.com redirects there via GoDaddy forwarding until other Calculate America tools exist. Registrar and DNS: **GoDaddy**.
- **Analytics (decided 2026-10-20):** none. Keep it easy to add a cookie-free script later; nothing to build now.
- Social sharing: Open Graph image per page; scenario links generate a readable title ("If America's income were divided like 1963").
- Launch checklist: GitHub Pages enabled (repo public, or a paid plan); all VERIFY items resolved and logged in `pipeline/VERIFICATION.md`; methods page reviewed by James; Lighthouse ≥ 90; tested on iPhone Safari and Android Chrome widths; 404 page; sources page complete.

---

## 12. Phases and order of work

Each phase ends with a PR, a preview deploy, and a short note to Adam of what changed and what's next.

**Phase 0: Setup (half a day)**
- Branch, move legacy app, new Vite/TS/Tailwind/Vitest/Playwright scaffold, CI (GitHub Actions: typecheck, test, build).
- Ask Adam the ASK ADAM items that block later phases: hosting/registrar, landing page structure, analytics.

Phase 3 (design mockups) waits on Adam's choice, so start it right after Phase 0 and run it alongside Phases 1 and 2. Don't let the session sit idle waiting for an answer.

**Phase 1: Data pipeline**
- WID US (ptinc, diinc, 992j, 127 bins, all years) → JSON with validation.
- CPS regression test from the spreadsheet.
- AS, DFA, tax tables, comparison countries.
- `VERIFICATION.md` logging each VERIFY item: what was checked, against what, result.

**Phase 2: Engine**
- Quantile/rank functions, counterfactual, career mode, hours, custom builders, summary stats, URL serialization. Full test coverage including property tests (shares sum to 1, mean preserved by every scenario, quantile monotonic).

**Phase 3: Design direction**
- Two or three static mockups. Adam picks one.

**Phase 4: Explorer and core charts**
- Calculator page with years, presets, custom, PSZ/AS and pre/post-tax switches. Charts 1, 2, 3, 6.

**Phase 5: The top**
- Zoom grid, then parade.

**Phase 6: Tax mode**

**Phase 7: Wealth mode**

**Phase 8: Story, methods, ethics, sources, about**
- Methods page written from the engine code so formulas match. Send to James for review.

**Phase 9: Launch**
- Hosting, DNS, launch checklist, go live.

**Later:** age adjustment (Paglin) with IPUMS CPS; state-level data; additional Calculate America tools.

---

## 13. Verification standard

- No number appears on the site unless it comes from a file in `public/data/` built by the pipeline, or is computed by the engine from those files. No hard-coded statistics in UI code.
- Every VERIFY item resolved and logged before launch. Each `VERIFICATION.md` entry gives the exact code checked (e.g. `sptinc992j`, `p99.999p100`), the first and last year found in the file, the source URL, and the result, so a reviewer can check it without rerunning the pipeline.
- WID's reuse license isn't stated on the codes dictionary. Find it on the wid.world terms page before launch.
- Spot checks: the site's top 1% / bottom 50% shares for 1963 and the latest year match WID's own site within rounding.
- An independent review pass (a fresh agent that hasn't seen the build) checks the methods page against the engine code and the data against sources before launch.

---

## 14. Sources to start from

- WID codes dictionary: https://wid.world/codes-dictionary/
- WID data: https://wid.world/data/ (bulk download linked there)
- PSZ updated US series: https://gabriel-zucman.eu/usdina/
- PSZ 2024 technical note: https://eml.berkeley.edu/~saez/PSZ2024.pdf
- Auten and Splinter: https://davidsplinter.com/AutenSplinter-Tax_Data_and_Inequality.pdf and data on davidsplinter.com
- Tax Policy Center primer on the PSZ/AS debate: https://taxpolicycenter.org/taxvox/measuring-income-inequality-primer-debate
- Federal Reserve DFA: https://www.federalreserve.gov/releases/z1/dataviz/dfa/
- Realtime Inequality (Blanchet, Saez, Zucman): https://realtimeinequality.org
- Tax Foundation historical brackets: https://taxfoundation.org (historical federal income tax rates and brackets)
- CPS vs tax data on top incomes (Burkhauser et al.): https://www.iser.essex.ac.uk/research/publications/publication-512773
- PSZ 2018 QJE (data coverage by year): https://eml.berkeley.edu/~saez/PSZ2018QJE.pdf
- Saez, Slemrod and Giertz on the elasticity of taxable income: https://www.nber.org/papers/w15012
- Norton and Ariely 2011: https://news.harvard.edu/wp-content/uploads/2016/02/norton_ariely.pdf
- Blanchet, Fournier and Piketty, generalized Pareto interpolation (gpinter): WID working paper, 2017
- James Green-Armytage, "The Mysteries of the Paglin Gini" (deck, in Adam's files)
