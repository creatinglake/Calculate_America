/** /taxes: tax scenarios (plan section 7). */
import { useEffect, useId, useMemo, useState } from 'react';
import {
  GROUP_KEYS, buildQuantile, fromDataFile, groupShares, personalTax, place, revenueMaximizingTopRate, runTaxes,
  type DataFile, type Recycle, type Status, type TaxRule,
} from '../engine';
import { useIncome } from '../app/income';
import { loadData, type Macro, type TaxBrackets, type TaxEffective } from '../data/load';
import { IncomeForm, toAnswers } from '../components/IncomeForm';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { PeopleIncomeBars } from '../charts/PeopleIncomeBars';
import { currentLawRule, customRule, effectiveRule, historicalRule, latestEffectiveYear, type Indexing } from '../model/taxRules';
import { money, moneyDiff, moneyShort, pct } from '../ui/format';

type Mode = 'effective' | 'statutory' | 'custom';
interface Loaded { ptinc: DataFile; ptincAs: DataFile; eff: TaxEffective; brackets: TaxBrackets; macro: Macro }

const RECYCLE: { value: Recycle; label: string; hint: string }[] = [
  { value: 'dividend', label: 'Equal dividend', hint: 'The same check to every adult.' },
  { value: 'bottom50', label: 'Bottom 50% only', hint: 'Equal checks to the lower-income half of adults.' },
  { value: 'belowMedian', label: 'In proportion, below the median', hint: 'To adults below the median, in proportion to their income.' },
  { value: 'publicGoods', label: 'Public goods', hint: 'Spent on services, not returned as income. Only the revenue is shown.' },
];

