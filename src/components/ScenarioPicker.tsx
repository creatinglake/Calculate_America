/** Scenario picker: Years / Presets / Custom / Taxes (plan 6.1). */
import { useId } from 'react';
import {
  GROUP_KEYS, groupShares, setGroupShare, thresholdLadder, type Distribution, type GroupKey, type GroupShares,
  type ViewState,
} from '../engine';
import type { PresetInfo } from '../model/scenarios';
import { money, pct, percentileLabel } from '../ui/format';

export const GROUP_LABEL: Record<GroupKey, string> = {
  b50: 'Bottom 50%', m40: 'Middle 40%', u9: 'Upper 9%', t09: 'Top 1% to 0.1%', t009: 'Top 0.1% to 0.01%', t001: 'Top 0.01%',
};

type Tab = 'years' | 'presets' | 'custom' | 'taxes';

function tabOf(s: ViewState['scenario']): Tab {
  if (s.kind === 'year') return 'years';
  if (s.kind === 'preset') return 'presets';
  return 'custom';
}

export function ScenarioPicker({ state, onChange, years, presets, today, scenarioDist, cpiRatio }: {
  state: ViewState;
  onChange: (s: ViewState) => void;
  years: number[];
  presets: PresetInfo[];
  today: Distribution;
  /** The scenario's distribution when it resolved, for the threshold ladder. */
  scenarioDist: Distribution | null;
  cpiRatio: number;
}) {
  const id = useId();
  const tab = tabOf(state.scenario);
  const set = (scenario: ViewState['scenario']) => onChange({ ...state, scenario });
  const tabs: { key: Tab; label: string }[] = [
    { key: 'years', label: 'Years' }, { key: 'presets', label: 'Presets' },
    { key: 'custom', label: 'Custom' }, { key: 'taxes', label: 'Taxes' },
  ];
  const go = (t: Tab) => {
    if (t === 'years') set({ kind: 'year', year: years.includes(1963) ? 1963 : years[0]! });
    if (t === 'presets') set({ kind: 'preset', id: presets[0]!.id });
    if (t === 'custom') set({ kind: 'custom', groups: groupShares(today) });
  };
  return (
    <section aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-h"><span className="pdot" aria-hidden />Compare with</h2>
      <div role="tablist" aria-label="Kind of scenario" className="seg-opts field">
        {tabs.map((t) => (
          <button
            key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            disabled={t.key === 'taxes'} title={t.key === 'taxes' ? 'Coming soon' : undefined}
            onClick={() => go(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'years' && state.scenario.kind === 'year' && (
        <div className="field">
          <label htmlFor={`${id}-year`}>Divide today's income like the US in</label>
          <select
            id={`${id}-year`}
            value={state.scenario.year}
            onChange={(e) => set({ kind: 'year', year: Number(e.target.value) })}
          >
            {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}
      {tab === 'presets' && state.scenario.kind === 'preset' && (
        <div className="choice-list" role="radiogroup" aria-label="Presets">
          {presets.map((p) => (
            <label key={p.id}>
              <input
                type="radio" name={`${id}-preset`}
                checked={state.scenario.kind === 'preset' && state.scenario.id === p.id}
                onChange={() => set({ kind: 'preset', id: p.id })}
              />
              {p.label}
            </label>
          ))}
        </div>
      )}
      {tab === 'custom' && (
        <CustomBuilders
          scenario={state.scenario} set={set} today={today} years={years} presets={presets}
          scenarioDist={scenarioDist} cpiRatio={cpiRatio}
        />
      )}
    </section>
  );
}

export function GroupSliders({ groups, onChange }: { groups: GroupShares; onChange: (g: GroupShares) => void }) {
  const id = useId();
  return (
    <div>
      <p className="hint field">
        Each slider is that group's share of all income. Moving one takes from or gives to the others in proportion, so
        they always add up to 100%.
      </p>
      {GROUP_KEYS.map((k) => (
        <div key={k} className="field">
          <div className="slider-row">
            <label htmlFor={`${id}-${k}`}>
              <span aria-hidden className="sw" style={{ background: `var(--g-${k})`, marginRight: '0.4rem', verticalAlign: '-1px' }} />
              {GROUP_LABEL[k]}
            </label>
            <output htmlFor={`${id}-${k}`} className="tabular">{pct(groups[k])}</output>
          </div>
          <input
            id={`${id}-${k}`} type="range" min={0} max={1000} step={1}
            value={Math.round(groups[k] * 1000)}
            onChange={(e) => onChange(setGroupShare(groups, k, Number(e.target.value) / 1000))}
          />
        </div>
      ))}
    </div>
  );
}

type CustomMode = 'custom' | 'blend' | 'param';

function CustomBuilders({ scenario, set, today, years, presets, scenarioDist, cpiRatio }: {
  scenario: ViewState['scenario'];
  set: (s: ViewState['scenario']) => void;
  today: Distribution;
  years: number[];
  presets: PresetInfo[];
  scenarioDist: Distribution | null;
  cpiRatio: number;
}) {
  const id = useId();
  const latest = Math.max(...years);
  const modes: { key: CustomMode; label: string }[] = [
    { key: 'custom', label: 'Group shares' }, { key: 'blend', label: 'Blend two' }, { key: 'param', label: 'Curve' },
  ];
  const choose = (m: CustomMode) => {
    if (m === 'custom') set({ kind: 'custom', groups: groupShares(today) });
    if (m === 'blend') set({ kind: 'blend', a: years.includes(1963) ? 'us-1963' : `us-${years[0]}`, b: `us-${latest}`, t: 0.5 });
    if (m === 'param') set({ kind: 'param', sigma: 0.8, alpha: 1.6 });
  };
  const endpoints = [
    ...[...years].reverse().map((y) => ({ id: `us-${y}`, label: `US ${y}` })),
    ...presets.map((p) => ({ id: p.id, label: p.label })),
  ];
  return (
    <div>
      <div role="radiogroup" aria-label="How to build it" className="seg-opts field">
        {modes.map((m) => (
          <button key={m.key} type="button" role="radio" aria-checked={scenario.kind === m.key} onClick={() => choose(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      {scenario.kind === 'custom' && (
        <>
          <GroupSliders groups={scenario.groups} onChange={(groups) => set({ kind: 'custom', groups })} />
          {scenarioDist && <Ladder dist={scenarioDist} cpiRatio={cpiRatio} />}
        </>
      )}
      {scenario.kind === 'blend' && (
        <div>
          <p className="hint field">Slide between two divisions. Halfway is an even mix of the two.</p>
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className="field">
              <label htmlFor={`${id}-${side}`}>{side === 'a' ? 'From' : 'To'}</label>
              <select id={`${id}-${side}`} value={scenario[side]}
                onChange={(e) => set({ ...scenario, [side]: e.target.value })}>
                {endpoints.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          ))}
          <div className="field">
            <div className="slider-row">
              <label htmlFor={`${id}-t`}>Mix</label>
              <output htmlFor={`${id}-t`} className="tabular">{Math.round((1 - scenario.t) * 100)}% / {Math.round(scenario.t * 100)}%</output>
            </div>
            <input id={`${id}-t`} type="range" min={0} max={100} step={1} value={Math.round(scenario.t * 100)}
              onChange={(e) => set({ ...scenario, t: Number(e.target.value) / 100 })} />
          </div>
        </div>
      )}
      {scenario.kind === 'param' && (
        <div>
          <p className="hint field">
            For people who want to set the shape of the curve directly. The bottom 90% follow a lognormal curve; the
            top 10% follow a Pareto curve, joined at the 90th percentile.
          </p>
          <div className="field">
            <div className="slider-row">
              <label htmlFor={`${id}-sig`}>Spread in the bottom 90% (sigma)</label>
              <output htmlFor={`${id}-sig`} className="tabular">{scenario.sigma.toFixed(2)}</output>
            </div>
            <input id={`${id}-sig`} type="range" min={10} max={150} step={1} value={Math.round(scenario.sigma * 100)}
              onChange={(e) => set({ ...scenario, sigma: Number(e.target.value) / 100 })} />
            <p className="hint">Higher means bigger gaps between the bottom and the middle.</p>
          </div>
          <div className="field">
            <div className="slider-row">
              <label htmlFor={`${id}-al`}>Top tail (Pareto alpha)</label>
              <output htmlFor={`${id}-al`} className="tabular">{scenario.alpha.toFixed(2)}</output>
            </div>
            <input id={`${id}-al`} type="range" min={110} max={400} step={1} value={Math.round(scenario.alpha * 100)}
              onChange={(e) => set({ ...scenario, alpha: Number(e.target.value) / 100 })} />
            <p className="hint">Lower means a fatter tail: more income at the very top.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Income at each group edge under the custom division, live (plan 4.6). */
function Ladder({ dist, cpiRatio }: { dist: Distribution; cpiRatio: number }) {
  return (
    <div className="rank" style={{ marginTop: '0.25rem' }}>
      <p className="field-label" style={{ margin: 0 }}>What it takes to be in each group</p>
      <ul className="hint" style={{ listStyle: 'none', padding: 0, margin: '0.35rem 0 0' }}>
        {thresholdLadder(dist).map((r) => (
          <li key={r.key} className="slider-row" style={{ fontWeight: 500 }}>
            <span>{GROUP_LABEL[r.key]} starts at {percentileLabel(r.p)}</span>
            <span className="tabular">{money(r.income * cpiRatio)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
