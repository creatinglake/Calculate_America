import { describe, expect, it } from 'vitest';
import { fromDataFile } from './distribution';
import { GROUP_KEYS } from './groups';
import { buildQuantile } from './quantile';
import {
  binTax, bracketTax, marginalRate, personalTax, revenueMaximizingTopRate, runTaxes, taxableIncome, taxOn, type TaxRule,
} from './taxes';
import { loadData } from './test/data';

const Q = buildQuantile(fromDataFile(loadData('us-ptinc'), 2023));
const brackets = [[0.1, 0], [0.2, 10_000], [0.5, 100_000]] as const;
const statutory = (top = 0.5): Extract<TaxRule, { kind: 'statutory' }> => ({
  kind: 'statutory', label: 'test',
  brackets: { single: [[0.1, 0], [0.2, 10_000], [top, 100_000]], mfj: [[0.1, 0], [0.2, 20_000], [top, 200_000]] },
  deduction: { kind: 'fixed', amount: { single: 5_000, mfj: 10_000 } },
  exemption: { single: 0, mfj: 0 }, agiRatio: 0.66,
});
const flat = (r: number): TaxRule => ({
  kind: 'effective', label: 'flat', rates: Object.fromEntries(GROUP_KEYS.map((g) => [g, r])) as never,
});

describe('tax schedules', () => {
  it('bracket tax', () => {
    expect(bracketTax(brackets, 5_000)).toBeCloseTo(500, 9);
    expect(bracketTax(brackets, 50_000)).toBeCloseTo(1_000 + 8_000, 9);
    expect(bracketTax(brackets, 200_000)).toBeCloseTo(1_000 + 18_000 + 50_000, 9);
    expect(bracketTax(brackets, 0)).toBe(0);
  });

  it('taxable income uses the AGI ratio and deductions', () => {
    expect(taxableIncome(statutory(), 100_000, 'single')).toBeCloseTo(66_000 - 5_000, 9);
    expect(taxableIncome(statutory(), 1_000, 'single')).toBe(0);
    const capped: Extract<TaxRule, { kind: 'statutory' }> = { ...statutory(), deduction: { kind: 'percentCapped', percent: 0.1, cap: { single: 1000, mfj: 1000 } } };
    expect(taxableIncome(capped, 5_000, 'single')).toBeCloseTo(3_300 - 330, 9);
    expect(taxableIncome(capped, 100_000, 'single')).toBeCloseTo(66_000 - 1_000, 9);
  });

  it('marginal rate on national income includes the AGI ratio', () => {
    expect(marginalRate(statutory(), 1e6, 0.999)).toBeCloseTo(0.5 * 0.66, 4);
    expect(marginalRate(flat(0.3), 50_000, 0.5)).toBe(0.3);
  });
});

describe('runTaxes', () => {
  it('same schedule: no revenue, no change', () => {
    const r = runTaxes({ Q, current: statutory(), scenario: statutory(), elasticity: 0.25, recycle: 'dividend' });
    expect(r.revenuePerAdult).toBeCloseTo(0, 6);
    for (const g of GROUP_KEYS) expect(r.groupChange[g]).toBeCloseTo(0, 6);
  });

  it('flat effective tax: revenue equals rate x mean, after-tax shares equal pre-tax shares', () => {
    const r = runTaxes({ Q, current: flat(0), scenario: flat(0.2), elasticity: 0, recycle: 'publicGoods' });
    expect(r.revenueShareOfIncome).toBeCloseTo(0.2, 9);
    const pre = runTaxes({ Q, current: flat(0), scenario: flat(0), elasticity: 0, recycle: 'publicGoods' });
    for (const g of GROUP_KEYS) expect(r.groupsAfterScenario[g]).toBeCloseTo(pre.groupsAfterCurrent[g], 9);
  });

  it('recycled transfers add up to the revenue', () => {
    for (const recycle of ['dividend', 'bottom50', 'belowMedian'] as const) {
      const r = runTaxes({ Q, current: statutory(0.37), scenario: statutory(0.7), elasticity: 0, recycle });
      const d = Q.dist;
      const given = r.transfer.reduce((a, t, k) => a + (d.p1[k]! - d.p0[k]!) * t, 0);
      expect(given / r.revenuePerAdult).toBeCloseTo(1, 9);
      expect(r.revenuePerAdult).toBeGreaterThan(0);
    }
  });

  it('a higher top rate with elasticity lowers top pre-tax income', () => {
    const r = runTaxes({ Q, current: statutory(0.37), scenario: statutory(0.7), elasticity: 0.25, recycle: 'publicGoods' });
    expect(r.preTaxScenario[126]!).toBeLessThan(r.preTax[126]!);
    expect(r.preTaxScenario[10]!).toBeCloseTo(r.preTax[10]!, 9); // below the top bracket: unchanged
  });

  it('tail tax is integrated, not applied to the average', () => {
    // A convex schedule: average of taxes > tax of the average in the tail bin.
    const rule = statutory(0.5);
    const r = runTaxes({ Q, current: flat(0), scenario: rule, elasticity: 0, recycle: 'publicGoods' });
    expect(r.taxScenario[126]!).toBeGreaterThanOrEqual(taxOn(rule, Q.dist.avg[126]!, 0.999995) - 1);
  });
});

describe('revenue-maximizing top rate and personal result', () => {
  it('1 / (1 + a e)', () => {
    const r = revenueMaximizingTopRate(Q, 0.25)!;
    expect(r.rate).toBeCloseTo(1 / (1 + r.pareto * 0.25), 12);
    expect(r.pareto).toBeGreaterThan(1);
    expect(revenueMaximizingTopRate(Q, 0)).toBeNull();
  });

  it('joint filers are taxed on the couple, then halved', () => {
    const inputs = { Q, current: statutory(), scenario: statutory(), elasticity: 0, recycle: 'publicGoods' as const };
    const r = runTaxes(inputs);
    const single = personalTax(r, inputs, 80_000, 0.7, 'single');
    const joint = personalTax(r, inputs, 80_000, 0.7, 'mfj');
    // The joint schedule here is exactly double the single one, so the halves match.
    expect(joint.taxNow).toBeCloseTo(single.taxNow, 6);
  });
});

describe('exact bin tax', () => {
  it('matches brute-force integration in a middle bin and near the top', () => {
    const rule = statutory(0.5);
    for (const k of [40, 95, 112, 124]) {
      const d = Q.dist, a = d.p0[k]!, b = d.p1[k]!, n = 20000;
      let s = 0;
      for (let i = 0; i < n; i++) { const p = a + ((b - a) * (i + 0.5)) / n; s += taxOn(rule, 1.1 * Q.q(p), p); }
      const brute = s / n;
      expect(Math.abs(binTax(Q, k, rule, 1.1) - brute)).toBeLessThanOrEqual(1e-5 * Math.max(1, brute));
    }
  });
});
