# Verification log

Every VERIFY item in FAIRSHARE_PLAN.md, and every other fact the pipeline relies on, is logged here: what was checked, against what, and the result. Codes are written the way the WID bulk files spell them (see V1). Raw file hashes are in `pipeline/raw/fetch_log.json` and `public/data/manifest.json`.

Status: **OK** verified · **PARTIAL** checked but something is still open · **OPEN** not yet checked · **CHANGED** the source contradicts the plan and Adam decided how to proceed.

---

## V1. WID variable code spelling — OK
- Checked: `WID_data_US.csv` from https://wid.world/bulk_download/WID_data_US.csv (Last-Modified 15 Oct 2026, retrieved 2026-10-20).
- The bulk files write concept + population letter + age: `sptincj992`. The plan and the WID codes dictionary write the API form `sptinc992j`. They are the same series. The pipeline uses the bulk spelling.

## V2. US 127-bin structure and year coverage — OK
- Checked: `sptincj992`, `aptincj992`, `tptincj992`, `sdiincj992` (+a, t), `shwealj992` (+a, t) in `WID_data_US.csv`.
- All 127 generalized percentiles (`p0p1` … `p98p99`, `p99p99.1` … `p99.8p99.9`, `p99.9p99.91` … `p99.98p99.99`, `p99.99p99.991` … `p99.999p100`) are present for every year listed.
- `ptinc` and `hweal`: 1820, 1850, 1880, 1900, 1910, then annually 1913–2024. `diinc`: annually 1913–2024. Values before 1962 are WID model estimates (metadata: "Before 1962 …"); the site uses 1962 onward, per PSZ 2018 QJE.
- Validation (plan 3.6) run on 1962–2023 for `ptinc` and `hweal`: shares sum to 1 within 0.002, averages and thresholds increase, every bin average lies between its thresholds. No failures.
- `ptinc` bottom bins are not negative in this vintage (the plan allowed for it). `hweal` has negative bottom bins in every year (1,233 bin-years), logged as warnings, as expected for net wealth.

## V3. Latest year: 2024 is a copy of 2023 — CHANGED (Adam chose 2023)
- In `WID_data_US.csv`, every one of the 127 `sptincj992` shares for 2024 is identical to 2023. Same for `sdiincj992` and `shwealj992`. The 2024 averages (`aptincj992`) equal the 2023 shape scaled to 2024 national income.
- So 2023 is the latest year with an estimated distribution. **Decision (Adam, 2026-10-20): "today" is 2023.** The build detects carried-forward years automatically (`build.latest_estimated`) and stops at the last real one.

## V4. Dollars and deflator — OK
- WID averages and thresholds are in constant 2025 USD: `inyixxi999` (national income price index) equals 1.000000 in 2025 (0.948861 in 2023, 0.126801 in 1963). Metadata: GDP deflator from UN SNA 1980–2024, Nievas & Piketty (2025) before 1980.
- The build rebases to 2023 dollars: value × `inyixxi999`[2023] / `inyixxi999`[2025].
- Check: `aptincj992` `p0p100` equals `anninci992` (national income per adult) in 1963, 2023 and 2024, so pre-tax income adds up to national income, as the plan's "same size economy" logic requires.

## V5. Post-tax disposable income (`cainc`) for the US — CHANGED (Adam chose PSZ tables)
- `scaincj992` in `WID_data_US.csv`: shares only, for 16 coarse groups (`p0p50`, `p50p90`, `p90p100`, `p99p100`, …), 1913–2019. No `acaincj992` or `tcaincj992`, no 127 bins.
- WID's US `diinc` (post-tax national income) is complete for 127 bins through 2024, but its metadata names the source as Fisher-Post & Gethin (2023), with 2019–2022 "estimated by applying the 2019 ratio of pretax to posttax income".
- PSZ's own updated series (Table C4b, "Average post-tax disposable cash income by g-percentile", equal-split adults 20+, $2018) has 127 bins for 1962–2019. 2020 is blank. **1985 is incomplete** (bins `p99.991`, `p99.992` blank), so 1985 is unavailable for post-tax and is not interpolated.
- Consistency: WID `scaincj992` top 1% 1963 = 9.67%, PSZ Table C1b top 1% 1963 = 9.67%. Same series.
- **Decision (Adam, 2026-10-20): the US after-tax view uses PSZ Table C4b.** Table C4b publishes averages only, so bin thresholds are derived (see the build and the methods page). Latest post-tax year is 2019.

