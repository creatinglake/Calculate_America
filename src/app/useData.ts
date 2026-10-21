/** Loads the files the calculator needs and assembles the scenario data. */
import { useEffect, useState } from 'react';
import { loadData, type Macro } from '../data/load';
import type { Data } from '../model/scenarios';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Data; macro: Macro };

export function useCalculatorData(): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    Promise.all([
      loadData('us-ptinc'), loadData('us-cainc'), loadData('us-ptinc-as'),
      loadData('comparisons'), loadData('presets'), loadData('us-macro'),
    ])
      .then(([ptinc, cainc, ptincAs, comparisons, presets, macro]) => {
        if (live) setState({ status: 'ready', data: { ptinc, cainc, ptincAs, comparisons, presets }, macro });
      })
      .catch((e: unknown) => {
        if (live) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
