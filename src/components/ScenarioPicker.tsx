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
    <section aria-labelledby={`${id}-h`} className="space-y-3">
      <h2 id={`${id}-h`} className="text-base font-semibold">Divide it like…</h2>
      <div role="tablist" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            disabled={t.key === 'taxes'}
            onClick={() => go(t.key)}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-sm aria-selected:bg-[var(--accent)] aria-selected:text-[var(--accent-text)] disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'years' && state.scenario.kind === 'year' && (
        <label className="block text-sm">
          <span className="font-medium">Year</span>
          <select
            value={state.scenario.year}
            onChange={(e) => set({ kind: 'year', year: Number(e.target.value) })}
            className="mt-1 block w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          >
            {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      )}
      {tab === 'presets' && state.scenario.kind === 'preset' && (
        <div className="grid gap-1" role="radiogroup" aria-label="Presets">
          {presets.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio" name={`${id}-preset`} checked={state.scenario.kind === 'preset' && state.scenario.id === p.id}
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
      {tab === 'taxes' && <p className="text-sm text-[var(--text-muted)]">Tax scenarios are coming in a later update.</p>}
    </section>
  );
}

export function GroupSliders({ groups, onChange }: { groups: GroupShares; onChange: (g: GroupShares) => void }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-muted)]">
        Each slider is that group's share of all income. Moving one takes from or gives to the others in proportion, so
        they always add up to 100%.
      </p>
      {GROUP_KEYS.map((k) => (
        <div key={k}>
          <div className="flex justify-between text-sm">
            <label htmlFor={`${id}-${k}`}>
              <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--g-${k})` }} />
              {GROUP_LABEL[k]}
            </label>
            <output htmlFor={`${id}-${k}`} className="tabular-nums">{pct(groups[k])}</output>
          </div>
          <input
            id={`${id}-${k}`} type="range" min={0} max={1000} step={1}
            value={Math.round(groups[k] * 1000)}
            onChange={(e) => onChange(setGroupShare(groups, k, Number(e.target.value) / 1000))}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}
