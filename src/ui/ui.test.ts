import { describe, expect, it } from 'vitest';
import { money, moneyDiff, moneyShort, ordinal, pct, percentileLabel, roundMoney } from './format';
import { P_MAX, stretch, unstretch } from './stretchAxis';

describe('format', () => {
  it('rounds money sensibly', () => {
    expect(money(48064.23)).toBe('$48,100');
    expect(money(108725.9)).toBe('$109,000');
    expect(money(999)).toBe('$999');
    expect(roundMoney(1234567)).toBe(1230000);
    expect(moneyDiff(8725.9)).toBe('+$8,730');
    expect(moneyDiff(-1200)).toBe('−$1,200');
    expect(moneyShort(2_108_379)).toBe('$2.11M');
    expect(moneyShort(48_000)).toBe('$48K');
  });
  it('formats shares and percentiles', () => {
    expect(pct(0.2073)).toBe('20.7%');
    expect(pct(0.0047)).toBe('0.47%');
    expect(percentileLabel(0.999)).toBe('P99.9');
    expect(percentileLabel(0.9999)).toBe('P99.99');
    expect(ordinal(83)).toBe('83rd');
    expect(ordinal(77.2)).toBe('77th');
    expect(ordinal(99.954)).toBe('99.95th');
    expect(ordinal(42.6)).toBe('43rd');
    expect(ordinal(11)).toBe('11th');
  });
});

describe('stretched axis', () => {
  it('puts band edges at 0..4', () => {
    expect(stretch(0)).toBe(0);
    expect(stretch(0.9)).toBeCloseTo(1, 12);
    expect(stretch(0.99)).toBeCloseTo(2, 12);
    expect(stretch(0.999)).toBeCloseTo(3, 12);
    expect(stretch(P_MAX)).toBeCloseTo(4, 9);
  });
  it('is increasing and invertible', () => {
    let prev = -1;
    for (let i = 0; i <= 1000; i++) {
      const p = (i / 1000) * P_MAX;
      const x = stretch(p);
      expect(x).toBeGreaterThanOrEqual(prev);
      expect(unstretch(x)).toBeCloseTo(p, 9);
      prev = x;
    }
  });
});
