# Methods questions for James

Open questions from the build, for James Green-Armytage to review. Each has what the code does now.

## 1. Fallback curve inside bins (engine/quantile.ts)
The quantile function follows WID's generalized Pareto interpolation: phi(x) = -ln(income above p), x = -ln(1-p), quintic Hermite between bin edges, so every threshold and bin average is reproduced. Where the spline is not increasing inside a bin, the plan suggested a quadratic in rank; the code uses Q = t_lo + (t_hi - t_lo) u^k instead, with k set so the bin average is exact, because a quadratic can decrease.

How often: 5.6% of pre-tax bins (1962–2023), 6.6% post-tax, 44% of wealth bins.

## 2. Why the fallback happens where it does
In 2023 pre-tax it is used in bins 98, 99, 107, 108, 116, 117 and 125: the edges where WID's bins become ten times narrower (P99, P99.9, P99.99). WID's US thresholds are the midpoints of the two neighbouring bin averages (pipeline/VERIFICATION.md V9). Where a 1%-wide bin meets a 0.1%-wide bin, that midpoint is a poor estimate of the income at the edge, so no smooth increasing curve can pass through it and match both averages. The result is small visible kinks in the income-by-percentile chart in the top bands.

Tried: choosing the spline's second derivatives so its third derivative is continuous (a tridiagonal solve). It made things worse (8.4% fallback), so it was not kept.

Possible alternative: fit the curve to the bin averages only (gpinter's own inputs are thresholds and top averages, but WID's published thresholds here look derived), and report thresholds from the fitted curve. That changes what "matches WID" means for thresholds. Your call.

## 3. Auten-Splinter rescaling (pipeline/build.py smooth_factors)
Uniform per-group scaling broke monotonicity in 49 of 61 years; the build uses a factor that is piecewise-linear in rank (knots at group edges), the smoothest that hits every AS group share exactly (VERIFICATION.md V12). Factors range 0.54 to 1.32.

## 4. Gini from bins
Computed with the trapezoid rule on the 127-bin Lorenz curve, which slightly understates the true Gini (your deck's point). The methods page will say so.

## 5. Tax mode choices (engine/taxes.ts, model/taxRules.ts)
- **Taxable base:** base = income × (AGI / national income) − deduction − exemption, with the ratio for the data year (2023: 0.659) used for every schedule, since every schedule is applied to today's incomes. The plan said "r_year for that year"; using the historical year's ratio (1963: 0.652) would barely differ here.
- **Filing:** each equal-split adult is taxed on the single schedule. In 1953 and 1963 the standard deduction cap was $1,000 per return, so a married couple filing jointly got $500 each, while the per-adult model gives each adult up to $1,000. Small effect, but it slightly understates historical taxes on couples.
- **"Proportional to income below the median":** read as transfers to adults below the median in proportion to their income. The other reading (in proportion to how far below the median) is a one-line change.
- **Elasticity under effective-rate schedules:** there is no marginal rate, so the behavioural response uses the change in average rates by group. Statutory schedules use marginal rates at each bin's average income.
- **Negative revenue:** if a schedule raises less than current taxes, the recycling rule charges the shortfall (e.g. an equal charge per adult) rather than leaving it unfunded.
- Current-law comparisons use 2026 federal law (Rev. Proc. 2025-32), converted to 2023 dollars with CPI-U.
