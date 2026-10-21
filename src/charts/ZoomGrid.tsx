/** Powers-of-ten zoom grid (plan 6.2, chart 4). */
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { GROUP_RANGE, GROUP_KEYS, levelStats, ZOOM_LEVELS, type GroupKey, type QuantileFn } from '../engine';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { money, percentileLabel } from '../ui/format';

function groupOf(p: number): GroupKey {
  return [...GROUP_KEYS].reverse().find((k) => p >= GROUP_RANGE[k][0] - 1e-12)!;
}

const people = (n: number) => (n >= 100 ? Math.round(n / 100) * 100 : Math.round(n)).toLocaleString('en-US');

function hoursText(h: number): string {
  if (!Number.isFinite(h)) return 'never';
  if (h >= 24 * 60) return `${Math.round(h / 24).toLocaleString('en-US')} days`;
  if (h >= 48) return `${(h / 24).toFixed(1)} days`;
  if (h >= 1) return `${h.toFixed(1)} hours`;
  return `${Math.max(1, Math.round(h * 60))} minutes`;
}

export function ZoomGrid({ Q, adults, year, wealth = false }: { Q: QuantileFn; adults: number; year: number; wealth?: boolean }) {
  const noun = wealth ? 'wealth' : 'income';
  const id = useId();
  const [level, setLevel] = useState(0);
  const [selected, setSelected] = useState(99);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const s = levelStats(Q, adults, level);
  const cell = s.cells[selected]!;
  const isTarget = (i: number) => s.zoomFrom !== null && i >= s.zoomFrom;

  const go = (i: number) => {
    const j = Math.min(99, Math.max(0, i));
    setSelected(j);
    refs.current[j]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10, Home: -i, End: 99 - i };
    if (e.key in moves) {
      e.preventDefault();
      go(i + moves[e.key]!);
    }
  };
  const zoomIn = () => {
    if (s.zoomFrom === null) return;
    setLevel(level + 1);
    setSelected(99);
  };
  const zoomOut = () => {
    setLevel(level - 1);
    setSelected(99);
  };

  return (
    <div className="zoom">
      <div className="chart-tools">
        <ol className="crumbs" aria-label="Zoom level">
          {ZOOM_LEVELS.map((l, i) => (
            <li key={l.label}>
              <button type="button" disabled={i > level} aria-current={i === level ? 'step' : undefined}
                onClick={() => { setLevel(i); setSelected(99); }}>
                {l.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <p className="sub">
        {s.level.label}{level > 0 ? ` of adults (${year})` : ` (${year})`}: each square is about{' '}
        <strong>{people(s.peoplePerCell)}</strong> people.
        {s.zoomFrom !== null && <> The highlighted {s.zoomFrom === 99 ? 'square is' : 'row is'} the next level down; select it and zoom in.</>}
        {s.level.interpolated && <> Squares at this level are narrower than the finest published data and are interpolated.</>}
      </p>
      <div className="zoom-body">
        <div role="grid" aria-label={`${s.level.label}, 100 squares`} className="zoom-grid">
          {Array.from({ length: 10 }, (_, r) => (
            <div role="row" key={r} className="zoom-row">
              {s.cells.slice(r * 10, r * 10 + 10).map((c) => (
                <button
                  key={c.index} type="button" role="gridcell"
                  ref={(el) => { refs.current[c.index] = el; }}
                  tabIndex={c.index === selected ? 0 : -1}
                  aria-selected={c.index === selected}
                  aria-label={`${percentileLabel(c.p0)} to ${percentileLabel(c.p1)}: average ${money(c.average)}`}
                  className="zoom-cell" data-target={isTarget(c.index)}
                  style={{ background: `var(--g-${groupOf(c.p0)})` }}
                  onClick={() => setSelected(c.index)}
                  onDoubleClick={() => isTarget(c.index) && zoomIn()}
                  onKeyDown={(e) => { onKey(e, c.index); if (e.key === 'Enter' && isTarget(c.index)) zoomIn(); }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="zoom-detail" aria-live="polite">
          <p className="kpi-label">{percentileLabel(cell.p0)} to {percentileLabel(cell.p1)}</p>
          <p className="kpi"><span className="kpi-num">{money(cell.average)}</span><span className="kpi-unit">average</span></p>
          <dl className="zoom-facts">
            <div><dt>People in this square</dt><dd>about {people(cell.people)}</dd></div>
            <div><dt>{wealth ? 'Net worth' : 'Income'} to get in</dt><dd>{money(cell.threshold)}</dd></div>
            <div><dt>Times the median {noun}</dt><dd>{cell.multipleOfMedian >= 10 ? Math.round(cell.multipleOfMedian).toLocaleString('en-US') : cell.multipleOfMedian.toFixed(1)}</dd></div>
            {!wealth && <div><dt>Receives the median's yearly income in</dt><dd>{hoursText(cell.hoursToEarnMedian)}</dd></div>}
            <div><dt>Group</dt><dd>{GROUP_LABEL[groupOf(cell.p0)]}</dd></div>
          </dl>
          <div className="zoom-actions">
            {level > 0 && <button type="button" className="theme-toggle" onClick={zoomOut}>Zoom out</button>}
            {s.zoomFrom !== null && (
              <button type="button" className="btn-primary" onClick={zoomIn} disabled={!isTarget(selected)}
                title={isTarget(selected) ? undefined : 'Select a highlighted square first'}>
                Zoom in to {ZOOM_LEVELS[level + 1]!.label.replace('The ', 'the ')}
              </button>
            )}
          </div>
          <p className="fine" id={`${id}-help`}>
            Use the arrow keys to move between squares.{wealth ? ` Net worth per adult, ${year} dollars.` : ` Hours count every hour of the year. ${year} dollars, before taxes.`}
          </p>
        </div>
      </div>
      <p className="fine">
        This level as a whole: average {money(s.average)}, {s.multipleOfMedian >= 10 ? Math.round(s.multipleOfMedian).toLocaleString('en-US') : s.multipleOfMedian.toFixed(1)} times
        the median ({money(s.median)}){wealth ? '.' : <>; receives the median's yearly income every {hoursText(s.hoursToEarnMedian)}.</>}
      </p>
    </div>
  );
}
