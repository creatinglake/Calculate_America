/**
 * Income by percentile on the stretched axis (plan 6.2, chart 3), with a
 * second view: real growth by percentile since an earlier year.
 */
import { scaleLinear, scaleLog } from 'd3-scale';
import { line } from 'd3-shape';
import { useId, useMemo, useState } from 'react';
import type { Shape } from '../engine';
import { money, moneyShort, pct, percentileLabel } from '../ui/format';
import { BANDS, P_MAX, TICKS, stretch, unstretch } from '../ui/stretchAxis';
import { ChartFrame } from './ChartFrame';

const W = 640, H = 300, M = { top: 12, right: 12, bottom: 34, left: 56 };
const SAMPLES = 320;
const TABLE_P = [0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999, 0.9999, P_MAX];

export function StretchedChart({ today, scenario, todayLabel, scenarioLabel, dollarYear, you, growthBase }: {
  today: Shape;
  scenario: Shape;
  todayLabel: string;
  scenarioLabel: string;
  dollarYear: number;
  /** The user's percentile, if they've entered an income. */
  you: number | null;
  /** For the growth view: an earlier year's shape and its label. */
  growthBase: { shape: Shape; label: string } | null;
}) {
  const id = useId();
  const [view, setView] = useState<'income' | 'growth'>('income');
  const [logScale, setLogScale] = useState(true);
  const growth = view === 'growth' && growthBase !== null;

  const ps = useMemo(() => Array.from({ length: SAMPLES + 1 }, (_, i) => unstretch((i / SAMPLES) * 4)).filter((p) => p < 1), []);
  const cf = (p: number) => today.mean * (scenario.Q.q(p) / scenario.mean);
  const series = useMemo(() => {
    if (growth) {
      return [{ key: 'growth', label: `Growth since ${growthBase!.label}`, values: ps.map((p) => today.Q.q(p) / growthBase!.shape.Q.q(p) - 1) }];
    }
    return [
      { key: 'today', label: todayLabel, values: ps.map((p) => today.Q.q(p)) },
      { key: 'scenario', label: `${scenarioLabel}, same average income`, values: ps.map(cf) },
    ];
  }, [growth, ps, today, scenario, growthBase, todayLabel, scenarioLabel]);

  const x = scaleLinear().domain([0, 4]).range([M.left, W - M.right]);
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  const y = growth
    ? scaleLinear().domain([Math.min(0, ...all), Math.max(...all)]).nice().range([H - M.bottom, M.top])
    : logScale
      ? scaleLog().domain([1000, Math.max(...all)]).clamp(true).range([H - M.bottom, M.top])
      : scaleLinear().domain([0, Math.max(...all)]).nice().range([H - M.bottom, M.top]);
  const path = (values: number[]) =>
    line<number>().x((_, i) => x(stretch(ps[i]!))).y((v) => y(Math.max(v, growth ? -Infinity : 1)))
      .defined((v) => Number.isFinite(v))(values) ?? '';
  const yTicks = growth ? y.ticks(5) : logScale ? [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9].filter((t) => t <= y.domain()[1]!) : y.ticks(5);
  const fmtY = (v: number) => (growth ? pct(v, 0) : moneyShort(v));

  const table = (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Percentile</th>
          {growth ? <th scope="col">Real growth since {growthBase!.label}</th> : <>
            <th scope="col">{todayLabel}</th>
            <th scope="col">{scenarioLabel}, same average</th>
          </>}
        </tr>
      </thead>
      <tbody>
        {TABLE_P.map((p) => (
          <tr key={p}>
            <th scope="row">{percentileLabel(p)}</th>
            {growth ? <td>{pct(today.Q.q(p) / growthBase!.shape.Q.q(p) - 1, 0)}</td> : <>
              <td>{money(today.Q.q(p))}</td>
              <td>{money(cf(p))}</td>
            </>}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame
      title={growth ? 'Income growth by percentile' : 'Income at each percentile'}
      description={growth
        ? `How much each percentile's income grew after inflation since ${growthBase!.label}.`
        : `Each band on the axis is ten times smaller than the one before it, so the top groups get room. ${dollarYear} dollars.`}
      table={table}
      tools={<>
        <div role="radiogroup" aria-label="Chart view" className="pill-opts">
          <button type="button" role="radio" aria-checked={view === 'income'} onClick={() => setView('income')}>Income</button>
          <button type="button" role="radio" aria-checked={view === 'growth'} disabled={!growthBase} onClick={() => setView('growth')}>Growth{growthBase ? ` since ${growthBase.label}` : ''}</button>
        </div>
        {!growth && (
          <label className="check">
            <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} /> Log scale
          </label>
        )}
      </>}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-desc`}>
        <desc id={`${id}-desc`}>
          {growth ? 'Line chart of real income growth by percentile.' : `Line chart of income by percentile for ${todayLabel} and ${scenarioLabel}.`} The data table below has the values.
        </desc>
        {BANDS.map((b, i) => (
          <g key={b.label}>
            {i % 2 === 1 && <rect x={x(i)} y={M.top} width={x(i + 1) - x(i)} height={H - M.top - M.bottom} fill="var(--band)" />}
            <text x={(x(i) + x(i + 1)) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{b.label}</text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--gridline)" />
            <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)">{fmtY(t)}</text>
          </g>
        ))}
        {TICKS.slice(1).map((p) => (
          <text key={p} x={x(stretch(p))} y={H - M.bottom + 12} textAnchor={p === P_MAX ? 'end' : 'middle'} fontSize="10" fill="var(--text-muted)">{percentileLabel(p)}</text>
        ))}
        {growth && <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} stroke="var(--text-muted)" />}
        {series.map((s, i) => (
          <path key={s.key} d={path(s.values)} fill="none" strokeWidth={2.5}
            stroke={i === 0 ? 'var(--line-now)' : 'var(--line-base)'} strokeDasharray={i === 1 ? '6 4' : undefined} />
        ))}
        {you !== null && !growth && (
          <g>
            <line x1={x(stretch(you))} x2={x(stretch(you))} y1={M.top} y2={H - M.bottom} stroke="var(--text)" strokeDasharray="2 3" />
            <text x={x(stretch(you)) + 4} y={M.top + 10} fontSize="11" fill="var(--text)">You</text>
          </g>
        )}
      </svg>
      <ul className="legend-row">
        {series.map((s, i) => (
          <li key={s.key}>
            <svg width="20" height="6" aria-hidden><line x1="0" x2="20" y1="3" y2="3" strokeWidth="2.5" stroke={i === 0 ? 'var(--line-now)' : 'var(--line-base)'} strokeDasharray={i === 1 ? '6 4' : undefined} /></svg>
            {s.label}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
