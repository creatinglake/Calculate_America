/** /explore: the calculator (plan 6.1). */
import { useMemo, useState } from 'react';
import { fromDataFile } from '../engine';
import { useCalculatorData } from '../app/useData';
import { useViewState } from '../app/useViewState';
import { EMPTY_FIELDS, IncomeForm, toAnswers, type IncomeFields } from '../components/IncomeForm';
import { ResultCard } from '../components/ResultCard';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { Switches } from '../components/Switches';
import { calculate } from '../model/calculate';
import { presetList, resolve, seriesFor } from '../model/scenarios';

const panel = 'rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4';

export function Explore() {
  const loaded = useCalculatorData();
  const [state, setState] = useViewState();
  const [fields, setFields] = useState<IncomeFields>(EMPTY_FIELDS);

  const view = useMemo(() => {
    if (loaded.status !== 'ready') return null;
    const series = seriesFor(loaded.data, state);
    const resolved = resolve(loaded.data, state);
    return { series, resolved };
  }, [loaded, state]);

  if (loaded.status === 'loading') return <p>Loading the data…</p>;
  if (loaded.status === 'error') return <p role="alert">Couldn't load the data: {loaded.message}</p>;
  const { data, macro } = loaded;
  const series = typeof view!.series === 'string' ? data.ptinc : view!.series;
  const resolved = view!.resolved;
  const latest = Math.max(...series.years);
  const answers = toAnswers(fields);
  const compYear = macro.compToWagesYear;
  const calc = resolved.ok && answers
    ? calculate(resolved, {
        answers, compToWages: macro.compToWages[String(compYear)]!, cpiRatio: macro.cpi.ratio,
        growthPenalty: state.growthPenalty,
      })
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className={panel}>
          <IncomeForm fields={fields} onChange={setFields} compToWages={macro.compToWages[String(compYear)]!} compYear={compYear} />
        </div>
        <div className={panel}>
          <ScenarioPicker
            state={state} onChange={setState} years={series.years}
            presets={presetList(data)} today={fromDataFile(series, latest)}
          />
        </div>
        <div className={panel}>
          <Switches state={state} onChange={setState} />
        </div>
      </div>
      <div className="space-y-4">
        {!resolved.ok && <p role="alert" className={panel}>{resolved.reason}</p>}
        {resolved.ok && !calc && (
          <p className={panel}>Enter your income to see where you stand and what you'd receive under this scenario.</p>
        )}
        {resolved.ok && calc && (
          <ResultCard
            calc={calc} scenarioLabel={resolved.scenario.label} todayYear={resolved.today.year}
            cpiRatio={macro.cpi.ratio} cpiThrough={macro.cpi.through} growthPenalty={state.growthPenalty}
          />
        )}
        {resolved.ok && resolved.scenario.note && <p className="text-sm text-[var(--text-muted)]">{resolved.scenario.note}</p>}
      </div>
    </div>
  );
}
