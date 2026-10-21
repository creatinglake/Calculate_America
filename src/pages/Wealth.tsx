/** /wealth: wealth mode (plan section 8). */
import { useEffect, useId, useMemo, useState } from 'react';
import {
  counterfactual, fromDataFile, fromGroupShares, gini, groupShares, mean, place, shapeOf, topShare,
  type DataFile, type Distribution, type GroupShares, type Shape,
} from '../engine';
import { loadData, type DfaWealth, type Macro } from '../data/load';
import { useIncome } from '../app/income';
import { parseAmount, RankBar, toAnswers } from '../components/IncomeForm';
import { GroupSliders } from '../components/ScenarioPicker';
import { CareerWealth } from '../components/CareerWealth';
import { PeopleIncomeBars } from '../charts/PeopleIncomeBars';
import { ShareHistory } from '../charts/ShareHistory';
import { DfaHistory } from '../charts/DfaHistory';
import { ZoomGrid } from '../charts/ZoomGrid';
import { Link } from '../app/router';
import { money, moneyDiff, pct } from '../ui/format';

type Choice = { kind: 'year'; year: number } | { kind: 'equality' } | { kind: 'custom'; groups: GroupShares };
interface Loaded { hweal: DataFile; ptinc: DataFile; dfa: DfaWealth; macro: Macro }

const shapeCache = new WeakMap<DataFile, Map<number, Shape>>();
function allShapes(file: DataFile) {
  let m = shapeCache.get(file);
  if (!m) {
    m = new Map(file.years.map((y) => [y, shapeOf(fromDataFile(file, y))] as const));
    shapeCache.set(file, m);
  }
  return m;
}

function equality(d: Distribution): Distribution {
  const m = mean(d);
  return { ...d, avg: d.avg.map(() => m), thr: d.thr.map(() => m) };
}

