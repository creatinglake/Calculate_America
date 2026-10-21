/** Builds tax rules from the data files (plan section 7). */
import type { Bracket, GroupShares, TaxRule } from '../engine';
import type { Macro, TaxBrackets, TaxEffective } from '../data/load';

export type Indexing = 'inflation' | 'income';

/** Average all-tax rates by group for a year (PSZ Table G1). */
export function effectiveRule(file: TaxEffective, year: number): TaxRule {
  const r = file.byYear[String(year)];
  if (!r) throw new Error(`No effective tax rates for ${year}`);
  const { all: _all, ...rates } = r;
  return { kind: 'effective', label: `${year} effective rates`, rates: rates as GroupShares };
}

/** Latest year with effective rates: the "current law" for effective comparisons. */
export function latestEffectiveYear(file: TaxEffective): number {
  return Math.max(...Object.keys(file.byYear).map(Number));
}

/** Factor turning a year's nominal dollars into the data's dollars. */
export function indexFactor(macro: Macro, year: number, how: Indexing): number {
  const p = macro.priceIndex[String(year)];
  if (p === undefined) throw new Error(`No price index for ${year}`);
  const inflation = 1 / p;
  if (how === 'inflation') return inflation;
  const latest = String(macro.cpi.dollarYear);
  const growth = macro.nationalIncomePerAdult[latest]! / macro.nationalIncomePerAdult[String(year)]!;
  return inflation * growth;
}

const scale = (b: [number, number][], f: number): Bracket[] => b.map(([r, t]) => [r, t * f] as const);

/** Statutory federal income tax schedule for a historical year, indexed to today. */
export function historicalRule(brackets: TaxBrackets, macro: Macro, year: number, how: Indexing): TaxRule {
  const y = brackets.byYear[String(year)];
  if (!y || !y.deduction || !y.exemption) throw new Error(`No statutory parameters for ${year}`);
  const f = indexFactor(macro, year, how);
  const deduction = y.deduction.rule === 'percentOfAgiCapped'
    ? { kind: 'percentCapped' as const, percent: y.deduction.percent, cap: { single: y.deduction.cap.single * f, mfj: y.deduction.cap.mfj * f } }
    : { kind: 'builtIn' as const };
  return {
    kind: 'statutory',
    label: `${year} federal income tax brackets, indexed by ${how === 'inflation' ? 'inflation' : 'income growth'}`,
    brackets: { single: scale(y.single, f), mfj: scale(y.mfj, f) },
    deduction,
    exemption: { single: (y.exemption.single ?? 0) * f, mfj: (y.exemption.married ?? 0) * f },
    agiRatio: agiRatio(macro),
  };
}

/** AGI / national income for the data year (falls back to the latest available). */
export function agiRatio(macro: Macro): number {
  const ys = Object.keys(macro.agiToNationalIncome).map(Number);
  const y = ys.includes(macro.cpi.dollarYear) ? macro.cpi.dollarYear : Math.max(...ys);
  return macro.agiToNationalIncome[String(y)]!;
}

/** Current federal income tax law, converted from its year's dollars with CPI-U. */
export function currentLawRule(brackets: TaxBrackets, macro: Macro): TaxRule {
  const c = brackets.currentLaw;
  const f = 1 / macro.cpi.ratio;
  return {
    kind: 'statutory',
    label: `Current law (${c.year})`,
    brackets: { single: scale(c.single, f), mfj: scale(c.mfj, f) },
    deduction: { kind: 'fixed', amount: { single: c.standardDeduction.single * f, mfj: c.standardDeduction.mfj * f } },
    exemption: { single: c.exemption.single * f, mfj: c.exemption.mfj * f },
    agiRatio: agiRatio(macro),
  };
}

/** A custom single-filer schedule entered in today's dollars; joint brackets are double. */
export function customRule(rows: { rate: number; from: number }[], macro: Macro, standardDeduction: number): TaxRule {
  const f = 1 / macro.cpi.ratio;
  const sorted = [...rows].sort((a, b) => a.from - b.from);
  if (!sorted.length || sorted[0]!.from !== 0) sorted.unshift({ rate: 0, from: 0 });
  const single: Bracket[] = sorted.map((r) => [r.rate, r.from * f] as const);
  return {
    kind: 'statutory', label: 'Your brackets',
    brackets: { single, mfj: single.map(([r, t]) => [r, 2 * t] as const) },
    deduction: { kind: 'fixed', amount: { single: standardDeduction * f, mfj: 2 * standardDeduction * f } },
    exemption: { single: 0, mfj: 0 },
    agiRatio: agiRatio(macro),
  };
}
