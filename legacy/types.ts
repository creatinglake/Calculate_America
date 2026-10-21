
export interface UserState {
  income: number | '';
  yearsWorked: number;
  hasOnboarded: boolean;
}

export type ViewState = 'dashboard' | 'distributions' | 'methodology' | 'settings';

export interface ChartPoint {
  percentile: number;
  currentShare: number;
  targetShare: number;
  equalityShare: number;
}

export interface QuintileStat {
  label: string;
  share: number;
  avgIncome: number;
  isTop20?: boolean;
}

export interface DistributionStats {
  quintiles: QuintileStat[];
  top1: {
    share: number;
    avgIncome: number;
  };
}
