/**
 * Household wealth shares, quarterly (Federal Reserve Distributional
 * Financial Accounts). Households, not adults: shown on its own, never
 * mixed into the adult distribution.
 */
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useId } from 'react';
import type { DfaWealth } from '../data/load';
import { pct } from '../ui/format';
import { ChartFrame } from './ChartFrame';

const W = 640, H = 280, M = { top: 10, right: 12, bottom: 26, left: 44 };
const SERIES = [
  { key: 'top01', label: 'Top 0.1%', color: 'var(--g-t009)' },
  { key: 't09', label: 'Next 0.9%', color: 'var(--g-t09)' },
  { key: 'u9', label: 'Next 9%', color: 'var(--g-u9)' },
  { key: 'm40', label: 'Next 40%', color: 'var(--g-m40)' },
  { key: 'b50', label: 'Bottom 50%', color: 'var(--g-b50)' },
] as const;

const yearOf = (q: string) => Number(q.slice(0, 4)) + (Number(q.slice(-1)) - 1) / 4;

export function DfaHistory({ data }: { data: DfaWealth }) {
  const id = useId();
  const t = data.quarters.map(yearOf);
  const x = scaleLinear().domain([t[0]!, t[t.length - 1]!]).range([M.left, W - M.right]);
  const max = Math.max(...SERIES.flatMap((s) => data.shares[s.key]));
  const y = scaleLinear().domain([0, max]).nice().range([H - M.bottom, M.top]);
  const path = (v: number[]) => line<number>().x((_, i) => x(t[i]!)).y((d) => y(d))(v) ?? '';
  const last = data.quarters.length - 1;
  const table = (
    <table className="data-table">
      <thead><tr><th scope="col">Quarter</th>{SERIES.map((s) => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
      <tbody>
        {data.quarters.map((q, i) => (i % 4 === 0 || i === last) && (
          <tr key={q}><th scope="row">{q.replace(':', ' ')}</th>{SERIES.map((s) => <td key={s.key}>{pct(data.shares[s.key][i]!)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <ChartFrame
      title="Household wealth, quarter by quarter"
      description={`Share of all household wealth held by each group of households, ${data.quarters[0]!.replace(':', ' ')} to ${data.quarters[last]!.replace(':', ' ')}. Federal Reserve data, counted by household rather than by adult, so it isn't directly comparable with the charts above.`}
      table={table}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-d`}>
        <desc id={`${id}-d`}>Line chart of household wealth shares by group over time. The data table below has the values.</desc>
        {y.ticks(5).map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="var(--gridline)" />
            <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)">{pct(v, 0)}</text>
          </g>
        ))}
        {x.ticks(7).map((v) => (
          <text key={v} x={x(v)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{v}</text>
        ))}
        {SERIES.map((s) => <path key={s.key} d={path(data.shares[s.key])} fill="none" stroke={s.color} strokeWidth={2.5} />)}
      </svg>
      <ul className="legend-row">
        {SERIES.map((s) => <li key={s.key}><span aria-hidden className="sw" style={{ background: s.color }} />{s.label}: {pct(data.shares[s.key][last]!)}</li>)}
      </ul>
    </ChartFrame>
  );
}
