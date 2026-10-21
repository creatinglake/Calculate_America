import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_STATE, groupShares, mean, shapeOf, type ViewState } from '../engine';
import { loadData } from '../engine/test/data';
import { presetList, resolve, type Data } from './scenarios';

const read = (n: string) => JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'data', `${n}.json`), 'utf8'));
const data: Data = {
  ptinc: loadData('us-ptinc'), cainc: loadData('us-cainc'), ptincAs: loadData('us-ptinc-as'),
  comparisons: read('comparisons'), presets: read('presets'),
};
const at = (patch: Partial<ViewState>): ViewState => ({ ...DEFAULT_STATE, ...patch });

describe('scenario resolution', () => {
  it('default: 2023 today vs US 1963', () => {
    const r = resolve(data, DEFAULT_STATE);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.today.year).toBe(2023); expect(r.scenario.label).toBe('US 1963'); }
  });

  it('post-tax uses the PSZ disposable income series (latest 2019)', () => {
    const r = resolve(data, at({ concept: 'post' }));
    expect(r.ok && r.today.year).toBe(2019);
  });

  it('post-tax 1985 is unavailable', () => {
    const r = resolve(data, at({ concept: 'post', scenario: { kind: 'year', year: 1985 } }));
    expect(r.ok).toBe(false);
  });

  it('AS with post-tax is unavailable; AS pre-tax latest is 2022', () => {
    expect(resolve(data, at({ data: 'as', concept: 'post' })).ok).toBe(false);
    const r = resolve(data, at({ data: 'as' }));
    expect(r.ok && r.today.year).toBe(2022);
  });

  it('every preset resolves pre-tax', () => {
    for (const p of presetList(data)) {
      const r = resolve(data, at({ scenario: { kind: 'preset', id: p.id } }));
      expect(r.ok, p.id).toBe(true);
    }
  });

  it('France and Western Europe have no post-tax preset', () => {
    for (const id of ['FR', 'QX']) {
      expect(resolve(data, at({ concept: 'post', scenario: { kind: 'preset', id } })).ok).toBe(false);
    }
  });

  it('perfect equality pays everyone the mean', () => {
    const r = resolve(data, at({ scenario: { kind: 'preset', id: 'equality' } }));
    if (!r.ok) throw new Error(r.reason);
    const S = shapeOf(r.scenario.dist);
    expect(S.Q.q(0.1)).toBeCloseTo(mean(r.today.dist), 6);
    expect(S.Q.q(0.99)).toBeCloseTo(mean(r.today.dist), 6);
  });

  it('gilded age matches the preset group shares', () => {
    const r = resolve(data, at({ scenario: { kind: 'preset', id: 'gilded-age' } }));
    if (!r.ok) throw new Error(r.reason);
    expect(groupShares(r.scenario.dist).t001).toBeCloseTo(data.presets.gildedAge.groups.central.t001!, 6);
  });

  it('impossible custom shares give the plan\'s message', () => {
    const groups = { b50: 0.6, m40: 0.3, u9: 0.06, t09: 0.03, t009: 0.007, t001: 0.003 };
    const r = resolve(data, at({ scenario: { kind: 'custom', groups } }));
    expect(r).toEqual({ ok: false, reason: "This isn't possible: a lower group would earn more per person than a higher group." });
  });

  it('blend of us-1963 and SE', () => {
    const r = resolve(data, at({ scenario: { kind: 'blend', a: 'us-1963', b: 'SE', t: 0.5 } }));
    expect(r.ok).toBe(true);
  });
});
