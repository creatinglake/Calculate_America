/** Scenario picker: Years / Presets / Custom / Taxes (plan 6.1). */
import { useId } from 'react';
import {
  GROUP_KEYS, groupShares, setGroupShare, type Distribution, type GroupKey, type GroupShares, type ViewState,
} from '../engine';
import type { PresetInfo } from '../model/scenarios';
import { pct } from '../ui/format';

export const GROUP_LABEL: Record<GroupKey, string> = {
  b50: 'Bottom 50%', m40: 'Middle 40%', u9: 'Upper 9%', t09: 'Top 1% to 0.1%', t009: 'Top 0.1% to 0.01%', t001: 'Top 0.01%',
};

type Tab = 'years' | 'presets' | 'custom' | 'taxes';

function tabOf(s: ViewState['scenario']): Tab {
  if (s.kind === 'year') return 'years';
  if (s.kind === 'preset') return 'presets';
  return 'custom';
}

export function ScenarioPicker({ state, onChange, years, presets, today }: {
  state: ViewState;
  onChange: (s: ViewState) => void;
  years: number[];
  presets: PresetInfo[];
  today: Distribution;
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
      {tab === 'custom' && state.scenario.kind === 'custom' && (
        <GroupSliders groups={state.scenario.groups} onChange={(groups) => set({ kind: 'custom', groups })} />
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
