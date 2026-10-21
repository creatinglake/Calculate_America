/**
 * Tax scenarios (plan section 7): today's pre-tax distribution taxed under a
 * different schedule, with the extra revenue returned by a chosen rule.
 *
 * Two kinds of schedule:
 * - effective: average tax rates by group (all taxes), applied to income;
 * - statutory: federal income tax brackets applied to an approximate taxable
 *   income, base = income x (AGI / national income) - deduction - exemption.
 * Taxes are averaged over each bin exactly, by integrating across the bin
 * (including the Pareto tail), not applied to the bin average.
 */
import { width } from './distribution';
import { GROUP_KEYS, GROUP_RANGE, type GroupKey, type GroupShares } from './groups';
import type { QuantileFn } from './quantile';

export type Bracket = readonly [rate: number, threshold: number];
export type Status = 'single' | 'mfj';

export type Deduction =
  | { kind: 'fixed'; amount: Record<Status, number> }
  | { kind: 'percentCapped'; percent: number; cap: Record<Status, number> }
  /** The standard deduction is built into the schedule (zero bracket amount). */
  | { kind: 'builtIn' };

export type TaxRule =
  | { kind: 'effective'; label: string; rates: GroupShares }
  | {
      kind: 'statutory';
      label: string;
      brackets: Record<Status, readonly Bracket[]>;
      deduction: Deduction;
      exemption: Record<Status, number>;
      /** AGI / national income, to turn national income into approximate AGI. */
      agiRatio: number;
    };

export type Recycle = 'dividend' | 'bottom50' | 'belowMedian' | 'publicGoods';

/** Tax on taxable income under a bracket schedule (brackets ascending from 0). */
export function bracketTax(brackets: readonly Bracket[], taxable: number): number {
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [rate, lo] = brackets[i]!;
    const hi = i + 1 < brackets.length ? brackets[i + 1]![1] : Infinity;
    if (taxable <= lo) break;
    tax += rate * (Math.min(taxable, hi) - lo);
  }
  return tax;
}

function deductionFor(d: Deduction, agi: number, status: Status): number {
  switch (d.kind) {
    case 'fixed': return d.amount[status];
    case 'percentCapped': return Math.min(d.cap[status], d.percent * Math.max(0, agi));
    case 'builtIn': return 0;
  }
}

/** Approximate taxable income for pre-tax national income y. */
export function taxableIncome(rule: Extract<TaxRule, { kind: 'statutory' }>, y: number, status: Status): number {
  const agi = y * rule.agiRatio;
  return Math.max(0, agi - deductionFor(rule.deduction, agi, status) - rule.exemption[status]);
}

function groupAt(p: number): GroupKey {
  return [...GROUP_KEYS].reverse().find((k) => p >= GROUP_RANGE[k][0] - 1e-12)!;
}

/** Tax on one person with pre-tax income y at percentile p. */
export function taxOn(rule: TaxRule, y: number, p: number, status: Status = 'single'): number {
  if (rule.kind === 'effective') return rule.rates[groupAt(p)] * y;
  return bracketTax(rule.brackets[status], taxableIncome(rule, y, status));
}

/** Marginal rate on national income (statutory) or the average rate (effective). */
export function marginalRate(rule: TaxRule, y: number, p: number, status: Status = 'single'): number {
  if (rule.kind === 'effective') return rule.rates[groupAt(p)];
  const h = Math.max(1, Math.abs(y) * 1e-6);
  return (taxOn(rule, y + h, p, status) - taxOn(rule, y, p, status)) / h;
}

/**
 * Incomes (pre-tax national income) where a statutory schedule's tax changes
 * slope: where taxable income becomes positive, crosses each bracket
 * threshold, and where a capped percentage deduction reaches its cap. Between
 * these points tax is linear in income.
 */
