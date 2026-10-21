/**
 * From income to wealth over a career (plan 4.5 career mode and section 8).
 * Each year from the start year, someone at the user's percentile receives
 * that year's average income divided like the scenario instead of as it was;
 * a share of the difference is saved and earns a real return.
 */
import { scaleLinear } from 'd3-scale';
import { area, line } from 'd3-shape';
import { useId, useMemo, useState } from 'react';
import {
  accumulate, career, DEFAULT_REAL_RETURN, DEFAULT_SAVE_RATE, type Shape,
} from '../engine';
import { money, moneyDiff, moneyShort } from '../ui/format';

const W = 640, H = 200, M = { top: 10, right: 12, bottom: 24, left: 56 };

export function CareerWealth({ percentile, scenario, scenarioLabel, shapes, cpiRatio, growthPenalty = 0 }: {
  percentile: number;
  scenario: Shape;
  scenarioLabel: string;
  /** Every available year's distribution in the series in use. */
  shapes: ReadonlyMap<number, Shape>;
  cpiRatio: number;
  /** The "smaller economy" slider, applied to every year. */
  growthPenalty?: number;
}) {
  const id = useId();
  const years = [...shapes.keys()].sort((a, b) => a - b);
  const last = years[years.length - 1]!;
  const [start, setStart] = useState(Math.max(years[0]!, last - 29));
  const [save, setSave] = useState(DEFAULT_SAVE_RATE);
  const [ret, setRet] = useState(DEFAULT_REAL_RETURN);

  const result = useMemo(() => {
    const c = career(percentile, start, shapes, scenario, growthPenalty);
    const flows = c.byYear.map((r) => ({ year: r.year, amount: r.difference * cpiRatio }));
    return { c, acc: accumulate(flows, save, ret), incomeTotal: c.total * cpiRatio };
  }, [percentile, start, shapes, scenario, save, ret, cpiRatio, growthPenalty]);

  const { c, acc, incomeTotal } = result;
  const yrs = acc.byYear.map((r) => r.year);
  const x = scaleLinear().domain([Math.min(...yrs), Math.max(...yrs, Math.min(...yrs) + 1)]).range([M.left, W - M.right]);
  const values = acc.byYear.map((r) => r.balance);
  const y = scaleLinear().domain([Math.min(0, ...values), Math.max(0, ...values)]).nice().range([H - M.bottom, M.top]);
  const path = line<{ year: number; balance: number }>().x((d) => x(d.year)).y((d) => y(d.balance))(acc.byYear) ?? '';
  const fill = area<{ year: number; balance: number }>().x((d) => x(d.year)).y0(y(0)).y1((d) => y(d.balance))(acc.byYear) ?? '';
  const n = c.byYear.length;

  return (
    <section className="card" aria-labelledby={`${id}-h`}>
      <p className="eyebrow">Over a working life</p>
      <h2 id={`${id}-h`} className="card-title">From income to wealth</h2>
      <p className="sub">
        Suppose someone at your place had received {scenarioLabel}'s division of each year's actual income, every year
        since {start}, and saved part of the difference.
      </p>
      <div className="result-body" style={{ marginTop: '1rem' }}>
        <div>
          <p className="kpi-label">Wealth difference today</p>
          <p className="kpi"><span className="kpi-num" data-negative={acc.total < 0}>{moneyDiff(acc.total)}</span></p>
          <p className="result-text">
            Over {n} years the income difference adds up to <strong>{moneyDiff(incomeTotal)}</strong>. Saving{' '}
            {Math.round(save * 100)}% of it, earning {(ret * 100).toFixed(1)}% a year after inflation, grows to{' '}
            <strong>{money(Math.abs(acc.total))}</strong> {acc.total >= 0 ? 'more' : 'less'} by {last}.
          </p>
          {c.skipped.length > 0 && <p className="fine">No data for {c.skipped.join(', ')}; those years are left out.</p>}
        </div>
        <div className="result-compare">
          <div className="field">
            <label className="field-label" htmlFor={`${id}-start`}>Started working in</label>
            <select id={`${id}-start`} value={start} onChange={(e) => setStart(Number(e.target.value))}
              style={{ width: '100%', font: 'inherit', padding: '0.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="slider-row"><label htmlFor={`${id}-s`}>Share saved</label><output className="tabular">{Math.round(save * 100)}%</output></div>
            <input id={`${id}-s`} type="range" min={0} max={50} step={1} value={Math.round(save * 100)} onChange={(e) => setSave(Number(e.target.value) / 100)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <div className="slider-row"><label htmlFor={`${id}-r`}>Return after inflation</label><output className="tabular">{(ret * 100).toFixed(1)}%</output></div>
            <input id={`${id}-r`} type="range" min={0} max={80} step={5} value={Math.round(ret * 1000)} onChange={(e) => setRet(Number(e.target.value) / 1000)} />
          </div>
        </div>
      </div>
      {n > 1 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ marginTop: '1rem' }} role="img"
          aria-label={`Wealth difference growing from ${yrs[0]} to ${last}, reaching ${moneyShort(acc.total)}`}>
          {y.ticks(4).map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--gridline)" />
              <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-muted)">{moneyShort(t)}</text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{t}</text>
          ))}
          <path d={fill} fill="var(--accent)" fillOpacity={0.15} />
          <path d={path} fill="none" stroke="var(--line-now)" strokeWidth={2.5} />
        </svg>
      )}
      <p className="assumption">
        Assumptions, not predictions: you stay at the same place in the distribution every year; {Math.round(save * 100)}%
        of the difference is saved; it earns {(ret * 100).toFixed(1)}% a year after inflation
        {growthPenalty > 0 ? `; each year's economy is ${Math.round(growthPenalty * 100)}% smaller under the scenario` : ''}. Today's dollars.
      </p>
    </section>
  );
}
