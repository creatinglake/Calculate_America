import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { taxOn } from '../engine';
import type { Macro, TaxBrackets, TaxEffective } from '../data/load';
import { currentLawRule, customRule, effectiveRule, historicalRule, indexFactor, latestEffectiveYear } from './taxRules';

const read = <T,>(n: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'data', `${n}.json`), 'utf8')) as T;
const macro = read<Macro>('us-macro');
const brackets = read<TaxBrackets>('us-tax-brackets');
const eff = read<TaxEffective>('us-tax-effective');

describe('tax rules from data', () => {
  it('effective rates for a year; latest is 2019', () => {
    const r = effectiveRule(eff, 1963);
    expect(r.kind).toBe('effective');
    expect(latestEffectiveYear(eff)).toBe(2019);
  });

  it('income indexing exceeds inflation indexing when real income grew', () => {
    expect(indexFactor(macro, 1963, 'income')).toBeGreaterThan(indexFactor(macro, 1963, 'inflation'));
    expect(indexFactor(macro, 2023, 'inflation')).toBeCloseTo(1, 9);
  });

  it('1963 top bracket indexed by inflation and the 91% rate', () => {
    const r = historicalRule(brackets, macro, 1963, 'inflation');
    if (r.kind !== 'statutory') throw new Error();
    const top = r.brackets.single[r.brackets.single.length - 1]!;
    expect(top[0]).toBeCloseTo(0.91, 9);
    expect(top[1]).toBeCloseTo(200_000 * indexFactor(macro, 1963, 'inflation'), 6);
    expect(r.deduction.kind).toBe('percentCapped');
  });

  it('1980 uses the built-in zero bracket', () => {
    const r = historicalRule(brackets, macro, 1980, 'inflation');
    if (r.kind !== 'statutory') throw new Error();
    expect(r.deduction.kind).toBe('builtIn');
    expect(r.brackets.single[0]![0]).toBe(0);
  });

  it('current law converts 2026 dollars with CPI', () => {
    const r = currentLawRule(brackets, macro);
    if (r.kind !== 'statutory') throw new Error();
    expect(r.brackets.single[1]![1]).toBeCloseTo(12_400 / macro.cpi.ratio, 6);
    // Someone below the standard deduction (in AGI terms) pays nothing.
    expect(taxOn(r, 10_000, 0.2)).toBe(0);
  });

  it('custom schedule starts at zero; joint thresholds double', () => {
    const r = customRule([{ rate: 0.2, from: 10_000 }, { rate: 0.5, from: 500_000 }], macro, 15_000);
    if (r.kind !== 'statutory') throw new Error();
    expect(r.brackets.single[0]).toEqual([0, 0]);
    expect(r.brackets.mfj[2]![1]).toBeCloseTo(2 * r.brackets.single[2]![1], 9);
  });
});
