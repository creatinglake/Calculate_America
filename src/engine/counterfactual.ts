/**
 * Same size of economy, different division (plan section 4.4).
 *
 * cf(p) = meanToday x (1 - growthPenalty) x q_scenario(p) / mean_scenario
 *
 * The scenario supplies only the shape; today supplies the size.
 */
import { mean, type Distribution } from './distribution';
import { buildQuantile, type QuantileFn } from './quantile';

export interface Shape {
  Q: QuantileFn;
  mean: number;
}

export function shapeOf(d: Distribution): Shape {
  return { Q: buildQuantile(d), mean: mean(d) };
}

/** Growth penalty slider range (plan: 0 to 30%). */
export const MAX_GROWTH_PENALTY = 0.3;

export function counterfactual(p: number, meanToday: number, scenario: Shape, growthPenalty = 0): number {
  if (growthPenalty < 0 || growthPenalty > 1) throw new RangeError('growth penalty must be in [0, 1]');
  return meanToday * (1 - growthPenalty) * (scenario.Q.q(p) / scenario.mean);
}

/**
 * The economy-shrink fraction at which the scenario stops paying more than
 * today: cf x (1 - x) = income, so x = 1 - income / cf. Null when the
 * scenario already pays less than today at zero penalty.
 */
export function breakevenPenalty(income: number, cfAtZeroPenalty: number): number | null {
  if (cfAtZeroPenalty <= income || cfAtZeroPenalty <= 0) return null;
  return 1 - income / cfAtZeroPenalty;
}