## V6. Headline numbers: PSZ vs Tax Policy Center — OK (with a note)
- TPC primer (Gale, Sabelhaus, Thorpe, 21 Dec 2023), https://taxpolicycenter.org/taxvox/measuring-income-inequality-primer-debate, read 2026-10-20. Confirms the plan's figures: PSZ top 1% pre-tax 13% → 19% (1960 → 2019), after-tax 9% → 15%; AS pre-tax 10% → 14%, after-tax 8% → 9%. TPC says "top 1% of taxpayers"; figures are whole percents.
- PSZ's own updated series, https://gabriel-zucman.eu/files/PSZ2022AppendixTablesII(Distrib).xlsx (Feb 2022 vintage), Table B1 top 1% pre-tax: 1960 12.55%, 2019 19.08%. TPC's "13%" is this rounded.
- WID `sptincj992` `p99p100`: 1960 12.43%, 2019 19.04%. Within 0.12 points of PSZ Table B1.
- WID `sdiincj992` `p99p100`: 1960 9.14%, 2019 15.11%. Matches TPC's 9% → 15%.
- The plan's 0.5-point check against TPC's rounded "13%" fails by 0.07 for 1960 only because of TPC's rounding, so the build check compares against PSZ Table B1 directly (top 1% and bottom 50%, 1962, 1963, 1980, 2000, 2019, tolerance 0.5 points). All pass.

## V7. Comparison countries — PARTIAL
- Downloaded `WID_data_{SE,DK,NO,FI,FR,DE,GB}.csv` (Last-Modified 15 Oct 2026) and `WID_data_QX.csv` (Last-Modified 7 Aug 2025).
- `QX` is **Western Europe**. It is not listed in `WID_countries.csv` but its bulk file exists and `WID_metadata_QX.csv` names it "Western Europe". (`OC` is "Other Western Europe", a residual, not used.)
- 127-bin coverage (s, a, t all present):

| Area | `ptinc` | `diinc` | `cainc` | Shares copied from prior year |
|---|---|---|---|---|
| SE | 1820–2024 | 1980–2024 | 1980–2022 | ptinc 2020, 2024 |
| DK | 1820–2024 | 1980–2024 | 1980–2022 | ptinc 2020, 2024 |
| NO | 1820–2024 | 1980–2024 | 1980–2022 | ptinc 2020, 2024 |
| FI | 1921–2024 | 1980–2024 | 1980–2022 | ptinc 2024 |
| FR | 1820–2024 | 1980–2024 | 1970–1979 only | ptinc 2024 |
| DE | 1820–2024 | 1980–2024 | 1980–2022 | ptinc 2020, 2024 |
| GB | 1820–2024 | 1980–2024 | 1980–2022 | ptinc 1981, 2020, 2024 |
| QX | 1980–2023 | 1980–2023 | none | none |

- Implication per the plan: post-tax comparison is disabled for France (no recent `cainc`) and Western Europe (no `cainc`). Still to do: build and validate these files.

## V8. WID license — PARTIAL
- No terms-of-use page found on wid.world (`/terms-of-use/` returns 404; no license wording on `/data/`, `/methodology/`, `/graphs-faq/`).
- Every chart on https://wid.world/country/usa/ links "Creative Commons License" to https://creativecommons.org/licenses/by-nc-sa/4.0/ (CC BY-NC-SA 4.0: attribution, non-commercial, share-alike). Checked 2026-10-20 in a browser.
- Not found: a statement that the bulk data files carry the same license. Open question for Adam (non-commercial and share-alike implications). Possible confirmation: stats@wid.world.

---

## Open VERIFY items (not yet checked)
- NIPA compensation-to-wages factor (BEA NIPA Table 1.12).
- Auten-Splinter files: which is current, groups and years.
- DFA download format and latest quarter; latest `hweal` year (2023 estimated, see V3).
- PSZ effective tax rates by group: table and groups.
- Current-law 2025/2026 federal brackets (IRS).
- Historical brackets (Tax Foundation, IRS SOI); SOI total AGI and BEA national income for the taxable-base ratio.
- Gilded Age 1928 top shares non-blank (WID `ptinc` 1928 is present: top 1% 22.29%; still to validate as a preset).
- CPS 1963 file weighted total (about 60M): needs the spreadsheet and IPUMS sample notes.
- Spot check against WID's own website for 1963 and 2023 (top 1%, bottom 50%).

## V9. WID thresholds are midpoints of adjacent bin averages — OK
- For US `ptinc` and `diinc`, 1962–2023, every `t…j992` threshold above the bottom bin equals the arithmetic mean of the two adjacent bin averages (`a…j992`), within 0.04% (ptinc) and 0.006% (diinc). The geometric mean misses by up to 17%.
- Bottom bin: threshold is 0 when the bin average is positive (`tptincj992` `p0p1` 2019 = 0), and twice the average when negative (`thwealj992` `p0p1` 2019 = −131,235, average −65,618).
- `hweal` thresholds follow the rule less closely (up to 11% difference), so WID's published wealth thresholds are used as is.
- Used for: PSZ Table C4b, which publishes averages only. `build.derive_thresholds` applies the same rule, so post-tax thresholds are built the way WID builds its own.

