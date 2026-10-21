# Fair Share mockups: computed numbers

Source: public/data/us-ptinc.json  meta={'country': 'US', 'concept': 'ptinc', 'unit': '992j', 'dollarYear': 2023, 'source': 'wid'}  bins=127
All dollars are 2023 dollars, pre-tax national income per adult (20+), income split equally between spouses.

## Averages
- Mean income per adult 2023 (meanPerAdult): $89,363  -> shown as $89,400
- Mean income per adult 1963 (meanPerAdult): $36,755  -> shown as $36,800
- Check: sum(avg x bin width) 2023 = $89,363
- Scale factor mean2023/mean1963 = 2.4313
- Median (P50 threshold) 2023: $49,528  -> shown as $49,500
- Sum of shares: 2023 1.0002, 1963 1.0002 (bin shares are rounded to 4 dp in the data file)

## Headline card (illustrative, approximate)
- User income: $60,000
- Bin containing it: index 57 P57-P58, thresholds $59,420 to $60,958
- Percentile p = 0.57377  -> shown as 'higher than about 57% of adults'
- q1963(p) = $31,578 (1963 shape, in 2023 dollars, 1963-size economy)
- Counterfactual = $89,363 x $31,578 / $36,755 = $76,777  -> shown as $76,800
- Annual difference (shown) = $76,800 - $60,000 = +$16,800

## Group shares of pre-tax income (sum of bin shares)
| Group | Share of adults | Share of income 2023 | Share of income 1963 |
|---|---|---|---|
| b50 Bottom 50% | 50% | 13.5% (0.1346) | 19.0% (0.1895) |
| m40 Middle 40% | 40% | 39.8% (0.3980) | 44.5% (0.4448) |
| u9 Upper 9% | 9% | 26.0% (0.2602) | 23.6% (0.2360) |
| t09 P99–99.9 | 0.9% | 10.8% (0.1079) | 8.5% (0.0852) |
| t009 P99.9–99.99 | 0.09% | 5.2% (0.0522) | 2.9% (0.0293) |
| t001 Top 0.01% | 0.01% | 4.7% (0.0473) | 1.5% (0.0154) |
| Top 1% (t09+t009+t001) | 1% | 20.7% | 13.0% |

Top 1% inset (people): P99-99.9 = 90% of the top 1%, P99.9-99.99 = 9%, top 0.01% = 1% (population definitions).

## Income at selected percentiles (chart 3 table)
| Percentile | 2023 | 1963 shape at 2023 size (q1963 x 2.4313) |
|---|---|---|
| P10 | $9,118 -> $9,100 | $14,612 -> $14,600 |
| P25 | $23,870 -> $23,900 | $32,915 -> $32,900 |
| P50 | $49,528 -> $49,500 | $67,309 -> $67,300 |
| P75 | $93,969 -> $94,000 | $104,226 -> $104,200 |
| P90 | $163,428 -> $163,400 | $155,137 -> $155,100 |
| P99 | $547,495 -> $547,500 | $477,797 -> $477,800 |
| P99.9 | $2,576,049 -> $2.6 million | $1,727,450 -> $1.7 million |
| P99.99 | $12,422,631 -> $12.4 million | $5,841,569 -> $5.8 million |

## Chart 3 geometry
- Points: each bin's lower threshold at its p0 (p0 > 0), 126 per line; 1963 line multiplied by the scale factor.
- Y axis: log scale from $1,000 to $156,056,688 (max plotted value $124,845,350, the P99.999 threshold, x 1.25 headroom); ticks at $1,000, $10,000, $100,000, $1.0 million, $10.0 million, $100.0 million; points below $1,000 are clipped to the axis floor.
- X axis: four equal bands P0-90, P90-99, P99-99.9 (linear inside) and P99.9-P99.999 (log10 stretch inside).
- Y tick labels shown as $1k, $10k, $100k, $1M, $10M, $100M (axis gridlines, not statistics).
- 'You' marker at p=0.57377, x=0.1594; $60,000 on the 2023 line and $76,777 on the 1963 line.

## Definitions used as labels (not statistics)
- Group population shares (50%, 40%, 9%, 0.9%, 0.09%, 0.01%), 'Top 1%', 'Top 0.1%', band names P0-90, P90-99, P99-99.9, P99.9-100,
  inset proportions 90% / 9% / 1% of the top 1%, the sample income $60,000, and the years 1963 and 2023 are definitions or inputs from FAIRSHARE_PLAN.md.
- Every other figure on the mockup pages is printed above. build_mockups.py imports compute() from this script, so the pages and this file cannot drift.

## Round 2 additions (D Studio, E Harbor; built by build_mockups_de.py)
- Rank bar in the input panel: filled to p = 57.38% of its width; text 'Higher than about 57%'.
- Result card comparison bars: $60,000 bar is 78.12% of the $76,800 bar (lengths only, no new figure shown).
- Income bars: 2023 and 1963 group shares from the table above; brackets labelled 'Top 1%: 20.7%' and 'Top 1%: 13.0%'.
- Data table under the bars adds a 'Top 1% (last three rows)' total row using the Top 1% line above.
- Year picker options: the years present in the data file's byYear (1962-2023 less 2023), labels only.
- No other figures appear on D or E; all other numbers are the same values printed above.
