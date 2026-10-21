/** Load one data file for a page. */
import { useEffect, useState } from 'react';
import { loadData, type DataFiles } from '../data/load';

export function useFile<K extends keyof DataFiles>(name: K): { data: DataFiles[K] | null; error: string | null } {
  const [data, setData] = useState<DataFiles[K] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadData(name).then(setData, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [name]);
  return { data, error };
}
