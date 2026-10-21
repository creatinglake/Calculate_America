/** Custom distributions (plan section 4.6). Each returns a 127-bin Distribution. */
import { mean, type Distribution } from './distribution';
import { GROUP_KEYS, GROUP_POP, GROUP_RANGE, groupBins, type GroupKey, type GroupShares } from './groups';
import { normalCdf, normalInv } from './normal';

// ---------------------------------------------------------------- sliders

/**
 * Linked sliders: set one group's share; the others give or take in
 * proportion to their current shares so the total stays 100%.
 */
export function setGroupShare(shares: GroupShares, key: GroupKey, value: number): GroupShares {
  const v = Math.min(1, Math.max(0, value));
  const others = GROUP_KEYS.filter((g) => g !== key);
  const rest = others.reduce((a, g) => a + shares[g], 0);
  const out = { ...shares, [key]: v };
  for (const g of others) {
    // If the others are all zero, share the remainder by population.
    const weight = rest > 0 ? shares[g] / rest : GROUP_POP[g] / (1 - GROUP_POP[key]);
    out[g] = (1 - v) * weight;
  }
  return out;
}

// ------------------------------------------------------- group shares builder

export type BuildResult =
  | { ok: true; dist: Distribution }
  | { ok: false; reason: 'order' | 'shape' | 'sum' };

/** Lower thresholds from bin averages: midpoints of neighbours (WID's rule). */
export function deriveThresholds(avg: readonly number[]): number[] {
  const thr = avg.map((_, i) => (i === 0 ? 0 : (avg[i - 1]! + avg[i]!) / 2));
  thr[0] = Math.min(0, 2 * avg[0]!);
  return thr;
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    [M[c], M[piv]] = [M[piv]!, M[c]!];
    for (let r = c + 1; r < n; r++) {
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r]![n]!;
    for (let k = r + 1; k < n; k++) s -= M[r]![k]! * x[k]!;
    x[r] = s / M[r]![r]!;
  }
  return x;
}

/**
 * Per-bin scale factors that move every group to its target share while
 * changing incomes inside each group as evenly as possible. Each group's
 * factor is a straight line in rank, a + b·t, with t running from -1/2 at the
 * group's bottom to +1/2 at its top. The slopes are as small as possible
 * (least sum of b²) subject to two rules: each group's share is exactly its
 * target, and the top of each group still has no more than the bottom of the
 * group above. When that second rule doesn't bind, every slope is zero and
 * each group is scaled by one number.
 */
export function evenFactors(d: Distribution, target: GroupShares): number[] {
  const shares = d.avg.map((a, i) => (d.p1[i]! - d.p0[i]!) * a);
  const total = shares.reduce((a, b) => a + b, 0);
  const G = GROUP_KEYS.length, n = 2 * G;
  const bins = GROUP_KEYS.map((g) => groupBins(d.p0, d.p1, g));
  const pos = new Array<number>(d.avg.length).fill(0);
  bins.forEach((idx, g) => {
    const [lo, hi] = GROUP_RANGE[GROUP_KEYS[g]!];
    for (const i of idx) pos[i] = ((d.p0[i]! + d.p1[i]!) / 2 - lo) / (hi - lo) - 0.5;
  });
  // Equality rows: group shares. Variables are [a_0..a_5, b_0..b_5].
  const eq: number[][] = bins.map((idx, g) => {
    const row = new Array<number>(n).fill(0);
    for (const i of idx) { row[g]! += shares[i]! / total; row[G + g]! += (shares[i]! / total) * pos[i]!; }
    return row;
  });
  const eqRhs = GROUP_KEYS.map((g) => target[g]);
  // Edge rows: (bottom bin of the group above) − (top bin of this group) ≥ 0.
  const edge: number[][] = [];
  for (let g = 0; g < G - 1; g++) {
    const top = bins[g]![bins[g]!.length - 1]!, bot = bins[g + 1]![0]!;
    const row = new Array<number>(n).fill(0);
    row[g + 1] = d.avg[bot]!; row[G + g + 1] = d.avg[bot]! * pos[bot]!;
    row[g] = -d.avg[top]!; row[G + g] = -d.avg[top]! * pos[top]!;
    edge.push(row);
  }
  const dot = (r: number[], x: number[]) => r.reduce((a, v, k) => a + v * x[k]!, 0);
  // A convex problem with few constraints: try every set of binding edges,
  // keep the feasible solution with the smallest objective.
  let best: number[] | null = null, bestObj = Infinity;
  for (let mask = 0; mask < 1 << edge.length; mask++) {
    const rows = [...eq, ...edge.filter((_, k) => mask & (1 << k))];
    const rhs = [...eqRhs, ...rows.slice(G).map(() => 0)];
    const m = rows.length;
    const K = [
      ...Array.from({ length: n }, (_, i) => [
        ...Array.from({ length: n }, (_, j) => (i === j && i >= G ? 2 : 0)),
        ...rows.map((r) => r[i]!),
      ]),
      ...rows.map((r) => [...r, ...new Array<number>(m).fill(0)]),
    ];
    const x = solve(K, [...new Array<number>(n).fill(0), ...rhs]).slice(0, n);
    if (x.some((v) => !Number.isFinite(v))) continue;
    if (edge.some((r) => dot(r, x) < -1e-9 * total)) continue;
    const obj = x.slice(G).reduce((a, b) => a + b * b, 0);
    if (obj < bestObj - 1e-15) { best = x; bestObj = obj; }
  }
  if (!best) return d.avg.map(() => NaN);
  const f = new Array<number>(d.avg.length).fill(NaN);
  bins.forEach((idx, g) => { for (const i of idx) f[i] = best![g]! + best![G + g]! * pos[i]!; });
  return f;
}

