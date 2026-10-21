/** /top: the top of the distribution, up close (plan 6.1, section 9). */
import { useEffect, useMemo, useState } from 'react';
import { buildQuantile, fromDataFile, HOURS_PER_YEAR, withinTop1, type DataFile } from '../engine';
import { loadData } from '../data/load';
import { ZoomGrid } from '../charts/ZoomGrid';
import { Parade } from '../charts/Parade';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { money, pct } from '../ui/format';

function useSeconds() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return s;
}

function Counter({ topAverage, median }: { topAverage: number; median: number }) {
  const s = useSeconds();
  const earned = (topAverage / (HOURS_PER_YEAR * 3600)) * s;
  const medianDays = (earned / median) * 365;
  const clock = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="card result">
      <p className="kpi-label">While you've been on this page ({clock})</p>
      <p className="kpi"><span className="kpi-num tabular">{money(earned)}</span></p>
      <p className="result-text">
        That's what an average adult in the top 0.01% has received, before taxes, counting every hour of the year.
        {s > 0 && <> The median adult takes about {medianDays < 1 ? `${Math.round(medianDays * 24)} hours` : `${medianDays.toFixed(1)} days`} to receive that much.</>}
      </p>
    </div>
  );
}

export function Top() {
  const [file, setFile] = useState<DataFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadData('us-ptinc').then(setFile, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const view = useMemo(() => {
    if (!file) return null;
    const year = Math.max(...file.years);
    const Q = buildQuantile(fromDataFile(file, year));
    return { year, Q, adults: file.adults![String(year)]!, within: withinTop1(Q) };
  }, [file]);

  const intro = (
    <div className="intro">
      <p className="eyebrow">The top, up close</p>
      <h1>Ten times smaller, again and again</h1>
      <p className="dek">
        The top 1% is too small to see on most charts. Zoom in step by step: the top 1%, then the top 0.1%, then the top
        0.01%. Each step is a group ten times smaller, and much richer.
      </p>
    </div>
  );
  if (error) return <>{intro}<p role="alert" className="alert">Couldn't load the data: {error}</p></>;
  if (!view) return <>{intro}<p className="sub">Loading the data…</p></>;
  const { year, Q, adults, within } = view;
  return (
    <>
      {intro}
      <div className="stack">
        <section className="card" aria-labelledby="zoom-h">
          <h2 id="zoom-h" className="card-title">Powers of ten</h2>
          <ZoomGrid Q={Q} adults={adults} year={year} />
        </section>
        <Counter topAverage={Q.meanBetween(0.9999, 1)} median={Q.q(0.5)} />
        <section className="card" aria-labelledby="within-h">
          <h2 id="within-h" className="card-title">Within the top 1%</h2>
          <p className="sub">How the top 1%'s income ({pct(Q.integral(0.99, 1) / Q.integral(0, 1))} of all income in {year}) is split among its three groups.</p>
          <div className="bars">
            <div className="bar" role="img" aria-label={`Top 1% income: ${(['t09', 't009', 't001'] as const).map((k) => `${GROUP_LABEL[k]} ${pct(within[k])}`).join(', ')}`}>
              {(['t09', 't009', 't001'] as const).map((k) => (
                <div key={k} className="sg" style={{ width: `${within[k] * 100}%`, background: `var(--g-${k})`, color: `var(--g-${k}-ink)` }}>
                  {pct(within[k], 0)}
                </div>
              ))}
            </div>
          </div>
          <ul className="legend-row">
            {(['t09', 't009', 't001'] as const).map((k) => (
              <li key={k}><span aria-hidden className="sw" style={{ background: `var(--g-${k})` }} />{GROUP_LABEL[k]}: {k === 't09' ? '90%' : k === 't009' ? '9%' : '1%'} of the top 1%'s people</li>
            ))}
          </ul>
        </section>
        <section className="card" aria-labelledby="parade-h">
          <h2 id="parade-h" className="card-title">A parade of incomes</h2>
          <p className="sub">
            Imagine everyone's height in proportion to their income, with the median adult at 5 feet 7 inches. The
            people near the top don't fit on the screen.
          </p>
          <Parade Q={Q} year={year} />
        </section>
      </div>
    </>
  );
}
