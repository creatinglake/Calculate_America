import { describe, expect, it } from 'vitest';
import { heightText } from './Parade';

describe('parade heights', () => {
  it('formats feet, inches and miles', () => {
    expect(heightText(67)).toBe('5 ft 7 in');
    expect(heightText(12 * 250)).toBe('250 feet');
    expect(heightText(12 * 5280 * 3)).toBe('3.0 miles');
    expect(heightText(-5)).toMatch(/below ground/);
  });
});
