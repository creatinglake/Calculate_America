
import React, { useState, useMemo, useEffect } from 'react';
import { BASE_DATA, MEAN_INCOME } from '../constants';
import { UserState, ChartPoint } from '../types';
import { getPercentileFromData, getIncomeFromData, generateCustomData, calculateStats, formatCurrency } from '../services/mathUtils';
import LorenzCurve from './Charts/LorenzCurve';
import DistributionBarChart from './Charts/DistributionBarChart';

interface DashboardProps {
  userState: UserState;
  setUserState: React.Dispatch<React.SetStateAction<UserState>>;
  setShowOnboarding: (show: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userState, setUserState, setShowOnboarding }) => {
  const [customMultiplier, setCustomMultiplier] = useState(1.0); // 1.0 = Current US
  const [animateResults, setAnimateResults] = useState(false);

  // 1. Data Source
  // BASE_DATA is the Current US distribution (Inequality Multiplier = 1.0)
  const currentData = BASE_DATA;
  
  // 2. Target Data Generation (The Accordion)
  const targetData = useMemo(() => {
    return generateCustomData(currentData, customMultiplier);
  }, [customMultiplier, currentData]);

  // Determine Scenario Name based on multiplier position
  const scenarioName = useMemo(() => {
    if (customMultiplier < 0.2) return "Perfect Equality";
    if (customMultiplier < 0.6) return "Nordic Model";
    if (customMultiplier < 0.85) return "US Historical (1960s)";
    if (customMultiplier < 1.1) return "Current 2022 US";
    if (customMultiplier < 1.3) return "Gilded Age (Extreme)";
    return "Hyper-Inequality";
  }, [customMultiplier]);

  // Helper: Treat empty input as 0 for math calculations
  const safeIncome = userState.income === '' ? 0 : userState.income;

  // 3. Calculate User's Current Percentile (Lookup from Data)
  const userPercentile = useMemo(() => {
    return getPercentileFromData(safeIncome, currentData);
  }, [safeIncome, currentData]);

  // 4. Calculate User's Income in Target Scenario (Lookup from Data)
  const targetIncome = useMemo(() => {
    return getIncomeFromData(userPercentile, targetData);
  }, [userPercentile, targetData]);

  // 5. Calculate Distribution Stats (for Bubble Chart)
  const distributionStats = useMemo(() => {
      return calculateStats(targetData);
  }, [targetData]);

  // 6. Calculate Differences
  const annualDiff = targetIncome - safeIncome;
  const lifetimeDiff = annualDiff * userState.yearsWorked;
  const isGain = annualDiff >= 0;

  // 7. Generate Chart Data (Lorenz)
  const chartData: ChartPoint[] = useMemo(() => {
    const points: ChartPoint[] = [];
    const steps = 20; 
    
    // Calculate cumulative sums for Lorenz
    let currentSum = 0;
    let targetSum = 0;
    const currentTotal = currentData.reduce((a,b) => a+b, 0);
    const targetTotal = targetData.reduce((a,b) => a+b, 0);
    
    // We have 100 data points (percentiles 1..100)
    const dataStep = 100 / steps; 
    
    points.push({ percentile: 0, currentShare: 0, targetShare: 0, equalityShare: 0 });
    
    for(let i=0; i<100; i++) {
        currentSum += currentData[i];
        targetSum += targetData[i];
        
        if ((i + 1) % dataStep === 0) {
            const p = i + 1;
            points.push({
                percentile: p,
                currentShare: (currentSum / currentTotal) * 100,
                targetShare: (targetSum / targetTotal) * 100,
                equalityShare: p
            });
        }
    }
    return points;
  }, [currentData, targetData]);


  useEffect(() => {
    setAnimateResults(true);
    const timer = setTimeout(() => setAnimateResults(false), 500);
    return () => clearTimeout(timer);
  }, [customMultiplier, userState.income]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Intro / Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Income Analysis</h2>
          <p className="text-slate-500">Compare your situation against historical and fair distributions.</p>
        </div>
        <button 
          onClick={() => setShowOnboarding(true)}
          className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          How does this work?
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Inputs & Settings */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Your Data */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Your Profile
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Annual Individual Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    step="1000"
                    value={userState.income}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUserState(prev => ({ 
                        ...prev, 
                        income: val === '' ? '' : Number(val) 
                      }));
                    }}
                    className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-slate-800"
                    placeholder="45000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Years Worked</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={userState.yearsWorked}
                  onChange={(e) => setUserState(prev => ({ ...prev, yearsWorked: Number(e.target.value) }))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 year</span>
                  <span className="font-semibold text-indigo-600">{userState.yearsWorked} years</span>
                  <span>50 years</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-sm text-slate-500">Current Percentile</span>
                 <span className="text-lg font-bold text-slate-800">{(userPercentile * 100).toFixed(1)}%</span>
               </div>
               <div className="w-full bg-slate-100 rounded-full h-2">
                 <div className="bg-slate-800 h-2 rounded-full transition-all duration-500" style={{ width: `${userPercentile * 100}%` }}></div>
               </div>
               <p className="text-xs text-slate-400 mt-2">
                 {userPercentile > 0.9 ? "You are in the top 10% of earners." : userPercentile < 0.5 ? "You are below the median." : "You are above the median."}
               </p>
            </div>
          </div>

          {/* Card 2: THE INEQUALITY SLIDER */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Select Income Distribution
            </h3>
            
            <p className="text-xs text-slate-500 mb-6">
                Drag the slider to explore different distributions.
            </p>

            <div className="relative pt-4 pb-4">
                <div className="flex justify-between items-center mb-6">
                  <label className="text-base font-bold text-slate-800">{scenarioName}</label>
                </div>
                
                {/* Slider Track with Anchors */}
                <div className="relative w-full h-12 select-none pt-2">
                   
                   {/* Custom Track Ticks */}
                   <div className="absolute top-[8px] w-full pointer-events-none z-10">
                        {/* 0.5 Nordic */}
                        <div className="absolute left-[33.3%] flex flex-col items-center -translate-x-1/2 -translate-y-full mb-1">
                            <span className="text-[11px] font-bold text-slate-600 mb-1">Nordic</span>
                            <div className="w-1 h-3 bg-slate-600 rounded-full opacity-50"></div>
                        </div>
                        {/* 0.7 1960s */}
                        <div className="absolute left-[46.6%] flex flex-col items-center -translate-x-1/2 -translate-y-full mb-1">
                             <span className="text-[11px] font-bold text-slate-600 mb-1">1960s US</span>
                             <div className="w-1 h-3 bg-slate-600 rounded-full opacity-50"></div>
                        </div>
                        {/* 1.0 US */}
                        <div className="absolute left-[66.6%] flex flex-col items-center -translate-x-1/2 -translate-y-full mb-1">
                            <span className="text-[11px] font-bold text-indigo-800 mb-1">Current 2022 US</span>
                            <div className="w-1 h-4 bg-indigo-800 rounded-full"></div>
                        </div>
                        {/* 1.2 Gilded */}
                        <div className="absolute left-[80%] flex flex-col items-center -translate-x-1/2 -translate-y-full mb-1">
                            <span className="text-[11px] font-bold text-amber-700 mb-1">Gilded US</span>
                            <div className="w-1 h-3 bg-amber-600 rounded-full"></div>
                        </div>
                   </div>

                   {/* Custom styled range input */}
                   <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.01"
                    value={customMultiplier}
                    onChange={(e) => setCustomMultiplier(Number(e.target.value))}
                    className="w-full h-6 rounded-full appearance-none cursor-pointer relative z-20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    style={{
                        background: 'linear-gradient(to right, #6ee7b7, #818cf8, #f43f5e)'
                    }}
                   />
                </div>
                
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-1">
                    <span>Total Equality</span>
                    <span>Extreme Inequality</span>
                </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Results & Visuals */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          
          {/* Big Result Card */}
          <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-8 transition-all duration-300 ${isGain ? 'border-t-4 border-t-emerald-500' : 'border-t-4 border-t-rose-500'}`}>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                 <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wide mb-1">Annual Difference</h2>
                 <div className="flex items-baseline gap-2">
                    <span className={`text-4xl lg:text-5xl font-bold tracking-tight ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isGain ? '+' : ''}{formatCurrency(annualDiff)}
                    </span>
                    <span className="text-slate-400 font-medium">/ year</span>
                 </div>
                 <p className="text-slate-600 mt-4 leading-relaxed">
                   If the US income distribution matched the
                   <strong className="text-slate-900"> {scenarioName}</strong> scenario, 
                   your individual income would be 
                   <span className="font-semibold bg-slate-100 px-1 rounded mx-1">{formatCurrency(targetIncome)}</span>
                   instead of {formatCurrency(safeIncome)}.
                 </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-2">Cumulative Lifetime Impact</h3>
                <p className={`text-3xl font-bold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {isGain ? '+' : ''}{formatCurrency(lifetimeDiff)}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Total accumulated difference over {userState.yearsWorked} years of work (nominal).
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6 min-w-0">
            
            {/* Chart 1: Distribution Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 overflow-hidden min-w-0">
               <div className="mb-4">
                <h3 className="font-semibold text-slate-800">Distribution Shares</h3>
                <p className="text-xs text-slate-500">Share of total income held by each group.</p>
              </div>
              <div className="h-[280px] w-full mt-6">
                <DistributionBarChart 
                  stats={distributionStats}
                  scenarioName={scenarioName}
                />
              </div>
            </div>

            {/* Chart 2: Lorenz Curve */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col overflow-hidden min-w-0">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-800">Lorenz Curve</h3>
                <p className="text-xs text-slate-500">Visualizing inequality. The closer to the diagonal line, the more equal the society.</p>
              </div>
              <div className="flex-1 min-h-[250px] w-full">
                <LorenzCurve 
                  data={chartData} 
                  currentName="Current US" 
                  targetName={scenarioName} 
                />
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