export function Wealth() {
  const id = useId();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [netWorth, setNetWorth] = useState('');
  const [couple, setCouple] = useState(false);
  const [choice, setChoice] = useState<Choice>({ kind: 'year', year: 1963 });
  const [incomeFields] = useIncome();

  useEffect(() => {
    Promise.all([loadData('us-hweal'), loadData('us-ptinc'), loadData('us-dfa-wealth'), loadData('us-macro')])
      .then(([hweal, ptinc, dfa, macro]) => setData({ hweal, ptinc, dfa, macro }),
        (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const year = Math.max(...data.hweal.years);
    const today = fromDataFile(data.hweal, year);
    let scenario: Distribution | string;
    let label: string;
    if (choice.kind === 'year') {
      scenario = fromDataFile(data.hweal, choice.year);
      label = `US ${choice.year}`;
    } else if (choice.kind === 'equality') {
      scenario = equality(today);
      label = 'perfect equality';
    } else {
      const r = fromGroupShares(today, choice.groups);
      scenario = r.ok ? r.dist : r.reason === 'order'
        ? "This isn't possible: a lower group would have more wealth per person than a higher group."
        : 'These shares could not be turned into a valid distribution.';
      label = 'your custom division';
    }
    return { year, today, T: shapeOf(today), scenario, label };
  }, [data, choice]);

  const intro = (
    <div className="intro">
      <p className="eyebrow">Wealth</p>
      <h1>What you own, divided another way</h1>
      <p className="dek">
        Wealth is far more concentrated than income. Find where your net worth ranks, see how the same total wealth
        could be divided, and how income differences add up to wealth over a working life.
      </p>
    </div>
  );
  if (error) return <>{intro}<p role="alert" className="alert">Couldn't load the data: {error}</p></>;
  if (!data || !view) return <>{intro}<p className="sub">Loading the data…</p></>;

  const { macro } = data;
  const cpi = macro.cpi.ratio;
  const { year, today, T, scenario, label } = view;
  const nw = parseAmount(netWorth);
  const entered = netWorth.trim() !== '' && Number.isFinite(nw);
  const perAdult = entered ? (couple ? nw / 2 : nw) / cpi : null;
  const p = perAdult !== null ? T.Q.rank(perAdult) : null;
  const S = typeof scenario === 'string' ? null : shapeOf(scenario);
  const alt = p !== null && S ? counterfactual(p, T.mean, S) : null;
  const top20 = topShare(today, 0.2);

  // Income side for the career card: the user's income from the calculator, if entered.
  const answers = toAnswers(incomeFields);
  const incomeShapes = allShapes(data.ptinc);
  const incomeLatest = Math.max(...data.ptinc.years);
  const incomeP = answers
    ? incomeShapes.get(incomeLatest)!.Q.rank(place(answers, macro.compToWages[String(macro.compToWagesYear)]!, cpi).perAdultDataDollars)
    : null;
  const incomeScenarioYear = choice.kind === 'year' && incomeShapes.has(choice.year) ? choice.year : 1963;

  return (
    <>
      {intro}
      <div className="layout">
        <div className="inputs panel">
          <div className="in-group">
            <h2 className="panel-h"><span className="pdot" aria-hidden />Your net worth</h2>
            <label className="switch field">
              <input type="checkbox" checked={couple} onChange={(e) => setCouple(e.target.checked)} />
              <span className="track" aria-hidden />
              I share finances with a spouse or partner
            </label>
            <div className="field">
              <label htmlFor={`${id}-nw`}>What you own minus what you owe</label>
              <div className="money-in" data-invalid={netWorth.trim() !== '' && !Number.isFinite(nw)}>
                <span aria-hidden>$</span>
                <input id={`${id}-nw`} inputMode="decimal" autoComplete="off" placeholder="0" value={netWorth} onChange={(e) => setNetWorth(e.target.value)} />
              </div>
              <p className="hint">
                Homes, savings, retirement accounts and businesses, minus mortgages and other debts. Can be negative.
                {couple && ' We split it equally between the two of you, as the data does.'}
              </p>
            </div>
            {p !== null && <RankBar percentile={p} year={year} />}
          </div>
          <div className="in-group">
            <h2 className="panel-h"><span className="pdot" aria-hidden />Compare with</h2>
            <div role="radiogroup" aria-label="Compare with" className="seg-opts field">
              {(['year', 'equality', 'custom'] as const).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={choice.kind === k}
                  onClick={() => setChoice(k === 'year' ? { kind: 'year', year: 1963 } : k === 'equality' ? { kind: 'equality' } : { kind: 'custom', groups: groupShares(today) })}>
                  {k === 'year' ? 'Years' : k === 'equality' ? 'Equality' : 'Custom'}
                </button>
              ))}
            </div>
            {choice.kind === 'year' && (
              <div className="field">
                <label htmlFor={`${id}-y`}>Divide today's wealth like the US in</label>
                <select id={`${id}-y`} value={choice.year} onChange={(e) => setChoice({ kind: 'year', year: Number(e.target.value) })}>
                  {[...data.hweal.years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
            {choice.kind === 'equality' && <p className="hint">Everyone holds the average. A reference point, not a proposal.</p>}
            {choice.kind === 'custom' && <GroupSliders groups={choice.groups} onChange={(groups) => setChoice({ kind: 'custom', groups })} />}
          </div>
        </div>

        <div className="stack">
          {typeof scenario === 'string' && <p role="alert" className="alert">{scenario}</p>}
          {p !== null && alt !== null && perAdult !== null ? (
            <section className="card result" aria-labelledby="w-result-h">
              <h2 id="w-result-h" className="kpi-label">Your wealth under this division</h2>
              <p className="kpi"><span className="kpi-num" data-negative={alt < perAdult}>{moneyDiff((alt - perAdult) * cpi)}</span></p>
              <p className="result-text">
                If today's total wealth were divided like <strong>{label}</strong>, someone at your place would hold{' '}
                <strong>{money(alt * cpi)}</strong> instead of <strong>{money(perAdult * cpi)}</strong>.
              </p>
              <p className="assumption">Same average wealth per adult as {year}; only how it is divided changes. Today's dollars, net worth per adult.</p>
            </section>
          ) : (
            <p className="card">Enter your net worth to see where you rank and what you'd hold under this division.</p>
          )}
          {S && (
            <PeopleIncomeBars
              noun="wealth" today={groupShares(today)} scenario={groupShares(S.Q.dist)}
              todayLabel={String(year)} scenarioLabel={label}
              gini={{ today: gini(today), scenario: gini(S.Q.dist) }}
            />
          )}
          <section className="card" aria-labelledby={`${id}-na`}>
            <p className="eyebrow">What Americans think</p>
            <h2 id={`${id}-na`} className="card-title">The top 20%: perception and reality</h2>
            <p className="sub">
              In a 2005 survey of 5,522 Americans (Norton and Ariely, 2011), people estimated that the richest 20% held
              about 59% of the country's wealth, and said that ideally they would hold 32%.
            </p>
            <div className="bars">
              {[
                { label: 'Survey: ideal', v: 0.32 },
                { label: 'Survey: estimated', v: 0.59 },
                { label: `Data: actual, ${year}`, v: top20 },
              ].map((r) => (
                <div key={r.label}>
                  <p className="blabel">{r.label}</p>
                  <div className="bar bar-inset" role="img" aria-label={`${r.label}: ${pct(r.v, 0)}`}>
                    <div className="sg" style={{ width: `${r.v * 100}%`, background: 'var(--accent)', color: 'var(--accent-text)' }}>{pct(r.v, 0)}</div>
                    <div className="sg" style={{ width: `${(1 - r.v) * 100}%`, background: 'var(--border-soft)' }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="fine">
              Survey figures are perceptions of household wealth, not data. The actual share is the top 20% of adults'
              share of net personal wealth in {year} (World Inequality Database), not the survey's own figure.
            </p>
          </section>
          {incomeP !== null ? (
            <CareerWealth
              percentile={incomeP} scenario={incomeShapes.get(incomeScenarioYear)!}
              scenarioLabel={`US ${incomeScenarioYear}`} shapes={incomeShapes} cpiRatio={cpi}
            />
          ) : (
            <section className="card">
              <p className="eyebrow">Over a working life</p>
              <h2 className="card-title">From income to wealth</h2>
              <p className="sub">
                Enter your income on the <Link href="/explore/">calculator</Link> to see how a different division of
                income would have added up to wealth over your working life.
              </p>
            </section>
          )}
          <section className="card" aria-labelledby={`${id}-zoom`}>
            <h2 id={`${id}-zoom`} className="card-title">Wealth at the top, up close</h2>
            <ZoomGrid Q={T.Q} adults={data.ptinc.adults![String(year)] ?? data.ptinc.adults![String(Math.max(...data.ptinc.years))]!} year={year} wealth />
          </section>
          <ShareHistory file={data.hweal} noun="wealth" label="net personal wealth, adults" other={null} otherLabel="" />
          <DfaHistory data={data.dfa} />
        </div>
      </div>
    </>
  );
}
