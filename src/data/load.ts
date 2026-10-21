/**
 * Loads the pipeline's JSON files from /data/ (public/data in the repo).
 * Each file is fetched once and cached for the session.
 */
import type { DataFile } from '../engine';

export interface Comparisons {
  meta: Record<string, unknown>;
  bins: { p0: number; p1: number }[];
  areas: Record<string, {
    name: string;
    ptinc: AreaYear | null;
    cainc: AreaYear | null;
  }>;
}

export interface AreaYear {
  year: number;
  currency: string;
  avg: number[];
  thr: number[];
  share: number[];
  mean: number;
}

export interface Presets {
  gildedAge: {
    id: string;
    year: number;
    observed: string[];
    b50ToM40Ratio1962: number;
    groups: Record<'central' | 'low' | 'high', Record<string, number>>;
  };
}

export interface Macro {
  compToWagesYear: number;
  compToWages: Record<string, number>;
  nationalIncomeMillions: Record<string, number>;
  agiMillions: Record<string, number>;
  agiToNationalIncome: Record<string, number>;
  cpi: {
    dollarYear: number;
    dollarYearAverage: number;
    latest12MonthAverage: number;
    through: string;
    missingMonths: string[];
    ratio: number;
  };
}

export interface DataFiles {
  'us-ptinc': DataFile;
  'us-cainc': DataFile;
  'us-ptinc-as': DataFile;
  'us-hweal': DataFile;
  comparisons: Comparisons;
  presets: Presets;
  'us-macro': Macro;
}

const cache = new Map<string, Promise<unknown>>();

export function loadData<K extends keyof DataFiles>(name: K): Promise<DataFiles[K]> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load ${name} (${r.status})`);
      return r.json();
    });
    // Let a failed request be retried later.
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p as Promise<DataFiles[K]>;
}
