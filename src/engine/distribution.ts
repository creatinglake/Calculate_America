/**
 * A distribution is 127 bins (WID generalized percentiles), each with a
 * population width, the average income in the bin, and its lower threshold.
 * Bins are ordered from the bottom; p0/p1 are population fractions in [0, 1].
 */
export interface Distribution {
  p0: readonly number[];
  p1: readonly number[];
  avg: readonly number[];
  thr: readonly number[];
}

/** One year of a data file in public/data (see pipeline/build.py to_json). */
export interface YearData {
  avg: number[];
  thr: number[];
  share: number[];
}

export interface DataFile {
  meta: Record<string, unknown>;
  years: number[];
  bins: { p0: number; p1: number }[];
  byYear: Record<string, YearData>;
  meanPerAdult: Record<string, number>;
  adults?: Record<string, number>;
}

export const BIN_COUNT = 127;

export function fromDataFile(file: DataFile, year: number): Distribution {
  const y = file.byYear[String(year)];
  if (!y) throw new Error(`No data for ${year}`);
  return {
    p0: file.bins.map((b) => b.p0),
    p1: file.bins.map((b) => b.p1),
    avg: y.avg,
    thr: y.thr,
  };
}

export function width(d: Distribution, i: number): number {
  return d.p1[i]! - d.p0[i]!;
}

/** Mean income per adult: sum of bin width x bin average. */
export function mean(d: Distribution): number {
  let m = 0;
  for (let i = 0; i < d.avg.length; i++) m += width(d, i) * d.avg[i]!;
  return m;
}

/** Fraction of total income going to each bin. */
export function binShares(d: Distribution): number[] {
  const m = mean(d);
  return d.avg.map((a, i) => (width(d, i) * a) / m);
}
