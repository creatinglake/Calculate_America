import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { blend, fromGroupShares, parametric, perPersonOrdered, setGroupShare, thresholdLadder } from './builders';
import { shapeOf } from './counterfactual';
import { fromDataFile, mean } from './distribution';
import { GROUP_KEYS, type GroupShares } from './groups';
import { buildQuantile } from './quantile';
import { gini, groupShares } from './stats';
import { loadData } from './test/data';

const file = loadData('us-ptinc');
const ref = fromDataFile(file, 2023);
const d1963 = fromDataFile(file, 1963);
const sum = (g: GroupShares) => GROUP_KEYS.reduce((a, k) => a + g[k], 0);

describe('linked sliders', () => {
  it('always sum to 1 and set the moved slider', () => {
    fc.assert(fc.property(fc.constantFrom(...GROUP_KEYS), fc.double({ min: 0, max: 1, noNaN: true }), (key, v) => {
      const out = setGroupShare(groupShares(ref), key, v);
      expect(sum(out)).toBeCloseTo(1, 12);
      expect(out[key]).toBeCloseTo(v, 12);
    }));
  });

  it('others change in proportion', () => {
    const g = groupShares(ref);
    const out = setGroupShare(g, 'b50', g.b50 + 0.05);
    expect(out.m40 / out.u9).toBeCloseTo(g.m40 / g.u9, 12);
  });
});

describe('group shares builder', () => {
  it('reproduces 1963 group shares on the 2023 shape, keeping the mean', () => {
    const target = groupShares(d1963);
    const r = fromGroupShares(ref, target);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const got = groupShares(r.dist);
    for (const k of GROUP_KEYS) expect(got[k]).toBeCloseTo(target[k], 9);
    expect(mean(r.dist)).toBeCloseTo(mean(ref), 4);
    // Valid distribution: the quantile function builds and is increasing.
    const Q = buildQuantile(r.dist);
    expect(Q.q(0.95)).toBeGreaterThan(Q.q(0.5));
  });

  it('rejects a lower group earning more per person than a higher one', () => {
    const bad: GroupShares = { b50: 0.6, m40: 0.3, u9: 0.06, t09: 0.03, t009: 0.007, t001: 0.003 };
    expect(perPersonOrdered(bad)).toBe(false);
    expect(fromGroupShares(ref, bad)).toEqual({ ok: false, reason: 'order' });
  });

  it('rejects shares that do not sum to 1', () => {
    const g = { ...groupShares(ref), b50: 0.5 };
    expect(fromGroupShares(ref, g)).toEqual({ ok: false, reason: 'sum' });
  });

  it('threshold ladder reads the group edges', () => {
    const ladder = thresholdLadder(ref);
    expect(ladder.map((r) => r.p)).toEqual([0.5, 0.9, 0.99, 0.999, 0.9999]);
    expect(ladder[0]!.income).toBe(ref.thr[50]);
    expect(ladder.every((r, i) => i === 0 || r.income > ladder[i - 1]!.income)).toBe(true);
  });
});

describe('blend', () => {
  it('endpoints give each distribution\'s shape', () => {
    const a = blend(ref, d1963, 0, mean(ref));
    const b = blend(ref, d1963, 1, mean(ref));
    expect(groupShares(a).t001).toBeCloseTo(groupShares(ref).t001, 9);
    expect(groupShares(b).t001).toBeCloseTo(groupShares(d1963).t001, 9);
  });

  it('keeps the requested mean and moves top share monotonically', () => {
    let prev = Infinity;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const d = blend(ref, d1963, t, 1000);
      expect(mean(d)).toBeCloseTo(1000, 6);
      const top = groupShares(d).t001;
      expect(top).toBeLessThanOrEqual(prev + 1e-12);
      prev = top;
    }
  });
});

describe('parametric', () => {
  const bins = { p0: ref.p0, p1: ref.p1 };

  it('is increasing with averages inside thresholds', () => {
    const d = parametric(bins, 0.8, 1.6);
    for (let i = 0; i < 127; i++) {
      const hi = i < 126 ? d.thr[i + 1]! : Infinity;
      expect(d.avg[i]!).toBeGreaterThanOrEqual(d.thr[i]!);
      expect(d.avg[i]!).toBeLessThanOrEqual(hi);
    }
    expect(shapeOf(d).Q.q(0.999)).toBeGreaterThan(shapeOf(d).Q.q(0.99));
  });

  it('more spread (sigma) or a fatter tail (lower alpha) raises inequality', () => {
    expect(gini(parametric(bins, 1.0, 2))).toBeGreaterThan(gini(parametric(bins, 0.5, 2)));
    const top = (a: number) => groupShares(parametric(bins, 0.7, a)).t001;
    expect(top(1.5)).toBeGreaterThan(top(2.5));
  });

  it('rejects alpha <= 1', () => {
    expect(() => parametric(bins, 0.7, 1)).toThrow();
  });
});
