/**
 * To-scale parade (plan 6.2, chart 5): each person's height is proportional
 * to their income, with the median adult at 5 feet 7 inches.
 */
import type { QuantileFn } from '../engine';
import { money, percentileLabel } from '../ui/format';

export const MEDIAN_HEIGHT_INCHES = 67;
const POINTS = [0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999, 0.9999, 0.99999];

export function heightText(inches: number): string {
  if (inches < 0) return 'below ground (negative income)';
  const feet = inches / 12;
  if (feet >= 5280 / 2) return `${(feet / 5280).toFixed(feet >= 52800 ? 0 : 1)} miles`;
  if (feet >= 100) return `${Math.round(feet).toLocaleString('en-US')} feet`;
  const f = Math.floor(inches / 12), i = Math.round(inches - f * 12);
  return i === 12 ? `${f + 1} ft 0 in` : `${f} ft ${i} in`;
}

export function Parade({ Q, year }: { Q: QuantileFn; year: number }) {
  const median = Q.q(0.5);
  const rows = POINTS.map((p) => ({ p, income: Q.q(p), inches: (Q.q(p) / median) * MEDIAN_HEIGHT_INCHES }));
  // Draw the people who fit on screen at true scale (up to P99).
  const drawn = rows.filter((r) => r.p <= 0.99);
  const maxIn = Math.max(...drawn.map((r) => r.inches));
  const H = 260, W = 640, base = H - 24, scale = (base - 10) / maxIn;
  const slot = W / drawn.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="People drawn to scale by income, from the 10th to the 99th percentile">
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--axis)" />
        {drawn.map((r, i) => {
          const h = Math.max(2, r.inches * scale), cx = slot * i + slot / 2, w = Math.min(28, slot * 0.4);
          return (
            <g key={r.p}>
              <circle cx={cx} cy={base - h + w * 0.3} r={w * 0.3} fill="var(--accent)" />
              <rect x={cx - w / 2} y={base - h + w * 0.65} width={w} height={Math.max(1, h - w * 0.65)} rx={w * 0.25} fill="var(--accent)" />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{percentileLabel(r.p)}</text>
            </g>
          );
        })}
      </svg>
      <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
        <table className="data-table">
          <thead><tr><th scope="col">Person at</th><th scope="col">Income ({year} dollars)</th><th scope="col">Height</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p}>
                <th scope="row">{percentileLabel(r.p)}{r.p > 0.99 ? ' (off the chart)' : ''}</th>
                <td>{money(r.income)}</td>
                <td>{heightText(r.inches)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
