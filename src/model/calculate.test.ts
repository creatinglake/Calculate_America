import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_STATE } from '../engine';
import { loadData } from '../engine/test/data';
import { calculate } from './calculate';
import { resolve, type Data } from './scenarios';

const read = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'data', `${n}.json`), 'utf8'));
const data: Data = {
  ptinc: loadData('us-ptinc'), cainc: loadData('us-cainc'), ptincAs: loadData('us-ptinc-as'),
  comparisons: read('comparisons'), presets: read('presets'),
};
const answers = { wages: 0, selfEmployment: 100_000, capital: 0, pensions: 0, sharesFinances: false };

describe('calculate', () => {
  const r = resolve(data, DEFAULT_STATE);
  if (!r.ok) throw new Error(r.reason);

  it('places the user and compares at the same percentile', () => {
    const c = calculate(r, { answers, compToWages: 1.213, cpiRatio: 1, growthPenalty: 0 });
    expect(c.income).toBe(100_000);
    expect(c.percentile).toBeGreaterThan(0.7);
    expect(c.percentile).toBeLessThan(0.85);
    expect(c.difference).toBeCloseTo(c.scenarioIncome - c.income, 9);
    expect(c.words.percentAbove).toBeCloseTo(c.percentile * 100, 9);
  });

  it('growth penalty lowers the scenario income; breakeven ignores it', () => {
    const a = calculate(r, { answers, compToWages: 1.213, cpiRatio: 1, growthPenalty: 0 });
    const b = calculate(r, { answers, compToWages: 1.213, cpiRatio: 1, growthPenalty: 0.1 });
    expect(b.scenarioIncome).toBeCloseTo(a.scenarioIncome * 0.9, 6);
    expect(b.breakeven).toBeCloseTo(a.breakeven!, 12);
  });

  it('CPI ratio converts income into data dollars before ranking', () => {
    const c = calculate(r, { answers, compToWages: 1.213, cpiRatio: 1.1, growthPenalty: 0 });
    expect(c.income).toBeCloseTo(100_000 / 1.1, 6);
  });
});