export function kinks(rule: Extract<TaxRule, { kind: 'statutory' }>, status: Status): number[] {
  const solve = (target: number) => {
    let lo = -1, hi = 1e13;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (taxableIncome(rule, mid, status) > target) hi = mid;
      else lo = mid;
    }
    return hi;
  };
  const out = [solve(0), ...rule.brackets[status].slice(1).map(([, t]) => solve(t))];
  if (rule.deduction.kind === 'percentCapped') {
    out.push(rule.deduction.cap[status] / (rule.deduction.percent * rule.agiRatio));
  }
  return [...new Set(out.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
}

/**
 * Average tax over bin k when everyone's income is multiplied by f. Exact:
 * effective rates are constant within a bin; statutory tax is linear between
 * kinks, so it integrates with the closed-form income integral.
 */
export function binTax(Q: QuantileFn, k: number, rule: TaxRule, f = 1): number {
  const d = Q.dist, p0 = d.p0[k]!, p1 = d.p1[k]!;
  if (rule.kind === 'effective') return rule.rates[groupAt((p0 + p1) / 2)] * f * d.avg[k]!;
  const ks = kinks(rule, 'single');
  const cuts = [p0];
  for (const y of ks) {
    const p = Q.rank(y / f);
    if (p > p0 && p < p1) cuts.push(p);
  }
  cuts.push(p1);
  cuts.sort((a, b) => a - b);
  let total = 0;
  for (let i = 0; i + 1 < cuts.length; i++) {
    const a = cuts[i]!, b = cuts[i + 1]!;
    if (b <= a) continue;
    // Find the linear piece containing this segment from two incomes inside it.
    const ya = f * Q.q(a + (b - a) * 0.25), yb = f * Q.q(a + (b - a) * 0.75);
    const ga = taxOn(rule, ya, a), gb = taxOn(rule, yb, b);
    const beta = yb !== ya ? (gb - ga) / (yb - ya) : 0;
    const alpha = ga - beta * ya;
    total += alpha * (b - a) + beta * f * Q.integral(a, b);
  }
  return total / (p1 - p0);
}

export interface TaxInputs {
  Q: QuantileFn;
  current: TaxRule;
  scenario: TaxRule;
  /** Elasticity of taxable income, 0 = no behavioural response. */
  elasticity: number;
  recycle: Recycle;
}

export interface TaxResult {
  /** Per bin, per adult, in the data's dollars. */
  preTax: number[];
  preTaxScenario: number[];
  taxCurrent: number[];
  taxScenario: number[];
  transfer: number[];
  afterCurrent: number[];
  afterScenario: number[];
  /** Extra revenue per adult (scenario minus current law, on the same base). */
  revenuePerAdult: number;
  revenueShareOfIncome: number;
  groupsAfterCurrent: GroupShares;
  groupsAfterScenario: GroupShares;
  /** Net change per adult by group (after-tax income, scenario minus current). */
  groupChange: GroupShares;
}

export function runTaxes({ Q, current, scenario, elasticity, recycle }: TaxInputs): TaxResult {
  const d = Q.dist, n = d.avg.length;
  const w = (k: number) => width(d, k);
  const preTax = d.avg.slice();
  // Behavioural response per bin, from marginal rates at the bin average.
  const factor = d.avg.map((y, k) => {
    if (elasticity === 0) return 1;
    const p = (d.p0[k]! + d.p1[k]!) / 2;
    const t0 = Math.min(0.99, marginalRate(current, y, p)), t1 = Math.min(0.99, marginalRate(scenario, y, p));
    return Math.pow((1 - t1) / (1 - t0), elasticity);
  });
  const preTaxScenario = preTax.map((y, k) => y * factor[k]!);
  const taxCurrent = preTax.map((_, k) => binTax(Q, k, current));
  const taxScenario = preTax.map((_, k) => binTax(Q, k, scenario, factor[k]!));

  let revenue = 0;
  for (let k = 0; k < n; k++) revenue += w(k) * (taxScenario[k]! - taxCurrent[k]!);

  const transfer = new Array<number>(n).fill(0);
  if (recycle === 'dividend') transfer.fill(revenue);
  if (recycle === 'bottom50') for (let k = 0; k < n; k++) if (d.p1[k]! <= 0.5 + 1e-12) transfer[k] = revenue / 0.5;
  if (recycle === 'belowMedian') {
    let base = 0;
    for (let k = 0; k < n; k++) if (d.p1[k]! <= 0.5 + 1e-12) base += w(k) * Math.max(0, preTax[k]!);
    for (let k = 0; k < n; k++) if (d.p1[k]! <= 0.5 + 1e-12 && base > 0) transfer[k] = (revenue * Math.max(0, preTax[k]!)) / base;
  }

  const afterCurrent = preTax.map((y, k) => y - taxCurrent[k]!);
  const afterScenario = preTaxScenario.map((y, k) => y - taxScenario[k]! + transfer[k]!);
  const groups = (v: number[]) => {
    const total = v.reduce((a, x, k) => a + w(k) * x, 0);
    const out = {} as GroupShares;
    for (const g of GROUP_KEYS) {
      const [lo, hi] = GROUP_RANGE[g];
      let s = 0;
      for (let k = 0; k < n; k++) if (d.p0[k]! >= lo - 1e-12 && d.p1[k]! <= hi + 1e-12) s += w(k) * v[k]!;
      out[g] = s / total;
    }
    return out;
  };
  const groupChange = {} as GroupShares;
  for (const g of GROUP_KEYS) {
    const [lo, hi] = GROUP_RANGE[g];
    let s = 0;
    for (let k = 0; k < n; k++) if (d.p0[k]! >= lo - 1e-12 && d.p1[k]! <= hi + 1e-12) s += w(k) * (afterScenario[k]! - afterCurrent[k]!);
    groupChange[g] = s / (hi - lo);
  }
  const meanIncome = preTax.reduce((a, y, k) => a + w(k) * y, 0);
  return {
    preTax, preTaxScenario, taxCurrent, taxScenario, transfer, afterCurrent, afterScenario,
    revenuePerAdult: revenue,
    revenueShareOfIncome: revenue / meanIncome,
    groupsAfterCurrent: groups(afterCurrent),
    groupsAfterScenario: groups(afterScenario),
    groupChange,
  };
}

/**
 * Revenue-maximizing top rate 1 / (1 + a e) (Saez, Slemrod and Giertz 2012),
 * with the Pareto coefficient a of the top 1% from the data. Null when e = 0.
 */
export function revenueMaximizingTopRate(Q: QuantileFn, elasticity: number): { rate: number; pareto: number } | null {
  if (elasticity <= 0) return null;
  const b = Q.meanBetween(0.99, 1) / Q.q(0.99);
  const a = b / (b - 1);
  return { rate: 1 / (1 + a * elasticity), pareto: a };
}

/** A person's own result: after-tax income now and under the scenario. */
export function personalTax(r: TaxResult, inputs: TaxInputs, y: number, p: number, status: Status) {
  const { Q, current, scenario, elasticity } = inputs;
  const d = Q.dist;
  const k = Math.max(0, d.p0.findIndex((p0, i) => p >= p0 && p < d.p1[i]!));
  const t0 = Math.min(0.99, marginalRate(current, y, p, status));
  const t1 = Math.min(0.99, marginalRate(scenario, y, p, status));
  const f = elasticity === 0 ? 1 : Math.pow((1 - t1) / (1 - t0), elasticity);
  // Joint filers: tax the couple's combined income on the joint schedule, then halve.
  const tax = (rule: TaxRule, income: number) =>
    status === 'mfj' && rule.kind === 'statutory' ? taxOn(rule, 2 * income, p, 'mfj') / 2 : taxOn(rule, income, p, 'single');
  const now = y - tax(current, y);
  const alt = y * f - tax(scenario, y * f) + r.transfer[k]!;
  return { now, scenario: alt, difference: alt - now, taxNow: tax(current, y), taxScenario: tax(scenario, y * f), transfer: r.transfer[k]! };
}