## V10. US post-tax file (PSZ Table C4b) — OK
- Source: Table C4b in https://gabriel-zucman.eu/files/PSZ2022AppendixTablesII(Distrib).xlsx (Last-Modified 6 Feb 2022), equal-split adults 20+, "$2018, national income deflator".
- Converted to 2023 dollars with WID's `inyixxi999`[2023] / `inyixxi999`[2018]. This is WID's current deflator vintage, not necessarily the one PSZ used in 2022; the difference affects the dollar level of the post-tax series only, not its shape.
- Averages increase in every year 1962–2019. Group shares rebuilt from the 127 bins match PSZ's own Table C1b (top 1% and bottom 50%, 1962, 1963, 1980, 2000, 2019) within 0.02 points.
- 61 bin-years have a negative average (bottom bins): warnings, not failures.
- Output `us-cainc.json`: 57 years, 1962–2019 without 1985 (`meta.missingYears`).

## V11. Auten-Splinter files, groups, years and unit — OK (plan wording corrected)
- davidsplinter.com (read 2026-10-21) links three workbooks. Site labels: `AutenSplinter-IncomeIneq.xlsx` = "Extension through 2022" (Last-Modified 23 Feb 2026); `AutenSplinter-IncomeIneq-2024.xlsx` = "Original through 2019" (4 Apr 2025); `AS-Update-2025.xlsx` = data for "Income Inequality in the United States: Extensions and Updates" (4 Apr 2025, summary tables only). **Current file: `AutenSplinter-IncomeIneq.xlsx`.**
- Used: Table C2 (`C2-Shares`), block "2. Pre-tax National Income (232)", columns P0-50, P50-90, P90-100, P95-100, P99-100, P99.5-100, P99.9-100, P99.99-100. These give all six of the plan's groups.
- Years: 1960–2022. The 2023 row is `#DIV/0!` in every column and is skipped.
- Headline check against TPC: AS pre-tax top 1% 1960 = 10.38%, 2019 = 14.33% (TPC: 10% → 14%). After-tax block "4. After-tax National Income (408)": 1960 = 8.14%, 2019 = 9.18% (TPC: 8% → 9%).
- Unit (AS paper, JPE 132(7), July 2024, doi 10.1086/728741, sec. on "Base Income Groups on Numbers of Individuals and Rank by Size-Adjusted Income"): groups contain equal numbers of **all individuals, including dependents**; tax units are ranked by income divided by the square root of the number of individuals in the unit. The plan's description ("individuals with income split within the tax unit, close to 992j") understates the difference from 992j (adults 20+, equal split between spouses). The methods page must use the paper's description.
- AS's after-tax concept (408) is after-tax national income including in-kind transfers such as Medicare; it is not post-tax disposable cash income. The AS switch is therefore offered for pre-tax only. Open question for Adam whether to offer an AS post-tax comparison on a different concept.

## V12. AS-adjusted distribution: smooth rescaling — CHANGED (Adam chose smooth rescaling)
- The plan's method (scale every bin in a group by one factor, then re-solve thresholds) left bin averages falling at group edges by 4–8% (e.g. 2019: p50p51 average 3.8% below p49p50; p90p91 7.7% below p89p90). 49 of 61 years (1962–2022) failed the monotonicity check.
- **Decision (Adam, 2026-10-21): smooth rescaling.** Factor is piecewise-linear in percentile rank with knots at 0, P50, P90, P99, P99.9, P99.99, P100; knot values minimize the sum of squared differences between neighbouring knots, subject to each of the six groups matching AS exactly (`build.smooth_factors`). Thresholds re-derived with the midpoint rule (V9).
- Result: all 61 years pass validation; factors range from 0.54 to 1.32; group shares match AS to 1e-9 (2019: top 1% 14.33%, bottom 50% 15.75%). For James to review.

## V13. Federal Reserve DFA — OK (license OPEN)
- Downloaded https://www.federalreserve.gov/releases/z1/dataviz/download/zips/dfa.zip (Last-Modified 18 Sep 2026, retrieved 2026-10-21). CSV files; used `dfa-networth-shares.csv` (columns Date, Category, Net worth, …).
- Groups (`Category`): TopPt1 (top 0.1%), RemainingTop1 (99–99.9), Next9 (90–99), Next40 (50–90), Bottom50. Shares in percent, one decimal.
- Quarters: 1989:Q3 to **2026:Q2** (148 quarters). Every quarter sums to 100 within 0.3 points.
- Unit: households. The DFA overview page (https://www.federalreserve.gov/releases/z1/dataviz/dfa/, read 2026-10-21) describes it as the distribution of "household wealth" by percentile group. Group totals only, no thresholds.
- Output `us-dfa-wealth.json`: history chart only, labeled "households", never mixed into the 992j bins.
- License/reuse terms: not yet checked.

## V14. Latest `hweal` year — OK
- `shwealj992` 2024 is identical to 2023 in all 127 bins (same carry-forward as V3). Latest estimated wealth year: 2023, matching income.
