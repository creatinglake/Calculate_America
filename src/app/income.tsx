/**
 * The user's income answers, shared across pages for this visit only.
 * Held in memory: never stored, never put in the URL.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { EMPTY_FIELDS, type IncomeFields } from '../components/IncomeForm';

const Ctx = createContext<[IncomeFields, (f: IncomeFields) => void] | null>(null);

export function IncomeProvider({ children }: { children: ReactNode }) {
  const state = useState<IncomeFields>(EMPTY_FIELDS);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useIncome(): [IncomeFields, (f: IncomeFields) => void] {
  const v = useContext(Ctx);
  if (!v) throw new Error('useIncome outside IncomeProvider');
  return v;
}
