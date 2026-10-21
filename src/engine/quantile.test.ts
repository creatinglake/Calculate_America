import { describe, expect, it } from 'vitest';
import { fromDataFile, width } from './distribution';
import { buildQuantile } from './quantile';
import { DATASETS, loadData } from './test/data';

/** Midpoint rule on [a, b]. */
function integrate(f: (p: number) => number, a: number, b: number, n = 4000): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + ((b - a) * (i + 0.5)) / n);
  return (s * (b - a)) / n;
}

const relClose = (got: number, want: number, rel: number) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(want)));

for (const name of DATASETS) {
  const file = loadData(name);
  describe(`quantile: ${name}`, () => {
    for (const year of file.years) {
      const d = fromDataFile(file, year);
      const Q = buildQuantile(d);

      it(`${year}: hits every threshold`, () => {
        for (let k = 0; k < 127; k++) {
          relClose(Q.q(d.p0[k]!), d.thr[k]!, 1e-9);
        }
      });

      it(`${year}: reproduces every bin average`, () => {
        for (let k = 0; k < 127; k++) {
          const lo = d.thr[k]!, hi = k < 126 ? d.thr[k + 1]! : Infinity;
          // Bins whose rounded average sits on a threshold can only be met to $1.
          const onEdge = d.avg[k]! <= lo || d.avg[k]! >= hi;
          const tol = onEdge ? 1 : 1e-6 * Math.max(1, Math.abs(d.avg[k]!));
          expect(Math.abs(Q.binMean(k) - d.avg[k]!)).toBeLessThanOrEqual(tol);
        }
      });

      it(`${year}: spline bins integrate to their averages`, () => {
        // Numerical check of the evaluated curve (power bins have a steep
        // start that midpoint integration can't resolve; they're exact above).
        for (let k = 0; k < 126; k++) {
          if (Q.fits[k] !== 'spline') continue;
          const m = integrate(Q.q, d.p0[k]!, d.p1[k]!) / width(d, k);
          relClose(m, d.avg[k]!, 1e-6);
        }
      });

      it(`${year}: is increasing and continuous`, () => {
        let prev = -Infinity;
        for (let k = 0; k < 127; k++) {
          const p0 = d.p0[k]!, p1 = k < 126 ? d.p1[k]! : 0.9999999;
          for (let i = 0; i <= 50; i++) {
            const v = Q.q(p0 + ((p1 - p0) * i) / 51);
            expect(v).toBeGreaterThanOrEqual(prev - 1e-6 * Math.abs(prev));
            prev = v;
          }
        }
      });

      it(`${year}: rank inverts the quantile`, () => {
        for (const p of [0.01, 0.1, 0.25, 0.5, 0.831, 0.9, 0.99, 0.999, 0.9999, 0.99995, 0.999995]) {
          const v = Q.q(p);
          if (v > d.thr[0]!) expect(Q.rank(v)).toBeCloseTo(p, 7);
        }
      });
    }
  });
}

describe('quantile: Pareto tail', () => {
  it('top bin mean equals b x threshold', () => {
    const d = fromDataFile(loadData('us-ptinc'), 2023);
    const Q = buildQuantile(d);
    const top = 126;
    const b = d.avg[top]! / d.thr[top]!;
    const alpha = b / (b - 1);
    expect((d.thr[top]! * alpha) / (alpha - 1)).toBeCloseTo(d.avg[top]!, 6);
    expect(Q.fits[top]).toBe('tail');
  });

  it('ranks incomes above the top threshold', () => {
    const d = fromDataFile(loadData('us-ptinc'), 2023);
    const Q = buildQuantile(d);
    const huge = d.thr[126]! * 10;
    expect(Q.rank(huge)).toBeGreaterThan(d.p0[126]!);
    relClose(Q.q(Q.rank(huge)), huge, 1e-9);
  });
});
