/** A person's results under a scenario (plan section 4.5). */
import { counterfactual, type Shape } from './counterfactual';

export const DEFAULT_ANNUAL_HOURS = 2000;
const WEEKS_PER_YEAR = 52;

export function lifetimeSimple(annualDifference: number, yearsWorked: number): number {
  return annualDifference * yearsWorked;
}

export interface CareerResult {
  total: number;
  byYear: { year: number; actual: number; scenario: number; difference: number }[];
  /** Years in the range with no data (e.g. 1985 in the post-tax series). */
  skipped: number[];
}

/**
 * Career mode: for each year from startYear to the latest year, what someone
 * at percentile p earned that year, against what they'd have earned with that
 * year's average income divided like the scenario. Summed in real dollars.
 */
export function career(p: number, startYear: number, years: ReadonlyMap<number, Shape>, scenario: Shape): CareerResult {
  const last = Math.max(...years.keys());
  const byYear: CareerResult['byYear'] = [];
  const skipped: number[] = [];
  for (let y = startYear; y <= last; y++) {
    const shape = years.get(y);
    if (!shape) {
      skipped.push(y);
      continue;
    }
    const actual = shape.Q.q(p);
    const alt = counterfactual(p, shape.mean, scenario);
    byYear.push({ year: y, actual, scenario: alt, difference: alt - actual });
  }
  return { total: byYear.reduce((a, r) => a + r.difference, 0), byYear, skipped };
}

/** "That equals N hours / weeks of work a year at your current pay." */
export function workEquivalent(difference: number, income: number, annualHours = DEFAULT_ANNUAL_HOURS) {
  if (income <= 0) return null;
  const fraction = difference / income;
  return { hours: fraction * annualHours, weeks: fraction * WEEKS_PER_YEAR };
}

/** "You earn more than X% of adults." "Your income is N x the median." */
export function rankInWords(percentile: number, income: number, median: number) {
  return { percentAbove: percentile * 100, multipleOfMedian: median > 0 ? income / median : null };
}

/** Default assumptions for the income-to-wealth link (plan section 8). */
export const DEFAULT_SAVE_RATE = 0.1;
export const DEFAULT_REAL_RETURN = 0.03;

export interface Accumulation {
  /** Wealth at the end of the last year, in real dollars. */
  total: number;
  /** Total saved before returns. */
  contributions: number;
  byYear: { year: number; saved: number; balance: number }[];
}

/**
 * "If your yearly income difference had been saved at rate s and earned real
 * return r, you'd have N more." Each year's saving is added at the end of the
 * year and earns the return in later years. Negative differences are
 * withdrawals (less saved).
 */
export function accumulate(flows: { year: number; amount: number }[], saveRate: number, realReturn: number): Accumulation {
  let balance = 0, contributions = 0;
  const byYear: Accumulation['byYear'] = [];
  for (const f of [...flows].sort((a, b) => a.year - b.year)) {
    const saved = f.amount * saveRate;
    balance = balance * (1 + realReturn) + saved;
    contributions += saved;
    byYear.push({ year: f.year, saved, balance });
  }
  return { total: balance, contributions, byYear };
}