function useLoaded() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([loadData('us-ptinc'), loadData('us-ptinc-as'), loadData('us-tax-effective'), loadData('us-tax-brackets'), loadData('us-macro')])
      .then(([ptinc, ptincAs, eff, brackets, macro]) => setData({ ptinc, ptincAs, eff, brackets, macro }),
        (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  return { data, error };
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="seg">
      <legend>{label}</legend>
      <div role="radiogroup" aria-label={label} className="seg-opts">
        {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </fieldset>
  );
}

export function Taxes() {
  const id = useId();
  const { data, error } = useLoaded();
  const [fields, setFields] = useIncome();
  const [mode, setMode] = useState<Mode>('effective');
  const [effYear, setEffYear] = useState(1963);
  const [statYear, setStatYear] = useState(1963);
  const [indexing, setIndexing] = useState<Indexing>('income');
  const [custom, setCustom] = useState([{ rate: 0.1, from: 0 }, { rate: 0.25, from: 60_000 }, { rate: 0.5, from: 500_000 }, { rate: 0.7, from: 5_000_000 }]);
  const [customStd, setCustomStd] = useState(16_000);
  const [recycle, setRecycle] = useState<Recycle>('dividend');
  const [elasticity, setElasticity] = useState(0);
  const [source, setSource] = useState<'psz' | 'as'>('psz');

  const view = useMemo(() => {
    if (!data) return null;
    const file = source === 'as' ? data.ptincAs : data.ptinc;
    const year = Math.max(...file.years);
    const Q = buildQuantile(fromDataFile(file, year));
    const latestEff = latestEffectiveYear(data.eff);
    let current: TaxRule, scenario: TaxRule;
    if (mode === 'effective') {
      current = effectiveRule(data.eff, latestEff);
      scenario = effectiveRule(data.eff, effYear);
    } else {
      current = currentLawRule(data.brackets, data.macro);
      scenario = mode === 'statutory'
        ? historicalRule(data.brackets, data.macro, statYear, indexing)
        : customRule(custom, data.macro, customStd);
    }
    const inputs = { Q, current, scenario, elasticity, recycle };
    return { file, year, Q, inputs, result: runTaxes(inputs), latestEff, adults: (data.ptinc.adults ?? {})[String(year)] ?? data.ptinc.adults![String(Math.max(...data.ptinc.years))]! };
  }, [data, source, mode, effYear, statYear, indexing, custom, customStd, recycle, elasticity]);

  const intro = (
    <div className="intro">
      <p className="eyebrow">Tax scenarios</p>
      <h1>Today's incomes, taxed another way</h1>
      <p className="dek">
        Keep today's pre-tax incomes, apply a different tax schedule, and return the extra revenue by a rule you pick.
        See what happens to your income after taxes and to each group's share.
      </p>
    </div>
  );
  if (error) return <>{intro}<p role="alert" className="alert">Couldn't load the data: {error}</p></>;
  if (!data || !view) return <>{intro}<p className="sub">Loading the data…</p></>;

  const { macro } = data;
  const { year, Q, inputs, result, latestEff, adults } = view;
  const cpi = macro.cpi.ratio;
  const compYear = macro.compToWagesYear;
  const compToWages = macro.compToWages[String(compYear)]!;
  const answers = toAnswers(fields);
  const mine = answers ? (() => {
    const pl = place(answers, compToWages, cpi);
    const p = Q.rank(pl.perAdultDataDollars);
    const status: Status = answers.sharesFinances ? 'mfj' : 'single';
    return personalTax(result, inputs, pl.perAdultDataDollars, p, status);
  })() : null;
  const effYears = Object.keys(data.eff.byYear).map(Number).sort((a, b) => b - a);
  const scope = mode === 'effective'
    ? `All taxes (federal, state and local: income, payroll, corporate, property, estate and sales), as average rates by group. Current: ${latestEff}, the latest year with estimates.`
    : `Federal income tax only, on approximate taxable income. Current: ${data.brackets.currentLaw.year} law.`;
  const revMax = revenueMaximizingTopRate(Q, elasticity);
  const totalRevenue = result.revenuePerAdult * adults * cpi;
  const before = groupShares(Q.dist);

  return (
    <>
      {intro}
      <div className="layout">
        <div className="inputs panel">
          <div className="in-group">
            <IncomeForm fields={fields} onChange={setFields} compToWages={compToWages} compYear={compYear} />
          </div>
          <div className="in-group">
            <h2 className="panel-h"><span className="pdot" aria-hidden />Tax schedule</h2>
            <Seg label="Compare current taxes with" value={mode} onChange={setMode}
              options={[{ value: 'effective', label: 'Effective rates' }, { value: 'statutory', label: 'Old brackets' }, { value: 'custom', label: 'Your own' }]} />
            {mode === 'effective' && (
              <div className="field">
                <label htmlFor={`${id}-ey`}>What each group actually paid in</label>
                <select id={`${id}-ey`} value={effYear} onChange={(e) => setEffYear(Number(e.target.value))}>
                  {effYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <p className="hint">The default: few people paid the old top statutory rates, because deductions and shelters kept effective rates much lower.</p>
              </div>
            )}
            {mode === 'statutory' && (
              <>
                <div className="field">
                  <label htmlFor={`${id}-sy`}>Federal income tax brackets of</label>
                  <select id={`${id}-sy`} value={statYear} onChange={(e) => setStatYear(Number(e.target.value))}>
                    {data.brackets.featuredYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <Seg label="Move the brackets to today by" value={indexing} onChange={setIndexing}
                  options={[{ value: 'income', label: 'Income growth' }, { value: 'inflation', label: 'Inflation' }]} />
                <p className="hint field">
                  Income growth keeps each bracket at the same place in the distribution. Inflation keeps its buying
                  power, so today's higher incomes reach the top brackets more easily.
                </p>
              </>
            )}
            {mode === 'custom' && (
              <div className="field">
                <p className="hint field">Rates on each slice of taxable income, single filer, today's dollars. Joint brackets are double.</p>
                {custom.map((row, i) => (
                  <div key={i} className="bracket-row">
                    <label>From $<input inputMode="numeric" value={row.from} disabled={i === 0}
                      onChange={(e) => setCustom(custom.map((r, j) => (j === i ? { ...r, from: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 } : r)))} /></label>
                    <label><input inputMode="decimal" value={Math.round(row.rate * 1000) / 10}
                      onChange={(e) => setCustom(custom.map((r, j) => (j === i ? { ...r, rate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) / 100 } : r)))} />%</label>
                    {i > 0 && <button type="button" className="table-toggle" style={{ marginTop: 0 }} onClick={() => setCustom(custom.filter((_, j) => j !== i))} aria-label={`Remove bracket ${i + 1}`}>Remove</button>}
                  </div>
                ))}
                <button type="button" className="table-toggle" onClick={() => setCustom([...custom, { rate: Math.min(0.99, custom[custom.length - 1]!.rate + 0.05), from: custom[custom.length - 1]!.from * 2 || 100_000 }])}>Add a bracket</button>
                <div className="field" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor={`${id}-sd`}>Standard deduction</label>
                  <div className="money-in"><span aria-hidden>$</span><input id={`${id}-sd`} inputMode="numeric" value={customStd} onChange={(e) => setCustomStd(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} /></div>
                </div>
              </div>
            )}
          </div>
          <div className="in-group">
            <h2 className="panel-h"><span className="pdot" aria-hidden />The extra revenue</h2>
            <div className="choice-list" role="radiogroup" aria-label="What happens to the extra revenue">
              {RECYCLE.map((r) => (
                <label key={r.value} title={r.hint}>
                  <input type="radio" name={`${id}-rec`} checked={recycle === r.value} onChange={() => setRecycle(r.value)} />
                  <span>{r.label}<span className="hint" style={{ display: 'block', margin: 0 }}>{r.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="in-group">
            <div className="field">
              <div className="slider-row">
                <label htmlFor={`${id}-e`}>How much people change their taxable income</label>
                <output htmlFor={`${id}-e`} className="tabular">{elasticity.toFixed(2)}</output>
              </div>
              <input id={`${id}-e`} type="range" min={0} max={100} step={5} value={Math.round(elasticity * 100)} list={`${id}-marks`}
                onChange={(e) => setElasticity(Number(e.target.value) / 100)} />
              <datalist id={`${id}-marks`}><option value={0} label="0" /><option value={25} label="0.25" /><option value={100} label="1" /></datalist>
              <p className="hint">
                0 = people don't change behavior. Saez, Slemrod and Giertz (2012) put the best estimates at 0.12 to
                0.40; 0.25 is in the middle.
              </p>
            </div>
            <Seg label="Pre-tax incomes from" value={source} onChange={setSource}
              options={[{ value: 'psz', label: 'Piketty-Saez-Zucman' }, { value: 'as', label: 'Auten-Splinter' }]} />
          </div>
        </div>

        <div className="stack">
          <p className="note">{scope}</p>
          {mine ? (
            <section className="card result" aria-labelledby="tax-result-h">
              <h2 id="tax-result-h" className="kpi-label">Your income after taxes</h2>
              <p className="kpi"><span className="kpi-num" data-negative={mine.difference < 0}>{moneyDiff(mine.difference * cpi)}</span><span className="kpi-unit">a year</span></p>
              <p className="result-text">
                After {mode === 'effective' ? 'all taxes' : 'federal income tax'}, you'd have <strong>{money(mine.scenario * cpi)}</strong> instead
                of <strong>{money(mine.now * cpi)}</strong>
                {mine.transfer > 0 && <>, including {money(mine.transfer * cpi)} from the returned revenue ({RECYCLE.find((r) => r.value === recycle)!.label.toLowerCase()})</>}
                {mine.transfer < 0 && <>, after a {money(-mine.transfer * cpi)} share of the revenue shortfall</>}.
              </p>
              <p className="fine">
                Tax now {money(mine.taxNow * cpi)}; under this schedule {money(mine.taxScenario * cpi)}. Income per adult in national
                income terms; today's dollars. {fields.sharesFinances && 'Taxed as a joint return, then split.'}
              </p>
            </section>
          ) : (
            <p className="card">Enter your income to see your own result. The effects on each group are below.</p>
          )}
          <section className="card" aria-labelledby="rev-h">
            <h2 id="rev-h" className="card-title">New revenue</h2>
            <p className="kpi"><span className="kpi-num" data-negative={totalRevenue < 0}>{moneyShort(totalRevenue)}</span><span className="kpi-unit">a year</span></p>
            <p className="result-text">
              {pct(Math.abs(result.revenueShareOfIncome))} of national income, or {money(Math.abs(result.revenuePerAdult) * cpi)} per adult
              {result.revenuePerAdult < 0 ? ' less than current taxes raise.' : ', compared with current taxes on the same incomes.'}
              {result.revenuePerAdult < 0 && recycle !== 'publicGoods' && ' This schedule raises less, so the rule you picked charges the shortfall instead of paying out.'}
            </p>
            {revMax && (
              <p className="fine">
                With people responding at {elasticity.toFixed(2)}, the top tax rate that raises the most revenue is about{' '}
                {Math.round(revMax.rate * 100)}% (1 / (1 + a × e), with the top 1%'s Pareto coefficient a = {revMax.pareto.toFixed(2)} from the data).
              </p>
            )}
          </section>
          <PeopleIncomeBars
            today={result.groupsAfterCurrent} scenario={result.groupsAfterScenario}
            todayLabel="after taxes now" scenarioLabel="after taxes under this schedule"
            gini={{ today: 0, scenario: 0 }} hideGini
          />
          <section className="card" aria-labelledby="who-h">
            <h2 id="who-h" className="card-title">Who pays more, who receives more</h2>
            <p className="sub">Change in income after taxes and transfers, per adult in each group, today's dollars.</p>
            <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
              <table className="data-table">
                <thead><tr><th scope="col">Group</th><th scope="col">Share before tax ({year})</th><th scope="col">After tax now</th><th scope="col">After tax, this schedule</th><th scope="col">Change per adult</th></tr></thead>
                <tbody>
                  {GROUP_KEYS.map((g) => (
                    <tr key={g}>
                      <th scope="row">{GROUP_LABEL[g]}</th>
                      <td>{pct(before[g])}</td>
                      <td>{pct(result.groupsAfterCurrent[g])}</td>
                      <td>{pct(result.groupsAfterScenario[g])}</td>
                      <td>{moneyDiff(result.groupChange[g] * cpi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">
              {elasticity > 0 ? 'Includes the change in pre-tax income from people responding to the new rates. ' : ''}
              Shares are of income after these taxes{recycle !== 'publicGoods' ? ' and the returned revenue' : ''}.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
