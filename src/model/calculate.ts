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
  /** Percentile in today's distribution, 0..1. */
  percentile: number;
  /** The user's income per adult, in data dollars. */
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
  const income = placement.perAdultDataDollars;
  const percentile = T.Q.rank(income);
  const scenarioIncome = counterfactual(percentile, T.mean, S, inputs.growthPenalty);
  const atZero = counterfactual(percentile, T.mean, S, 0);
  const today = summarize(r.today.dist, T.Q);
  return {
    placement,
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
