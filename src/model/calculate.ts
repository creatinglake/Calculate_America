/**
 * Everything the result card and charts need for one person and scenario.
 * Pure: the page calls this with the resolved scenario and the user's answers.
 */
import {
  breakevenPenalty, counterfactual, groupShares, place, rankInWords, shapeOf, summarize,
  workEquivalent, type GroupShares, type IncomeAnswers, type Summary,
} from '../engine';
import type { Resolved } from './scenarios';

export interface Inputs {
  answers: IncomeAnswers;
  compToWages: number;
  cpiRatio: number;
  growthPenalty: number;
  annualHours?: number;
}

export interface Calculation {
  placement: ReturnType<typeof place>;
  /** True when "income" is the after-tax income at the user's pre-tax rank. */
  afterTax: boolean;
  /** Percentile in today's distribution, 0..1. */
  percentile: number;
  /** The user's income per adult in data dollars (after tax at their rank, in after-tax views). */
  income: number;
  /** What someone at that percentile would receive under the scenario. */
  scenarioIncome: number;
  difference: number;
  breakeven: number | null;
  work: ReturnType<typeof workEquivalent>;
  words: ReturnType<typeof rankInWords>;
  today: Summary;
  scenario: Summary;
  groupsToday: GroupShares;
  groupsScenario: GroupShares;
}

export function calculate(r: Resolved, inputs: Inputs): Calculation {
  const placement = place(inputs.answers, inputs.compToWages, inputs.cpiRatio);
  const T = shapeOf(r.today.dist);
  const S = shapeOf(r.scenario.dist);
  // In after-tax views the entered (pre-tax) income sets the rank, and the
  // comparison is between after-tax incomes at that rank.
  const percentile = r.rankBy
    ? shapeOf(r.rankBy.dist).Q.rank(placement.perAdultDataDollars)
    : T.Q.rank(placement.perAdultDataDollars);
  const income = r.rankBy ? T.Q.q(percentile) : placement.perAdultDataDollars;
  const scenarioIncome = counterfactual(percentile, T.mean, S, inputs.growthPenalty);
  const atZero = counterfactual(percentile, T.mean, S, 0);
  const today = summarize(r.today.dist, T.Q);
  return {
    placement,
    afterTax: Boolean(r.rankBy),
    percentile,
    income,
    scenarioIncome,
    difference: scenarioIncome - income,
    breakeven: breakevenPenalty(income, atZero),
    work: workEquivalent(scenarioIncome - income, income, inputs.annualHours),
    words: rankInWords(percentile, income, today.median),
    today,
    scenario: summarize(r.scenario.dist, S.Q),
    groupsToday: groupShares(r.today.dist),
    groupsScenario: groupShares(r.scenario.dist),
  };
}
