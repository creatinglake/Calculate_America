/**
 * Resolves a view state (scenario + switches) into the two distributions the
 * engine compares: "today" and the scenario. Pure: takes loaded data files.
 */
import {
  blend, fromDataFile, fromGroupShares, mean, mostEqualYear, parametric,
  type DataFile, type Distribution, type GroupShares, type Scenario, type ViewState,
} from '../engine';
import type { Comparisons, Presets } from '../data/load';

export interface Data {
  ptinc: DataFile;
  cainc: DataFile;
  ptincAs: DataFile;
  comparisons: Comparisons;
  presets: Presets;
}

export interface PresetCard {
  title: string;
  body: string[];
  source: string;
}

export interface Resolved {
  ok: true;
  today: { dist: Distribution; year: number; file: DataFile };
  scenario: { dist: Distribution; label: string; card?: PresetCard };
}

export type Resolution = Resolved | { ok: false; reason: string };

/** The series in use for the data and concept switches. */
export function seriesFor(data: Data, s: Pick<ViewState, 'data' | 'concept'>): DataFile | string {
  if (s.data === 'as' && s.concept === 'post') {
    return 'Auten-Splinter estimates are used for pre-tax income only.';
  }
  if (s.concept === 'post') return data.cainc;
  return s.data === 'as' ? data.ptincAs : data.ptinc;
}

export const AREA_IDS = ['SE', 'DK', 'NO', 'FI', 'FR', 'DE', 'GB', 'QX'] as const;

export interface PresetInfo {
  id: string;
  label: string;
}

export function presetList(data: Data): PresetInfo[] {
  return [
    { id: 'most-equal', label: 'US most equal year' },
    { id: 'gilded-age', label: 'Gilded Age (US 1928)' },
    ...AREA_IDS.map((id) => ({ id, label: data.comparisons.areas[id]?.name ?? id })),
    { id: 'equality', label: 'Perfect equality' },
  ];
}

function equality(like: Distribution): Distribution {
  const m = mean(like);
  return { p0: like.p0, p1: like.p1, avg: like.avg.map(() => m), thr: like.thr.map(() => m) };
}

function resolvePreset(id: string, data: Data, series: DataFile, today: Distribution, post: boolean):
  Resolved["scenario"] | string {
  const concept = post ? 'after taxes and cash transfers' : 'before taxes';
  if (id === 'equality') {
    return {
      dist: equality(today), label: 'Perfect equality',
      card: { title: 'Perfect equality', body: ['Everyone receives the average income. A reference point, not a proposal.'], source: 'Computed.' },
    };
  }
  if (id === 'most-equal') {
    const years = new Map(series.years.map((y) => [y, fromDataFile(series, y)] as const));
    const best = mostEqualYear(years);
    const first = Math.min(...series.years), last = Math.max(...series.years);
    return {
      dist: years.get(best.year)!, label: `US ${best.year} (most equal year)`,
      card: {
        title: `US ${best.year}: the most equal year`,
        body: [
          `The year from ${first} to ${last} with the lowest Gini coefficient for income ${concept}, computed from the data.`,
          'The year with the smallest top 1% share and the year with the largest bottom 50% share are not necessarily the same.',
        ],
        source: 'World Inequality Database (Piketty, Saez and Zucman).',
      },
    };
  }
  if (id === 'gilded-age') {
    if (post) return 'The 1928 preset is for income before taxes only.';
    const ga = data.presets.gildedAge;
    const r = fromGroupShares(today, ga.groups.central as unknown as GroupShares);
    if (!r.ok) return "The 1928 preset could not be built on this year's shape.";
    const b50 = (k: 'low' | 'high') => `${(ga.groups[k].b50! * 100).toFixed(1)}%`;
    return {
      dist: r.dist, label: 'Gilded Age (US 1928)',
      card: {
        title: 'Gilded Age: the US in 1928',
        body: [
          'Only the top of the distribution is observed for 1928: the shares of the top 10%, 1%, 0.1% and 0.01%.',
          'How the bottom 90% was split is an assumption: we use the 1962 split between the bottom 50% and the middle 40%. '
            + `With that split 25% lower or higher, the bottom 50% would get between ${b50('low')} and ${b50('high')} of income.`,
          `Inside each group, incomes follow today's shape.`,
        ],
        source: 'World Inequality Database (Piketty and Saez top income shares).',
      },
    };
  }
  const area = data.comparisons.areas[id];
  if (area) {
    const y = post ? area.cainc : area.ptinc;
    if (!y) return `${area.name} has no ${post ? 'after-tax' : 'before-tax'} data in the World Inequality Database.`;
    const bins = data.comparisons.bins;
    const nordic = ['SE', 'DK', 'NO', 'FI'].includes(id);
    return {
      dist: { p0: bins.map((b) => b.p0), p1: bins.map((b) => b.p1), avg: y.avg, thr: y.thr },
      label: `${area.name} ${y.year}`,
      card: {
        title: `${area.name}, ${y.year}`,
        body: [
          `How ${area.name} divided its income ${concept} in ${y.year}, applied to the US economy's size. Same measure and unit as the US figures: adults 20 and over, couples' income split equally.`,
          ...(nordic ? ['Nordic countries are more equal mostly after taxes and transfers. Compare the before- and after-tax views.'] : []),
          'European series are built from surveys and tax data with different pension and public-sector conventions.',
        ],
        source: 'World Inequality Database (Blanchet, Chancel and Gethin for Europe).',
      },
    };
  }
  return `Unknown preset "${id}".`;
}

