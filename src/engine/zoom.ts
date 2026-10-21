/**
 * Powers-of-ten zoom grid (plan 6.2, chart 4). Each level is a 10 x 10 grid
 * of equal slices of a population range: everyone, the top 1%, the top 0.1%,
 * the top 0.01%. People per cell come from the adult population count.
 */
import type { QuantileFn } from './quantile';

export interface ZoomLevel {
  /** Lower edge of the range shown (0, 0.99, 0.999, 0.9999). */
  from: number;
  label: string;
  /** True when cells are narrower than WID's finest bins (0.001% of adults). */
  interpolated: boolean;
}

export const ZOOM_LEVELS: readonly ZoomLevel[] = [
  { from: 0, label: 'All adults', interpolated: false },
  { from: 0.99, label: 'The top 1%', interpolated: false },
  { from: 0.999, label: 'The top 0.1%', interpolated: false },
  { from: 0.9999, label: 'The top 0.01%', interpolated: true },
];

export const CELLS = 100;
/** Hours in a year, for "earns the median income every N hours". */
export const HOURS_PER_YEAR = 8760;

export interface Cell {
  index: number;
  p0: number;
  p1: number;
  people: number;
  average: number;
  threshold: number;
  multipleOfMedian: number;
  /** Hours (counting every hour of the year) to receive the median's yearly income. */
  hoursToEarnMedian: number;
}

export interface LevelStats {
  level: ZoomLevel;
  cells: Cell[];
  peoplePerCell: number;
  average: number;
  threshold: number;
  median: number;
  multipleOfMedian: number;
  hoursToEarnMedian: number;
  /** Index of the first cell that opens the next level, or null at the last level. */
  zoomFrom: number | null;
}

export function levelStats(Q: QuantileFn, adults: number, levelIndex: number): LevelStats {
  const level = ZOOM_LEVELS[levelIndex]!;
  const w = (1 - level.from) / CELLS;
  const median = Q.q(0.5);
  const hours = (avg: number) => (avg > 0 ? (median / avg) * HOURS_PER_YEAR : Infinity);
  const cells: Cell[] = Array.from({ length: CELLS }, (_, i) => {
    const p0 = level.from + i * w;
    const p1 = i === CELLS - 1 ? 1 : level.from + (i + 1) * w;
    const average = Q.meanBetween(p0, p1);
    return {
      index: i, p0, p1, people: adults * w, average, threshold: Q.q(p0),
      multipleOfMedian: average / median, hoursToEarnMedian: hours(average),
    };
  });
  const average = Q.meanBetween(level.from, 1);
  const next = ZOOM_LEVELS[levelIndex + 1];
  return {
    level, cells, peoplePerCell: adults * w, average, threshold: Q.q(level.from), median,
    multipleOfMedian: average / median, hoursToEarnMedian: hours(average),
    // The next level is the top tenth of this one's range: its last 10 cells
    // (at level 0, only the last cell, since the top 1% is one cell).
    zoomFrom: next ? Math.round((next.from - level.from) / w) : null,
  };
}

/** Shares of the top 1%'s income going to P99-99.9, P99.9-99.99 and the top 0.01%. */
export function withinTop1(Q: QuantileFn) {
  const top = Q.integral(0.99, 1);
  return {
    t09: Q.integral(0.99, 0.999) / top,
    t009: Q.integral(0.999, 0.9999) / top,
    t001: Q.integral(0.9999, 1) / top,
  };
}
