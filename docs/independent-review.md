# Independent review, 2026-10-21

A fresh agent that hadn't seen the build checked the methods page against the code and spot-checked the data against the original sources (FAIRSHARE_PLAN.md rule 8). Summary of its findings and what was done.

## Data spot checks: all matched
WID top 1% / bottom 50% shares for 1963 and 2023; the 2023-dollar deflator and mean income per adult; PSZ Table B1 vs WID; Auten-Splinter 2019 group shares; 2026 IRS brackets and standard deduction (all 14 thresholds); IRS AGI for 1953, 1963, 1980 and 2023; BEA compensation/wages 2023 (1.2130); CPI ratio (1.085519). Not done: comparison with the wid.world website (still open in VERIFICATION.md).

## Tests
1,303 unit tests, typecheck and 24 pipeline tests passed at review time.

## Findings and actions
| # | Finding | Action |
|---|---|---|
| 1 | Bug: after-tax view ranked the entered pre-tax income in the after-tax distribution | Fixed: rank by pre-tax income of the same year, compare after-tax incomes at that rank (commit "Fix after-tax view") |
| 2 | Wage factor 1.213 includes employer pension and Social Security contributions, which pre-tax national income excludes; about 1.10 on the reviewer's reading | **Open decision for Adam and James**; disclosed on the methods page |
| 3 | "Income-growth indexing keeps brackets at the same place in the distribution" was false | Corrected: same multiple of average income |
| 4 | "Single filer equals joint filing" misleading for deductions, 1980 and today | Corrected on the methods page |
| 5 | 1953 88%, 1963 87% and 50% capital gains, 1980 50% maximum tax not modelled | Verified in the sources; disclosed under "Not modelled" |
| 6 | Elasticity τ is per dollar of national income; revenue-max rate is a total marginal rate | Disclosed |
| 7 | Fallback locations sentence wrong | Now listed live from the engine |
| 8 | "The method WID uses" overstated | "Based on", with the differences described |
| 9 | Career mode ignored the smaller-economy slider | Fixed: applied every year |
| 10 | "Today" differs by view (2022 AS, 2019 after tax) | Stated on the methods page |
| 11 | Minor wording (revenue with elasticity, which groups are derived, G1 denominator, one AGI ratio, deflator vs CPI, builder 'shape' refusal, bottom edge rule, "two or three percentiles") | Corrected; the ±2–3 percentile figure (from the plan) removed from the methods page pending James |
