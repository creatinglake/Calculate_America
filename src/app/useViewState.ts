/** The scenario state lives in the URL query string (engine/url.ts). */
import { useCallback, useMemo } from 'react';
import { fromQuery, toQuery, type ViewState } from '../engine';
import { navigate, useLocation } from './router';

export function useViewState(): [ViewState, (next: ViewState) => void] {
  const { path, search } = useLocation();
  const state = useMemo(() => fromQuery(search), [search]);
  const set = useCallback(
    (next: ViewState) => navigate(`${path}?${toQuery(next)}`, { replace: true }),
    [path],
  );
  return [state, set];
}
