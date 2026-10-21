import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GROUP_KEYS, type GroupShares } from './groups';
import { DEFAULT_STATE, fromQuery, shareTitle, toQuery } from './url';

const groupsArb = fc
  .array(fc.integer({ min: 1, max: 1000 }), { minLength: 6, maxLength: 6 })
  .map((xs) => {
    const t = xs.reduce((a, b) => a + b, 0);
    return Object.fromEntries(GROUP_KEYS.map((k, i) => [k, xs[i]! / t])) as GroupShares;
  });

const id = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
const scenarioArb = fc.oneof(
  fc.integer({ min: 1962, max: 2023 }).map((year) => ({ kind: 'year' as const, year })),
  id.map((pid) => ({ kind: 'preset' as const, id: pid })),
  groupsArb.map((groups) => ({ kind: 'custom' as const, groups })),
  fc.tuple(id, id, fc.integer({ min: 0, max: 1000 })).map(([a, b, t]) => ({ kind: 'blend' as const, a, b, t: t / 1000 })),
  fc.tuple(fc.integer({ min: 1, max: 3000 }), fc.integer({ min: 1001, max: 5000 })).map(([s, a]) => ({ kind: 'param' as const, sigma: s / 1000, alpha: a / 1000 })),
);
const stateArb = fc.record({
  scenario: scenarioArb,
  data: fc.constantFrom('psz' as const, 'as' as const),
  concept: fc.constantFrom('pre' as const, 'post' as const),
  growthPenalty: fc.integer({ min: 0, max: 30 }).map((x) => x / 100),
});

describe('url state', () => {
  it('round-trips every state', () => {
    fc.assert(fc.property(stateArb, (s) => {
      const back = fromQuery(toQuery(s));
      expect(back.data).toBe(s.data);
      expect(back.concept).toBe(s.concept);
      expect(back.growthPenalty).toBeCloseTo(s.growthPenalty, 9);
      if (s.scenario.kind === 'custom' && back.scenario.kind === 'custom') {
        for (const k of GROUP_KEYS) expect(back.scenario.groups[k]).toBeCloseTo(s.scenario.groups[k], 5);
      } else {
        expect(back.scenario).toEqual(s.scenario);
      }
    }));
  });

  it('matches the plan example', () => {
    const s = fromQuery('?s=custom&g=12.5,40,27,10,5.5,5');
    expect(s.scenario.kind).toBe('custom');
    if (s.scenario.kind === 'custom') expect(s.scenario.groups.b50).toBeCloseTo(0.125, 12);
  });

  it('falls back to defaults on junk', () => {
    for (const bad of ['?s=year&y=abc', '?s=custom&g=1,2', '?s=param&sig=-1&al=0.5', '?s=preset&p=<script>', '?gp=99', '?s=blend&a=x&b=y&t=2']) {
      expect(fromQuery(bad).scenario).toEqual(DEFAULT_STATE.scenario);
    }
    expect(fromQuery('?gp=99').growthPenalty).toBe(0);
  });

  it('never stores income', () => {
    expect(toQuery({ ...DEFAULT_STATE, growthPenalty: 0.1 })).not.toMatch(/income|inc=/);
  });

  it('share titles', () => {
    expect(shareTitle(DEFAULT_STATE)).toBe("If America's income were divided like 1963");
  });
});
