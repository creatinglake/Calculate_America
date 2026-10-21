import { describe, expect, it } from 'vitest';
import { fromDataFile, type Distribution } from './distribution';
import { GROUP_KEYS } from './groups';
import { buildQuantile } from './quantile';
import { gini, groupShares, mostEqualYear, summarize, topShare } from './stats';
import { loadData } from './test/data';

const file = loadData('us-ptinc');
const bins = { p0: file.bins.map((b) => b.p0), p1: file.bins.map((b) => b.p1) };

function equal(): Distribution {
  return { ...bins, avg: bins.p0.map(() => 50_000), thr: bins.p0.map(() => 50_000) };
}

describe('stats', () => {
  it('perfect equality: shares equal population, Gini 0', () => {
    const d = equal();
    const g = groupShares(d);
    expect(g.b50).toBeCloseTo(0.5, 12);
    expect(g.t001).toBeCloseTo(0.0001, 12);
    expect(topShare(d, 0.01)).toBeCloseTo(0.01, 12);
    expect(gini(d)).toBeCloseTo(0, 12);
  });

  it('one person has everything: Gini near 1', () => {
    const avg = bins.p0.map(() => 0);
    avg[126] = 1e9;
    expect(gini({ ...bins, avg, thr: avg })).toBeGreaterThan(0.99);
  });

  for (const year of [1963, 2023]) {
    it(`${year}: group shares match the data file's bin shares`, () => {
      const d = fromDataFile(file, year);
      const g = groupShares(d);
      const total = GROUP_KEYS.reduce((a, k) => a + g[k], 0);
      expect(total).toBeCloseTo(1, 12);
      // Pipeline shares are WID's own (rounded at source); averages-based shares agree closely.
      const pub = file.byYear[String(year)]!.share;
      const top1Pub = pub.slice(99).reduce((a, b) => a + b, 0);
      expect(Math.abs(topShare(d, 0.01) - top1Pub)).toBeLessThan(0.001);
    });
  }

  it('summary is internally consistent', () => {
    const d = fromDataFile(file, 2023);
    const s = summarize(d, buildQuantile(d));
    expect(s.top1).toBeCloseTo(s.groups.t09 + s.groups.t009 + s.groups.t001, 12);
    expect(s.median).toBeLessThan(s.mean);
    expect(s.gini).toBeGreaterThan(0);
    expect(s.gini).toBeLessThan(1);
    expect(s.top1ToBottom50).toBeGreaterThan(1);
  });
});

describe('most equal year', () => {
  it('is the minimum Gini across years', () => {
    const years = new Map(file.years.map((y) => [y, fromDataFile(file, y)] as const));
    const best = mostEqualYear(years);
    for (const d of years.values()) expect(gini(d)).toBeGreaterThanOrEqual(best.gini);
    expect(file.years).toContain(best.year);
  });
});
