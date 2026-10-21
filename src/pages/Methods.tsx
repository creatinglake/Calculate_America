/**
 * /methods: how every number is calculated, written from the engine code
 * (src/engine) and the pipeline (pipeline/build.py). Parameter values are read
 * from the data files and the engine when the page loads.
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useMemo, type ReactNode } from 'react';
import {
  binShares, buildQuantile, fromDataFile, gini, mostEqualYear, revenueMaximizingTopRate, topShare,
  type DataFile, type Distribution,
} from '../engine';
import { useFile } from '../app/useFile';
import { Link } from '../app/router';
import { monthName, money, pct } from '../ui/format';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="card methods" aria-labelledby={id} id={id.replace('-h', '')}>
      <h2 id={id} className="card-title">{title}</h2>
      {children}
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return <p className="formula" role="math">{children}</p>;
}

function Lorenz({ a, b, la, lb }: { a: Distribution; b: Distribution; la: string; lb: string }) {
  const W = 360, H = 360, M = 36;
  const x = scaleLinear().domain([0, 1]).range([M, W - 10]);
  const y = scaleLinear().domain([0, 1]).range([H - M, 10]);
  const pts = (d: Distribution) => {
    const s = binShares(d);
    let c = 0;
    const out: [number, number][] = [[0, 0]];
    s.forEach((v, i) => { c += v; out.push([d.p1[i]!, c]); });
    return out;
  };
  const path = (p: [number, number][]) => line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]))(p) ?? '';
  return (
    <figure style={{ margin: '1rem 0 0' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 360, width: '100%' }} role="img"
        aria-label={`Lorenz curves for ${la} and ${lb}. The further below the diagonal, the more unequal.`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(1)} stroke="var(--gridline)" />
            <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--gridline)" />
            <text x={x(t)} y={H - 16} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{pct(t, 0)}</text>
            <text x={M - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)">{pct(t, 0)}</text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--axis)" strokeDasharray="4 4" />
        <path d={path(pts(b))} fill="none" stroke="var(--line-base)" strokeWidth={2.5} strokeDasharray="6 4" />
        <path d={path(pts(a))} fill="none" stroke="var(--line-now)" strokeWidth={2.5} />
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="var(--text-muted)">Share of adults, poorest first</text>
      </svg>
      <figcaption className="fine">
        Lorenz curves: the share of all income received by the poorest x% of adults. Solid: {la}. Dashed: {lb}. The Gini
        is twice the area between the curve and the diagonal.
      </figcaption>
    </figure>
  );
}

function fallbackShare(file: DataFile): { share: number; latest: number[] } {
  let power = 0, total = 0;
  for (const y of file.years) {
    const Q = buildQuantile(fromDataFile(file, y));
    power += Q.fits.filter((k) => k === 'power').length;
    total += Q.fits.length - 1;
  }
  const latest = buildQuantile(fromDataFile(file, Math.max(...file.years))).fits
    .map((k, i) => (k === 'power' ? i : -1)).filter((i) => i >= 0);
  return { share: power / total, latest };
}

export function Methods() {
  const ptinc = useFile('us-ptinc');
  const ptincAs = useFile('us-ptinc-as');
  const cainc = useFile('us-cainc');
  const hweal = useFile('us-hweal');
  const macro = useFile('us-macro');
  const cps = useFile('cps-panel');
  const eff = useFile('us-tax-effective');
  const brackets = useFile('us-tax-brackets');

  const v = useMemo(() => {
    if (!ptinc.data || !ptincAs.data || !cainc.data || !hweal.data || !macro.data || !cps.data || !eff.data || !brackets.data) return null;
    const p = ptinc.data, m = macro.data;
    const latest = Math.max(...p.years), first = Math.min(...p.years);
    const today = fromDataFile(p, latest), d1963 = fromDataFile(p, 1963);
    const Q = buildQuantile(today);
    const years = new Map(p.years.map((y) => [y, fromDataFile(p, y)] as const));
    const asLatest = Math.max(...ptincAs.data.years);
    const effYears = Object.keys(eff.data.byYear).map(Number);
    return {
      latest, first, today, d1963, Q,
      compYear: m.compToWagesYear, comp: m.compToWages[String(m.compToWagesYear)]!,
      agi: m.agiToNationalIncome, cpi: m.cpi,
      fallback: { ptinc: fallbackShare(p), cainc: fallbackShare(cainc.data), hweal: fallbackShare(hweal.data) },
      giniToday: gini(today), gini1963: gini(d1963), mostEqual: mostEqualYear(years),
      psz: { y0: first, t0: topShare(fromDataFile(p, first), 0.01), y1: asLatest, t1: topShare(fromDataFile(p, asLatest), 0.01) },
      as: { t0: topShare(fromDataFile(ptincAs.data, first), 0.01), t1: topShare(fromDataFile(ptincAs.data, asLatest), 0.01) },
      caincYears: [Math.min(...cainc.data.years), Math.max(...cainc.data.years)],
      caincMissing: (cainc.data.meta.missingYears as number[] | undefined) ?? [],
      hwealLatest: Math.max(...hweal.data.years),
      cps: cps.data, effRange: [Math.min(...effYears), Math.max(...effYears)],
      currentLaw: brackets.data.currentLaw, revMax: revenueMaximizingTopRate(Q, 0.25),
      adults: p.adults![String(latest)]!,
      asLatest,
      fallbackLatest: fallbackShare(p).latest.map((i) => `P${Number((today.p0[i]! * 100).toFixed(3))}`),
    };
  }, [ptinc.data, ptincAs.data, cainc.data, hweal.data, macro.data, cps.data, eff.data, brackets.data]);

  const intro = (
    <div className="intro">
      <p className="eyebrow">Methods</p>
      <h1>How Fair Share calculates</h1>
      <p className="dek">
        Every formula used on the site, described from the code that runs it. Numbers on this page are read from the
        same data files and calculations as the rest of the site.
      </p>
    </div>
  );
  const err = [ptinc, ptincAs, cainc, hweal, macro, cps, eff, brackets].find((f) => f.error)?.error;
  if (err) return <>{intro}<p role="alert" className="alert">Couldn't load the data: {err}</p></>;
  if (!v) return <>{intro}<p className="sub">Loading…</p></>;

  return (
    <>
      {intro}
      <nav aria-label="On this page" className="card toc">
        <ol>
          {[['measure', 'What we measure'], ['dollars', 'Years and dollars'], ['placing', 'Placing you'], ['quantile', 'Income at each percentile'],
            ['same-size', 'Same size economy'], ['results', 'Your results'], ['wealth-link', 'From income to wealth'], ['stats', 'Summary statistics'],
            ['custom', 'Custom divisions'], ['estimates', 'Two estimates of the top'], ['presets', 'Presets'], ['taxes', 'Tax scenarios'],
            ['wealth', 'Wealth'], ['surveys', "Why we don't use survey data for the top"], ['limits', 'Limitations']].map(([id, t]) => (
            <li key={id}><a href={`#${id}`}>{t}</a></li>
          ))}
        </ol>
      </nav>
      <div className="stack">
        <Section id="measure-h" title="What we measure">
          <p className="sub">
            <strong>People:</strong> adults age 20 and over. A married couple's income is split equally between them, so a
            couple with $120,000 counts as two adults with $60,000 each. This is the standard in the distributional national
            accounts of Piketty, Saez and Zucman (WID code 992j).
          </p>
          <p className="sub">
            <strong>Income before taxes:</strong> pre-tax national income (WID ptinc): wages, business income, capital
            income including corporate profits kept by companies (attributed to their owners), employer benefits and
            payroll taxes, and pensions received. It adds up to national income, which is what makes "the same size economy"
            consistent across years. Pension contributions are not counted; pension benefits are. (The wage adjustment
            below does not yet follow this rule exactly; see Placing you.)
          </p>
          <p className="sub">
            <strong>Income after taxes:</strong> post-tax disposable cash income: income after all taxes, plus cash
            transfers only (not health insurance or public services). For the US this comes from the authors' own published
            tables (Piketty, Saez and Zucman, updated series, Table C4b), which run {v.caincYears[0]} to {v.caincYears[1]}
            {v.caincMissing.length > 0 && <> with {v.caincMissing.join(', ')} missing (two top groups are blank in the source)</>}.
            The table gives average income in each group but not the income at each boundary; boundaries are set at the
            midpoint of neighbouring averages, which is how WID's own US boundaries are built.
          </p>
          <p className="sub">
            <strong>Wealth:</strong> net personal wealth (WID hweal): assets minus debts, same people and unit.
          </p>
          <p className="sub">
            <strong>Groups:</strong> every chart uses six groups that don't overlap: the bottom 50%, the middle 40% (P50 to
            P90), the upper 9% (P90 to P99), P99 to P99.9, P99.9 to P99.99, and the top 0.01%. The data come in 127 groups
            ("generalized percentiles"): each percentile up to P99, then tenths, hundredths and thousandths of a percent.
          </p>
        </Section>

        <Section id="dollars-h" title="Years and dollars">
          <p className="sub">
            Full distributions run from {v.first} to {v.latest}. The World Inequality Database's {v.latest + 1} figures copy
            {' '}{v.latest}'s division exactly, so {v.latest} is the latest year used. Before 1962 only the top groups are
            observed. "Today" is {v.latest} in the main view, {v.asLatest} with the Auten-Splinter estimates (their latest
            year), and {v.caincYears[1]} after taxes (the latest published); the wage adjustment and price conversion use{' '}
            {v.latest} in every view.
          </p>
          <p className="sub">
            Data figures are in {v.latest} dollars, using WID's national income price index. The income you enter is
            treated as this year's and converted to {v.latest} dollars with the consumer price index (CPI-U): the average of
            the latest twelve months available (through {monthName(v.cpi.through)}
            {v.cpi.missingMonths.length > 0 && <>; {v.cpi.missingMonths.map(monthName).join(', ')} was not published by the Bureau of Labor Statistics and is left out</>})
            {' '}divided by the {v.latest} average, a factor of {v.cpi.ratio.toFixed(4)}. Results are converted back to today's
            dollars the same way.
          </p>
        </Section>

        <Section id="placing-h" title="Placing you in the distribution">
          <p className="sub">
            A paycheck is smaller than its share of national income, which also counts employer health insurance,
            retirement contributions and payroll taxes. We multiply wages by the ratio of total employee compensation to
            wages and salaries in {v.compYear}, {v.comp.toFixed(3)} (Bureau of Economic Analysis, National Income and Product
            Accounts Table 1.12), and add self-employment income, interest, dividends and rent, and pension and Social
            Security benefits as entered. If you share finances, the total is split between two adults.
          </p>
          <p className="sub">
            Under review: total compensation also includes employer contributions to pensions and Social Security, which
            pre-tax national income does not count (it counts the benefits instead), and wages include the employee's own
            payroll tax. Counting only the parts of compensation that belong in this income concept would give a smaller
            factor and a somewhat higher rank. This is an open methods question.
          </p>
          <Formula>your income = (wages × {v.comp.toFixed(3)} + other income) ÷ (2 if you share finances) ÷ {v.cpi.ratio.toFixed(4)}</Formula>
          <p className="sub">
            Corporate profits kept by companies are part of national income but aren't asked for, so your rank is
            approximate.
          </p>
        </Section>

        <Section id="quantile-h" title="Income at each percentile">
          <p className="sub">
            The data give each group's average income and the income at its lower edge. To find the income at any
            percentile, we use a method based on the one the World Inequality Database uses, generalized Pareto
            interpolation (Blanchet, Fournier and Piketty, 2017). With x = −ln(1 − p), define
          </p>
          <Formula>φ(x) = −ln( total income of everyone above percentile p )</Formula>
          <p className="sub">
            At every group edge both φ and its slope are known exactly from the data: the slope is the edge income times
            (1 − p), divided by the income above p. Between edges φ is a quintic polynomial matching φ, its slope and a
            second derivative estimated from the neighbouring edges' slopes (the published method solves for these jointly
            for extra smoothness). Income at percentile p is then
          </p>
          <Formula>Q(p) = φ′(x) · e^(x − φ(x))</Formula>
          <p className="sub">
            This passes through every published edge income and reproduces every group's published average exactly, by
            construction. Above the last edge (P99.999) incomes follow a Pareto curve with b = average ÷ edge income and
            α = b ÷ (b − 1) (the published method uses a generalized Pareto tail).
          </p>
          <p className="sub">
            Where the curve would not be increasing inside a group, that group uses Q = t₀ + (t₁ − t₀)·u^k instead, where u
            is the position within the group, t₀ and t₁ its edge incomes, and k is set so the group's average is exact. This
            happens in {pct(v.fallback.ptinc.share)} of income groups across all years ({pct(v.fallback.cainc.share)} after
            taxes, {pct(v.fallback.hweal.share)} for wealth). In {v.latest} it is used for the groups starting at{' '}
            {v.fallbackLatest.join(', ')}, mostly next to the edges where groups become ten times narrower. WID's published
            edge incomes are the midpoints of neighbouring group averages, which a smooth curve can't always pass through
            there. This shows as small kinks in the income chart. The bottom group's lower edge is 0, or twice its average
            when that is negative.
          </p>
          <p className="sub">Your rank is found by searching for the percentile whose income equals yours.</p>
        </Section>

        <Section id="same-size-h" title="The same size economy, divided another way">
          <p className="sub">
            Every comparison keeps today's average income per adult and changes only how it is divided. The scenario
            supplies the shape; today supplies the size. For someone at percentile p:
          </p>
          <Formula>scenario income(p) = today's average × (1 − g) × Q_scenario(p) ÷ scenario's average</Formula>
          <p className="sub">
            g is the optional "smaller economy" slider (0 to 30%), for testing the idea that less inequality would have
            meant less growth. The break-even g, where the scenario stops paying more than today, is 1 − (your income ÷
            scenario income at g = 0). This is an assumption, not a claim that a past division could be restored without
            changing growth.
          </p>
        </Section>

        <Section id="results-h" title="Your results">
          <p className="sub">
            <strong>Per year:</strong> scenario income minus your income. <strong>Weeks of work:</strong> the difference ÷
            your income × 52. <strong>Rank:</strong> "more than X% of adults" is your percentile; "times the median" is your
            income ÷ the income at P50.
          </p>
          <p className="sub">
            <strong>Over a career:</strong> for each year from the year you started to {v.latest}, someone at your
            percentile receives that year's average income divided like the scenario, against what that percentile actually
            received that year. The differences are added up in today's dollars. You are assumed to stay at the same
            percentile every year. The "smaller economy" slider applies to every year.
          </p>
          <p className="sub">
            <strong>After taxes:</strong> the income you enter is before taxes, so it sets your percentile in the
            before-tax distribution of the same year; the result compares what someone at that percentile has after taxes
            and cash transfers, now and under the scenario.
          </p>
        </Section>

        <Section id="wealth-link-h" title="From income to wealth">
          <p className="sub">
            Each year's income difference is multiplied by a saving rate s (default 10%) and added to a balance that earns
            a real return r (default 3% a year after inflation):
          </p>
          <Formula>balance(year) = balance(year − 1) × (1 + r) + s × difference(year)</Formula>
          <p className="sub">The rate and return are assumptions you can change, not predictions.</p>
        </Section>

        <Section id="stats-h" title="Summary statistics">
          <p className="sub">
            Group shares add up each group's income. The Gini coefficient is computed from the 127-group Lorenz curve with
            the trapezoid rule. Treating everyone in a group as having the group's average ignores inequality inside the
            groups, so this slightly understates the true Gini. {v.latest}: {v.giniToday.toFixed(3)}; 1963:{' '}
            {v.gini1963.toFixed(3)}.
          </p>
          <p className="sub">
            The "most equal year" preset is the year from {v.first} to {v.latest} with the lowest Gini, {v.mostEqual.year}{' '}
            ({v.mostEqual.gini.toFixed(3)}). The year with the smallest top 1% share and the year with the largest bottom 50%
            share are not necessarily the same.
          </p>
          <Lorenz a={v.today} b={v.d1963} la={String(v.latest)} lb="1963" />
          <p className="sub">
            James Green-Armytage's work on the Paglin Gini, which separates inequality between age groups (people earn
            more mid-career) from inequality within them, is planned for a later version.
          </p>
        </Section>

        <Section id="custom-h" title="Custom divisions">
          <p className="sub">
            <strong>Group sliders:</strong> moving one slider takes from or gives to the others in proportion to their
            shares, so the total stays 100%. Each group's incomes are scaled by one number so its share is exactly what you
            set, keeping today's shape inside the group. If that would leave the top of one group with more than the
            bottom of the group above, the scaling inside those groups tilts, as little as possible, so incomes still
            rise from bottom to top: the factor becomes a straight line in rank within each group, with the least total
            slope that keeps the order. Edge incomes are then set at the midpoints of neighbouring averages. If a lower
            group would have more per person than a higher one, or the result would not rise steadily from bottom to top, the setting is refused.
          </p>
          <p className="sub"><strong>Blend:</strong> two divisions mixed at weight t, each scaled to its own average:</p>
          <Formula>Q(p) = [(1 − t) · Q_A(p) ÷ average_A + t · Q_B(p) ÷ average_B] × today's average</Formula>
          <p className="sub">
            <strong>Curve:</strong> the bottom 90% follow a lognormal curve with spread σ, the top 10% a Pareto curve with
            coefficient α, joined at P90 with no jump. Group averages are computed in closed form.
          </p>
        </Section>

        <Section id="estimates-h" title="Two estimates of the top">
          <p className="sub">
            Two research teams use the same tax data to estimate the distribution of national income and reach different
            answers about the top. In our data the top 1%'s share of income before taxes was {pct(v.psz.t0)} in {v.psz.y0}{' '}
            and {pct(v.psz.t1)} in {v.psz.y1} in the Piketty-Saez-Zucman series, and {pct(v.as.t0)} and {pct(v.as.t1)} in
            the Auten-Splinter series. Much of the gap comes from how income missing from tax returns is assigned (Tax
            Policy Center primer, Gale, Sabelhaus and Thorpe, 2023).
          </p>
          <p className="sub">
            Auten and Splinter publish group shares, not 127 groups. We take the Piketty-Saez-Zucman shape for each year and
            rescale it with a factor that changes smoothly with rank (straight-line pieces joined at the group edges, the
            smoothest such factor) so the six groups match Auten and Splinter's shares of pre-tax
            national income. Their groups contain equal numbers of all individuals, including children, ranked by tax-unit
            income divided by the square root of the number of people in the unit, which is close to, but not the same as,
            our unit. Their after-tax measure includes benefits like Medicare, so the switch applies to income before taxes
            only.
          </p>
        </Section>

        <Section id="presets-h" title="Presets">
          <p className="sub">
            <strong>Gilded Age (1928):</strong> only the top 10%, 1%, 0.1% and 0.01% shares are observed for 1928. The bottom
            90% is split between the bottom 50% and the middle 40% in the same ratio as 1962; the preset card shows the range
            if that ratio is 25% higher or lower. <strong>Other countries:</strong> the World Inequality Database's latest
            estimated year, same measure and unit; European series are built from surveys and tax data with different
            pension and public-sector conventions. France and Western Europe have no recent after-tax data, so they are
            pre-tax only. <strong>Perfect equality:</strong> everyone at the average.
          </p>
        </Section>

        <Section id="taxes-h" title="Tax scenarios">
          <p className="sub">
            Today's pre-tax incomes are taxed under another schedule, and the extra revenue is returned by the rule you
            pick. Revenue is always the scenario's taxes minus current taxes. With the behavior slider at 0 both are on the
            same incomes; above 0, the scenario's taxes are on the incomes after people respond.
          </p>
          <p className="sub">
            <strong>Effective rates (the default):</strong> each group's average tax rate, all taxes (federal, state and
            local; income, payroll, corporate, property, estate and sales), from Piketty, Saez and Zucman's Table G1,{' '}
            {v.effRange[0]} to {v.effRange[1]}. The table publishes cumulative top groups; the rates for P90 to P99, P99 to
            P99.9 and P99.9 to P99.99 are separated from them using each group's share of income (the top 0.01% rate is
            published directly). The table's rates are measured against income including capital gains; here they are
            applied to pre-tax national income. "Current" is {v.effRange[1]}, the latest year with estimates.
          </p>
          <p className="sub">
            <strong>Brackets:</strong> federal income tax only. Brackets apply to taxable income, not national income, so
            we estimate it:
          </p>
          <Formula>taxable income = income × (AGI ÷ national income) − standard deduction − exemptions</Formula>
          <p className="sub">
            using IRS adjusted gross income over BEA national income for {v.latest} ({(v.agi[String(v.latest)] ?? 0).toFixed(3)};
            {' '}it was {(v.agi['1963'] ?? 0).toFixed(3)} in 1963). The same ratio is used for everyone and for every schedule,
            since all schedules are applied to today's incomes; in reality the share of income that shows up as AGI differs
            a lot between income levels. Historical deductions follow the IRS reports: in 1953 and
            1963, 10% of AGI up to $1,000, plus $600 per exemption; in 1980 a zero bracket amount built into the schedule.
            Current law is {v.currentLaw.year} (IRS Revenue Procedure 2025-32), converted to {v.latest} dollars with CPI-U.
            Historical brackets are moved to today either by inflation (WID's national income price index) or by growth in
            national income per adult; the second keeps each bracket at the same multiple of average income, though not at
            the same percentile, because the shape of the distribution has changed. Each adult is taxed as a single filer.
            For 1953 and 1963 that matches joint filing for the brackets (joint brackets were exactly double), but not for
            the standard deduction, whose $1,000 cap applied per couple; in 1980 and today, joint brackets are not double
            the single ones. Your own result uses the joint schedule if you share finances. Tax is computed exactly across
            each group, including the Pareto tail, because tax is a straight line between bracket edges.
          </p>
          <p className="sub">
            <strong>Not modelled:</strong> the limits that kept actual top rates below the schedules. In 1953 the maximum
            effective rate was 88% (Tax Foundation); in 1963 income tax was limited to 87% of taxable income and capital
            gains could be taxed at an alternative 50% rate (IRS, Statistics of Income 1963); in 1980 a 50% maximum rate
            applied to personal service income (IRS, Statistics of Income 1980). The schedules here apply 92%, 91% and 70%
            to all income in the top brackets, so they overstate those years' taxes at the very top. Credits, the
            alternative minimum tax and itemized deductions are also not modelled.
          </p>
          <p className="sub">
            <strong>Returning the revenue:</strong> an equal amount per adult; equal amounts to the bottom 50% only; to
            adults below the median in proportion to their income; or kept for public goods (revenue only). If a schedule
            raises less, the same rule shares the shortfall.
          </p>
          <p className="sub">
            <strong>Behavior:</strong> with elasticity e, each group's pre-tax income becomes income × ((1 − τ′) ÷ (1 − τ))^e,
            where τ and τ′ are the current and scenario marginal tax per extra dollar of national income at the group's
            average (for brackets, the statutory rate × the AGI ratio, so a 37% bracket counts as about{' '}
            {pct(0.37 * (v.agi[String(v.latest)] ?? 0), 0)}; for effective schedules, the group's average rate). The
            revenue-maximizing top rate is 1 ÷ (1 + a·e), with a the Pareto coefficient of the top 1% in the data
            {v.revMax && <> ({v.revMax.pareto.toFixed(2)}, giving {pct(v.revMax.rate, 0)} at e = 0.25)</>}. That rate is a total
            marginal rate on national income from all taxes, not a federal bracket rate on taxable income.
          </p>
        </Section>

        <Section id="wealth-h" title="Wealth">
          <p className="sub">
            Wealth uses the same methods with net personal wealth instead of income, latest year {v.hwealLatest}. Net worth
            can be negative at the bottom. The Federal Reserve's Distributional Financial Accounts are shown separately: they
            count households, not adults, and publish group totals only, so they are never mixed into the adult
            distribution. The survey comparison uses only the top 20% figures stated in Norton and Ariely (2011); the paper
            gives its other quintiles only in a figure.
          </p>
        </Section>

        <Section id="surveys-h" title="Why we don't use survey data for the top">
          <p className="sub">
            Household surveys such as the Current Population Survey miss the top: few very rich people respond, and public
            files cap and swap the highest incomes for privacy. The survey also measures a different income concept and
            a different population (people with any income, not adults 20+ with couples' income split), so it isn't
            directly comparable. Compare the top shares:
          </p>
          <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
            <table className="data-table">
              <thead><tr><th scope="col">Income year</th><th scope="col">Survey: top 1%</th><th scope="col">Tax data: top 1%</th><th scope="col">Survey: top 0.1%</th><th scope="col">Tax data: top 0.1%</th><th scope="col">Highest survey income</th></tr></thead>
              <tbody>
                {v.cps.years.map((r) => (
                  <tr key={r.incomeYear}>
                    <th scope="row">{r.incomeYear}</th>
                    <td>{pct(r.cpsTop1Share)}</td><td>{pct(r.widTop1Share)}</td>
                    <td>{pct(r.cpsTop01Share)}</td><td>{pct(r.widTop01Share)}</td>
                    <td>{money(r.maxIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">
            Survey: IPUMS CPS Annual Social and Economic Supplement, people with positive total income (the survey asks about
            the previous calendar year). Tax data: World Inequality Database, pre-tax national income, adults 20+.
          </p>
        </Section>

        <Section id="limits-h" title="Limitations">
          <ul className="sub" style={{ paddingLeft: '1.2rem' }}>
            <li>The same size economy is an assumption. A different division might have meant faster or slower growth.</li>
            <li>Your rank is approximate: retained corporate earnings aren't asked for and the wage factor is an average.</li>
            <li>Distributions before 1962 are only observed at the top.</li>
            <li>The 0.001%-wide groups at the very top are the finest published; anything finer is interpolated.</li>
            <li>Tax scenarios are static unless you set the elasticity, and statutory schedules ignore credits, the AMT and
              most deductions.</li>
            <li>Career results assume you stay at the same percentile; people usually move up with age.</li>
          </ul>
          <p className="sub">
            Every data source, file and check is listed on <Link href="/sources/">Sources</Link> and in the project's
            verification log.
          </p>
        </Section>
      </div>
    </>
  );
}
