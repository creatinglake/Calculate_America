/**
 * / : the story (plan 6.1). A short scrolling explainer. Every number is
 * computed from the data files when the page loads.
 */
import { useMemo } from 'react';
import { buildQuantile, counterfactual, fromDataFile, GROUP_KEYS, GROUP_POP, groupShares, HOURS_PER_YEAR, mean, shapeOf, type GroupShares } from '../engine';
import { useFile } from '../app/useFile';
import { Link } from '../app/router';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { money, pct } from '../ui/format';

function StackBar({ shares, label }: { shares: Record<string, number>; label: string }) {
  return (
    <div>
      <p className="blabel">{label}</p>
      <div className="bar" role="img" aria-label={`${label}: ${GROUP_KEYS.map((k) => `${GROUP_LABEL[k]} ${pct(shares[k]!)}`).join(', ')}`}>
        {GROUP_KEYS.map((k) => {
          const w = shares[k]!;
          return (
            <div key={k} className="sg" data-small={w < 0.1}
              style={{ width: `${w * 100}%`, background: `var(--g-${k})`, color: `var(--g-${k}-ink)` }}>
              {w >= 0.07 ? pct(w, w >= 0.14 ? 1 : 0) : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <ul className="legend-row">
      {GROUP_KEYS.map((k) => <li key={k}><span aria-hidden className="sw" style={{ background: `var(--g-${k})` }} />{GROUP_LABEL[k]}</li>)}
    </ul>
  );
}

const top1 = (g: GroupShares) => g.t09 + g.t009 + g.t001;
const people = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : Math.round(n / 100) * 100 === 0 ? String(Math.round(n)) : (Math.round(n / 100) * 100).toLocaleString('en-US'));

export function Story() {
  const { data: file, error } = useFile('us-ptinc');
  const v = useMemo(() => {
    if (!file) return null;
    const year = Math.max(...file.years);
    const base = 1963;
    const today = fromDataFile(file, year), then = fromDataFile(file, base);
    const Q = buildQuantile(today);
    const adults = file.adults![String(year)]!;
    const median = Q.q(0.5);
    const topAvg = Q.meanBetween(0.9999, 1);
    const cfMedian = counterfactual(0.5, mean(today), shapeOf(then));
    // The bottom slice of adults whose combined income equals the top 0.01%'s.
    const target = Q.integral(0.9999, 1);
    let lo = 0, hi = 0.9999;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (Q.integral(0, mid) < target) lo = mid;
      else hi = mid;
    }
    const bottomEquivalent = hi;
    return {
      year, base, adults, median, topAvg, cfMedian,
      gToday: groupShares(today), gThen: groupShares(then),
      topHours: (median / topAvg) * HOURS_PER_YEAR,
      bottomEquivalent,
      meanToday: mean(today),
    };
  }, [file]);

  if (error) return <p role="alert" className="alert">Couldn't load the data: {error}</p>;
  if (!v) return <p className="sub" style={{ paddingTop: '2rem' }}>Loading…</p>;
  const { year, base, adults, median, topAvg, cfMedian, gToday, gThen, topHours, meanToday, bottomEquivalent } = v;

  return (
    <div className="story">
      <section className="story-step intro">
        <p className="eyebrow">Fair Share</p>
        <h1>How America divides its income, and what your share would be if it were divided differently</h1>
        <p className="dek">
          The economy produces a certain amount of income each year. How that amount is divided depends on
          laws, markets and history. Here's how it's divided now, and how it used to be.
        </p>
      </section>

      <section className="story-step card" aria-labelledby="s1">
        <p className="eyebrow">1 · How the pie is cut today</p>
        <h2 id="s1" className="story-h">Half of adults receive {pct(gToday.b50)} of the income</h2>
        <p className="sub">
          In {year} the average adult's income before taxes was {money(meanToday)}, but the median, the adult in the
          exact middle, had {money(median)}. The bottom half of adults received {pct(gToday.b50)} of all income. The top
          1% received {pct(top1(gToday))}.
        </p>
        <div className="bars">
          <StackBar label="Share of adults" shares={GROUP_POP} />
          <StackBar label={`Share of income, ${year}`} shares={gToday} />
        </div>
        <Legend />
      </section>

      <section className="story-step card" aria-labelledby="s2">
        <p className="eyebrow">2 · Zoom into the top</p>
        <h2 id="s2" className="story-h">The top 0.01% receive the median's yearly income every {topHours < 48 ? `${topHours.toFixed(0)} hours` : `${(topHours / 24).toFixed(0)} days`}</h2>
        <p className="sub">
          The top 0.01% is about {people(adults * 0.0001)} adults. Their average income in {year} was {money(topAvg)}, and
          together they received {pct(gToday.t001)} of all income: as much as the bottom {pct(bottomEquivalent, 0)} of adults
          combined, about {people(adults * bottomEquivalent)} people.
        </p>
        <p className="sub"><Link href="/top/">Zoom in step by step on The top, up close →</Link></p>
      </section>

      <section className="story-step card" aria-labelledby="s3">
        <p className="eyebrow">3 · How it was cut in {base}</p>
        <h2 id="s3" className="story-h">In {base} the bottom half received {pct(gThen.b50)}; the top 1%, {pct(top1(gThen))}</h2>
        <p className="sub">
          The economy has grown since then, but this compares only how it was divided: the share of income going to each
          group.
        </p>
        <div className="bars">
          <StackBar label={`Share of income, ${base}`} shares={gThen} />
          <StackBar label={`Share of income, ${year}`} shares={gToday} />
        </div>
        <Legend />
      </section>

      <section className="story-step card" aria-labelledby="s4">
        <p className="eyebrow">4 · What that means for one person</p>
        <h2 id="s4" className="story-h">The median adult would have {money(cfMedian)} instead of {money(median)}</h2>
        <p className="sub">
          Keep the economy the size it was in {year}, and divide it the way it was divided in {base}. The adult in the
          middle would receive {money(cfMedian - median)} more a year before taxes. Nothing else changes in this
          comparison: it assumes the same total income, and asks only how it is shared.
        </p>
      </section>

      <section className="story-step card result" aria-labelledby="s5">
        <p className="eyebrow">5 · Your turn</p>
        <h2 id="s5" className="story-h">Find your number</h2>
        <p className="sub">
          Enter your income to see where you stand, and what you'd receive if today's income were divided like another
          year, another country, or your own idea of fair.
        </p>
        <p style={{ marginTop: '1rem' }}><Link href="/explore/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Open the calculator</Link></p>
        <p className="fine">
          Before-tax national income per adult, couples' income split equally, {year} dollars. Data: World Inequality
          Database (Piketty, Saez and Zucman). <Link href="/methods/">How we calculate this</Link>.
        </p>
      </section>
    </div>
  );
}
