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
    <fieldset className="space-y-3">
      <legend className="text-base font-semibold">Your yearly income</legend>
      <div className="flex items-center gap-2 text-sm">
        <input
          id={`${id}-share`}
          type="checkbox"
          checked={fields.sharesFinances}
          onChange={(e) => onChange({ ...fields, sharesFinances: e.target.checked })}
        />
        <label htmlFor={`${id}-share`}>I share finances with a spouse or partner</label>
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        Enter amounts for {who}, before tax, in this year's dollars.
        {fields.sharesFinances && ' We split the total equally between the two of you, as the data does.'}
      </p>
      {LINES.map((line) => (
        <div key={line.key}>
          <label htmlFor={`${id}-${line.key}`} className="block text-sm font-medium">{line.label}</label>
          <input
            id={`${id}-${line.key}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="$0"
            value={fields[line.key]}
            onChange={(e) => onChange({ ...fields, [line.key]: e.target.value })}
            aria-describedby={`${id}-${line.key}-hint`}
            aria-invalid={!Number.isFinite(parseAmount(fields[line.key]))}
            className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
          <p id={`${id}-${line.key}-hint`} className="mt-0.5 text-xs text-[var(--text-muted)]">{line.hint}</p>
        </div>
      ))}
      <p className="text-xs text-[var(--text-muted)]">
        National income counts more than a paycheck: employer health insurance, retirement contributions and payroll
        taxes. We scale wages up by {compToWages.toFixed(3)}, the ratio of total employee compensation to wages in {compYear}
        (BEA). Corporate profits kept by companies aren't asked for, so your rank is approximate, give or take two or three
        percentiles.
      </p>
    </fieldset>
  );
}