/** A blend endpoint: "us-1963" or a preset id. */
function endpoint(id: string, data: Data, series: DataFile, today: Distribution, post: boolean) {
  const m = /^us-(\d{4})$/.exec(id);
  if (m) {
    const y = Number(m[1]);
    return series.byYear[String(y)] ? { dist: fromDataFile(series, y), label: `US ${y}` } : `No data for ${y}.`;
  }
  return resolvePreset(id, data, series, today, post);
}

export function resolve(data: Data, state: ViewState): Resolution {
  const series = seriesFor(data, state);
  if (typeof series === 'string') return { ok: false, reason: series };
  const year = Math.max(...series.years);
  const today = { dist: fromDataFile(series, year), year, file: series };
  const post = state.concept === 'post';
  const sc: Scenario = state.scenario;
  let out: Resolved["scenario"] | string;
  switch (sc.kind) {
    case 'year':
      out = series.byYear[String(sc.year)]
        ? { dist: fromDataFile(series, sc.year), label: `US ${sc.year}` }
        : `No data for ${sc.year} in this series.`;
      break;
    case 'preset':
      out = resolvePreset(sc.id, data, series, today.dist, post);
      break;
    case 'custom': {
      const r = fromGroupShares(today.dist, sc.groups);
      out = r.ok
        ? { dist: r.dist, label: 'Your custom division' }
        : r.reason === 'order'
          ? "This isn't possible: a lower group would earn more per person than a higher group."
          : 'These shares could not be turned into a valid distribution.';
      break;
    }
    case 'blend': {
      const a = endpoint(sc.a, data, series, today.dist, post);
      const b = endpoint(sc.b, data, series, today.dist, post);
      if (typeof a === 'string') out = a;
      else if (typeof b === 'string') out = b;
      else out = { dist: blend(a.dist, b.dist, sc.t, mean(today.dist)), label: `${Math.round((1 - sc.t) * 100)}% ${a.label}, ${Math.round(sc.t * 100)}% ${b.label}` };
      break;
    }
    case 'param':
      out = { dist: parametric(today.dist, sc.sigma, sc.alpha), label: 'Custom curve' };
      break;
  }
  if (typeof out === 'string') return { ok: false, reason: out };
  return { ok: true, today, scenario: out };
}
