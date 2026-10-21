/** /explore: the calculator (plan 6.1). */
import { useMemo } from 'react';
import type { DataFile, Shape } from '../engine';
import { fromDataFile, gini, groupShares, shapeOf } from '../engine';
import { useCalculatorData } from '../app/useData';
import { useViewState } from '../app/useViewState';
import { useIncome } from '../app/income';
import { IncomeForm, RankBar, toAnswers } from '../components/IncomeForm';
import { CareerWealth } from '../components/CareerWealth';
import { PresetCard } from '../components/PresetCard';
import { ResultCard } from '../components/ResultCard';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { Switches } from '../components/Switches';
import { PeopleIncomeBars } from '../charts/PeopleIncomeBars';
import { ShareHistory } from '../charts/ShareHistory';
import { StretchedChart } from '../charts/StretchedChart';
import { calculate } from '../model/calculate';
import { presetList, resolve, seriesFor } from '../model/scenarios';

// Every year's quantile function for a series, built once per series.
const shapeCache = new WeakMap<DataFile, Map<number, Shape>>();
function allShapes(file: DataFile): Map<number, Shape> {
  let m = shapeCache.get(file);
  if (!m) {
    m = new Map(file.years.map((y) => [y, shapeOf(fromDataFile(file, y))] as const));
    shapeCache.set(file, m);
  }
  return m;
}

export function Explore() {
  const loaded = useCalculatorData();
  const [state, setState] = useViewState();
  const [fields, setFields] = useIncome();

  const view = useMemo(() => {
    if (loaded.status !== 'ready') return null;
    const s = seriesFor(loaded.data, state);
    const series = typeof s === 'string' ? loaded.data.ptinc : s;
    const resolved = resolve(loaded.data, state);
    const latest = Math.max(...series.years);
    const shapes = resolved.ok
      ? { today: shapeOf(resolved.today.dist), scenario: shapeOf(resolved.scenario.dist) }
      : null;
    const growthBase = state.scenario.kind === 'year' && series.byYear[String(state.scenario.year)]
      ? { shape: shapeOf(fromDataFile(series, state.scenario.year)), label: String(state.scenario.year) }
      : null;
    return { series, resolved, latest, shapes, growthBase, todayDist: fromDataFile(series, latest) };
  }, [loaded, state]);

  const intro = (
    <div className="intro">
      <p className="eyebrow">Calculator</p>
      <h1>Same size economy, divided another way</h1>
      <p className="dek">
        Find your place in how America divides its income today, then see what someone at that place would receive if
        the same total were divided another way.
      </p>
    </div>
  );

  if (loaded.status === 'loading' || !view) return <>{intro}<p className="sub">Loading the data…</p></>;
  if (loaded.status === 'error') return <>{intro}<p role="alert" className="alert">Couldn't load the data: {loaded.message}</p></>;

  const { data, macro } = loaded;
  const { series, resolved, latest, shapes, growthBase, todayDist } = view;
  const compYear = macro.compToWagesYear;
  const compToWages = macro.compToWages[String(compYear)]!;
  const answers = toAnswers(fields);
  const calc = resolved.ok && answers
    ? calculate(resolved, { answers, compToWages, cpiRatio: macro.cpi.ratio, growthPenalty: state.growthPenalty })
    : null;
  const todayLabel = resolved.ok ? String(resolved.today.year) : String(latest);

  return (
    <>
      {intro}
      <div className="layout">
        <div className="inputs panel">
          <div className="in-group">
            <IncomeForm fields={fields} onChange={setFields} compToWages={compToWages} compYear={compYear} />
            {calc && resolved.ok && <RankBar percentile={calc.percentile} year={resolved.today.year} />}
          </div>
          <div className="in-group">
            <ScenarioPicker
              state={state} onChange={setState} years={series.years} presets={presetList(data)} today={todayDist}
              scenarioDist={resolved.ok ? resolved.scenario.dist : null} cpiRatio={macro.cpi.ratio}
            />
          </div>
          <div className="in-group">
            <Switches state={state} onChange={setState} />
          </div>
        </div>
        <div className="stack">
          {!resolved.ok && <p role="alert" className="alert">{resolved.reason}</p>}
          {resolved.ok && !calc && (
            <p className="card">Enter your income to see where you stand and what you'd receive under this scenario.</p>
          )}
          {resolved.ok && calc && (
            <ResultCard
              calc={calc} scenarioLabel={resolved.scenario.label} todayYear={resolved.today.year}
              cpiRatio={macro.cpi.ratio} cpiThrough={macro.cpi.through} growthPenalty={state.growthPenalty}
              compToWages={compToWages}
            />
          )}
          {resolved.ok && calc && shapes && (
            <CareerWealth
              percentile={calc.percentile} scenario={shapes.scenario} scenarioLabel={resolved.scenario.label}
              shapes={allShapes(series)} cpiRatio={macro.cpi.ratio} growthPenalty={state.growthPenalty}
            />
          )}
          {resolved.ok && resolved.scenario.card && <PresetCard card={resolved.scenario.card} />}
          {resolved.ok && shapes && (
            <PeopleIncomeBars
              today={groupShares(resolved.today.dist)} scenario={groupShares(resolved.scenario.dist)}
              todayLabel={todayLabel} scenarioLabel={resolved.scenario.label}
              gini={{ today: gini(resolved.today.dist), scenario: gini(resolved.scenario.dist) }}
            />
          )}
          {resolved.ok && shapes && (
            <StretchedChart
              today={shapes.today} scenario={shapes.scenario}
              todayLabel={todayLabel} scenarioLabel={resolved.scenario.label}
              dollarYear={Number(series.meta.dollarYear ?? resolved.today.year)}
              you={calc ? calc.percentile : null}
              growthBase={growthBase}
            />
          )}
          {resolved.ok && (
            <ShareHistory
              file={series}
              label={state.concept === 'post'
                ? 'after taxes and cash transfers'
                : state.data === 'as' ? 'Auten-Splinter, before taxes' : 'Piketty-Saez-Zucman, before taxes'}
              other={state.concept === 'post' ? null : state.data === 'as' ? data.ptinc : data.ptincAs}
              otherLabel={state.data === 'as' ? 'Piketty-Saez-Zucman' : 'Auten-Splinter'}
            />
          )}
        </div>
      </div>
    </>
  );
}
