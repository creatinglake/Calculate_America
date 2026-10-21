/** Data source and income measure switches, and the growth penalty slider. */
import { useId } from 'react';
import { MAX_GROWTH_PENALTY, type ViewState } from '../engine';

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="seg">
      <legend>{label}</legend>
      <div role="radiogroup" aria-label={label} className="seg-opts">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Switches({ state, onChange }: { state: ViewState; onChange: (s: ViewState) => void }) {
  const id = useId();
  return (
    <div>
      <Segmented
        label="Income measure" value={state.concept}
        options={[{ value: 'pre', label: 'Before taxes' }, { value: 'post', label: 'After taxes' }]}
        onChange={(concept) => onChange({ ...state, concept })}
      />
      <Segmented
        label="Estimates by" value={state.data}
        options={[{ value: 'psz', label: 'Piketty-Saez-Zucman' }, { value: 'as', label: 'Auten-Splinter' }]}
        onChange={(data) => onChange({ ...state, data })}
      />
      <p className="hint field">
        Two research teams disagree on how much the top's share has grown. Switch to see both.
      </p>
      <div className="field">
        <div className="slider-row">
          <label htmlFor={`${id}-gp`}>If the economy would have been smaller by</label>
          <output htmlFor={`${id}-gp`} className="tabular">{Math.round(state.growthPenalty * 100)}%</output>
        </div>
        <input
          id={`${id}-gp`} type="range" min={0} max={MAX_GROWTH_PENALTY * 100} step={1}
          value={Math.round(state.growthPenalty * 100)}
          onChange={(e) => onChange({ ...state, growthPenalty: Number(e.target.value) / 100 })}
        />
        <p className="hint">
          0% keeps the economy the same size. Use this to test the idea that less inequality would have meant less growth.
        </p>
      </div>
    </div>
  );
}
