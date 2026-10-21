/**
 * Turning a person's answers into an income comparable with the data
 * (plan section 2, "Placing a user in the distribution").
 *
 * The data measure pre-tax national income per adult, with couples' income
 * split equally. Wages are scaled up by the ratio of employee compensation
 * to wages and salaries (BEA NIPA Table 1.12), because national income also
 * counts employer benefits and payroll taxes; other lines are used as entered.
 * Retained corporate earnings aren't asked for, so the rank is approximate.
 */
export interface IncomeAnswers {
  wages: number;
  selfEmployment: number;
  /** Interest, dividends and rent. */
  capital: number;
  /** Pension and Social Security benefits received. */
  pensions: number;
  /** "Do you share finances with a spouse or partner?" If yes, amounts are combined. */
  sharesFinances: boolean;
}

export interface Placement {
  wagesScaled: number;
  combined: number;
  /** Income per adult, in today's dollars, before converting to data dollars. */
  perAdult: number;
  /** Income per adult in the data's dollars (divided by the CPI ratio). */
  perAdultDataDollars: number;
}

/**
 * @param compToWages employee compensation / wages and salaries for the data year
 * @param cpiRatio CPI-U now / CPI-U in the data's dollar year (1 if same year)
 */
export function place(a: IncomeAnswers, compToWages: number, cpiRatio = 1): Placement {
  for (const v of [a.wages, a.selfEmployment, a.capital, a.pensions]) {
    if (!Number.isFinite(v)) throw new RangeError('income must be a number');
  }
  const wagesScaled = a.wages * compToWages;
  const combined = wagesScaled + a.selfEmployment + a.capital + a.pensions;
  const perAdult = a.sharesFinances ? combined / 2 : combined;
  return { wagesScaled, combined, perAdult, perAdultDataDollars: perAdult / cpiRatio };
}
