/**
 * Group share history (plan 6.2, chart 6): stacked area of the six groups'
 * shares over time, with the other estimate's top 1% share as a line so the
 * PSZ / Auten-Splinter difference is visible.
 */
import { scaleLinear } from 'd3-scale';
import { area, line, stack } from 'd3-shape';
import { useId, useMemo } from 'react';
import { GROUP_KEYS, fromDataFile, groupShares, type DataFile, type GroupShares } from '../engine';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { pct } from '../ui/format';
import { ChartFrame } from './ChartFrame';

const W = 640, H = 300, M = { top: 10, right: 12, bottom: 26, left: 44 };

function history(file: DataFile): { year: number; g: GroupShares }[] {
  return file.years.map((year) => ({ year, g: groupShares(fromDataFile(file, year)) }));
}

export function ShareHistory({ file, label, other, otherLabel, noun = 'income' }: {
  file: DataFile; label: string; other: DataFile | null; otherLabel: string; noun?: string;
}) {
  const id = useId();
  const rows = useMemo(() => history(file), [file]);
  const otherRows = useMemo(() => (other ? history(other) : null), [other]);
  const years = rows.map((r) => r.year);
  const x = scaleLinear().domain([Math.min(...years), Math.max(...years)]).range([M.left, W - M.right]);
  const y = scaleLinear().domain([0, 1]).range([H - M.bottom, M.top]);
  const series = stack<{ year: number; g: GroupShares }>().keys([...GROUP_KEYS]).value((d, k) => d.g[k as keyof GroupShares])(rows);
  const shape = area<[number, number] & { data: { year: number } }>()
    .x((d) => x(d.data.year)).y0((d) => y(d[0])).y1((d) => y(d[1]));
  const top1 = (g: GroupShares) => g.t09 + g.t009 + g.t001;
  const topLine = (rs: { year: number; g: GroupShares }[]) =>
    line<{ year: number; g: GroupShares }>().x((d) => x(d.year)).y((d) => y(1 - top1(d.g)))(rs) ?? '';
  const gaps = [];
  for (let yv = years[0]!; yv <= years[years.length - 1]!; yv++) if (!years.includes(yv)) gaps.push(yv);

  const table = (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Year</th>
          {GROUP_KEYS.map((k) => <th key={k} scope="col">{GROUP_LABEL[k]}</th>)}
          {otherRows && <th scope="col">Top 1%, {otherLabel}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.year}>
            <th scope="row">{r.year}</th>
            {GROUP_KEYS.map((k) => <td key={k}>{pct(r.g[k])}</td>)}
            {otherRows && <td>{(() => { const o = otherRows.find((q) => q.year === r.year); return o ? pct(top1(o.g)) : '–'; })()}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame
      title="Who gets what, over time"
      description={`Each group's share of all ${noun}, ${years[0]} to ${years[years.length - 1]}, ${label}. The top three bands together are the top 1%.`}
      table={table}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-d`}>
        <desc id={`${id}-d`}>Stacked area chart of income shares by group over time. The data table below has the values.</desc>
        {series.map((s) => (
          <path key={s.key} d={shape(s as never) ?? ''} fill={`var(--g-${s.key})`} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--surface)" strokeOpacity={0.5} />
            <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)">{pct(t, 0)}</text>
          </g>
        ))}
        {x.ticks(6).map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{t}</text>
        ))}
        {otherRows && (
          <path d={topLine(otherRows)} fill="none" stroke="var(--text)" strokeWidth={2} strokeDasharray="5 4" />
        )}
      </svg>
      <ul className="legend-row">
        {GROUP_KEYS.map((k) => (
          <li key={k}>
            <span aria-hidden className="sw" style={{ background: `var(--g-${k})` }} />
            {GROUP_LABEL[k]}
          </li>
        ))}
        {otherRows && (
          <li>
            <svg width="20" height="6" aria-hidden><line x1="0" x2="20" y1="3" y2="3" stroke="var(--text)" strokeWidth="2" strokeDasharray="5 4" /></svg>
            Where the top 1% would start under {otherLabel}
          </li>
        )}
      </ul>
      {gaps.length > 0 && <p className="fine">No data for {gaps.join(', ')}; the chart joins the neighbouring years.</p>}
    </ChartFrame>
  );
}
