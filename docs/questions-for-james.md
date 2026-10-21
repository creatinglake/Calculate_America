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