/** True when every group earns more per person than the group below it. */
export function perPersonOrdered(target: GroupShares): boolean {
  const per = GROUP_KEYS.map((g) => target[g] / GROUP_POP[g]);
  return per.every((v, i) => i === 0 || v > per[i - 1]!);
}

/**
 * Build a distribution with the given group shares, keeping the shape of
 * `reference` inside groups (see evenFactors). Fails with 'order' if a
 * lower group would earn more per person than a higher one, or 'shape' if
 * the result isn't increasing.
 */
export function fromGroupShares(reference: Distribution, target: GroupShares): BuildResult {
  const sum = GROUP_KEYS.reduce((a, g) => a + target[g], 0);
  if (Math.abs(sum - 1) > 1e-6 || GROUP_KEYS.some((g) => target[g] < 0)) return { ok: false, reason: 'sum' };
  if (!perPersonOrdered(target)) return { ok: false, reason: 'order' };
  const f = evenFactors(reference, target);
  if (f.some((v) => !(v > 0))) return { ok: false, reason: 'shape' };
  const avg = reference.avg.map((a, i) => a * f[i]!);
  for (let i = 1; i < avg.length; i++) if (avg[i]! < avg[i - 1]! * (1 - 1e-9)) return { ok: false, reason: 'shape' };
  return { ok: true, dist: { p0: reference.p0, p1: reference.p1, avg, thr: deriveThresholds(avg) } };
}

/** Income at each group's lower edge (P50, P90, P99, P99.9, P99.99). */
export function thresholdLadder(d: Distribution): { key: GroupKey; p: number; income: number }[] {
  return GROUP_KEYS.slice(1).map((key) => {
    const p = GROUP_RANGE[key][0];
    const i = d.p0.findIndex((x) => Math.abs(x - p) < 1e-9);
    return { key, p, income: d.thr[i]! };
  });
}

// ------------------------------------------------------------------ blend

/**
 * Blend two distributions: q(p) = (1-t) qA(p)/meanA + t qB(p)/meanB, times
 * outMean. Applied to bin averages and thresholds, which is exact because
 * both are linear in q.
 */
export function blend(a: Distribution, b: Distribution, t: number, outMean = 1): Distribution {
  if (t < 0 || t > 1) throw new RangeError('blend weight must be in [0, 1]');
  const ma = mean(a), mb = mean(b);
  const mix = (x: readonly number[], y: readonly number[]) =>
    x.map((v, i) => outMean * ((1 - t) * (v / ma) + t * (y[i]! / mb)));
  return { p0: a.p0, p1: a.p1, avg: mix(a.avg, b.avg), thr: mix(a.thr, b.thr) };
}

// ------------------------------------------------------------- parametric

const SPLIT = 0.9;

/**
 * Bottom 90% lognormal with shape sigma, top 10% Pareto with coefficient
 * alpha (> 1), joined at P90 with no jump. Scale is arbitrary (the median
 * is 1); only the shape matters to the engine.
 */
export function parametric(bins: Pick<Distribution, 'p0' | 'p1'>, sigma: number, alpha: number): Distribution {
  if (!(sigma > 0)) throw new RangeError('sigma must be positive');
  if (!(alpha > 1)) throw new RangeError('alpha must be greater than 1');
  const q90 = Math.exp(sigma * normalInv(SPLIT));
  const q = (p: number) =>
    p < SPLIT ? (p <= 0 ? 0 : Math.exp(sigma * normalInv(p))) : q90 * Math.pow((1 - SPLIT) / (1 - p), 1 / alpha);
  // Integral of q over [p0, p1], in closed form on each side of P90.
  const lognormalPart = (p0: number, p1: number) => {
    const z0 = p0 <= 0 ? -Infinity : normalInv(p0), z1 = normalInv(p1);
    return Math.exp((sigma * sigma) / 2) * (normalCdf(z1 - sigma) - (z0 === -Infinity ? 0 : normalCdf(z0 - sigma)));
  };
  const e = 1 - 1 / alpha;
  const paretoPart = (p0: number, p1: number) =>
    (q90 * Math.pow(1 - SPLIT, 1 / alpha) * (Math.pow(1 - p0, e) - (p1 >= 1 ? 0 : Math.pow(1 - p1, e)))) / e;
  const avg = bins.p0.map((p0, i) => {
    const p1 = bins.p1[i]!;
    const integral = p1 <= SPLIT + 1e-12 ? lognormalPart(p0, p1) : paretoPart(p0, p1);
    return integral / (p1 - p0);
  });
  return { p0: bins.p0, p1: bins.p1, avg, thr: bins.p0.map(q) };
}

