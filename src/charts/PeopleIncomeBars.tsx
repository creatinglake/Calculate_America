/**
 * People vs income (plan 6.2, chart 2): stacked bars of the six groups'
 * share of adults and share of income, today and under the scenario, with a
 * magnified row for the top 1% of adults.
 */
import { GROUP_KEYS, GROUP_POP, type GroupKey, type GroupShares } from '../engine';
import { GROUP_LABEL } from '../components/ScenarioPicker';
import { pct } from '../ui/format';
import { ChartFrame } from './ChartFrame';

const TOP1: GroupKey[] = ['t09', 't009', 't001'];
// Print the share inside a segment only when it's wide enough to read.
const LABEL_MIN = 0.07;

function Bar({ label, shares, keys = GROUP_KEYS, inset = false }: {
  label: string; shares: Record<string, number>; keys?: readonly GroupKey[]; inset?: boolean;
}) {
  const total = keys.reduce((a, k) => a + shares[k]!, 0);
  return (
    <div>
      <p className="blabel">{label}</p>
      <div className={inset ? 'bar bar-inset' : 'bar'} role="img"
        aria-label={`${label}: ${keys.map((k) => `${GROUP_LABEL[k]} ${pct(shares[k]!)}`).join(', ')}`}>
        {keys.map((k) => {
          const w = shares[k]! / total;
          return (
            <div key={k} className="sg" title={`${GROUP_LABEL[k]}: ${pct(shares[k]!)}`}
              style={{ width: `${w * 100}%`, background: `var(--g-${k})`, color: `var(--g-${k}-ink)` }}>
              {w >= LABEL_MIN ? pct(shares[k]!, w >= 0.12 ? 1 : 0) : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeopleIncomeBars({ today, scenario, todayLabel, scenarioLabel, gini }: {
  today: GroupShares; scenario: GroupShares; todayLabel: string; scenarioLabel: string;
  gini: { today: number; scenario: number };
}) {
  const top1 = (g: GroupShares) => g.t09 + g.t009 + g.t001;
  const zoomPeople = Object.fromEntries(TOP1.map((k) => [k, GROUP_POP[k]])) as Record<GroupKey, number>;
  const table = (
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Group</th>
          <th scope="col">Share of adults</th>
          <th scope="col">Income, {todayLabel}</th>
          <th scope="col">Income, {scenarioLabel}</th>
        </tr>
      </thead>
      <tbody>
        {GROUP_KEYS.map((k) => (
          <tr key={k}>
            <th scope="row">{GROUP_LABEL[k]}</th>
            <td>{pct(GROUP_POP[k], 2)}</td>
            <td>{pct(today[k])}</td>
            <td>{pct(scenario[k])}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Top 1% (last three)</th>
          <td>1%</td>
          <td>{pct(top1(today))}</td>
          <td>{pct(top1(scenario))}</td>
        </tr>
      </tfoot>
    </table>
  );
  return (
    <ChartFrame
      title="Share of people vs share of income"
      description="Each bar is everyone. The top groups are slivers of the people but large blocks of the income."
      table={table}
    >
      <ul className="legend-row" style={{ marginTop: 0 }}>
        {GROUP_KEYS.map((k) => (
          <li key={k}><span aria-hidden className="sw" style={{ background: `var(--g-${k})` }} />{GROUP_LABEL[k]}</li>
        ))}
      </ul>
      <div className="bars">
        <Bar label="Adults" shares={GROUP_POP} />
        <Bar label={`Income, ${todayLabel}`} shares={today} />
        <Bar label={`Income, ${scenarioLabel}`} shares={scenario} />
      </div>
      <p className="zoom-note">
        Zoom in on the top 1% of adults (magnified 100 times). Together they receive {pct(top1(today))} of all income
        in {todayLabel}, and would receive {pct(top1(scenario))} divided like {scenarioLabel}.
      </p>
      <Bar label="The top 1% of adults, split into its three groups" shares={zoomPeople} keys={TOP1} inset />
      <p className="fine" style={{ marginTop: '1rem' }}>
        Gini coefficient: {gini.today.toFixed(3)} in {todayLabel}, {gini.scenario.toFixed(3)} divided like {scenarioLabel}.
        The Gini runs from 0 (everyone has the same income) to 1 (one person has all of it). It is computed from 127
        income groups, which slightly understates it.
      </p>
    </ChartFrame>
  );
}
