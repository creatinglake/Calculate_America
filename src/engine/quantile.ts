/**
 * Income at percentile p (quantile function) and its inverse (rank).
 *
 * Follows WID's generalized Pareto interpolation (Blanchet, Fournier and
 * Piketty 2017, "gpinter"). With x = -ln(1 - p) and
 *   phi(x) = -ln( integral from p to 1 of Q(u) du ),
 * every bin edge k gives phi exactly (from the bin averages above it) and its
 * slope phi'(x_k) = threshold_k * (1 - p_k) / (income above p_k). Between
 * edges phi is a quintic Hermite spline, and Q(p) = phi'(x) * exp(x - phi(x)).
 * This reproduces every published threshold and every bin average exactly.
 *
 * If the spline is not increasing inside a bin, that bin falls back to a
 * power curve in rank, Q = t_lo + (t_hi - t_lo) * u^k, with k chosen so the
 * bin average is exact. Above the last edge (P99.999) income follows a Pareto
 * tail with inverted Pareto coefficient b = average / threshold.
 */
import type { Distribution } from './distribution';
import { width } from './distribution';

type BinFit =
  | { kind: 'spline'; x0: number; h: number; f0: number; f1: number; d0: number; d1: number; s0: number; s1: number }
  | { kind: 'power'; lo: number; hi: number; k: number }
  | { kind: 'tail'; thr: number; p0: number; alpha: number };

export interface QuantileFn {
  /** Income at percentile p in [0, 1). */
  q(p: number): number;
  /** Percentile of an income, in [0, 1). */
  rank(income: number): number;
  /** How each bin was fitted, for tests and the methods page. */
  fits: readonly BinFit['kind'][];
  /** Mean of the fitted curve over bin k, in closed form. */
  binMean(k: number): number;
  dist: Distribution;
}

const SAMPLES_PER_BIN = 64;
// Rounding to whole dollars can put a bin average on its threshold; keep the
// power exponent finite in that case.
const K_MIN = 1e-9;
const K_MAX = 1e9;

function hermite(t: number, f0: number, d0: number, s0: number, f1: number, d1: number, s1: number, h: number) {
  const t2 = t * t, t3 = t2 * t, t4 = t3 * t, t5 = t4 * t;
  const v =
    (1 - 10 * t3 + 15 * t4 - 6 * t5) * f0 +
    (t - 6 * t3 + 8 * t4 - 3 * t5) * h * d0 +
    ((t2 - 3 * t3 + 3 * t4 - t5) / 2) * h * h * s0 +
    ((t3 - 2 * t4 + t5) / 2) * h * h * s1 +
    (-4 * t3 + 7 * t4 - 3 * t5) * h * d1 +
    (10 * t3 - 15 * t4 + 6 * t5) * f1;
  const dv =
    ((-30 * t2 + 60 * t3 - 30 * t4) * f0 +
      (1 - 18 * t2 + 32 * t3 - 15 * t4) * h * d0 +
      ((2 * t - 9 * t2 + 12 * t3 - 5 * t4) / 2) * h * h * s0 +
      ((3 * t2 - 8 * t3 + 5 * t4) / 2) * h * h * s1 +
      (-12 * t2 + 28 * t3 - 15 * t4) * h * d1 +
      (30 * t2 - 60 * t3 + 30 * t4) * f1) / h;
  return { v, dv };
}

function evalFit(fit: BinFit, p: number, p0: number, p1: number): number {
  switch (fit.kind) {
    case 'spline': {
      const x = -Math.log(1 - p);
      const t = Math.min(1, Math.max(0, (x - fit.x0) / fit.h));
      const { v, dv } = hermite(t, fit.f0, fit.d0, fit.s0, fit.f1, fit.d1, fit.s1, fit.h);
      return dv * Math.exp(x - v);
    }
    case 'power': {
      const u = Math.min(1, Math.max(0, (p - p0) / (p1 - p0)));
      return fit.lo + (fit.hi - fit.lo) * Math.pow(u, fit.k);
    }
    case 'tail':
      return fit.thr * Math.pow((1 - fit.p0) / (1 - p), 1 / fit.alpha);
  }
}

function powerFit(lo: number, hi: number, avg: number): BinFit {
  if (hi <= lo) return { kind: 'power', lo, hi: lo, k: 1 };
  const k = (hi - lo) / (avg - lo) - 1;
  return { kind: 'power', lo, hi, k: Math.min(K_MAX, Math.max(K_MIN, Number.isFinite(k) ? k : K_MAX)) };
}

