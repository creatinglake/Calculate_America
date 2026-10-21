/** Number formatting for display (plan 6.4: "$48,100 not $48,064.23"). */

/** Round to 3 significant figures, at least to the nearest $100 above $10k. */
export function roundMoney(x: number): number {
  const a = Math.abs(x);
  if (a < 1000) return Math.round(x);
  const digits = Math.floor(Math.log10(a)) + 1;
  const step = Math.pow(10, Math.max(0, digits - 3));
  return Math.round(x / step) * step;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** "$48,100" (sensibly rounded). */
export function money(x: number): string {
  return usd.format(roundMoney(x));
}

/** "$48,064" (exact to the dollar, for tooltips). */
export function moneyExact(x: number): string {
  return usd.format(Math.round(x));
}

/** "+$8,730" / "−$1,200" for differences. */
export function moneyDiff(x: number): string {
  const s = money(Math.abs(x));
  return x >= 0 ? `+${s}` : `−${s}`;
}

/** Compact: "$1.2M", "$48K". */
export function moneyShort(x: number): string {
  const a = Math.abs(x);
  const sign = x < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}$${(a / 1e9).toPrecision(3).replace(/\.0+$/, '')}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toPrecision(3).replace(/\.0+$/, '')}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
}

/** Share as a percent: "20.7%"; small shares keep two significant figures. */
export function pct(share: number, digits = 1): string {
  const v = share * 100;
  if (v !== 0 && Math.abs(v) < 1) return `${v.toPrecision(2)}%`;
  return `${v.toFixed(digits)}%`;
}

/** Percentile label: "P50", "P99.9", "P99.99". */
export function percentileLabel(p: number): string {
  return `P${Number((p * 100).toFixed(4))}`;
}

/** "83rd", "99.95th" for "the Nth percentile": whole numbers below 99,
 * up to two decimals above (where the top groups are). */
export function ordinal(x: number): string {
  const n = x >= 99 ? Number(Math.min(x, 99.99).toFixed(2)) : Math.round(x);
  if (!Number.isInteger(n)) return `${n}th`;
  const mod100 = n % 100, mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'}`;
}

/** "77" or "99.95" for "you earn more than N% of adults". */
export function percentAbove(x: number): string {
  return x >= 99 ? String(Number(Math.min(x, 99.99).toFixed(2))) : String(Math.round(x));
}

/** "2026-09" -> "September 2026". */
export function monthName(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
