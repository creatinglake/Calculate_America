/** The income checklist (plan section 2, "Placing a user in the distribution"). */
import { useId } from 'react';
import type { IncomeAnswers } from '../engine';

export interface IncomeFields {
  wages: string;
  selfEmployment: string;
  capital: string;
  pensions: string;
  sharesFinances: boolean;
}

export const EMPTY_FIELDS: IncomeFields = { wages: '', selfEmployment: '', capital: '', pensions: '', sharesFinances: false };

/** Parse "$60,000" -> 60000; blank -> 0; anything else -> NaN. */
export function parseAmount(s: string): number {
  const t = s.replace(/[$,\s]/g, '');
  if (t === '') return 0;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export function toAnswers(f: IncomeFields): IncomeAnswers | null {
  const a = {
    wages: parseAmount(f.wages),
    selfEmployment: parseAmount(f.selfEmployment),
    capital: parseAmount(f.capital),
    pensions: parseAmount(f.pensions),
    sharesFinances: f.sharesFinances,
  };
  const values = [a.wages, a.selfEmployment, a.capital, a.pensions];
  if (values.some((v) => !Number.isFinite(v))) return null;
  if (values.every((v) => v === 0)) return null;
  return a;
}

const LINES: { key: keyof Omit<IncomeFields, 'sharesFinances'>; label: string; hint: string }[] = [
  { key: 'wages', label: 'Wages and salary', hint: 'Before taxes and deductions.' },
  { key: 'selfEmployment', label: 'Self-employment or business income', hint: 'Profit after business expenses.' },
  { key: 'capital', label: 'Interest, dividends and rent', hint: 'Net rental income.' },
  { key: 'pensions', label: 'Pension and Social Security benefits', hint: 'Benefits received this year.' },
];

export function IncomeForm({ fields, onChange, compToWages, compYear }: {
  fields: IncomeFields;
  onChange: (f: IncomeFields) => void;
  compToWages: number;
  compYear: number;
}) {
  const id = useId();
  const who = fields.sharesFinances ? 'your household' : 'you';
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="panel-h"><span className="pdot" aria-hidden />Your income</legend>
      <label className="switch field">
        <input
          type="checkbox"
          checked={fields.sharesFinances}
          onChange={(e) => onChange({ ...fields, sharesFinances: e.target.checked })}
        />
        <span className="track" aria-hidden />
        I share finances with a spouse or partner
      </label>
      <p className="hint field">
        Enter yearly amounts for {who}, before tax, in this year's dollars.
        {fields.sharesFinances && ' We split the total equally between the two of you, as the data does.'}
      </p>
      {LINES.map((line) => {
        const invalid = !Number.isFinite(parseAmount(fields[line.key]));
        return (
          <div key={line.key} className="field">
            <label htmlFor={`${id}-${line.key}`}>{line.label}</label>
            <div className="money-in" data-invalid={invalid}>
              <span aria-hidden>$</span>
              <input
                id={`${id}-${line.key}`}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={fields[line.key]}
                onChange={(e) => onChange({ ...fields, [line.key]: e.target.value })}
                aria-describedby={`${id}-${line.key}-hint`}
                aria-invalid={invalid}
              />
            </div>
            <p id={`${id}-${line.key}-hint`} className="hint">{invalid ? 'Enter a number, like 60,000.' : line.hint}</p>
          </div>
        );
      })}
      <p className="hint">
        National income counts more than a paycheck: employer health insurance, retirement contributions and payroll
        taxes. We scale wages up by {compToWages.toFixed(3)}, the ratio of total employee compensation to wages in{' '}
        {compYear} (BEA). Corporate profits kept by companies aren't asked for, so your rank is approximate, give or take
        two or three percentiles.
      </p>
    </fieldset>
  );
}

/** "Your rank" bar shown in the input panel once an income is entered. */
export function RankBar({ percentile, year }: { percentile: number; year: number }) {
  const pctAbove = percentile >= 0.99 ? (percentile * 100).toFixed(2) : Math.round(percentile * 100).toString();
  return (
    <div className="rank" role="group" aria-label="Your rank">
      <div className="rank-top">
        <span>Your rank, {year}</span>
        <strong>Higher than about {pctAbove}%</strong>
      </div>
      <div className="rank-bar" aria-hidden><span style={{ width: `${percentile * 100}%` }} /></div>
      <p className="hint">Of adults age 20 and over. Approximate.</p>
    </div>
  );
}
