import { describe, expect, it } from 'vitest';
import { EMPTY_FIELDS, parseAmount, toAnswers } from './IncomeForm';

describe('income form parsing', () => {
  it('parses money strings', () => {
    expect(parseAmount('$60,000')).toBe(60000);
    expect(parseAmount(' 1234.5 ')).toBe(1234.5);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBeNaN();
  });
  it('needs at least one amount and all valid', () => {
    expect(toAnswers(EMPTY_FIELDS)).toBeNull();
    expect(toAnswers({ ...EMPTY_FIELDS, wages: 'x' })).toBeNull();
    expect(toAnswers({ ...EMPTY_FIELDS, wages: '60,000' })?.wages).toBe(60000);
  });
});
