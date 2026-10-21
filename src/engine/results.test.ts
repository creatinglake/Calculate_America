import { describe, expect, it } from 'vitest';
import { counterfactual, shapeOf, type Shape } from './counterfactual';
import { fromDataFile } from './distribution';
import { place } from './placement';
import { career, lifetimeSimple, rankInWords, workEquivalent } from './results';
import { loadData } from './test/data';

const file = loadData('us-ptinc');
const shapes = new Map<number, Shape>(file.years.map((y) => [y, shapeOf(fromDataFile(file, y))]));

describe('results', () => {
  it('simple lifetime is annual x years', () => {
    expect(lifetimeSimple(1000, 40)).toBe(40_000);
  });

  it('career with scenario = each year itself sums to zero', () => {
    const latest = shapes.get(2023)!;
    const r = career(0.5, 2023, shapes, latest);
    expect(r.byYear).toHaveLength(1);
    expect(r.total).toBeCloseTo(0, 6);
  });

  it('career sums yearly differences and uses each year\'s own mean', () => {
    const s1963 = shapes.get(1963)!;
    const r = career(0.5, 2000, shapes, s1963);
    expect(r.byYear.map((x) => x.year)).toEqual([...Array(24).keys()].map((i) => 2000 + i));
    const y2010 = r.byYear.find((x) => x.year === 2010)!;
    expect(y2010.scenario).toBeCloseTo(counterfactual(0.5, shapes.get(2010)!.mean, s1963), 6);
    expect(r.total).toBeCloseTo(r.byYear.reduce((a, x) => a + x.difference, 0), 6);
  });

  it('career applies the smaller-economy penalty to every year', () => {
    const s1963 = shapes.get(1963)!;
    const a = career(0.5, 2010, shapes, s1963), b = career(0.5, 2010, shapes, s1963, 0.1);
    b.byYear.forEach((r, i) => expect(r.scenario).toBeCloseTo(a.byYear[i]!.scenario * 0.9, 6));
  });

  it('career reports years with no data', () => {
    const gappy = new Map(shapes);
    gappy.delete(2005);
    expect(career(0.5, 2000, gappy, shapes.get(1963)!).skipped).toEqual([2005]);
  });

  it('work equivalent', () => {
    expect(workEquivalent(10_000, 50_000)).toEqual({ hours: 400, weeks: 10.4 });
    expect(workEquivalent(10_000, 0)).toBeNull();
  });

  it('rank in words', () => {
    expect(rankInWords(0.831, 100_000, 50_000)).toEqual({ percentAbove: 83.1, multipleOfMedian: 2 });
  });
});

describe('placement', () => {
  const base = { wages: 100_000, selfEmployment: 0, capital: 2_000, pensions: 0, sharesFinances: false };

  it('scales wages only', () => {
    const p = place(base, 1.2);
    expect(p.wagesScaled).toBeCloseTo(120_000, 9);
    expect(p.combined).toBeCloseTo(122_000, 9);
  });

  it('halves combined income for couples', () => {
    expect(place({ ...base, sharesFinances: true }, 1.2).perAdult).toBeCloseTo(61_000, 9);
  });

  it('converts to data dollars with the CPI ratio', () => {
    expect(place(base, 1, 1.1).perAdultDataDollars).toBeCloseTo(102_000 / 1.1, 9);
  });

  it('rejects non-numbers', () => {
    expect(() => place({ ...base, wages: NaN }, 1.2)).toThrow();
  });
});

describe('income to wealth', () => {
  it('compounds yearly savings at the real return', async () => {
    const { accumulate } = await import('./results');
    const a = accumulate([{ year: 2000, amount: 1000 }, { year: 2001, amount: 1000 }], 0.1, 0.05);
    expect(a.contributions).toBeCloseTo(200, 9);
    expect(a.total).toBeCloseTo(100 * 1.05 + 100, 9);
    expect(a.byYear.map((r) => r.year)).toEqual([2000, 2001]);
  });

  it('with zero return equals total saved, and order does not matter for input', async () => {
    const { accumulate } = await import('./results');
    const a = accumulate([{ year: 2002, amount: 500 }, { year: 2001, amount: -200 }], 0.5, 0);
    expect(a.total).toBeCloseTo(150, 9);
    expect(a.byYear[0]!.year).toBe(2001);
  });

  it('matches the closed form for a constant difference', async () => {
    const { accumulate } = await import('./results');
    const flows = Array.from({ length: 30 }, (_, i) => ({ year: 1994 + i, amount: 10_000 }));
    const s = 0.1, r = 0.03;
    expect(accumulate(flows, s, r).total).toBeCloseTo((s * 10_000 * ((1 + r) ** 30 - 1)) / r, 6);
  });
});
