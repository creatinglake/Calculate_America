/** The six non-overlapping groups used by every chart (plan section 2). */
export const GROUP_KEYS = ['b50', 'm40', 'u9', 't09', 't009', 't001'] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

/** Population range [lo, hi) of each group, as fractions of adults. */
export const GROUP_RANGE: Record<GroupKey, readonly [number, number]> = {
  b50: [0, 0.5],
  m40: [0.5, 0.9],
  u9: [0.9, 0.99],
  t09: [0.99, 0.999],
  t009: [0.999, 0.9999],
  t001: [0.9999, 1],
};

export const GROUP_POP: Record<GroupKey, number> = {
  b50: 0.5, m40: 0.4, u9: 0.09, t09: 0.009, t009: 0.0009, t001: 0.0001,
};

export type GroupShares = Record<GroupKey, number>;

const EPS = 1e-9;

/** Indices of the bins (by their p0/p1 edges) that make up a group. */
export function groupBins(p0: readonly number[], p1: readonly number[], key: GroupKey): number[] {
  const [lo, hi] = GROUP_RANGE[key];
  const out: number[] = [];
  for (let i = 0; i < p0.length; i++) if (p0[i]! >= lo - EPS && p1[i]! <= hi + EPS) out.push(i);
  return out;
}
