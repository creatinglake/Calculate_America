/** Data source and income concept switches, and the growth penalty slider. */
import { useId } from 'react';
import { MAX_GROWTH_PENALTY, type ViewState } from '../engine';

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-full border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="px-3 py-1 text-sm aria-checked:bg-[var(--accent)] aria-checked:text-[var(--accent-text)]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switches({ state, onChange }: { state: ViewState; onChange: (s: ViewState) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Segmented
          label="Data source" value={state.data}
          options={[{ value: 'psz', label: 'Piketty-Saez-Zucman' }, { value: 'as', label: 'Auten-Splinter' }]}
          onChange={(data) => onChange({ ...state, data })}
        />
        <Segmented
          label="Income measure" value={state.concept}
          options={[{ value: 'pre', label: 'Before taxes' }, { value: 'post', label: 'After taxes' }]}
          onChange={(concept) => onChange({ ...state, concept })}
        />
      </div>
      <div>
        <div className="flex justify-between text-sm">
          <label htmlFor={`${id}-gp`}>What if the economy would have been smaller?</label>
          <output htmlFor={`${id}-gp`} className="tabular-nums">{Math.round(state.growthPenalty * 100)}%</output>
        </div>
        <input
          id={`${id}-gp`} type="range" min={0} max={MAX_GROWTH_PENALTY * 100} step={1}
          value={Math.round(state.growthPenalty * 100)}
          onChange={(e) => onChange({ ...state, growthPenalty: Number(e.target.value) / 100 })}
          className="w-full"
        />
        <p className="text-xs text-[var(--text-muted)]">
          0% means the same size economy. Use this to test the idea that less inequality would have meant less growth.
        </p>
      </div>
    </div>
  );
}
