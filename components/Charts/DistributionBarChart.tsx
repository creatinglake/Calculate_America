import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../services/mathUtils';
import { DistributionStats } from '../../types';

interface DistributionBarChartProps {
  stats: DistributionStats;
  scenarioName: string;
}

const DistributionBarChart: React.FC<DistributionBarChartProps> = ({ stats, scenarioName }) => {
  const { quintiles, top1 } = stats;

  // SCALING LOGIC
  // Responsive scaling to prevent overlap on desktop and overflow on mobile
  const [scaleFactor, setScaleFactor] = useState(115);

  useEffect(() => {
    const handleResize = () => {
      // Shrink bubbles significantly on mobile to fit vertical layout
      if (window.innerWidth < 768) {
        setScaleFactor(75); 
      } else {
        setScaleFactor(115);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDiameter = (share: number) => {
    // Sqrt ensures area proportionality
    return Math.sqrt(share) * scaleFactor; 
  };

  return (
    <div className="w-full h-full flex flex-col justify-center">
      
      {/* Bubble Container */}
      <div className="flex items-end justify-between px-0 pb-8 h-[240px]">
        {quintiles.map((d, i) => {
          const diameter = getDiameter(d.share);
          const isTop20 = d.isTop20;
          
          return (
            <div key={i} className="flex flex-col items-center group relative w-[20%] flex-shrink-0">
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs rounded p-2 whitespace-nowrap z-20 pointer-events-none shadow-lg left-1/2 -translate-x-1/2">
                <p className="font-bold text-indigo-200">{d.label}</p>
                <p>Share: {(d.share * 100).toFixed(1)}%</p>
                <p>Avg: {formatCurrency(d.avgIncome)}</p>
                {isTop20 && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <p className="font-bold text-amber-400">Nested Top 1%</p>
                    <p>Share: {(top1.share * 100).toFixed(1)}%</p>
                    <p>Avg: {formatCurrency(top1.avgIncome)}</p>
                  </div>
                )}
              </div>

              {/* Percentage Above Bubble */}
              <span className={`mb-1 text-[10px] md:text-sm font-bold ${isTop20 ? 'text-indigo-600' : 'text-slate-500'}`}>
                {(d.share * 100).toFixed(1)}%
              </span>

              {/* Bubble Circle */}
              <div 
                className={`rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-sm relative 
                  ${isTop20 
                    ? 'bg-indigo-600 shadow-indigo-200 border border-indigo-800' // Darker border for top 20%
                    : 'bg-indigo-300 border border-indigo-400' // Darker border for normal bubbles
                  }`}
                style={{ 
                  width: `${diameter}px`, 
                  height: `${diameter}px`,
                  minWidth: '12px', 
                  minHeight: '12px'
                }}
              >
                {/* Top 1% Nested Bubble */}
                {isTop20 && (
                   <div 
                     className="absolute bottom-1 bg-amber-400 rounded-full border border-amber-600 shadow-lg flex items-center justify-center animate-pulse-slow hover:animate-none transition-all duration-500"
                     style={{
                        width: `${getDiameter(top1.share)}px`,
                        height: `${getDiameter(top1.share)}px`,
                        minWidth: '6px',
                        minHeight: '6px'
                     }}
                   >
                      {/* Only show 1% text if it fits nicely */}
                      {getDiameter(top1.share) > 24 && (
                         <span className="text-[9px] md:text-[10px] font-bold text-amber-900">1%</span>
                      )}
                   </div>
                )}
              </div>

              {/* Label Below */}
              <div className="mt-3 text-center w-full">
                <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 leading-tight truncate px-0.5">{d.label}</p>
                <p className="text-[9px] md:text-xs text-slate-800 font-mono mt-0.5 truncate px-0.5">{formatCurrency(d.avgIncome)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center md:text-right mt-2 text-[10px] text-slate-400 px-4">
        Bubble area ∝ Income Share. <span className="text-amber-500 font-bold">Gold bubble</span> represents the Top 1%.
      </div>
    </div>
  );
};

export default DistributionBarChart;