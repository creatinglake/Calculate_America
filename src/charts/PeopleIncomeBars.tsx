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

function Bar({ label, shares, keys = GROUP_KEYS, scale = 1 }: {
  label: string; shares: Record<string, number>; keys?: readonly GroupKey[]; scale?: number;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <span className="text-sm">{label}</span>
      <div className="flex h-7 overflow-hidden rounded border border-[var(--border)]" role="img"
        aria-label={`${label}: ${keys.map((k) => `${GROUP_LABEL[k]} ${pct(shares[k]!)}`).join(', ')}`}>
        {keys.map((k) => (
          <div
            key={k}
            title={`${GROUP_LABEL[k]}: ${pct(shares[k]!)}`}
            className="h-full transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${shares[k]! * scale * 100}%`, background: `var(--g-${k})` }}
          />
        ))}
      </div>
    </div>
  );
}

export function PeopleIncomeBars({ today, scenario, todayLabel, scenarioLabel }: {
  today: GroupShares; scenario: GroupShares; todayLabel: string; scenarioLabel: string;
}) {
  const top1 = (g: GroupShares) => g.t09 + g.t009 + g.t001;
  const zoomPeople = Object.fromEntries(TOP1.map((k) => [k, GROUP_POP[k] / 0.01])) as Record<GroupKey, number>;
  const table = (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-left">
          <th className="pr-3 font-medium">Group</th>
          <th className="pr-3 font-medium">Share of adults</th>
          <th className="pr-3 font-medium">Share of income, {todayLabel}</th>
          <th className="font-medium">Share of income, {scenarioLabel}</th>
        </tr>
      </thead>
      <tbody>
        {GROUP_KEYS.map((k) => (
          <tr key={k} className="border-t border-[var(--border)]">
            <th scope="row" className="pr-3 text-left font-normal">{GROUP_LABEL[k]}</th>
            <td className="pr-3">{pct(GROUP_POP[k], 2)}</td>
            <td className="pr-3">{pct(today[k])}</td>
            <td>{pct(scenario[k])}</td>
          </tr>
        ))}
        <tr className="border-t border-[var(--border)] font-medium">
          <th scope="row" className="pr-3 text-left">Top 1% (last three)</th>
          <td className="pr-3">1%</td>
          <td className="pr-3">{pct(top1(today))}</td>
          <td>{pct(top1(scenario))}</td>
        </tr>
      </tbody>
    </table>
  );
  return (
    <ChartFrame
      title="Share of people vs share of income"
      description="Each bar is everyone. The top groups are slivers of the people but large blocks of the income."
      table={table}
    >
      <div className="space-y-2">
        <Bar label="Adults" shares={GROUP_POP} />
        <Bar label={`Income, ${todayLabel}`} shares={today} />
        <Bar label={`Income, ${scenarioLabel}`} shares={scenario} />
        <div className="pt-2">
          <p className="mb-1 text-xs text-[var(--text-muted)]">
            Zoom: the top 1% of adults, magnified 100 times. Today they receive {pct(top1(today))} of all income;
            under {scenarioLabel}, {pct(top1(scenario))}.
          </p>
          <Bar label="Top 1% of adults" shares={zoomPeople} keys={TOP1} />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs">
          {GROUP_KEYS.map((k) => (
            <li key={k} className="flex items-center gap-1">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: `var(--g-${k})` }} />
              {GROUP_LABEL[k]}
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
