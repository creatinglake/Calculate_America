import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { breakevenPenalty, counterfactual, shapeOf } from './counterfactual';
import { fromDataFile, mean } from './distribution';
import { loadData } from './test/data';

const file = loadData('us-ptinc');
const today = fromDataFile(file, 2023);
const T = shapeOf(today);

describe('counterfactual', () => {
  it('scenario = today returns today\'s income at every percentile', () => {
    for (const p of [0.1, 0.5, 0.9, 0.99, 0.9999]) {
      expect(counterfactual(p, T.mean, T)).toBeCloseTo(T.Q.q(p), 6);
    }
  });

  it('preserves the mean: average of cf over everyone equals today\'s mean', () => {
    // Integrate cf over p using bin means of the scenario curve (exact).
    for (const year of [1963, 1980, 2000]) {
      const S = shapeOf(fromDataFile(file, year));
      let total = 0;
      for (let k = 0; k < 127; k++) {
        total += (S.Q.dist.p1[k]! - S.Q.dist.p0[k]!) * S.Q.binMean(k) * (T.mean / S.mean);
      }
      expect(total / T.mean).toBeCloseTo(1, 9);
    }
  });

  it('is scale-free in the scenario: doubling every income gives the same result', () => {
    const d = fromDataFile(file, 1963);
    const doubled = { ...d, avg: d.avg.map((a) => a * 2), thr: d.thr.map((t) => t * 2) };
    const a = counterfactual(0.6, T.mean, shapeOf(d));
    const b = counterfactual(0.6, T.mean, shapeOf(doubled));
    expect(b).toBeCloseTo(a, 6);
  });

  it('growth penalty scales the result', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 0.3, noNaN: true }), (x) => {
      const S = shapeOf(fromDataFile(file, 1963));
      const base = counterfactual(0.5, T.mean, S);
      expect(counterfactual(0.5, T.mean, S, x)).toBeCloseTo(base * (1 - x), 6);
    }));
  });

  it('breakeven penalty makes the scenario equal today', () => {
    expect(breakevenPenalty(60_000, 80_000)).toBeCloseTo(0.25, 12);
    expect(breakevenPenalty(80_000, 60_000)).toBeNull();
  });

  it('reproduces mean(d) for the data file', () => {
    expect(T.mean).toBeCloseTo(mean(today), 9);
    expect(Math.abs(T.mean - file.meanPerAdult['2023']!)).toBeLessThan(1);
  });
});
