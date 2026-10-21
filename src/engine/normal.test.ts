import { describe, expect, it } from 'vitest';
import { normalCdf, normalInv } from './normal';

describe('normal', () => {
  it('CDF basics', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1.959963984540054)).toBeCloseTo(0.975, 6);
    expect(normalCdf(-3) + normalCdf(3)).toBeCloseTo(1, 9);
  });
  it('inverse round-trips', () => {
    for (const p of [1e-6, 0.001, 0.02, 0.1, 0.5, 0.9, 0.99, 0.999999]) {
      expect(normalCdf(normalInv(p))).toBeCloseTo(p, 6);
    }
  });
});