export function buildQuantile(d: Distribution): QuantileFn {
  const n = d.avg.length;
  // Income above each edge: T_k = sum over bins j >= k of width_j * avg_j.
  const above = new Array<number>(n + 1).fill(0);
  for (let k = n - 1; k >= 0; k--) above[k] = above[k + 1]! + width(d, k) * d.avg[k]!;

  const x = d.p0.map((p) => -Math.log(1 - p));
  const phi = above.slice(0, n).map((t) => -Math.log(t));
  const dphi = d.thr.map((t, k) => (t * (1 - d.p0[k]!)) / above[k]!);
  const d2 = dphi.map((_, k) => {
    if (k === 0) return (dphi[1]! - dphi[0]!) / (x[1]! - x[0]!);
    if (k === n - 1) return (dphi[k]! - dphi[k - 1]!) / (x[k]! - x[k - 1]!);
    const h0 = x[k]! - x[k - 1]!, h1 = x[k + 1]! - x[k]!;
    return (h0 * h0 * (dphi[k + 1]! - dphi[k]!) + h1 * h1 * (dphi[k]! - dphi[k - 1]!)) / (h0 * h1 * (h0 + h1));
  });

  const fits: BinFit[] = [];
  for (let k = 0; k < n - 1; k++) {
    const lo = d.thr[k]!, hi = d.thr[k + 1]!;
    const spline: BinFit = {
      kind: 'spline', x0: x[k]!, h: x[k + 1]! - x[k]!,
      f0: phi[k]!, f1: phi[k + 1]!, d0: dphi[k]!, d1: dphi[k + 1]!, s0: d2[k]!, s1: d2[k + 1]!,
    };
    fits.push(isIncreasing(spline, d.p0[k]!, d.p1[k]!, lo, hi) ? spline : powerFit(lo, hi, d.avg[k]!));
  }
  // Top bin: Pareto tail, b = average / threshold, alpha = b / (b - 1).
  const top = n - 1;
  const b = d.avg[top]! / d.thr[top]!;
  fits.push({ kind: 'tail', thr: d.thr[top]!, p0: d.p0[top]!, alpha: b / (b - 1) });

  const q = (p: number): number => {
    if (!(p >= 0 && p < 1)) throw new RangeError(`percentile out of range: ${p}`);
    const k = binIndex(d.p0, p);
    return evalFit(fits[k]!, p, d.p0[k]!, d.p1[k]!);
  };

  const rank = (income: number): number => {
    if (income <= d.thr[0]!) return 0;
    const tail = fits[top] as Extract<BinFit, { kind: 'tail' }>;
    if (income >= tail.thr) return 1 - (1 - tail.p0) * Math.pow(tail.thr / income, tail.alpha);
    const k = binIndex(d.thr, income);
    let lo = d.p0[k]!, hi = d.p1[k]!;
    for (let i = 0; i < 64; i++) {
      const mid = (lo + hi) / 2;
      if (evalFit(fits[k]!, mid, d.p0[k]!, d.p1[k]!) < income) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const binMean = (k: number): number => {
    const f = fits[k]!;
    switch (f.kind) {
      case 'spline':
        return (Math.exp(-f.f0) - Math.exp(-f.f1)) / width(d, k);
      case 'power':
        return f.lo + (f.hi - f.lo) / (f.k + 1);
      case 'tail':
        return (f.thr * f.alpha) / (f.alpha - 1);
    }
  };

  return { q, rank, binMean, fits: fits.map((f) => f.kind), dist: d };
}

function isIncreasing(fit: BinFit, p0: number, p1: number, lo: number, hi: number): boolean {
  let prev = lo;
  const tol = 1e-9 * Math.max(1, Math.abs(hi));
  for (let i = 1; i <= SAMPLES_PER_BIN; i++) {
    const v = evalFit(fit, p0 + ((p1 - p0) * i) / SAMPLES_PER_BIN, p0, p1);
    if (!Number.isFinite(v) || v < prev - tol || v > hi + tol) return false;
    prev = v;
  }
  return true;
}

/** Largest k with edges[k] <= value (edges ascending), clamped to [0, n-1]. */
function binIndex(edges: readonly number[], value: number): number {
  let lo = 0, hi = edges.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (edges[mid]! <= value) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
