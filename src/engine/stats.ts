/** Summary statistics for a distribution (plan section 4.7). */
import { binShares, mean, type Distribution } from './distribution';
import { GROUP_KEYS, GROUP_POP, groupBins, type GroupShares } from './groups';
import type { QuantileFn } from './quantile';

export function groupShares(d: Distribution): GroupShares {
  const s = binShares(d);
  const out = {} as GroupShares;
  for (const g of GROUP_KEYS) out[g] = groupBins(d.p0, d.p1, g).reduce((a, i) => a + s[i]!, 0);
  return out;
}

/** Share of total income going to the top `top` fraction of adults (e.g. 0.01). */
export function topShare(d: Distribution, top: number): number {
  const s = binShares(d);
  let t = 0;
  for (let i = 0; i < s.length; i++) if (d.p0[i]! >= 1 - top - 1e-9) t += s[i]!;
  return t;
}

/**
 * Gini coefficient from the binned Lorenz curve (trapezoid rule). Treating
 * everyone in a bin as equal ignores inequality inside bins, so this slightly
 * understates the true Gini.
 */
export function gini(d: Distribution): number {
  const s = binShares(d);
  let lorenz = 0, area = 0;
  for (let i = 0; i < s.length; i++) {
    const next = lorenz + s[i]!;
    area += (d.p1[i]! - d.p0[i]!) * (lorenz + next);
    lorenz = next;
  }
  return 1 - area;
}

export interface Summary {
  mean: number;
  median: number;
  groups: GroupShares;
  top10: number;
  top1: number;
  top01: number;
  top001: number;
  gini: number;
  /** Average income of the top 1% divided by that of the bottom 50%. */
  top1ToBottom50: number;
}

export function summarize(d: Distribution, Q: QuantileFn): Summary {
  const groups = groupShares(d);
  const top1 = groups.t09 + groups.t009 + groups.t001;
  return {
    mean: mean(d),
    median: Q.q(0.5),
    groups,
    top10: groups.u9 + top1,
    top1,
    top01: groups.t009 + groups.t001,
    top001: groups.t001,
    gini: gini(d),
    top1ToBottom50: top1 / 0.01 / (groups.b50 / GROUP_POP.b50),
  };
}

/**
 * The year with the lowest Gini (plan section 5, "US most equal year").
 * Computed from the data, never hard-coded. The lowest top 1% share and the
 * highest bottom 50% share can fall in different years; the preset card says so.
 */
export function mostEqualYear(years: ReadonlyMap<number, Distribution>): { year: number; gini: number } {
  let best: { year: number; gini: number } | null = null;
  for (const [year, d] of years) {
    const g = gini(d);
    if (!best || g < best.gini) best = { year, gini: g };
  }
  if (!best) throw new Error('no years given');
  return best;
}
