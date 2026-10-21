
// US Full-Time, Year-Round Worker Mean Income ~$80,000
export const MEAN_INCOME = 80000; 

// --- DATA GENERATION ENGINE (SOURCE OF TRUTH) ---
// We generate static 100-point "lookup tables" that act as our datasets.
// These are tuned to match real-world statistics (Census/WID) including the "fat tail".

const generateBaseData = (gini: number, top1ShareTarget: number) => {
  const n = 100;
  const rawData: number[] = [];
  
  // Base LogNormal Parameters
  const sigma = gini * 2.1; 
  const mu = Math.log(MEAN_INCOME) - (sigma * sigma) / 2;
  
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    
    // Inverse Error Function approximation
    const a = 0.147;
    const sign = (2*p - 1) < 0 ? -1 : 1;
    const ln_1_minus_x_sq = Math.log(1 - Math.pow(2*p - 1, 2));
    const part1 = 2 / (Math.PI * a) + ln_1_minus_x_sq / 2;
    const part2 = ln_1_minus_x_sq / a;
    const z = sign * Math.sqrt(Math.sqrt(part1*part1 - part2) - part1);
    
    let val = Math.exp(mu + sigma * z);
    
    // Apply "Fat Tail" Correction to match specific Top 1% targets
    // This allows us to mimic the specific shape of different economies
    if (p > 0.90) {
        const tailBoost = 1 + (p - 0.90) * (top1ShareTarget * 80); 
        val = val * tailBoost;
    }
    
    rawData.push(val);
  }
  
  // Normalize to exact Mean
  const currentSum = rawData.reduce((a, b) => a + b, 0);
  const currentMean = currentSum / n;
  const correction = MEAN_INCOME / currentMean;
  
  return rawData.map(v => v * correction);
};

// THE SOURCE OF TRUTH DATASETS
// These arrays represent the income distribution for each model.
export const BASE_DATA = generateBaseData(0.48, 0.20); // Current US (Gini 0.48, Top 1% ~20%)

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z' },
  { id: 'distributions', label: 'Distributions', icon: 'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z' },
  { id: 'methodology', label: 'Methodology', icon: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25' },
];
