/** Headline result card (plan 6.2, chart 1). */
import type { Calculation } from '../model/calculate';
import { money, moneyDiff, moneyExact, monthName, percentAbove } from '../ui/format';

export function ResultCard({ calc, scenarioLabel, todayYear, cpiRatio, cpiThrough, growthPenalty, compToWages }: {
  calc: Calculation;
  scenarioLabel: string;
  todayYear: number;
  cpiRatio: number;
  cpiThrough: string;
  growthPenalty: number;
  compToWages: number;
}) {
  // The engine works in the data's dollars; show today's dollars.
  const now = calc.income * cpiRatio;
  const alt = calc.scenarioIncome * cpiRatio;
  const diff = alt - now;
  const weeks = calc.work ? Math.abs(calc.work.weeks) : null;
  const top = Math.max(now, alt, 1);
  return (
    <section aria-labelledby="result-h" className="card result">
      <h2 id="result-h" className="kpi-label">Your result</h2>
      <div className="result-body">
        <div>
          <p className="kpi" aria-label={`Difference per year: ${moneyDiff(diff)}`}>
            <span className="kpi-num" data-negative={diff < 0} title={moneyExact(diff)}>{moneyDiff(diff)}</span>
            <span className="kpi-unit">a year</span>
          </p>
          <p className="result-text">
            If today's income were divided like <strong>{scenarioLabel}</strong>, someone at your place would receive{' '}
            <strong>{money(alt)}</strong> instead of <strong>{money(now)}</strong>
            {weeks !== null && <>, a difference of about {weeks.toFixed(1)} weeks of work a year at your current pay</>}.
          </p>
          <p className="fine">
            You earn more than {percentAbove(calc.words.percentAbove)}% of adults
            {calc.words.multipleOfMedian !== null && <>, {calc.words.multipleOfMedian.toFixed(1)} times the median</>}.
          </p>
        </div>
        <div className="result-compare" aria-hidden>
          <div className="cmp-row">
            <div className="cmp-top"><span>Now ({todayYear} division)</span><strong>{money(now)}</strong></div>
            <div className="cmp-bar"><span className="cmp-now" style={{ width: `${(now / top) * 100}%` }} /></div>
          </div>
          <div className="cmp-row">
            <div className="cmp-top"><span>Divided like {scenarioLabel}</span><strong>{money(alt)}</strong></div>
            <div className="cmp-bar"><span className="cmp-base" style={{ width: `${(alt / top) * 100}%` }} /></div>
          </div>
        </div>
      </div>
      <p className="assumption">
        Same average income per adult as {todayYear}
        {growthPenalty > 0 ? `, made ${Math.round(growthPenalty * 100)}% smaller` : ''}; only how it is divided changes.
        {calc.breakeven !== null && diff > 0 && <> Your result stays higher unless the economy would have been more than {Math.round(calc.breakeven * 100)}% smaller.</>}
      </p>
      <HowCounted calc={calc} compToWages={compToWages} />
      <p className="fine">Dollars are today's, converted with CPI-U through {monthName(cpiThrough)}. Your rank is approximate.</p>
    </section>
  );
}

/** Shows how the entered amounts became income per adult in national-income terms. */
function HowCounted({ calc, compToWages }: { calc: Calculation; compToWages: number }) {
  const p = calc.placement;
  const wages = p.wagesScaled / compToWages;
  const other = p.combined - p.wagesScaled;
  const halved = p.perAdult !== p.combined;
  if (wages === 0 && !halved) return null;
  const parts: string[] = [];
  if (wages > 0) parts.push(`${money(wages)} wages × ${compToWages.toFixed(3)} for employer benefits and payroll taxes`);
  if (other !== 0) parts.push(`${money(other)} other income`);
  return (
    <p className="fine">
      How we count it: {parts.join(' + ')}
      {halved ? ', split between two adults' : ''} = {money(p.perAdult)} per adult.
    </p>
  );
}
