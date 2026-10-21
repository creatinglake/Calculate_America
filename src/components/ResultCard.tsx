/** Headline result card (plan 6.2, chart 1). */
import type { Calculation } from '../model/calculate';
import { money, moneyDiff, moneyExact, monthName, percentAbove } from '../ui/format';

export function ResultCard({ calc, scenarioLabel, todayYear, cpiRatio, cpiThrough, growthPenalty, compToWages }: {
  calc: Calculation;
  compToWages: number;
  scenarioLabel: string;
  todayYear: number;
  cpiRatio: number;
  cpiThrough: string;
  growthPenalty: number;
}) {
  // The engine works in the data's dollars; show today's dollars.
  const now = calc.income * cpiRatio;
  const alt = calc.scenarioIncome * cpiRatio;
  const diff = alt - now;
  const weeks = calc.work ? Math.abs(calc.work.weeks) : null;
  return (
    <section aria-labelledby="result-h" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 id="result-h" className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">Your result</h2>
      <HowCounted calc={calc} compToWages={compToWages} />
      <dl className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Your income now</dt>
          <dd className="text-2xl font-semibold tabular-nums" title={moneyExact(now)}>{money(now)}</dd>
        </div>
        <div>
          <dt className="text-sm text-[var(--text-muted)]">Divided like {scenarioLabel}</dt>
          <dd className="text-2xl font-semibold tabular-nums" title={moneyExact(alt)}>{money(alt)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-lg">
        Difference: <strong className={diff >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}>{moneyDiff(diff)}</strong> a year
        {weeks !== null && <>, about {weeks.toFixed(1)} weeks of work at your current pay</>}.
      </p>
      <p className="mt-2 text-sm">
        You earn more than {percentAbove(calc.words.percentAbove)}% of adults
        {calc.words.multipleOfMedian !== null && <>, {calc.words.multipleOfMedian.toFixed(1)} times the median</>}.
      </p>
      <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
        Assumes the same average income per adult as {todayYear}
        {growthPenalty > 0 ? `, made ${Math.round(growthPenalty * 100)}% smaller,` : ''}; only how it is divided changes.
        {calc.breakeven !== null && diff > 0 && <> Your result stays higher unless the economy would have been more than {Math.round(calc.breakeven * 100)}% smaller.</>}
        {' '}Dollars are today's, converted with CPI-U through {monthName(cpiThrough)}. Your rank is approximate.
      </p>
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
  if (wages > 0) parts.push(`${money(wages)} wages \u00d7 ${compToWages.toFixed(3)} for employer benefits and payroll taxes`);
  if (other !== 0) parts.push(`${money(other)} other income`);
  return (
    <p className="mt-2 text-sm text-[var(--text-muted)]">
      How we count it: {parts.join(' + ')}
      {halved ? `, split between two adults` : ''} = {money(p.perAdult)} per adult.
    </p>
  );
}
