
import { MEAN_INCOME } from '../constants';
import { DistributionStats } from '../types';

/**
 * CORE LOGIC: Lookup Table Interpolation
 * Finds the income value at a specific percentile within a dataset.
 * Uses linear interpolation between the 100 data points.
 */
export function getIncomeFromData(percentile: number, data: number[]): number {
  if (percentile <= 0) return data[0];
  if (percentile >= 1) return data[data.length - 1];
  
  const index = percentile * (data.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;
  
  return data[lowerIndex] * (1 - weight) + data[upperIndex] * weight;
}

/**
 * CORE LOGIC: Reverse Lookup
 * Finds what percentile a specific income falls into.
 */
export function getPercentileFromData(income: number, data: number[]): number {
  if (income <= data[0]) return 0.01;
  if (income >= data[data.length - 1]) return 0.999;
  
  // Find the first index where data[i] > income
  const idx = data.findIndex(val => val >= income);
  if (idx === -1) return 0.999;
  if (idx === 0) return 0.01;
  
  // Interpolate between idx-1 and idx
  const lowerVal = data[idx - 1];
  const upperVal = data[idx];
  const fraction = (income - lowerVal) / (upperVal - lowerVal);
  
  return (idx - 1 + fraction) / data.length;
}

/**
 * THE ACCORDION: Inequality Multiplier Logic
 * Squeezes or stretches the income gap relative to the mean.
 * Formula: NewIncome = Mean + (BaseIncome - Mean) * Multiplier
 * 
 * Multiplier 1.0 = Current US
 * Multiplier 0.7 = 1960s
 * Multiplier 0.5 = Nordic
 * Multiplier 0.0 = Equality
 */
export function generateCustomData(baseData: number[], multiplier: number): number[] {
  return baseData.map(val => {
    const diff = val - MEAN_INCOME;
    const newVal = MEAN_INCOME + (diff * multiplier);
    return Math.max(1000, newVal); // Income floor of $1000
  });
}

/**
 * AGGREGATOR: Calculates chart statistics (Quintiles + Top 1%)
 * This logic is now centralized here instead of in the UI component.
 */
export function calculateStats(data: number[]): DistributionStats {
    const totalIncome = data.reduce((a,b) => a+b, 0);
    
    // Helper to sum a slice
    const getSliceSum = (startPct: number, endPct: number) => {
        const startIdx = Math.floor(startPct * 100);
        const endIdx = Math.floor(endPct * 100);
        let sum = 0;
        for(let i=startIdx; i<endIdx; i++) sum += data[i];
        return sum;
    };
    
    // Generate Quintiles
    const quintiles = [
        { label: "1st 20%", start: 0.0, end: 0.2 },
        { label: "2nd 20%", start: 0.2, end: 0.4 },
        { label: "3rd 20%", start: 0.4, end: 0.6 },
        { label: "4th 20%", start: 0.6, end: 0.8 },
        { label: "Top 20%", start: 0.8, end: 1.0, isTop20: true },
    ].map(q => {
        const sum = getSliceSum(q.start, q.end);
        return {
            label: q.label,
            share: sum / totalIncome,
            avgIncome: sum / 20, // 20 data points per quintile
            isTop20: q.isTop20
        };
    });
    
    // Generate Top 1% (Last data point in a 100-point array represents the top 1%)
    const top1Sum = data[99]; 
    const top1 = {
        share: top1Sum / totalIncome,
        avgIncome: top1Sum // It's just 1 point, so sum = avg
    };
    
    return { quintiles, top1 };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}
