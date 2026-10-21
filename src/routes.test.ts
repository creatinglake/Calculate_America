import { describe, expect, it } from 'vitest';
import { matchRoute } from './routes';

describe('matchRoute', () => {
  it('matches the root', () => {
    expect(matchRoute('/')).toBe('/');
  });
  it('accepts paths with or without a trailing slash', () => {
    expect(matchRoute('/explore')).toBe('/explore/');
    expect(matchRoute('/explore/')).toBe('/explore/');
  });
  it('returns null for unknown paths', () => {
    expect(matchRoute('/nope')).toBeNull();
  });
});
