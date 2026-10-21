/**
 * The stretched percentile axis (plan 6.2, chart 3): four equal-width bands,
 * P0-90, P90-99, P99-99.9 and P99.9-100. The first is linear in rank; the
 * next two are logarithmic in (1 - p), so each is one decade; the last band
 * squeezes P99.9 to P99.999 (two decades) into one band width.
 * Returns a position in [0, 4]; multiply by band width for pixels.
 */
export const BANDS = [
  { from: 0, to: 0.9, label: 'Bottom 90%' },
  { from: 0.9, to: 0.99, label: 'Next 9%' },
  { from: 0.99, to: 0.999, label: 'Next 0.9%' },
  { from: 0.999, to: 1, label: 'Top 0.1%' },
] as const;

/** Highest percentile plotted (the last WID bin edge). */
export const P_MAX = 0.99999;

export function stretch(p: number): number {
  if (p <= 0) return 0;
  if (p <= 0.9) return p / 0.9;
  const u = -Math.log10(1 - Math.min(p, P_MAX)); // 1 at P90, 2 at P99, 3 at P99.9, 5 at P99.999
  if (u <= 3) return u;
  return 3 + (u - 3) / 2;
}

export function unstretch(x: number): number {
  if (x <= 1) return 0.9 * Math.max(0, x);
  const u = x <= 3 ? x : 3 + (x - 3) * 2;
  return 1 - Math.pow(10, -u);
}

/** Tick marks: band edges plus a few labelled points. */
export const TICKS = [0, 0.5, 0.9, 0.99, 0.999, 0.9999, P_MAX];
